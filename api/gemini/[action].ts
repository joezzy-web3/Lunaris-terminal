// api/gemini/[action].ts
// Unified Vercel Serverless Function for all Gemini operations:
// - /api/gemini/debate
// - /api/gemini/rehuddle
// - /api/gemini/pulse-ai
import { ThinkingLevel } from '@google/genai';
import { getGeminiApiKey, getGeminiClient } from '../_lib/gemini';

export const config = {
  maxDuration: 45,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = String(req.url || '').split('?')[0];
  const urlSegment = rawUrl.split('/').filter(Boolean).pop() || '';
  const action = String(req.query?.action || urlSegment || '').toLowerCase();

  // Route 1: Council Re-Huddle Cross Examination
  if (action === 'rehuddle') {
    return handleRehuddle(req, res);
  }

  // Route 2: Council Deliberation Debate
  if (action === 'debate') {
    return handleDebate(req, res);
  }

  // Route 3: Social Pulse AI Refresh
  if (action === 'pulse-ai' || action === 'ai-refresh') {
    return handlePulseAi(req, res);
  }

  return res.status(404).json({
    success: false,
    error: `Unknown Gemini action: ${action}. Expected 'debate', 'rehuddle', or 'pulse-ai'.`,
  });
}

async function handleRehuddle(req: any, res: any) {
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
            const config: any = { responseMimeType: 'application/json' };
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
          } catch (modelErr) {
            console.warn(`[ReHuddle] Model ${model} unavailable:`, modelErr);
          }
        }
      } catch (geminiErr: any) {
        console.warn('[ReHuddle] Gemini call error:', geminiErr?.message || geminiErr);
      }
    }

    // High-fidelity fallback
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
    console.error('Rehuddle handler error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
}

