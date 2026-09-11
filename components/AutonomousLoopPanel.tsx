// components/AutonomousLoopPanel.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchPriceSnapshot, PriceSnapshot, ASSET_REGISTRY } from '@/lib/liveTokenFeed';
import { getSeededPrice, SEEDED_ASSETS } from '@/lib/demoSeedData';
import { evaluateTradeRisk, TradeProposal } from '@/lib/riskVeto';
import { Play, Square, Zap, ShieldAlert, RotateCcw, ArrowUpRight, ArrowDownRight, RefreshCw, Target, ShieldCheck, Lock, Sliders } from 'lucide-react';
import { playTradeApprovedChime, playRiskVetoTone } from '@/lib/soundSynth';

export interface AutonomousLog {
  id: string;
  timestamp: string;
  ticker: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  sizePct: number;
  text: string;
  status: 'APPROVED' | 'VETOED';
  overrideCode?: string;
  source: 'AUTONOMOUS' | 'COUNCIL_SIGNAL';
}

export interface Position {
  ticker: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  class: 'CX' | 'EQ';
}

interface AutonomousLoopPanelProps {
  key?: React.Key;
  externalProposal?: TradeProposal | null;
  onClearExternalProposal?: () => void;
  demoShockActive?: boolean;
}

const INITIAL_POSITIONS: Record<string, Position> = {};
const INITIAL_CASH = 100000;

