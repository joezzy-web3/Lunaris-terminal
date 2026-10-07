// api/gemini/debate.ts
// Vercel Serverless Function: Council Deliberation with Google Search Grounding
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
2. NEXUS_RED (Adversarial Red Team // Chaos Arbiter): Sits as the relentless dissenting voice. Specifically hunts for:
   - "Is this a classic low-liquidity spoof or exit pump?"
   - "Are funding rates overcrowded leading to a long squeeze?"
   - "Is there an upcoming macro print or token unlock that will wipe out this entry?"
   If NEXUS_RED finds a critical vulnerability or trap, it casts a "VETO" or "CRITICAL FLAW" stance, dropping consensus to "CONTENTIOUS" and demanding an explicit Risk Mitigation Clause!
3. MACRO (Atlas-Macro // Strategic Lead & Cross-Asset): Funding rate compression, Fed/CPI expectations, liquidity cycles, institutional flow, asymmetric R:R.

Downstream Note: Guardian-01 is an independent deterministic code gate executing outside of this deliberation that strictly enforces 5x leverage and 0.5% slippage collars.

IMPORTANT EXECUTION CLARITY:
You MUST clearly distinguish between:
- "executionType": "MARKET_ORDER" (Enter immediately at the current market price) vs "LIMIT_PULLBACK" (Wait for a retest/pullback limit price before buying) vs "BREAKOUT_STOP" (Trigger entry only if resistance breaks).
- "targetEntryPrice": The exact price at which the order should execute (equals current market price if MARKET_ORDER, or the specified pullback limit price if LIMIT_PULLBACK).

${forceOverAllocation ? 'Note: A forced 32% over-allocation stress test is active. NEXUS-RED and the downstream Risk Engine MUST vigorously veto or force-recalibrate the sizing to institutional safety limits (max 5%).' : ''}
${promptInstruction ? `Special Trader Instruction / Thesis: "${promptInstruction}". Deliberate directly on this thesis!` : ''}

Respond ONLY with valid JSON matching this exact schema:
{
  "assetSymbol": "${symbol}",
  "assetName": "Full name of the company or crypto asset",
  "assetType": "CRYPTO" | "EQUITY" | "ETF" | "COMMODITY" | "FOREX",
  "currentPrice": ${liveBasePrice},
  "change24h": 0.0,
  "currency": "USD",
  "keyCatalysts": [
    "Latest real news catalyst 1 with recent facts",
    "Latest real news catalyst 2",
    "Latest real news catalyst 3"
  ],
  "turns": [
    {
      "speakerId": "QUANT",
      "speakerName": "Quant-Omega // Momentum & Orderflow",
      "stance": "BULLISH" | "BEARISH" | "NEUTRAL",
      "argument": "Detailed momentum analysis citing real prices, orderbook depth and breakout signals..."
    },
    {
      "speakerId": "NEXUS_RED",
      "speakerName": "NEXUS-RED // Adversarial Red Team",
      "stance": "VETO" | "ADVERSARIAL_CHALLENGE" | "CAUTION" | "APPROVED",
      "argument": "Rigorous stress-test challenging liquidity traps, overcrowded leverage, and macro tripwires..."
    },
    {
      "speakerId": "MACRO",
      "speakerName": "Atlas-Macro // Strategic Consensus Lead",
      "stance": "RATIFIED" | "CONTENTIOUS" | "VETO",
      "argument": "Institutional synthesis factoring in funding rates, macro basis, final resolution and risk mitigation clause..."
    }
  ],
  "verdict": {
    "action": "BUY" | "SELL" | "HOLD" | "VETO",
    "executionType": "MARKET_ORDER" | "LIMIT_PULLBACK" | "BREAKOUT_STOP",
    "targetEntryPrice": ${liveBasePrice},
    "consensusStatus": "UNANIMOUS" | "RATIFIED" | "CONTENTIOUS",
    "nexusRedDissent": false,
    "riskMitigationClause": "Mandatory mitigation clause addressing NEXUS-RED concerns",
    "winRatePct": 65,
    "optimalSizePct": 4.5,
    "stopLoss": "Numerical stop loss price",
    "takeProfit": "Target price",
    "riskScore": 6,
    "riskFactors": ["Key risk 1", "Key risk 2"],
    "synthesizedReasoning": "Concise 2-sentence executive summary of the consensus verdict clearly stating if buying at current market price or waiting for limit pullback"
  }
}
Do not wrap in markdown tags if possible. Ensure all prices and metrics reflect real data found via Google Search.`;

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
                title: chunk.web.title || 'Market Intelligence Source',
                url: chunk.web.uri,
              }))
              .slice(0, 8);

            return res.status(200).json({
              success: true,
              isRealGemini: true,
              modelUsed: modelName,
              data: parsedData,
              grounding: {
                queries: webSearchQueries.length ? webSearchQueries : [`${symbol} current market price and news`],
                sources,
              },
            });
          }
        } catch (modelErr) {
          console.warn(`[Debate Serverless] Model ${modelName} failed, trying next fallback:`, modelErr);
        }
      }
    }

    // Dynamic High-Fidelity Synthesis if Gemini is unavailable
    const isCrypto = ['BTC', 'ETH', 'SOL', 'SUI', 'DOGE', 'XRP', 'AVAX'].includes(symbol);
    const isVetoed = Boolean(forceOverAllocation);

    const fallbackData = {
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
        {
          speakerId: 'QUANT',
          speakerName: 'Quant-Omega // Momentum & Orderflow',
          stance: 'BULLISH',
          argument: `Orderbook depth at $${liveBasePrice.toLocaleString()} shows strong passive bid support. Momentum indicators favor structured continuation.`,
        },
        {
          speakerId: 'NEXUS_RED',
          speakerName: 'NEXUS-RED // Adversarial Red Team',
          stance: isVetoed ? 'VETO' : 'CAUTION',
          argument: isVetoed
            ? 'Forced over-allocation of 32% violates fundamental portfolio VaR limits. Veto mandatory.'
            : 'Liquidity sweep risk exists below the current consolidation range. Hard stops must remain locked.',
        },
        {
          speakerId: 'MACRO',
          speakerName: 'Atlas-Macro // Strategic Consensus Lead',
          stance: isVetoed ? 'VETO' : 'RATIFIED',
          argument: isVetoed
            ? 'Council ratifies NEXUS-RED veto. Risk parameters violated.'
            : `Macro conditions align with measured allocation. Standing consensus on disciplined execution at $${liveBasePrice.toLocaleString()}.`,
        },
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
        riskFactors: ['Short-term volatility spikes', 'Macro event sensitivity'],
        synthesizedReasoning: `Council decree ratified on ${symbol} at $${liveBasePrice.toLocaleString()} with risk parameters locked.`,
      },
    };

    return res.status(200).json({
      success: true,
      isRealGemini: false,
      data: fallbackData,
    });
  } catch (err: any) {
    console.error('Debate serverless error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
}