async function handleDebate(req: any, res: any) {
  try {
    const { ticker, clientPrice, instruction, forceOverAllocation } = req.body || {};
    const symbol = String(ticker || 'BTC').trim().toUpperCase();
    const liveBasePrice =
      typeof clientPrice === 'number' && Number.isFinite(clientPrice) && clientPrice > 0
        ? clientPrice
        : 100;
    const promptInstruction = typeof instruction === 'string' ? instruction.trim() : '';

    const apiKey = getGeminiApiKey();

    if (apiKey) {
      const ai = getGeminiClient();

      const systemPrompt = `You are the institutional LUNARIS Multi-Agent Trading Council.
Your mission is to perform deep, authentic, real-time market deliberation for the requested asset (${symbol}) or trading instruction.
Current verified live market exchange price for ${symbol}: $${liveBasePrice.toLocaleString()}. You MUST use this exact price ($${liveBasePrice.toLocaleString()}) for currentPrice.

Search for the REAL, LATEST, LIVE market price, latest news, recent 24h change, financial earnings, macro drivers, and technical levels.

You simulate the strict deliberation among 3 distinct AI council personas (evaluated downstream by the non-LLM Guardian-01 risk gate):
1. QUANT (Quant-Omega // Momentum & Orderflow Lead): Bullish breakout hunter, volume profile, EMA structure, orderbook depth, relative strength, entry trigger.
2. NEXUS_RED (Adversarial Red Team // Chaos Arbiter): Relentless dissenting voice hunting for liquidity spoofs, funding squeezes, or upcoming macro shocks.
3. MACRO (Atlas-Macro // Strategic Lead & Cross-Asset): Funding rate compression, Fed/CPI expectations, liquidity cycles, institutional flow, asymmetric R:R.

${forceOverAllocation ? 'Note: A forced 32% over-allocation stress test is active. NEXUS-RED and the downstream Risk Engine MUST vigorously veto or force-recalibrate sizing.' : ''}
${promptInstruction ? `Special Trader Instruction / Thesis: "${promptInstruction}". Deliberate directly on this thesis!` : ''}

Respond ONLY with valid JSON matching this schema:
{
  "assetSymbol": "${symbol}",
  "assetName": "Full name",
  "assetType": "CRYPTO" | "EQUITY" | "ETF",
  "currentPrice": ${liveBasePrice},
  "change24h": 0.0,
  "currency": "USD",
  "keyCatalysts": ["Catalyst 1", "Catalyst 2", "Catalyst 3"],
  "turns": [
    { "speakerId": "QUANT", "speakerName": "Quant-Omega // Momentum & Orderflow", "stance": "BULLISH", "argument": "Detailed momentum analysis..." },
    { "speakerId": "NEXUS_RED", "speakerName": "NEXUS-RED // Adversarial Red Team", "stance": "CAUTION", "argument": "Stress-test challenging traps..." },
    { "speakerId": "MACRO", "speakerName": "Atlas-Macro // Strategic Consensus Lead", "stance": "RATIFIED", "argument": "Institutional synthesis..." }
  ],
  "verdict": {
    "action": "BUY" | "SELL" | "HOLD" | "VETO",
    "executionType": "MARKET_ORDER" | "LIMIT_PULLBACK" | "BREAKOUT_STOP",
    "targetEntryPrice": ${liveBasePrice},
    "consensusStatus": "UNANIMOUS" | "RATIFIED" | "CONTENTIOUS",
    "nexusRedDissent": false,
    "riskMitigationClause": "Mitigation clause",
    "winRatePct": 65,
    "optimalSizePct": 4.5,
    "stopLoss": "Numerical stop price",
    "takeProfit": "Target price",
    "riskScore": 5,
    "riskFactors": ["Risk 1", "Risk 2"],
    "synthesizedReasoning": "Concise 2-sentence executive summary"
  }
}`;

      const modelsToTry: { name: string; search: boolean }[] = [
        { name: 'gemini-3.8-flash', search: true },
        { name: 'gemini-3.1-flash-lite', search: false },
        { name: 'gemini-3.8-flash', search: false },
      ];

      for (const { name: modelName, search } of modelsToTry) {
        try {
          const config: any = {};
          if (search) {
            config.tools = [{ googleSearch: {} }];
          }
          const response = await ai.models.generateContent({
            model: modelName,
            contents: systemPrompt,
            config,
          });
          const candidate = response.candidates?.[0];
          const rawText = response.text || candidate?.content?.parts?.[0]?.text || '';
          if (rawText) {
            let cleaned = rawText.trim();
            if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
            const parsedData = JSON.parse(cleaned);
            if (parsedData && liveBasePrice > 0) {
              parsedData.currentPrice = liveBasePrice;
            }

            const groundingMetadata = candidate?.groundingMetadata;
            const webSearchQueries = groundingMetadata?.webSearchQueries || [];
            const groundingChunks = groundingMetadata?.groundingChunks || [];
            const sources = groundingChunks
              .filter((chunk: any) => chunk.web && chunk.web.uri)
              .map((chunk: any) => ({
                title: chunk.web.title || 'Market Source',
                url: chunk.web.uri,
              }))
              .slice(0, 8);

            return res.status(200).json({
              success: true,
              isRealGemini: true,
              modelUsed: modelName,
              data: parsedData,
              grounding: {
                queries: webSearchQueries.length ? webSearchQueries : [`${symbol} market price news`],
                sources,
              },
            });
          }
        } catch (modelErr) {
          console.warn(`[Debate] Model ${modelName} error:`, modelErr);
        }
      }
    }

    // Dynamic fallback
    const isCrypto = ['BTC', 'ETH', 'SOL', 'SUI', 'DOGE', 'XRP', 'AVAX'].includes(symbol);
    const isVetoed = Boolean(forceOverAllocation);

    return res.status(200).json({
      success: true,
      isRealGemini: false,
      data: {
        assetSymbol: symbol,
        assetName: isCrypto ? `${symbol} Network` : `${symbol} Corp`,
        assetType: isCrypto ? 'CRYPTO' : 'EQUITY',
        currentPrice: liveBasePrice,
        change24h: 1.25,
        currency: 'USD',
        keyCatalysts: [
          `Institutional orderflow accumulating around $${liveBasePrice.toLocaleString()}`,
          `Volume-weighted average price (VWAP) holding steady on 4h timeframe`,
          `Derivatives funding rate balanced across major venues`,
        ],
        turns: [
          { speakerId: 'QUANT', speakerName: 'Quant-Omega // Momentum & Orderflow', stance: 'BULLISH', argument: `Orderbook depth at $${liveBasePrice.toLocaleString()} shows strong passive bid support.` },
          { speakerId: 'NEXUS_RED', speakerName: 'NEXUS-RED // Adversarial Red Team', stance: isVetoed ? 'VETO' : 'CAUTION', argument: isVetoed ? 'Forced 32% allocation violates portfolio VaR limits.' : 'Liquidity sweep risk exists below current range.' },
          { speakerId: 'MACRO', speakerName: 'Atlas-Macro // Strategic Consensus Lead', stance: isVetoed ? 'VETO' : 'RATIFIED', argument: `Macro conditions align with measured allocation at $${liveBasePrice.toLocaleString()}.` },
        ],
        verdict: {
          action: isVetoed ? 'VETO' : 'BUY',
          executionType: 'MARKET_ORDER',
          targetEntryPrice: liveBasePrice,
          consensusStatus: isVetoed ? 'CONTENTIOUS' : 'RATIFIED',
          nexusRedDissent: isVetoed,
          riskMitigationClause: 'Strict 5x leverage and 0.5% slippage collars armed.',
          winRatePct: isVetoed ? 38 : 74,
          optimalSizePct: isVetoed ? 0 : 4.5,
          stopLoss: Number((liveBasePrice * 0.955).toFixed(2)),
          takeProfit: Number((liveBasePrice * 1.085).toFixed(2)),
          riskScore: isVetoed ? 9 : 5,
          riskFactors: ['Short-term volatility', 'Macro event sensitivity'],
          synthesizedReasoning: `Council decree ratified on ${symbol} at $${liveBasePrice.toLocaleString()}.`,
        },
      },
    });
  } catch (err: any) {
    console.error('Debate handler error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
}

async function handlePulseAi(req: any, res: any) {
  try {
    const { ticker } = req.body || {};
    const symbol = String(ticker || 'SOL').trim().toUpperCase();

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(200).json({
        success: true,
        isRealGemini: false,
        data: {
          ticker: symbol,
          sentimentScore: 78,
          sentimentLabel: 'BULLISH',
          velocity1h: 185,
          mentionsPerHour: 4200,
          breakingCatalyst: `Real-time social telemetry logs sustained mentions across X and Farcaster for ${symbol}. Orderbook delta confirms positive accumulation.`,
          twitterSentiment: 82,
          redditSentiment: 74,
          farcasterSentiment: 80,
          searchQueries: [`${symbol} latest news`, `${symbol} market catalysts`],
        },
      });
    }

    const ai = getGeminiClient();

    const prompt = `You are the LUNARIS Social Velocity Radar Intelligence Lead.
Target Asset: ${symbol}.

Search real-time Google Search and social feeds (Twitter/X, Reddit, Farcaster, Bloomberg, Coindesk) for the absolute latest breaking market catalyst, sentiment spike, or orderflow news in the last 1 to 24 hours.

Return STRICTLY a JSON object with this format:
{
  "ticker": "${symbol}",
  "sentimentScore": 85,
  "sentimentLabel": "EXTREME BULL" | "BULLISH" | "NEUTRAL" | "BEARISH" | "EXTREME FEAR",
  "velocity1h": 240,
  "mentionsPerHour": 5800,
  "breakingCatalyst": "1-2 sentence real-time catalyst quoting the exact drivers found from live search",
  "twitterSentiment": 88,
  "redditSentiment": 79,
  "farcasterSentiment": 84,
  "searchQueries": ["query 1", "query 2"]
}`;

    const modelsToTry = [
      { name: 'gemini-3.8-flash', search: true },
      { name: 'gemini-3.1-flash-lite', search: false },
    ];

    for (const { name: mName, search } of modelsToTry) {
      try {
        const config: any = {};
        if (search) {
          config.tools = [{ googleSearch: {} }];
        }
        const resp = await ai.models.generateContent({
          model: mName,
          contents: prompt,
          config,
        });

        const rawText = resp.text || resp.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (rawText) {
          let cleaned = rawText.trim();
          if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
          const parsedData = JSON.parse(cleaned);

          const groundingMetadata = resp.candidates?.[0]?.groundingMetadata;
          const searchQueries = groundingMetadata?.webSearchQueries || parsedData.searchQueries || [];

          return res.status(200).json({
            success: true,
            isRealGemini: true,
            model: mName,
            data: {
              ...parsedData,
              searchQueries: searchQueries.length > 0 ? searchQueries : parsedData.searchQueries || [],
            },
          });
        }
      } catch (tierErr) {
        console.warn(`[AI Pulse] Tier ${mName} error:`, tierErr);
      }
    }

    return res.status(200).json({
      success: true,
      isRealGemini: false,
      data: {
        ticker: symbol,
        sentimentScore: 76,
        sentimentLabel: 'BULLISH',
        velocity1h: 160,
        mentionsPerHour: 3900,
        breakingCatalyst: `Orderbook telemetry indicates steady accumulation for ${symbol}.`,
        twitterSentiment: 78,
        redditSentiment: 72,
        farcasterSentiment: 75,
        searchQueries: [`${symbol} trading news`],
      },
    });
  } catch (err: any) {
    console.error('Pulse AI handler error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
}
