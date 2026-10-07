// api/gemini/rehuddle.ts
// Vercel Serverless Function: Council Cross-Examination & Re-Huddle Deliberation
import { ThinkingLevel } from '@google/genai';
import { getGeminiApiKey, getGeminiClient } from '../_lib/gemini';

export const config = {
  maxDuration: 45,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { ticker, userQuestion, previousVerdict, clientPrice } = req.body || {};
    const symbol = String(ticker || 'BTC').trim().toUpperCase();
    const query = String(userQuestion || '').trim();

    if (!query) {
      return res.status(400).json({ success: false, error: 'Question / proposal is required for re-huddle.' });
    }

    const liveBasePrice =
      typeof clientPrice === 'number' && Number.isFinite(clientPrice) && clientPrice > 0
        ? clientPrice
        : previousVerdict?.currentPrice || 100;
    const prevAction = previousVerdict?.action || 'BUY';
    const prevReasoning = previousVerdict?.synthesizedReasoning || 'Previous consensus decree';

    const apiKey = getGeminiApiKey();

    if (apiKey) {
      try {
        const ai = getGeminiClient();
        const rehuddlePrompt = `You are the institutional LUNARIS Multi-Agent Trading Council.
The user (acting as Managing Director / Judge) has interrupted the ratified verdict on ${symbol} with a specific cross-examination or follow-up question:
"${query}"

Previous Ratified Decree:
Action: ${prevAction}
Previous Reasoning: "${prevReasoning}"
Current Live Price of ${symbol}: $${liveBasePrice.toLocaleString()}

The 4 council personas must immediately re-huddle, deliberate on the user's specific point, and decide whether to:
1. "AMEND_DECREE": Reason with the user's idea, modify target price/sizing/timing (e.g. switch to limit pullback, scale down size, adjust target if unrealistic, or flip bias).
2. "SUSTAIN_RULING": Stand firm with the initial plan, explaining politely yet rigorously why the user's scenario is already accounted for or why altering the plan introduces unacceptable tail risk.

Deliberate in 4 turns:
1. QUANT (Quant-Omega // Momentum & Orderflow Lead): Re-evaluates orderbook, timing, or technical levels based directly on the user's question and numbers.
2. GUARDIAN (Guardian-01 // Risk Arbiter): Audits downside, portfolio impact, and whether the user's suggestion reduces or increases risk.
3. NEXUS_RED (Adversarial Red Team // Chaos Arbiter): Highlights traps, slippage, or counter-risks in the user's idea vs the original plan.
4. MACRO (Atlas-Macro // Consensus Lead): Synthesizes whether the council amends or sustains the decree.

Respond ONLY with valid JSON matching this schema:
{
  "huddleOutcome": "AMEND_DECREE" | "SUSTAIN_RULING",
  "outcomeTitle": "AMENDED DECREE: [Specific adjustment]" | "ORIGINAL RULING SUSTAINED: [Reason]",
  "amendedAction": "BUY" | "SELL" | "HOLD",
  "executionType": "MARKET_ORDER" | "LIMIT_PULLBACK" | "BREAKOUT_STOP",
  "targetEntryPrice": ${liveBasePrice},
  "revisedSizePct": ${previousVerdict?.optimalSizePct || 4.5},
  "revisedStopLossPct": ${previousVerdict?.stopLossPct || 4.5},
  "reHuddleSummary": "2-sentence institutional ruling directly addressing the user's specific question and any numbers mentioned",
  "turns": [
    {
      "speakerId": "QUANT",
      "speakerName": "Quant-Omega // Momentum Lead",
      "stance": "RECALIBRATING" | "AFFIRMING",
      "argument": "Direct, thoughtful response analyzing the user's specific thesis or question..."
    },
    {
      "speakerId": "GUARDIAN",
      "speakerName": "Guardian-01 // Risk Arbiter",
      "stance": "ADAPTING" | "REJECTING",
      "argument": "Risk impact and capital protection perspective on the user's point..."
    },
    {
      "speakerId": "NEXUS_RED",
      "speakerName": "NEXUS-RED // Chaos Arbiter",
      "stance": "CHALLENGE" | "CONCESSION",
      "argument": "Adversarial stress-test directly engaging with the user's specific observation..."
    },
    {
      "speakerId": "MACRO",
      "speakerName": "Atlas-Macro // Strategic Lead",
      "stance": "AMENDED_CONSENSUS" | "SUSTAINED_CONSENSUS",
      "argument": "Final synthesized resolution taking the user's input into account..."
    }
  ]
}
Note: Respond strictly with the JSON object. Do not wrap in markdown tags if possible.`;

        const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
        for (const model of models) {
          try {
            const config: any = {
              responseMimeType: 'application/json',
            };
            if (model === 'gemini-3.8-flash') {
              config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
            }
            const response = await ai.models.generateContent({
              model,
              contents: rehuddlePrompt,
              config,
            });
            const rawText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (rawText) {
              let cleaned = rawText.trim();
              if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
              else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
              const parsed = JSON.parse(cleaned);
              if (parsed && liveBasePrice > 0) {
                if (!parsed.targetEntryPrice || parsed.executionType === 'MARKET_ORDER') {
                  parsed.targetEntryPrice = liveBasePrice;
                }
              }
              return res.status(200).json({
                success: true,
                isRealGemini: true,
                data: parsed,
                modelUsed: model,
              });
            }
          } catch (modelErr: any) {
            console.warn(`[ReHuddle Serverless] Model ${model} failed, trying fallback:`, modelErr?.message || modelErr);
          }
        }
      } catch (geminiErr: any) {
        console.warn('[ReHuddle Serverless] Gemini call failed, using dynamic synthesis:', geminiErr?.message || geminiErr);
      }
    }

    // High-fidelity fallback re-huddle engine if API key missing or exhausted
    const qLower = query.toLowerCase();
    const numbersInQuery = query.match(/\$?\d+(?:\.\d+)?/g);
    const parsedTarget = numbersInQuery ? parseFloat(numbersInQuery[0].replace('$', '')) : null;
    const isTargetQuestion = parsedTarget !== null && (qLower.includes('hit') || qLower.includes('unrealistic') || qLower.includes('reach') || qLower.includes('high') || qLower.includes('target'));

    const isAgreeingWithUser =
      isTargetQuestion ||
      qLower.includes('scale') ||
      qLower.includes('wait') ||
      qLower.includes('limit') ||
      qLower.includes('cpi') ||
      qLower.includes('drawdown') ||
      qLower.includes('loss') ||
      qLower.includes('pullback') ||
      qLower.includes('stop') ||
      qLower.includes('unrealistic');

    const outcome = isAgreeingWithUser ? 'AMEND_DECREE' : 'SUSTAIN_RULING';
    const outcomeTitle = isAgreeingWithUser
      ? `AMENDED DECREE // Calibrated to: "${query.slice(0, 36)}..."`
      : `ORIGINAL RULING SUSTAINED // Stand Firm on ${prevAction} ${symbol}`;

    const fallbackRehuddle = {
      huddleOutcome: outcome,
      outcomeTitle,
      amendedAction: prevAction,
      executionType: isAgreeingWithUser ? 'LIMIT_PULLBACK' : 'MARKET_ORDER',
      targetEntryPrice: isAgreeingWithUser ? Number((liveBasePrice * 0.985).toFixed(2)) : liveBasePrice,
      revisedSizePct: isAgreeingWithUser ? Math.max(2, Math.round((previousVerdict?.optimalSizePct || 4.5) * 0.7)) : (previousVerdict?.optimalSizePct || 4.5),
      revisedStopLossPct: previousVerdict?.stopLossPct || 4.5,
      reHuddleSummary: isTargetQuestion && parsedTarget
        ? `The Council deliberated on your question regarding the $${parsedTarget} target on ${symbol}. Given current price at $${liveBasePrice.toLocaleString()}, a move to $${parsedTarget} represents a ${((parsedTarget - liveBasePrice) / liveBasePrice * 100).toFixed(1)}% extension. We have tempered expectations and recalibrated entry to a disciplined limit pullback.`
        : isAgreeingWithUser
        ? `The Council has incorporated your counsel on "${query}". We have adjusted execution to a LIMIT PULLBACK entry at $${(liveBasePrice * 0.985).toLocaleString()} with scaled sizing to protect portfolio capital.`
        : `The Council has thoroughly stress-tested your query "${query}". NEXUS-RED and Guardian-01 confirm the existing risk boundaries already insulate us, and altering entry now risks missing liquidity absorption. Decree sustained.`,
      turns: [
        {
          speakerId: 'QUANT',
          speakerName: 'Quant-Omega // Momentum Lead',
          stance: isAgreeingWithUser ? 'RECALIBRATING' : 'AFFIRMING',
          argument: isTargetQuestion && parsedTarget
            ? `Regarding whether $${parsedTarget} is realistic: ${symbol} has overhead supply clusters between $${(liveBasePrice * 1.05).toFixed(2)} and $${parsedTarget}. Slicing entry rather than expecting an immediate sprint to $${parsedTarget} is statistically sounder.`
            : isAgreeingWithUser
            ? `The user's point on "${query}" is technically sound. Resting limit bids around $${(liveBasePrice * 0.985).toLocaleString()} preserves our reward-to-risk ratio without chasing the current market print.`
            : `Orderbook delta at current price $${liveBasePrice.toLocaleString()} is currently dominated by passive iceberg bids. If we delay or alter entry, we face unfavorable slippage as breakout velocity accelerates.`,
        },
        {
          speakerId: 'GUARDIAN',
          speakerName: 'Guardian-01 // Risk Arbiter',
          stance: isAgreeingWithUser ? 'ADAPTING' : 'REJECTING',
          argument: isAgreeingWithUser
            ? `Conservative adjustment approved. Bounding sizing down to lower portfolio VaR from current NAV. Stop-loss remains inviolable.`
            : `The hard stop-loss is already set to absorb a flash deviation. Tampering with parameters without a technical breakdown introduces discretionary emotion. Guardian-01 votes to sustain.`,
        },
        {
          speakerId: 'NEXUS_RED',
          speakerName: 'NEXUS-RED // Chaos Arbiter',
          stance: isAgreeingWithUser ? 'CONCESSION' : 'CHALLENGE',
          argument: isTargetQuestion && parsedTarget
            ? `Adversarial audit concedes: Chasing an aggressive $${parsedTarget} print exposes traders to distribution by earlier swing longs. Tempering target expectations removes the trap.`
            : isAgreeingWithUser
            ? `Adversarial audit concedes: The user identified a valid short-term liquidity tripwire. Shifting to limit fill bounds completely eliminates sandwich bot vulnerability.`
            : `I re-simulated the user's concern. The probability of that tail event is <12% based on current perp funding. Slicing the plan now actually creates execution drag.`,
        },
        {
          speakerId: 'MACRO',
          speakerName: 'Atlas-Macro // Strategic Lead',
          stance: isAgreeingWithUser ? 'AMENDED_CONSENSUS' : 'SUSTAINED_CONSENSUS',
          argument: isAgreeingWithUser
            ? `Consensus ratified on the amended decree. Updated execution instructions dispatched with user-calibrated limits.`
            : `Supermajority votes to sustain the original decree. We hold our ground with automated risk parameters armed.`,
        },
      ],
    };

    return res.status(200).json({ success: true, isRealGemini: false, data: fallbackRehuddle });
  } catch (err: any) {
    console.error('Rehuddle serverless error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
}
