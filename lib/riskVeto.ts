// lib/riskVeto.ts

export interface TradeProposal {
  asset: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  size_pct: number;
  confidence: number;
  reasoning: string;
}

export type RiskOverrideCode =
  | 'MAX_POSITION'
  | 'STOP_LOSS'
  | 'DRAWDOWN_LIMIT'
  | 'CAPACITY_LIMIT'
  | 'CASH_RESERVE_FLOOR'
  | 'SPOT_SHORT_BLOCKED';

export interface RiskCheckResult {
  approved: boolean;
  reason: string;
  overrideCode?: RiskOverrideCode;
}

export const MAX_POSITION_PCT = 25.0; // Max 25% allocation per single trade
export const DRAWDOWN_LIMIT_PCT = 10.0; // Circuit breaker at 10% unrealized loss
export const MAX_SLIPPAGE_PCT = 0.005; // 0.5% maximum deviation slippage collar per documented Bitget standard

/**
 * Validates whether an exitPrice is within the documented 0.5% slippage collar relative to entry/spot price.
 */
export function validateSlippageCollar(
  entryPrice: number,
  exitPrice: number,
  maxSlippagePct: number = MAX_SLIPPAGE_PCT
): boolean {
  if (!Number.isFinite(entryPrice) || !Number.isFinite(exitPrice) || entryPrice <= 0) {
    return false;
  }
  const deviation = Math.abs(exitPrice - entryPrice) / entryPrice;
  return deviation <= maxSlippagePct + 1e-6;
}

/**
 * Enforces the 0.5% maximum execution slippage collar.
 * If exitPrice exceeds the collar relative to entryPrice (or spotPrice),
 * clamps exitPrice to entryPrice * (1 ± MAX_SLIPPAGE_PCT) in the trade direction.
 */
export function enforceSlippageCollar(
  entryPrice: number,
  exitPrice: number,
  direction: 'LONG' | 'SHORT' = 'LONG',
  lastSpotPrice?: number
): number {
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return exitPrice;
  }
  const refPrice = (Number.isFinite(lastSpotPrice) && (lastSpotPrice as number) > 0)
    ? (lastSpotPrice as number)
    : entryPrice;

  const deviation = Math.abs(exitPrice - refPrice) / refPrice;
  const decimals = entryPrice < 10 ? 4 : 2;

  if (deviation > MAX_SLIPPAGE_PCT) {
    // Clamp to entryPrice * (1 ± MAX_SLIPPAGE_PCT) in the appropriate direction.
    // Round conservatively towards refPrice so rounding never pushes deviation over MAX_SLIPPAGE_PCT.
    const factor = Math.pow(10, decimals);
    const clamped = exitPrice >= refPrice
      ? Math.floor(refPrice * (1 + MAX_SLIPPAGE_PCT) * factor) / factor
      : Math.ceil(refPrice * (1 - MAX_SLIPPAGE_PCT) * factor) / factor;
    return parseFloat(clamped.toFixed(decimals));
  }

  return parseFloat(exitPrice.toFixed(decimals));
}

export interface PortfolioRiskContext {
  activePositionsCount?: number;
  maxAllowedPositions?: number;
  isAssetHeld?: boolean;
  availableDeployableCash?: number;
}

/**
 * Deterministic Risk Veto Engine
 * Evaluates trade proposals against hard risk bounds, capacity caps, spot-only rules, and stop-loss circuit breakers.
 */
export function evaluateTradeRisk(
  proposal: TradeProposal,
  currentPortfolioValue: number,
  assetUnrealizedPnlPct?: number,
  portfolioContext?: PortfolioRiskContext
): RiskCheckResult {
  if (proposal.action === 'HOLD') {
    return { approved: true, reason: 'PASS — NO ACTION REQUESTED' };
  }

  // 1. Pure Spot / Long Model: Disallow shorting or selling assets not currently held
  if (proposal.action === 'SELL' && portfolioContext && portfolioContext.isAssetHeld === false) {
    return {
      approved: false,
      reason: `OVERRIDE — SPOT ONLY: Cannot SELL ${proposal.asset} (asset is not currently held in active portfolio)`,
      overrideCode: 'SPOT_SHORT_BLOCKED',
    };
  }

  // 2. Portfolio Capacity Rule (User-defined max open positions, capped at 5)
  if (
    proposal.action === 'BUY' &&
    portfolioContext &&
    !portfolioContext.isAssetHeld &&
    typeof portfolioContext.activePositionsCount === 'number' &&
    typeof portfolioContext.maxAllowedPositions === 'number' &&
    portfolioContext.activePositionsCount >= portfolioContext.maxAllowedPositions
  ) {
    return {
      approved: false,
      reason: `OVERRIDE — CAPACITY CAP REACHED: ${portfolioContext.activePositionsCount}/${portfolioContext.maxAllowedPositions} positions active. Risk Sentinel blocked BUY ${proposal.asset}.`,
      overrideCode: 'CAPACITY_LIMIT',
    };
  }

  // 3. Liquidation Shield Reserve Floor Rule (Deployable cash buffer check)
  if (
    proposal.action === 'BUY' &&
    portfolioContext &&
    typeof portfolioContext.availableDeployableCash === 'number' &&
    portfolioContext.availableDeployableCash < 25
  ) {
    return {
      approved: false,
      reason: `OVERRIDE — LIQUIDATION SHIELD: Reserve floor engaged. Deployable cash buffer locked to guarantee 0% liquidation risk.`,
      overrideCode: 'CASH_RESERVE_FLOOR',
    };
  }

  // 4. Position Sizing Rules (Max 25% allocation per single trade)
  if (proposal.size_pct > MAX_POSITION_PCT) {
    return {
      approved: false,
      reason: `OVERRIDE — EXCEEDS MAX POSITION SIZE (${proposal.size_pct}% > ${MAX_POSITION_PCT}%)`,
      overrideCode: 'MAX_POSITION',
    };
  }

  // 5. Automated Stop-Loss Circuit Breaker
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

  return { approved: true, reason: 'APPROVED — RISK & CAPACITY PARAMETERS VERIFIED' };
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