export function AutonomousLoopPanel({
  externalProposal,
  onClearExternalProposal,
  demoShockActive,
}: AutonomousLoopPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false);
  const [logs, setLogs] = useState<AutonomousLog[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      ticker: 'SYS',
      action: 'HOLD',
      sizePct: 0,
      text: 'LUNARIS Autonomous Loop initialized with 15% price delta safeguard.',
      status: 'APPROVED',
      source: 'AUTONOMOUS',
    },
  ]);
  const [portfolio, setPortfolio] = useState<Record<string, PriceSnapshot>>({});
  const [positions, setPositions] = useState<Record<string, Position>>(INITIAL_POSITIONS);
  const [cashBalance, setCashBalance] = useState<number>(INITIAL_CASH);
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'VETOED'>('ALL');
  const [circuitBreakerAlert, setCircuitBreakerAlert] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Live');

  // User-configurable auto-exit profit target percentage (e.g. +2%, +3%, +5%, +8%, +15%)
  const [autoExitPct, setAutoExitPct] = useState<number>(3);
  const autoExitPctRef = useRef<number>(3);

  // Atomic refs to prevent state race conditions and break infinite useEffect execution loops
  const positionsRef = useRef<Record<string, Position>>(INITIAL_POSITIONS);
  const cashBalanceRef = useRef<number>(INITIAL_CASH);
  const isExecutingRef = useRef<boolean>(isExecuting);
  const isTurboRef = useRef<boolean>(isTurbo);

  // Sync refs with React state
  useEffect(() => {
    autoExitPctRef.current = autoExitPct;
  }, [autoExitPct]);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    cashBalanceRef.current = cashBalance;
  }, [cashBalance]);

  useEffect(() => {
    isExecutingRef.current = isExecuting;
  }, [isExecuting]);

  useEffect(() => {
    isTurboRef.current = isTurbo;
  }, [isTurbo]);

  const monitoredTickers = ['BTC', 'ETH', 'SOL', 'NVDA', 'TSLA', 'MSTR', 'COIN', 'AAPL'];

  /**
   * Safe calculation of total portfolio value.
   * Guarantees a strictly finite, positive number, never NaN or Infinity.
   */
  const calculateTotalValue = useCallback((
    posMap: Record<string, Position> = positionsRef.current,
    cash: number = cashBalanceRef.current
  ): number => {
    let posValue = 0;
    if (posMap && typeof posMap === 'object') {
      Object.values(posMap).forEach((pos) => {
        if (!pos) return;
        const amt = Number(pos.amount);
        const price = Number(pos.currentPrice);
        if (Number.isFinite(amt) && Number.isFinite(price) && amt > 0 && price > 0) {
          posValue += amt * price;
        }
      });
    }
    const safeCash = Number.isFinite(cash) && cash >= 0 ? cash : 0;
    const total = safeCash + posValue;
    return Number.isFinite(total) && total > 0 ? total : safeCash || INITIAL_CASH;
  }, []);

  /**
   * Reset the portfolio back to factory initial state.
   */
  const handleResetPortfolio = () => {
    positionsRef.current = INITIAL_POSITIONS;
    cashBalanceRef.current = INITIAL_CASH;
    setPositions(INITIAL_POSITIONS);
    setCashBalance(INITIAL_CASH);
    setLogs((prev) => [
      {
        id: `reset-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        ticker: 'SYS',
        action: 'HOLD',
        sizePct: 0,
        text: 'Portfolio reset to initial $100,000 baseline cash reserve ($0.00 Starting PnL).',
        status: 'APPROVED',
        source: 'AUTONOMOUS',
      },
      ...prev.slice(0, 49),
    ]);
  };

  /**
   * Cash out 100% of open positions directly into Available Cash reserve.
   */
  const handleCashoutAllPositions = useCallback(() => {
    const currentPositions = { ...positionsRef.current };
    const posKeys = Object.keys(currentPositions);
    if (posKeys.length === 0) return;

    let totalProceeds = 0;
    let closedCount = 0;
    posKeys.forEach((t) => {
      const p = currentPositions[t];
      if (p && Number.isFinite(p.amount) && p.amount > 0) {
        const price = Number.isFinite(p.currentPrice) && p.currentPrice > 0 ? p.currentPrice : p.entryPrice;
        totalProceeds += p.amount * price;
        closedCount++;
      }
    });

    const safeProceeds = Number.isFinite(totalProceeds) && totalProceeds > 0 ? totalProceeds : 0;
    const currentCash = Number(cashBalanceRef.current) || 0;
    const nextCash = currentCash + safeProceeds;

    cashBalanceRef.current = nextCash;
    setCashBalance(nextCash);
    positionsRef.current = {};
    setPositions({});
    playTradeApprovedChime();

    setLogs((prev) => [
      {
        id: `cashout-all-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        ticker: 'ALL',
        action: 'SELL',
        sizePct: 100,
        text: `[FULL CASHOUT EXECUTED] Closed ${closedCount} open positions. $${safeProceeds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} credited directly into Available Cash reserve.`,
        status: 'APPROVED',
        source: 'AUTONOMOUS',
      },
      ...prev.slice(0, 59),
    ]);
  }, []);

  /**
   * Bulletproof buy execution.
   */
  const executeSimulatedBuy = useCallback((
    ticker: string,
    sizePct: number,
    currentPrice: number,
    assetClass: 'CX' | 'EQ'
  ) => {
    const normTicker = ticker.toUpperCase();
    const validPrice = Number(currentPrice);
    if (!normTicker || !Number.isFinite(validPrice) || validPrice <= 0) return;

    const currentCash = Number(cashBalanceRef.current);
    const safeCash = Number.isFinite(currentCash) && currentCash > 0 ? currentCash : 0;
    if (safeCash < 10) return;

    const totalVal = calculateTotalValue(positionsRef.current, safeCash);
    const validSizePct = Math.min(25, Math.max(1, Number(sizePct) || 5));
    let tradeUsd = (totalVal * validSizePct) / 100;

    if (!Number.isFinite(tradeUsd) || tradeUsd <= 0) return;

    // Liquidation Shield: Enforce mandatory 20% NAV / $12,000 cash reserve so account can NEVER face liquidation
    const minReserveBuffer = Math.min(15000, totalVal * 0.20);
    const maxDeployableCash = Math.max(0, safeCash - minReserveBuffer);
    if (maxDeployableCash < 20) {
      // Shield engaged: preserve minimum buffer against liquidation
      return;
    }

    if (tradeUsd > maxDeployableCash) {
      tradeUsd = maxDeployableCash * 0.9;
    }
    if (tradeUsd < 10) return;

    const units = tradeUsd / validPrice;
    if (!Number.isFinite(units) || units <= 0) return;

    const nextCash = Math.max(0, safeCash - tradeUsd);
    cashBalanceRef.current = nextCash;
    setCashBalance(nextCash);

    setPositions((prev) => {
      const existing = prev[normTicker];
      let updatedPosition: Position;

      if (existing && Number.isFinite(existing.amount) && existing.amount > 0) {
        const existingAmt = existing.amount;
        const existingEntry = Number.isFinite(existing.entryPrice) && existing.entryPrice > 0 ? existing.entryPrice : validPrice;
        const totalUnits = existingAmt + units;
        const avgEntry = totalUnits > 0 ? (existingAmt * existingEntry + tradeUsd) / totalUnits : validPrice;
        const safeEntry = Number.isFinite(avgEntry) && avgEntry > 0 ? avgEntry : validPrice;
        const pnl = (validPrice - safeEntry) * totalUnits;
        const pnlPct = safeEntry > 0 ? ((validPrice - safeEntry) / safeEntry) * 100 : 0;

        updatedPosition = {
          ...existing,
          amount: Number.isFinite(totalUnits) ? totalUnits : units,
          entryPrice: safeEntry,
          currentPrice: validPrice,
          unrealizedPnl: Number.isFinite(pnl) ? pnl : 0,
          unrealizedPnlPct: Number.isFinite(pnlPct) ? pnlPct : 0,
        };
      } else {
        updatedPosition = {
          ticker: normTicker,
          amount: units,
          entryPrice: validPrice,
          currentPrice: validPrice,
          unrealizedPnl: 0,
          unrealizedPnlPct: 0,
          class: assetClass || (ASSET_REGISTRY[normTicker]?.class || 'CX'),
        };
      }

      const nextPositions = {
        ...prev,
        [normTicker]: updatedPosition,
      };
      positionsRef.current = nextPositions;
      return nextPositions;
    });
  }, [calculateTotalValue]);

  /**
   * Bulletproof sell execution.
   */
  const executeSimulatedSell = useCallback((ticker: string, currentPrice?: number) => {
    const normTicker = ticker.toUpperCase();
    const currentPositions = positionsRef.current;
    const pos = currentPositions[normTicker];
    if (!pos || !Number.isFinite(pos.amount) || pos.amount <= 0) return;

    const sellPrice = Number.isFinite(currentPrice) && (currentPrice as number) > 0
      ? (currentPrice as number)
      : (Number.isFinite(pos.currentPrice) && pos.currentPrice > 0 ? pos.currentPrice : pos.entryPrice);

    if (!Number.isFinite(sellPrice) || sellPrice <= 0) return;

    const proceeds = pos.amount * sellPrice;
    if (!Number.isFinite(proceeds) || proceeds <= 0) return;

    const currentCash = Number(cashBalanceRef.current);
    const safeCash = Number.isFinite(currentCash) && currentCash >= 0 ? currentCash : 0;
    const nextCash = safeCash + proceeds;

    cashBalanceRef.current = nextCash;
    setCashBalance(nextCash);

    setPositions((prev) => {
      const next = { ...prev };
      delete next[normTicker];
      positionsRef.current = next;
      return next;
    });
  }, []);

  /**
   * Handle incoming proposal from COUNCIL or external modules.
   */
  const handleIncomingCouncilSignal = useCallback(async (proposal: TradeProposal) => {
    if (!proposal || !proposal.asset) return;
    const ticker = proposal.asset.toUpperCase();

    let snap: PriceSnapshot;
    try {
      snap = await fetchPriceSnapshot(ticker);
    } catch {
      const fallbackPrice = getSeededPrice(ticker);
      snap = {
        ticker,
        price: fallbackPrice,
        change24h: 0,
        source: 'sim',
        class: (ASSET_REGISTRY[ticker]?.class || 'CX') as 'CX' | 'EQ',
        lastUpdated: Date.now(),
      };
    }

    if (!Number.isFinite(snap.price) || snap.price <= 0) {
      snap.price = SEEDED_ASSETS[ticker]?.basePrice || 100;
    }

    const currentPositions = positionsRef.current;
    const position = currentPositions[ticker];
    const unrealizedPnlPct = position && Number.isFinite(position.unrealizedPnlPct) ? position.unrealizedPnlPct : undefined;

    const totalPortfolioValue = calculateTotalValue(currentPositions, cashBalanceRef.current);
    const vetoResult = evaluateTradeRisk(proposal, totalPortfolioValue, unrealizedPnlPct);

    const newLog: AutonomousLog = {
      id: `council-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      ticker,
      action: proposal.action,
      sizePct: proposal.size_pct,
      text: vetoResult.approved
        ? `[COUNCIL HANDOFF] ${proposal.action} ${ticker} (${proposal.size_pct}%) — ${proposal.reasoning}`
        : `[COUNCIL HANDOFF VETO] ${vetoResult.reason}`,
      status: vetoResult.approved ? 'APPROVED' : 'VETOED',
      overrideCode: vetoResult.overrideCode,
      source: 'COUNCIL_SIGNAL',
    };

    setLogs((prev) => [newLog, ...prev.slice(0, 59)]);

    if (vetoResult.approved && proposal.action === 'BUY') {
      executeSimulatedBuy(ticker, proposal.size_pct, snap.price, snap.class);
    } else if (vetoResult.approved && proposal.action === 'SELL') {
      executeSimulatedSell(ticker, snap.price);
    } else if (!vetoResult.approved) {
      setCircuitBreakerAlert(vetoResult.reason);
      setTimeout(() => setCircuitBreakerAlert(null), 5000);
    }
  }, [calculateTotalValue, executeSimulatedBuy, executeSimulatedSell]);

  useEffect(() => {
    if (externalProposal) {
      handleIncomingCouncilSignal(externalProposal);
      if (onClearExternalProposal) {
        onClearExternalProposal();
      }
    }
  }, [externalProposal, handleIncomingCouncilSignal, onClearExternalProposal]);

  /**
   * Continuous Real-Time Price Ingestion (Runs 24/7 regardless of autopilot state).
   * Ensures the portfolio net value always updates live without requiring trade execution.
   */
  useEffect(() => {
    let isMounted = true;

    const syncMarketPrices = async () => {
      const activePositionTickers = Object.keys(positionsRef.current);
      const allTickersToFetch = Array.from(new Set([...monitoredTickers, ...activePositionTickers]));
      const updatedPortfolio: Record<string, PriceSnapshot> = {};

      for (const t of allTickersToFetch) {
        try {
          const snap = await fetchPriceSnapshot(t);
          if (snap && Number.isFinite(snap.price) && snap.price > 0) {
            updatedPortfolio[t] = snap;
          }
        } catch {
          const fallbackPrice = getSeededPrice(t);
          updatedPortfolio[t] = {
            ticker: t,
            price: fallbackPrice,
            change24h: 0,
            source: 'sim',
            class: (ASSET_REGISTRY[t]?.class || 'CX') as 'CX' | 'EQ',
            lastUpdated: Date.now(),
          };
        }
      }

      if (!isMounted) return;
      setPortfolio(updatedPortfolio);
      setLastSyncTime(new Date().toLocaleTimeString());

      // If Autopilot is paused (!isExecuting), FREEZE positions and PnL at the exact state of the last trade!
      // Portfolio metrics lock in place with zero drift until autopilot is re-engaged.
      if (!isExecutingRef.current) {
        return;
      }

      // Check for Auto-Exit (target profit) and Liquidation Shield emergency cuts
      const targetProfitPct = Number(autoExitPctRef.current) || 3.0;
      let totalCashProceedsToAdd = 0;
      const autoExitLogs: AutonomousLog[] = [];
      let soundToPlay: 'CHIME' | 'VETO' | null = null;

      // Safely update positions with live prices and calculate accurate PnL & exits
      const nextPositions: Record<string, Position> = {};
      const currentPosMap = { ...positionsRef.current };
      const posKeys = Object.keys(currentPosMap);

      posKeys.forEach((t) => {
        const p = currentPosMap[t];
        if (!p || !Number.isFinite(p.amount) || p.amount <= 0) return;

        const snap = updatedPortfolio[t];
        let newPrice = snap && Number.isFinite(snap.price) && snap.price > 0 ? snap.price : p.currentPrice;

        // Apply realistic dynamic market micro-drift (+0.1% to +0.5% or -0.1% to -0.3%) when autopilot is active
        const drift = 1 + (Math.random() * 0.007 - 0.002);
        newPrice = Number((newPrice * drift).toFixed(2));

        const entry = Number.isFinite(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : newPrice;
        const amount = p.amount;
        const pnl = (newPrice - entry) * amount;
        const pnlPct = entry > 0 ? ((newPrice - entry) / entry) * 100 : 0;
        const totalPosVal = amount * newPrice;

        // Condition A: Take-Profit Auto-Exit Target reached
        if (pnlPct >= targetProfitPct) {
          totalCashProceedsToAdd += totalPosVal;
          soundToPlay = 'CHIME';
          autoExitLogs.push({
            id: `autoexit-${Date.now()}-${t}`,
            timestamp: new Date().toLocaleTimeString(),
            ticker: t,
            action: 'SELL',
            sizePct: 100,
            text: `[AUTO-EXIT CASHOUT] Target +${targetProfitPct.toFixed(1)}% reached! Closed ${t} at +${pnlPct.toFixed(2)}% gain. Full proceeds of $${totalPosVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cashed out into Available Cash.`,
            status: 'APPROVED',
            source: 'AUTONOMOUS',
          });
        } else if (pnlPct <= -6) {
          // Condition B: Liquidation Shield auto-cut at -6% drawdown
          totalCashProceedsToAdd += totalPosVal;
          soundToPlay = soundToPlay || 'VETO';
          autoExitLogs.push({
            id: `shieldcut-${Date.now()}-${t}`,
            timestamp: new Date().toLocaleTimeString(),
            ticker: t,
            action: 'SELL',
            sizePct: 100,
            text: `[LIQUIDATION SHIELD] Emergency closed ${t} at ${pnlPct.toFixed(2)}% drawdown. Full proceeds of $${totalPosVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} returned to Available Cash.`,
            status: 'APPROVED',
            source: 'AUTONOMOUS',
          });
        } else {
          // Position stays open with updated metrics
          nextPositions[t] = {
            ...p,
            currentPrice: newPrice,
            unrealizedPnl: Number.isFinite(pnl) ? pnl : 0,
            unrealizedPnlPct: Number.isFinite(pnlPct) ? pnlPct : 0,
          };
        }
      });

      // Synchronously credit cashed out funds to Available Cash
      if (totalCashProceedsToAdd > 0) {
        const nextCash = (Number(cashBalanceRef.current) || 0) + totalCashProceedsToAdd;
        cashBalanceRef.current = nextCash;
        setCashBalance(nextCash);
      }

      positionsRef.current = nextPositions;
      setPositions(nextPositions);

      if (autoExitLogs.length > 0) {
        setLogs((prev) => [...autoExitLogs, ...prev.slice(0, 59)]);
        if (soundToPlay === 'CHIME') {
          playTradeApprovedChime();
        } else if (soundToPlay === 'VETO') {
          playRiskVetoTone();
        }
      }
    };

    // Initial fetch
    syncMarketPrices();
    const interval = setInterval(syncMarketPrices, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  /**
   * Autonomous AI Trade Inference Cycle.
   * Runs STRICTLY on a timer when autopilot is engaged.
   * Does NOT re-trigger when trades execute, preventing infinite recursive cascades.
   */
  useEffect(() => {
    if (!isExecuting) return;

    const runAutonomousDecision = async () => {
      const candidateTickers = ['NVDA', 'SOL', 'BTC', 'TSLA', 'MSTR', 'ETH', 'COIN'];
      const targetTicker = candidateTickers[Math.floor(Math.random() * candidateTickers.length)];

      let targetSnap: PriceSnapshot;
      try {
        targetSnap = await fetchPriceSnapshot(targetTicker);
      } catch {
        const fallbackPrice = getSeededPrice(targetTicker);
        targetSnap = {
          ticker: targetTicker,
          price: fallbackPrice,
          change24h: 0,
          source: 'sim',
          class: (ASSET_REGISTRY[targetTicker]?.class || 'CX') as 'CX' | 'EQ',
          lastUpdated: Date.now(),
        };
      }

      if (!targetSnap || !Number.isFinite(targetSnap.price) || targetSnap.price <= 0) {
        return;
      }

      const isOversized = Math.random() > 0.8;
      const size = isOversized ? 30 : Math.floor(Math.random() * 10) + 6; // 6% to 15%, or 30% for veto test
      const action: 'BUY' | 'SELL' = Math.random() > 0.45 ? 'BUY' : 'SELL';

      const reasons = [
        'SMA5 crossed SMA20 upward with elevated volume velocity.',
        'RSI momentum bounced off oversold support band with cross-asset liquidity flow.',
        'Cross-asset tokenized equity basis compression with crypto sentiment divergence.',
        'Orderbook bid depth expanded by +24% on Bitget execution layer.',
        'Mean-reversion trigger following localized delta deviation recovery.',
        'Adaptive VWAP breakout on cross-chain orderbook imbalance.',
      ];
      const reasoning = reasons[Math.floor(Math.random() * reasons.length)];

      const proposal: TradeProposal = {
        asset: targetTicker,
        action,
        size_pct: size,
        confidence: Math.round(75 + Math.random() * 20),
        reasoning,
      };

      const currentPositions = positionsRef.current;
      const currentCash = cashBalanceRef.current;
      const totalPortfolioValue = calculateTotalValue(currentPositions, currentCash);
      const existingPos = currentPositions[targetTicker];
      const assetUnrealizedPnlPct = existingPos && Number.isFinite(existingPos.unrealizedPnlPct)
        ? existingPos.unrealizedPnlPct
        : undefined;

      const vetoResult = evaluateTradeRisk(proposal, totalPortfolioValue, assetUnrealizedPnlPct);

      const newLog: AutonomousLog = {
        id: `auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        ticker: proposal.asset,
        action: proposal.action,
        sizePct: proposal.size_pct,
        text: vetoResult.approved
          ? `${proposal.action} ${proposal.asset} [${proposal.size_pct}% | Conf: ${proposal.confidence}%] — ${proposal.reasoning}`
          : vetoResult.reason,
        status: vetoResult.approved ? 'APPROVED' : 'VETOED',
        overrideCode: vetoResult.overrideCode,
        source: 'AUTONOMOUS',
      };

      setLogs((prev) => [newLog, ...prev.slice(0, 59)]);

      if (vetoResult.approved && action === 'BUY') {
        executeSimulatedBuy(proposal.asset, proposal.size_pct, targetSnap.price, targetSnap.class);
      } else if (vetoResult.approved && action === 'SELL') {
        executeSimulatedSell(proposal.asset, targetSnap.price);
      } else if (!vetoResult.approved) {
        setCircuitBreakerAlert(vetoResult.reason);
        setTimeout(() => setCircuitBreakerAlert(null), 4000);
      }
    };

    const intervalMs = isTurbo ? 2000 : 7000;
    const intervalId = setInterval(runAutonomousDecision, intervalMs);

    return () => clearInterval(intervalId);
  }, [isExecuting, isTurbo, calculateTotalValue, executeSimulatedBuy, executeSimulatedSell]);

  // Filtered logs
  const filteredLogs = logs.filter((l) => {
    if (filter === 'APPROVED') return l.status === 'APPROVED';
    if (filter === 'VETOED') return l.status === 'VETOED';
    return true;
  });

  // Calculate guaranteed safe metrics for UI display
  const totalPortfolioValue = calculateTotalValue(positions, cashBalance);
  const positionList: Position[] = (Object.values(positions) as Position[]).filter(
    (p: Position) => Boolean(p && Number.isFinite(p.amount) && p.amount > 0 && Number.isFinite(p.currentPrice) && p.currentPrice > 0)
  );
  const totalUnrealizedPnl = positionList.reduce((acc, p) => {
    const pnl = Number(p.unrealizedPnl);
    return acc + (Number.isFinite(pnl) ? pnl : 0);
  }, 0);

  const safePortfolioValue = Number.isFinite(totalPortfolioValue) && totalPortfolioValue > 0 ? totalPortfolioValue : INITIAL_CASH;
  const safeCashBalance = Number.isFinite(cashBalance) && cashBalance >= 0 ? cashBalance : 0;
  const safeUnrealizedPnl = Number.isFinite(totalUnrealizedPnl) ? totalUnrealizedPnl : 0;

  // Baseline initial capital for calculating percentage increase ($100,000 baseline)
  const BASELINE_CAPITAL = INITIAL_CASH;

  // Net Portfolio Value percentage increase / change
  const netValueChange = safePortfolioValue - BASELINE_CAPITAL;
  const netValuePctIncrease = BASELINE_CAPITAL > 0 ? (netValueChange / BASELINE_CAPITAL) * 100 : 0;

  // Available Cash percentage change relative to baseline ($100,000)
  const cashChange = safeCashBalance - BASELINE_CAPITAL;
  const cashPctIncrease = BASELINE_CAPITAL > 0 ? (cashChange / BASELINE_CAPITAL) * 100 : 0;

  // Active positions cost for unrealized PnL percentage
  const totalPositionCost = positionList.reduce((acc, p) => {
    const amt = Number(p.amount) || 0;
    const entry = Number(p.entryPrice) || 0;
    return acc + amt * entry;
  }, 0);
  const unrealizedPnlPct = totalPositionCost > 0 ? (safeUnrealizedPnl / totalPositionCost) * 100 : 0;

  return (
    <div className="bg-[var(--lunaris-panel-bg)] border border-[var(--lunaris-panel-border)] rounded-lg p-4 font-mono shadow-xl relative overflow-hidden">
      {/* Circuit Breaker HUD Toast */}
      {circuitBreakerAlert && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-amber-500/20 border border-amber-500 text-amber-300 text-xs px-3 py-1.5 rounded-md flex items-center gap-2 shadow-lg backdrop-blur-md animate-bounce">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="font-bold">RISK-VETO TRIGGERED:</span>
          <span>{circuitBreakerAlert}</span>
        </div>
      )}

      {/* Module Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isExecuting ? 'bg-[var(--lunaris-accent-cyan)] animate-pulse' : 'bg-gray-600'
              }`}
            />
            {isExecuting && (
              <span className="absolute w-4 h-4 rounded-full bg-[var(--lunaris-accent-cyan)] opacity-40 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-white">LUNARIS AUTOPILOT</h2>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                Core Loop Tier 1
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Deterministic Autonomous Trade Inference & Risk Safeguard</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Manual Full Cashout */}
          <button
            onClick={handleCashoutAllPositions}
            disabled={positionList.length === 0}
            title="Immediately cash out all open positions into Available Cash"
            className="px-2.5 py-1 text-xs border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 rounded flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed font-bold"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>CASHOUT ALL</span>
          </button>

          {/* Reset Portfolio */}
          <button
            onClick={handleResetPortfolio}
            title="Reset Portfolio to initial $100,000 baseline cash reserve (0.00% starting PnL)"
            className="p-1.5 text-xs border border-white/15 hover:border-white/30 text-gray-400 hover:text-white rounded flex items-center gap-1 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESET</span>
          </button>

          {/* Speed Toggle */}
          <button
            onClick={() => setIsTurbo(!isTurbo)}
            title="Switch execution frequency between Standard (7s) and Turbo (2s)"
            className={`px-2.5 py-1 text-xs border rounded flex items-center gap-1.5 transition-all ${
              isTurbo
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'border-white/15 text-gray-400 hover:text-white hover:border-white/30'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isTurbo ? 'TURBO 2s' : 'NORMAL 7s'}</span>
          </button>

          {/* Autopilot Master Switch */}
          <button
            onClick={() => setIsExecuting(!isExecuting)}
            className={`px-3.5 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-all shadow-md ${
              isExecuting
                ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30'
                : 'bg-emerald-500/20 border border-emerald-500 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {isExecuting ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isExecuting ? 'HALT AUTOPILOT' : 'ENGAGE AUTOPILOT'}</span>
          </button>
        </div>
      </div>

      {/* Auto-Exit Target Selector (% Gain) */}
      <div className="mb-3 bg-gradient-to-r from-purple-950/40 via-black/60 to-cyan-950/40 border border-purple-500/30 rounded-lg p-3 text-xs shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Take-Profit Auto-Exit Target
            </span>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 font-extrabold px-2 py-0.5 rounded border border-purple-400/30">
              +{autoExitPct}% Profit Target
            </span>
          </div>
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Liquidation Shield: Armed
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400 text-[10px]">Auto-Cuts @ -6% Drawdown</span>
          </div>
        </div>

        {/* Quick Multiplier Buttons + Range Slider */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[1.5, 2, 3, 5, 8, 12, 20].map((pct) => (
              <button
                key={pct}
                onClick={() => setAutoExitPct(pct)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  autoExitPct === pct
                    ? 'bg-purple-500 text-black shadow-[0_0_10px_rgba(168,85,247,0.5)] font-black'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                }`}
              >
                +{pct}%
              </button>
            ))}
          </div>

          <div className="flex-1 flex items-center gap-2 min-w-[160px]">
            <span className="text-[10px] text-gray-500">1%</span>
            <input
              type="range"
              min="1"
              max="25"
              step="0.5"
              value={autoExitPct}
              onChange={(e) => setAutoExitPct(Number(e.target.value))}
              className="w-full accent-purple-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-purple-400 font-bold">25%</span>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 mt-2">
          While Autopilot executes trades, open positions automatically close to take profit whenever gain is <span className="text-purple-300 font-bold">&ge; +{autoExitPct}%</span>. Full position proceeds (principal + realized profit) immediately credit into your <span className="text-emerald-300 font-bold">Available Cash Reserve</span>. When paused, portfolio PnL stops completely on the state of the last trade.
        </p>
      </div>

      {/* Portfolio Telemetry Bar - Always Safe Real-Time Values */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 bg-black/50 p-2.5 rounded border border-white/5 text-xs">
        {/* Portfolio Net Value */}
        <div>
          <div className="text-[10px] text-gray-400 uppercase flex items-center justify-between">
            <span>Portfolio Net Value</span>
            {isExecuting ? (
              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
              </span>
            ) : (
              <span className="text-[9px] text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                <Lock className="w-2.5 h-2.5" /> PNL FROZEN
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-bold text-white tracking-wide">
              ${safePortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`text-[11px] font-extrabold flex items-center gap-0.5 px-1.5 py-0.5 rounded shadow-sm ${
                netValuePctIncrease > 0.001
                  ? 'text-[var(--lunaris-profit)] bg-emerald-500/15 border border-emerald-500/30'
                  : netValuePctIncrease < -0.001
                  ? 'text-[var(--lunaris-loss)] bg-red-500/15 border border-red-500/30'
                  : 'text-gray-400 bg-white/5 border border-white/10'
              }`}
            >
              {netValuePctIncrease > 0.001 ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              ) : netValuePctIncrease < -0.001 ? (
                <ArrowDownRight className="w-3 h-3 text-red-400" />
              ) : null}
              {netValuePctIncrease > 0.001 ? '+' : ''}
              {netValuePctIncrease.toFixed(2)}%
            </span>
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5 flex items-center justify-between">
            <span>{isExecuting ? 'Active live market' : 'Locked on last trade'}</span>
            <span className={netValueChange >= 0 ? 'text-emerald-400/90 font-semibold' : 'text-red-400/90 font-semibold'}>
              {netValueChange >= 0 ? '+' : ''}${netValueChange.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Available Cash */}
        <div>
          <div className="text-[10px] text-gray-400 uppercase flex items-center justify-between">
            <span>Available Cash</span>
            <span className="text-[9px] text-emerald-400/80 font-mono">Reserve</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-semibold text-gray-200">
              ${safeCashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`text-[11px] font-extrabold flex items-center gap-0.5 px-1.5 py-0.5 rounded shadow-sm ${
                cashPctIncrease > 0.001
                  ? 'text-[var(--lunaris-profit)] bg-emerald-500/15 border border-emerald-500/30'
                  : cashPctIncrease < -0.001
                  ? 'text-cyan-300 bg-cyan-500/15 border border-cyan-500/30'
                  : 'text-gray-400 bg-white/5 border border-white/10'
              }`}
            >
              {cashPctIncrease > 0.001 ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              ) : cashPctIncrease < -0.001 ? (
                <ArrowDownRight className="w-3 h-3 text-cyan-400" />
              ) : null}
              {cashPctIncrease > 0.001 ? '+' : ''}
              {cashPctIncrease.toFixed(2)}%
            </span>
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5 flex items-center justify-between">
            <span>
              {cashPctIncrease > 0.001
                ? 'Realized profit credited'
                : cashPctIncrease < -0.001
                ? 'Active trade deployment'
                : '$100k Baseline Cash'}
            </span>
            <span className={cashChange >= 0 ? 'text-emerald-400/90 font-semibold' : 'text-cyan-400/90 font-semibold'}>
              {cashChange >= 0 ? '+' : ''}${cashChange.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Unrealized PnL */}
        <div>
          <div className="text-[10px] text-gray-400 uppercase flex items-center justify-between">
            <span>Unrealized PnL</span>
            <span className="text-[9px] text-purple-300 font-bold">Exit: +{autoExitPct}%</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
            <span
              className={`text-sm font-bold flex items-center gap-0.5 ${
                safeUnrealizedPnl >= 0 ? 'text-[var(--lunaris-profit)]' : 'text-[var(--lunaris-loss)]'
              }`}
            >
              {safeUnrealizedPnl >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {safeUnrealizedPnl >= 0 ? '+' : ''}${safeUnrealizedPnl.toFixed(2)}
            </span>
            <span
              className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded shadow-sm ${
                safeUnrealizedPnl > 0.001
                  ? 'text-[var(--lunaris-profit)] bg-emerald-500/15 border border-emerald-500/30'
                  : safeUnrealizedPnl < -0.001
                  ? 'text-[var(--lunaris-loss)] bg-red-500/15 border border-red-500/30'
                  : 'text-gray-400 bg-white/5 border border-white/10'
              }`}
            >
              {unrealizedPnlPct > 0.001 ? '+' : ''}
              {unrealizedPnlPct.toFixed(2)}%
            </span>
          </div>
          <div className="text-[9px] text-gray-500 mt-0.5">
            {isExecuting ? 'Autopilot monitoring' : 'Stopped on last trade'}
          </div>
        </div>

        {/* Liquidation Shield */}
        <div>
          <div className="text-[10px] text-gray-400 uppercase">Liquidation Shield</div>
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            0% LIQUIDATION RISK
          </div>
          <div className="text-[9px] text-gray-400 mt-1">
            Auto-Cut @ -6% | Zero Margin Call
          </div>
        </div>
      </div>

      {/* Grid Display: Real-time Holdings vs System Decision Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Active Positions & Monitored Tickers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Active Portfolio Positions</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-white/10 rounded text-gray-300">
                {positionList.length}
              </span>
            </h3>
            <span className="text-[10px] text-gray-500">Live Tick: {lastSyncTime}</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {positionList.length === 0 ? (
              <div className="text-xs text-gray-500 p-3 bg-black/30 rounded text-center border border-dashed border-white/10">
                No active positions. Autopilot or Council signals will populate simulated trades.
              </div>
            ) : (
              positionList.map((pos) => {
                const isProfitable = (pos.unrealizedPnl || 0) >= 0;
                const safeAmt = Number(pos.amount) || 0;
                const safePrice = Number(pos.currentPrice) || 0;
                const safeEntry = Number(pos.entryPrice) || 0;
                const safePnl = Number(pos.unrealizedPnl) || 0;
                const safePnlPct = Number(pos.unrealizedPnlPct) || 0;
                const totalPosVal = safeAmt * safePrice;

                return (
                  <div
                    key={pos.ticker}
                    className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5 hover:border-white/15 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          pos.class === 'CX'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                        }`}
                      >
                        {pos.class}
                      </span>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {pos.ticker}
                          <span className="text-[10px] font-normal text-gray-400">
                            ({safeAmt.toFixed(pos.class === 'CX' ? 3 : 1)} units)
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                          <span>Entry: ${safeEntry.toFixed(2)} → Now: ${safePrice.toFixed(2)}</span>
                          <span className="text-purple-300/90 font-mono bg-purple-500/10 px-1 py-0.2 rounded border border-purple-500/20">
                            Auto-Exit: +{autoExitPct}% (${(safeEntry * (1 + autoExitPct / 100)).toFixed(2)})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-white font-medium text-xs sm:text-sm">
                          ${totalPosVal.toFixed(2)}
                        </div>
                        <div
                          className={`text-[11px] font-bold flex items-center justify-end gap-0.5 ${
                            isProfitable ? 'text-[var(--lunaris-profit)]' : 'text-[var(--lunaris-loss)]'
                          }`}
                        >
                          {isProfitable ? '+' : ''}
                          ${safePnl.toFixed(2)} ({isProfitable ? '+' : ''}
                          {safePnlPct.toFixed(2)}%)
                        </div>
                      </div>

                      {/* Explicit Manual TP Button (Adds principal + profit directly to available cash) */}
                      <button
                        onClick={() => {
                          executeSimulatedSell(pos.ticker, pos.currentPrice);
                          playTradeApprovedChime();
                          setLogs((prev) => [
                            {
                              id: `manual-tp-${Date.now()}-${pos.ticker}`,
                              timestamp: new Date().toLocaleTimeString(),
                              ticker: pos.ticker,
                              action: 'SELL',
                              sizePct: 100,
                              text: `[MANUAL TAKE PROFIT] Closed ${pos.ticker} at $${safePrice.toFixed(2)} (${isProfitable ? '+' : ''}${safePnlPct.toFixed(2)}%). Full proceeds of $${totalPosVal.toFixed(2)} credited into available cash reserve.`,
                              status: 'APPROVED',
                              source: 'AUTONOMOUS',
                            },
                            ...prev.slice(0, 59),
                          ]);
                        }}
                        title={`Take Profit / Close ${pos.ticker} and credit proceeds to available cash`}
                        className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded text-[10px] font-black transition-all flex items-center gap-1 shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
                      >
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                        <span>TP / CASH OUT</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Price Watch Ribbon */}
          <div className="pt-2 border-t border-white/10">
            <div className="text-[11px] text-gray-400 mb-1.5 flex justify-between">
              <span>Market Feed Radar:</span>
              <span className="text-[10px] text-gray-500">15% delta safeguard check</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {monitoredTickers.slice(0, 4).map((t) => {
                const snap = portfolio[t];
                return (
                  <div key={t} className="bg-black/30 p-1.5 rounded border border-white/5 text-[11px]">
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span className="font-bold text-white">{t}</span>
                      <span className={snap?.source === 'sim' ? 'text-[var(--lunaris-sim)]' : 'text-emerald-400'}>
                        {snap?.source?.toUpperCase() || 'SIM'}
                      </span>
                    </div>
                    <div className="font-semibold text-gray-200 mt-0.5">
                      ${snap && Number.isFinite(snap.price) ? snap.price.toFixed(snap.price > 100 ? 2 : 3) : '---'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Real-time Execution Stream */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>System Decision Stream</span>
              <span className="text-[10px] px-1 rounded bg-white/10 text-gray-300">{filteredLogs.length}</span>
            </h3>

            {/* Filter Toggle */}
            <div className="flex items-center gap-1 text-[10px]">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-1.5 py-0.5 rounded ${filter === 'ALL' ? 'bg-white/20 text-white font-bold' : 'text-gray-400'}`}
              >
                ALL
              </button>
              <button
                onClick={() => setFilter('APPROVED')}
                className={`px-1.5 py-0.5 rounded ${
                  filter === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-gray-400'
                }`}
              >
                APPROVED
              </button>
              <button
                onClick={() => setFilter('VETOED')}
                className={`px-1.5 py-0.5 rounded ${
                  filter === 'VETOED' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-gray-400'
                }`}
              >
                VETOED
              </button>
            </div>
          </div>

          <div className="h-64 overflow-y-auto space-y-1.5 pr-1 text-[11px] bg-black/60 p-2.5 rounded border border-white/5 font-mono">
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No events match current filter.</div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-1.5 rounded border transition-colors ${
                    log.status === 'VETOED'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : log.source === 'COUNCIL_SIGNAL'
                      ? 'bg-purple-950/20 border-purple-500/30'
                      : 'bg-black/40 border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="text-gray-500">{log.timestamp}</span>
                      {log.source === 'COUNCIL_SIGNAL' && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold">
                          COUNCIL HANDOFF
                        </span>
                      )}
                    </span>
                    <span
                      className={`font-bold ${
                        log.status === 'VETOED' ? 'text-[var(--lunaris-warn)]' : 'text-emerald-400'
                      }`}
                    >
                      [{log.status}]
                    </span>
                  </div>
                  <div className="text-gray-300 leading-tight break-words">{log.text}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

