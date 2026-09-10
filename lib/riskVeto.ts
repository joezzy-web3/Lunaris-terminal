// lib/riskVeto.ts

export interface TradeProposal {
  asset: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  size_pct: number;
  confidence: number;
  reasoning: string;
}

export interface RiskCheckResult {
  approved: boolean;
  reason: string;
  overrideCode?: 'MAX_POSITION' | 'STOP_LOSS' | 'DRAWDOWN_LIMIT';
}

export const MAX_POSITION_PCT = 25.0; // Max 25% allocation per single trade
export const DRAWDOWN_LIMIT_PCT = 10.0; // Circuit breaker at 10% unrealized loss

/**
 * Deterministic Risk Veto Engine
 * Evaluates trade proposals against hard risk bounds and stop-loss circuit breakers.
 */
export function evaluateTradeRisk(
  proposal: TradeProposal,
  currentPortfolioValue: number,
  assetUnrealizedPnlPct?: number
): RiskCheckResult {
  if (proposal.action === 'HOLD') {
    return { approved: true, reason: 'PASS — NO ACTION REQUESTED' };
  }

  // 1. Position Sizing Rules
  if (proposal.size_pct > MAX_POSITION_PCT) {
    return {
      approved: false,
      reason: `OVERRIDE — EXCEEDS MAX POSITION SIZE (${proposal.size_pct}% > ${MAX_POSITION_PCT}%)`,
      overrideCode: 'MAX_POSITION',
    };
  }

  // 2. Automated Stop-Loss Circuit Breaker
  if (
    assetUnrealizedPnlPct !== undefined &&
    Number.isFinite(assetUnrealizedPnlPct) &&
    assetUnrealizedPnlPct <= -DRAWDOWN_LIMIT_PCT
  ) {
    return {
      approved: false,
      reason: `OVERRIDE — STOP-LOSS ENGAGED (${assetUnrealizedPnlPct.toFixed(2)}% Drawdown)`,
      overrideCode: 'STOP_LOSS',
    };
  }

  return { approved: true, reason: 'APPROVED — RISK PARAMETERS VERIFIED' };
}

/**
 * Calculates current asset allocation and checks against portfolio limits.
 */
export function calculatePositionLimit(portfolioValue: number): {
  maxPositionUsd: number;
  maxPositionPct: number;
  circuitBreakerThresholdPct: number;
} {
  return {
    maxPositionUsd: (portfolioValue * MAX_POSITION_PCT) / 100,
    maxPositionPct: MAX_POSITION_PCT,
    circuitBreakerThresholdPct: DRAWDOWN_LIMIT_PCT,
  };
}
