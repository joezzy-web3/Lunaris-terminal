export interface TradePostMortem {
  rootCause: string;
  adversarialFlag: string;
  lessonLearned: string;
  policyAdjustment: string;
}

export interface PaperTradeRecord {
  id: string;
  timestamp: string; // ISO 8601 UTC
  instrument: string; // e.g., BTC/USDT, ETH/USDT, SOL/USDT, NVDAon/USDT, TSLAon/USDT
  direction: 'LONG' | 'SHORT';
  price: number; // Primary entry / execution price
  entryPrice?: number; // Explicit entry execution price
  exitPrice?: number; // Explicit exit / close execution price
  priceDelta?: number; // Dollar difference: exitPrice - entryPrice
  priceDeltaPct?: number; // Price movement percentage
  quantity: number; // in USDT (Margin Collateral)
  leverage: number;
  balanceChange: number; // Net Realized PnL ($)
  balanceChangePct: number; // Net Realized PnL (%)
  accountBalance: number; // Running balance after settlement
  fee?: number; // Bitget VIP-0 Taker Fee ($) (0.06% crypto / 0.10% rTokens)
  feeRate?: number; // Fee rate applied (0.0006 or 0.0010)
  slippage?: number; // Dynamic L2 Orderbook Slippage ($)
  slippageBps?: number; // Slippage in basis points
  grossPnl?: number; // Gross PnL ($) before fees & slippage
  netPnl?: number; // Net Realized PnL ($)
  trigger: string; // e.g. "Council Quorum: Quant-Omega + Atlas-Macro (92% Conf)"
  status: 'CLOSED' | 'OPEN' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'ADJUSTMENT';
  sourceHandler?: 'AUTOPILOT_DAEMON' | 'COUNCIL_SIGNAL' | 'PULSE_RADAR' | 'MANUAL' | 'AUDIT_SIM' | 'ADJUSTMENT';
  idempotencyKey?: string;
  postMortem?: TradePostMortem;
  legacyId?: string;
  auditSeq?: number;
}

export function resolveTradePrices(trade: Partial<PaperTradeRecord>): {
  entryPrice: number;
  exitPrice: number;
  priceDelta: number;
  priceDeltaPct: number;
} {
  const entryPrice = Number(trade.entryPrice ?? trade.price ?? 0);
  const exitPrice = Number(trade.exitPrice ?? trade.price ?? entryPrice);
  const priceDelta = parseFloat((exitPrice - entryPrice).toFixed(4));
  const priceDeltaPct = entryPrice > 0 ? parseFloat((((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2)) : 0;
  return { entryPrice, exitPrice, priceDelta, priceDeltaPct };
}
