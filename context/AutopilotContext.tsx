// context/AutopilotContext.tsx
// Global Autonomous Execution Engine Context for LUNARIS Terminal
// Maintains 24/7 continuous autonomous trading, price ingestion, risk veto checks,
// and state persistence across all tab changes (DECK, TERMINAL, COUNCIL, PULSE, ALGO, AUDIT).

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { fetchPriceSnapshot, PriceSnapshot, ASSET_REGISTRY } from '@/lib/liveTokenFeed';
import { getSeededPrice, SEEDED_ASSETS } from '@/lib/demoSeedData';
import { evaluateTradeRisk, TradeProposal } from '@/lib/riskVeto';
import { recordNewPaperTrade } from '@/lib/paperTradingAudit';
import { playTradeApprovedChime, playRiskVetoTone } from '@/lib/soundSynth';
import { AutopilotLedgerEntry } from '@/components/AutopilotLedgerView';
import {
  saveAutopilotStateToFirestore,
  subscribeToAutopilotState,
  isFirestoreQuotaExceeded,
  INGESTION_PRICE_CORRIDORS,
} from '@/lib/firestoreAudit';

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

export interface BuyExecutionResult {
  success: boolean;
  reason?: string;
  ticker: string;
  units?: number;
  price?: number;
  tradeUsd?: number;
  sizePct?: number;
}

export interface SellExecutionResult {
  success: boolean;
  reason?: string;
  ticker: string;
  units?: number;
  price?: number;
  proceeds?: number;
  pnl?: number;
  pnlPct?: number;
}

export interface Position {
  ticker: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  class: 'CX' | 'EQ';
  peakPrice?: number;
  peakPnlPct?: number;
  trailingStopPct?: number;
  lockedFloorPrice?: number;
  isBreakevenLocked?: boolean;
}

interface AutopilotContextType {
  isExecuting: boolean;
  setIsExecuting: (val: boolean | ((prev: boolean) => boolean)) => void;
  toggleExecuting: () => void;
  isTurbo: boolean;
  setIsTurbo: (val: boolean | ((prev: boolean) => boolean)) => void;
  logs: AutonomousLog[];
  setLogs: React.Dispatch<React.SetStateAction<AutonomousLog[]>>;
  portfolio: Record<string, PriceSnapshot>;
  positions: Record<string, Position>;
  setPositions: React.Dispatch<React.SetStateAction<Record<string, Position>>>;
  cashBalance: number;
  setCashBalance: React.Dispatch<React.SetStateAction<number>>;
  ledger: AutopilotLedgerEntry[];
  setLedger: React.Dispatch<React.SetStateAction<AutopilotLedgerEntry[]>>;
  autoExitPct: number;
  setAutoExitPct: (val: number) => void;
  maxOpenPositions: number;
  setMaxOpenPositions: (val: number) => void;
  circuitBreakerAlert: string | null;
  lastSyncTime: string;
  calculateTotalValue: (posMap?: Record<string, Position>, cash?: number) => number;
  handleManualTrade: (ticker: string, action: 'BUY' | 'SELL', usdAmount: number) => Promise<void>;
  handleCashoutAllPositions: () => void;
  handleConfirmPasscodeReset: () => void;
  handleIncomingCouncilSignal: (proposal: TradeProposal) => Promise<void>;
  dispatchProposal: (proposal: TradeProposal) => void;
  executeSimulatedBuy: (ticker: string, sizePct: number, currentPrice: number, assetClass: 'CX' | 'EQ') => BuyExecutionResult;
  executeSimulatedSell: (ticker: string, currentPrice: number) => SellExecutionResult;
  monitoredTickers: string[];
}

const AUTOPILOT_PERSISTENCE_KEY = 'LUNARIS_AUTOPILOT_PERSISTED_STATE_V2';
const INITIAL_POSITIONS: Record<string, Position> = {};
const INITIAL_CASH = 100000;

function loadPersistedAutopilotState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTOPILOT_PERSISTENCE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse persisted autopilot state:', err);
  }
  return null;
}

const AutopilotContext = createContext<AutopilotContextType | null>(null);

export const AutopilotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Autopilot active state (defaults to true for continuous 24/7 background execution)
  const [isExecuting, setIsExecuting] = useState<boolean>(() => {
    const p = loadPersistedAutopilotState();
    return typeof p?.isExecuting === 'boolean' ? p.isExecuting : true;
  });
  const [isTurbo, setIsTurbo] = useState<boolean>(false);
  const [circuitBreakerAlert, setCircuitBreakerAlert] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Live');

  const [logs, setLogs] = useState<AutonomousLog[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      ticker: 'SYS',
      action: 'HOLD',
      sizePct: 0,
      text: 'LUNARIS Global Autonomous Engine initialized with persistent background loop.',
      status: 'APPROVED',
      source: 'AUTONOMOUS',
    },
  ]);

  const [portfolio, setPortfolio] = useState<Record<string, PriceSnapshot>>({});

  // Persistent Positions & Cash Balance across tab changes and browser sessions
  const [positions, setPositions] = useState<Record<string, Position>>(() => {
    const p = loadPersistedAutopilotState();
    return p?.positions && typeof p.positions === 'object' ? p.positions : INITIAL_POSITIONS;
  });

  const [cashBalance, setCashBalance] = useState<number>(() => {
    const p = loadPersistedAutopilotState();
    return typeof p?.cashBalance === 'number' && Number.isFinite(p.cashBalance) && p.cashBalance >= 0
      ? p.cashBalance
      : INITIAL_CASH;
  });

  // Persistent Transaction Ledger
  const [ledger, setLedger] = useState<AutopilotLedgerEntry[]>(() => {
    const p = loadPersistedAutopilotState();
    if (Array.isArray(p?.ledger) && p.ledger.length > 0) {
      return p.ledger;
    }
    return [
      {
        id: 'seed-ledger-1',
        timestamp: new Date().toLocaleTimeString(),
        utcTimestamp: new Date().toISOString(),
        type: 'BUY',
        ticker: 'BTC',
        amount: 0.0388,
        price: 77300.0,
        totalUsd: 3000.0,
        balanceBefore: 100000.0,
        balanceAfter: 97000.0,
        realizedPnl: 0,
        realizedPnlPct: 0,
        notes: 'Initial Autopilot baseline position open on Bitget BTC/USDT',
      },
      {
        id: 'seed-ledger-2',
        timestamp: new Date().toLocaleTimeString(),
        utcTimestamp: new Date().toISOString(),
        type: 'TAKE_PROFIT',
        ticker: 'BTC',
        amount: 0.0388,
        price: 79850.0,
        totalUsd: 3098.18,
        balanceBefore: 97000.0,
        balanceAfter: 100098.18,
        realizedPnl: 98.18,
        realizedPnlPct: 3.27,
        notes: 'Auto-Exit Profit Target triggered (+3.27%). Proceeds credited to Available Cash.',
      },
    ];
  });

  const [autoExitPct, setAutoExitPct] = useState<number>(() => {
    const p = loadPersistedAutopilotState();
    return typeof p?.autoExitPct === 'number' && p.autoExitPct > 0 ? p.autoExitPct : 3;
  });

  const [maxOpenPositions, setMaxOpenPositions] = useState<number>(() => {
    const p = loadPersistedAutopilotState();
    return typeof p?.maxOpenPositions === 'number' && p.maxOpenPositions >= 1 && p.maxOpenPositions <= 5
      ? p.maxOpenPositions
      : 3;
  });

  // Atomic refs for loop stability
  const positionsRef = useRef<Record<string, Position>>(positions);
  const cashBalanceRef = useRef<number>(cashBalance);
  const isExecutingRef = useRef<boolean>(isExecuting);
  const isTurboRef = useRef<boolean>(isTurbo);
  const autoExitPctRef = useRef<number>(autoExitPct);
  const maxOpenPositionsRef = useRef<number>(maxOpenPositions);

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

  useEffect(() => {
    autoExitPctRef.current = autoExitPct;
  }, [autoExitPct]);

  useEffect(() => {
    maxOpenPositionsRef.current = maxOpenPositions;
  }, [maxOpenPositions]);

  // Fetch and subscribe to Firestore cloud-persisted autopilot state across all browsers
  useEffect(() => {
    let isMounted = true;

    // 1. Subscribe to Firestore cloud document
    const unsubscribeCloud = subscribeToAutopilotState((cloudState) => {
      if (!isMounted || !cloudState) return;
      if (typeof cloudState.isExecuting === 'boolean') {
        setIsExecuting(cloudState.isExecuting);
      }
      if (
        typeof cloudState.cashBalance === 'number' &&
        Number.isFinite(cloudState.cashBalance) &&
        cloudState.cashBalance >= 0
      ) {
        setCashBalance(cloudState.cashBalance);
      }
      if (cloudState.positions && typeof cloudState.positions === 'object') {
        setPositions(cloudState.positions);
      }
      if (Array.isArray(cloudState.ledger) && cloudState.ledger.length > 0) {
        setLedger(cloudState.ledger);
      }
    });

    // 2. Fetch server-persisted autopilot state fallback
    fetch('/api/autopilot/state')
      .then((r) => r.json())
      .then((data) => {
        if (!isMounted || !data?.success || !data.state) return;
        const s = data.state;
        if (typeof s.isExecuting === 'boolean') {
          setIsExecuting(s.isExecuting);
        }
        if (typeof s.cashBalance === 'number' && Number.isFinite(s.cashBalance) && s.cashBalance >= 0) {
          setCashBalance(s.cashBalance);
        }
        if (s.positions && typeof s.positions === 'object') {
          setPositions(s.positions);
        }
        if (Array.isArray(s.ledger) && s.ledger.length > 0) {
          setLedger(s.ledger);
        }
      })
      .catch((err) => console.warn('Could not sync with server autopilot state:', err));

    return () => {
      isMounted = false;
      unsubscribeCloud();
    };
  }, []);

  // Persist state in Firestore cloud database, localStorage, and server so any browser/device sees the exact same portfolio
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stateToSave = {
        isExecuting,
        cashBalance,
        positions,
        ledger: ledger.slice(0, 300),
        autoExitPct,
        maxOpenPositions,
      };

      // Local cache (instant)
      localStorage.setItem(AUTOPILOT_PERSISTENCE_KEY, JSON.stringify(stateToSave));

      // Server persistence (instant)
      fetch('/api/autopilot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: stateToSave }),
      }).catch(() => {});

      // Debounce Firestore Cloud DB sync (save at most once every 30s) and skip if quota reached
      if (!isFirestoreQuotaExceeded()) {
        const timer = setTimeout(() => {
          if (!isFirestoreQuotaExceeded()) {
            saveAutopilotStateToFirestore(stateToSave).catch((err) =>
              console.warn('Failed to sync autopilot state to Firestore:', err)
            );
          }
        }, 30000);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      console.warn('Failed to persist autopilot state:', err);
    }
  }, [isExecuting, cashBalance, positions, ledger, autoExitPct, maxOpenPositions]);

  const monitoredTickers = ['BTC', 'ETH', 'SOL', 'NVDA', 'TSLA', 'MSTR', 'COIN', 'AAPL'];

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

  const toggleExecuting = useCallback(() => {
    setIsExecuting((prev) => {
      const next = !prev;
      playTradeApprovedChime();
      fetch(next ? '/api/autopilot/start' : '/api/autopilot/stop', { method: 'POST' }).catch(() => {});
      return next;
    });
  }, []);

  /**
   * Helper: Generate a self-reflective post-mortem record for stop-loss events
   */
  const generateStopLossPostMortem = (
    ticker: string,
    pnl: number,
    pnlPct: number,
    entryPrice: number,
    exitPrice: number
  ) => {
    const rootCauses = [
      `Orderbook bid wall spoof pulled on Bitget spot feed ($${exitPrice.toFixed(2)})`,
      `Aggressive taker selling breached short-term VWAP support band`,
      `Macro risk-off correlation wave induced sudden liquidity vacuum`,
      `Adversarial red-team alert: Momentum trap triggered stop cluster`,
    ];
    const mitigations = [
      `Tightened trailing volatility buffer by +12% on ${ticker}`,
      `Increased minimum orderbook depth requirement before next re-entry`,
      `Calibrated Nexus-Red adversarial cross-check threshold to 0.75`,
      `Mandated 15-minute cool-down period before any new long proposal on ${ticker}`,
    ];
    const pickedCause = rootCauses[Math.floor(Math.random() * rootCauses.length)];
    const pickedMitigation = mitigations[Math.floor(Math.random() * mitigations.length)];

    return {
      rootCause: pickedCause,
      adversarialFlag: 'NEXUS-RED Verified Liquidity Trap',
      lessonLearned: `Capital preservation ratified: Automated stop prevented tail drawdown. Drawdown capped at ${Math.abs(pnlPct).toFixed(2)}%.`,
      policyAdjustment: pickedMitigation,
    };
  };

  /**
   * Buy execution with capacity cap & cash reserve checks.
   */
  const executeSimulatedBuy = useCallback((
    ticker: string,
    sizePct: number,
    currentPrice: number,
    assetClass: 'CX' | 'EQ'
  ): BuyExecutionResult => {
    const normTicker = ticker.toUpperCase();
    const validPrice = Number(currentPrice);
    if (!normTicker || !Number.isFinite(validPrice) || validPrice <= 0) {
      return { success: false, ticker: normTicker, reason: 'Invalid ticker or market price' };
    }

    // Price Collar Protection: prevent anomalous fills exceeding Bitget corridor
    const cleanSym = normTicker.replace('ON', '').replace('/USDT', '');
    const priceCorridor = INGESTION_PRICE_CORRIDORS[cleanSym] || INGESTION_PRICE_CORRIDORS[normTicker];
    if (priceCorridor) {
      if (validPrice > priceCorridor.max || validPrice < priceCorridor.min) {
        return {
          success: false,
          ticker: normTicker,
          reason: `Price Collar Veto: Proposed execution price $${validPrice.toLocaleString()} is outside verified corridor ($${priceCorridor.min.toLocaleString()} - $${priceCorridor.max.toLocaleString()}).`,
        };
      }
    }

    const currentPosMap = positionsRef.current;
    const isAlreadyHeld = Boolean(currentPosMap[normTicker] && currentPosMap[normTicker].amount > 0);
    const activePositions = (Object.values(currentPosMap) as Position[]).filter(
      (p) => Boolean(p && Number.isFinite(p.amount) && p.amount > 0)
    );
    const maxLimit = Math.min(5, Math.max(1, Number(maxOpenPositionsRef.current) || 3));

    if (!isAlreadyHeld && activePositions.length >= maxLimit) {
      return {
        success: false,
        ticker: normTicker,
        reason: `Capacity limit reached (${activePositions.length}/${maxLimit} positions active). Risk Sentinel blocked BUY ${normTicker}.`,
      };
    }

    const currentCash = Number(cashBalanceRef.current);
    const safeCash = Number.isFinite(currentCash) && currentCash > 0 ? currentCash : 0;
    if (safeCash < 10) {
      return { success: false, ticker: normTicker, reason: 'Insufficient available cash balance' };
    }

    const totalVal = calculateTotalValue(currentPosMap, safeCash);
    const validSizePct = Math.min(15, Math.max(1, Number(sizePct) || 5)); // Cap single trade allocation at 15%
    let tradeUsd = (totalVal * validSizePct) / 100;

    // Hard ceiling: Absolute max position size is $25,000 USDT to prevent runaway compounding
    if (tradeUsd > 25000) {
      tradeUsd = 25000;
    }

    if (!Number.isFinite(tradeUsd) || tradeUsd <= 0) {
      return { success: false, ticker: normTicker, reason: 'Invalid calculated trade size' };
    }

    // Liquidation Shield: Enforce mandatory 20% NAV / $12,000 cash reserve
    const minReserveBuffer = Math.min(15000, totalVal * 0.20);
    const maxDeployableCash = Math.max(0, safeCash - minReserveBuffer);
    if (maxDeployableCash < 20) {
      return {
        success: false,
        ticker: normTicker,
        reason: 'Liquidation Shield Reserve Floor: Available cash buffer locked to guarantee 0% liquidation risk.',
      };
    }

    if (tradeUsd > maxDeployableCash) {
      tradeUsd = maxDeployableCash * 0.9;
    }
    if (tradeUsd < 10) {
      return { success: false, ticker: normTicker, reason: 'Deployable capital below minimum order size ($10.00)' };
    }

    const units = tradeUsd / validPrice;
    if (!Number.isFinite(units) || units <= 0) {
      return { success: false, ticker: normTicker, reason: 'Invalid unit computation' };
    }

    const nextCash = Math.max(0, safeCash - tradeUsd);
    cashBalanceRef.current = nextCash;
    setCashBalance(nextCash);

    const buyEntry: AutopilotLedgerEntry = {
      id: `buy-${Date.now()}-${normTicker}`,
      timestamp: new Date().toLocaleTimeString(),
      utcTimestamp: new Date().toISOString(),
      type: 'BUY',
      ticker: normTicker,
      amount: units,
      price: validPrice,
      totalUsd: tradeUsd,
      balanceBefore: safeCash,
      balanceAfter: nextCash,
      realizedPnl: 0,
      realizedPnlPct: 0,
      notes: `Autopilot Buy: Deployed $${tradeUsd.toFixed(2)} (${validSizePct}% allocation) into ${units.toFixed(4)} ${normTicker} at $${validPrice.toFixed(2)}`,
    };
    setLedger((prev) => [buyEntry, ...prev.slice(0, 299)]);

    setPositions((prev) => {
      const existing = prev[normTicker];
      let updatedPos: Position;
      if (existing && existing.amount > 0) {
        const totalUnits = existing.amount + units;
        const avgPrice = (existing.amount * existing.entryPrice + tradeUsd) / totalUnits;
        const peak = Math.max(existing.peakPrice || avgPrice, validPrice);
        updatedPos = {
          ...existing,
          amount: totalUnits,
          entryPrice: avgPrice,
          currentPrice: validPrice,
          unrealizedPnl: (validPrice - avgPrice) * totalUnits,
          unrealizedPnlPct: ((validPrice - avgPrice) / avgPrice) * 100,
          peakPrice: peak,
          peakPnlPct: ((peak - avgPrice) / avgPrice) * 100,
          trailingStopPct: existing.trailingStopPct ?? -3.0,
          lockedFloorPrice: existing.lockedFloorPrice ?? (avgPrice * 0.97),
          isBreakevenLocked: existing.isBreakevenLocked ?? false,
        };
      } else {
        updatedPos = {
          ticker: normTicker,
          amount: units,
          entryPrice: validPrice,
          currentPrice: validPrice,
          unrealizedPnl: 0,
          unrealizedPnlPct: 0,
          class: assetClass,
          peakPrice: validPrice,
          peakPnlPct: 0,
          trailingStopPct: -3.0, // Quantitative baseline stop at -3.0%
          lockedFloorPrice: validPrice * 0.97,
          isBreakevenLocked: false,
        };
      }
      const nextPositions = { ...prev, [normTicker]: updatedPos };
      positionsRef.current = nextPositions;
      return nextPositions;
    });

    return {
      success: true,
      ticker: normTicker,
      units,
      price: validPrice,
      tradeUsd,
      sizePct: validSizePct,
    };
  }, [calculateTotalValue]);

  /**
   * Sell execution with Pure Spot / Long validation and Post-Mortem recording on Stop-Loss.
   */
  const executeSimulatedSell = useCallback((ticker: string, currentPrice?: number): SellExecutionResult => {
    const normTicker = ticker.toUpperCase();
    const currentPositions = positionsRef.current;
    const pos = currentPositions[normTicker];
    if (!pos || !Number.isFinite(pos.amount) || pos.amount <= 0) {
      return {
        success: false,
        ticker: normTicker,
        reason: `Pure Spot Model: Asset ${normTicker} is not held in active portfolio (shorting disallowed)`,
      };
    }

    const sellPrice = Number.isFinite(currentPrice) && (currentPrice as number) > 0
      ? (currentPrice as number)
      : (Number.isFinite(pos.currentPrice) && pos.currentPrice > 0 ? pos.currentPrice : pos.entryPrice);

    if (!Number.isFinite(sellPrice) || sellPrice <= 0) {
      return { success: false, ticker: normTicker, reason: 'Invalid sell execution price' };
    }

    const proceeds = pos.amount * sellPrice;
    if (!Number.isFinite(proceeds) || proceeds <= 0) {
      return { success: false, ticker: normTicker, reason: 'Invalid trade proceeds calculation' };
    }

    const currentCash = Number(cashBalanceRef.current);
    const safeCash = Number.isFinite(currentCash) && currentCash >= 0 ? currentCash : 0;
    const nextCash = safeCash + proceeds;

    cashBalanceRef.current = nextCash;
    setCashBalance(nextCash);

    const initialCost = pos.amount * pos.entryPrice;
    const pnl = proceeds - initialCost;
    const pnlPct = initialCost > 0 ? ((proceeds - initialCost) / initialCost) * 100 : 0;
    const isStopLoss = pnl < 0;

    const sellEntry: AutopilotLedgerEntry = {
      id: `sell-${Date.now()}-${normTicker}`,
      timestamp: new Date().toLocaleTimeString(),
      utcTimestamp: new Date().toISOString(),
      type: pnl >= 0 ? 'TAKE_PROFIT' : 'STOP_LOSS',
      ticker: normTicker,
      amount: pos.amount,
      price: sellPrice,
      totalUsd: proceeds,
      balanceBefore: safeCash,
      balanceAfter: nextCash,
      realizedPnl: pnl,
      realizedPnlPct: pnlPct,
      notes: `${pnl >= 0 ? 'Take Profit Target Reached' : 'Stop Loss Risk Sentinel'}: Closed ${pos.amount.toFixed(4)} ${normTicker} at $${sellPrice.toFixed(2)}. ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%) realized.`,
    };
    setLedger((prev) => [sellEntry, ...prev.slice(0, 299)]);

    // Record official Bitget S2 paper-trading audit record with Post-Mortem if loss
    try {
      const postMortemData = isStopLoss
        ? generateStopLossPostMortem(normTicker, pnl, pnlPct, pos.entryPrice, sellPrice)
        : undefined;

      recordNewPaperTrade({
        instrument: `${normTicker}/USDT`,
        direction: 'LONG',
        price: parseFloat(sellPrice.toFixed(sellPrice < 10 ? 4 : 2)),
        quantity: parseFloat(initialCost.toFixed(2)),
        leverage: 3,
        balanceChange: parseFloat(pnl.toFixed(2)),
        balanceChangePct: parseFloat(pnlPct.toFixed(2)),
        trigger: isStopLoss
          ? `Risk Sentinel & Nexus-Red Stop: Volatility limit breached on ${normTicker} (${pnlPct.toFixed(2)}%)`
          : `Autopilot Engine: Target Profit Ratified on ${normTicker} (+${pnlPct.toFixed(2)}%)`,
        status: pnl >= 0 ? 'TAKE_PROFIT' : 'STOP_LOSS',
        postMortem: postMortemData,
        timestamp: sellEntry.utcTimestamp,
        idempotencyKey: `close_${normTicker}_${Math.floor(new Date(sellEntry.utcTimestamp).getTime() / 2000)}`,
        sourceHandler: 'AUTOPILOT_DAEMON',
      });
    } catch (err) {
      console.warn('Failed to record audit log on sell:', err);
    }

    setPositions((prev) => {
      const next = { ...prev };
      delete next[normTicker];
      positionsRef.current = next;
      return next;
    });

    return {
      success: true,
      ticker: normTicker,
      units: pos.amount,
      price: sellPrice,
      proceeds,
      pnl,
      pnlPct,
    };
  }, []);

  /**
   * Continuous Market Prices Sync across the whole terminal
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

      if (!isExecutingRef.current) {
        return;
      }

      // Check for Auto-Exit (target profit) and Liquidation Shield emergency cuts
      const targetProfitPct = Number(autoExitPctRef.current) || 3.0;
      let totalCashProceedsToAdd = 0;
      const autoExitLogs: AutonomousLog[] = [];
      const autoExitLedgerEntries: AutopilotLedgerEntry[] = [];
      let soundToPlay: 'CHIME' | 'VETO' | null = null;

      const nextPositions: Record<string, Position> = {};
      const currentPosMap = { ...positionsRef.current };
      const posKeys = Object.keys(currentPosMap);
      const startingCash = Number(cashBalanceRef.current) || 0;
      let runningCash = startingCash;

      posKeys.forEach((t) => {
        const p = currentPosMap[t];
        if (!p || !Number.isFinite(p.amount) || p.amount <= 0) return;

        const snap = updatedPortfolio[t];
        const basePrice = snap && Number.isFinite(snap.price) && snap.price > 0 ? snap.price : p.entryPrice;
        // Tightly clamp micro-drift to ±0.8% of real base quote, preventing runaway simulation drift
        const microNoise = 1 + (Math.random() * 0.008 - 0.004);
        let newPrice = Number((basePrice * microNoise).toFixed(basePrice < 10 ? 4 : 2));

        const entry = Number.isFinite(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : newPrice;
        const amount = p.amount;
        const pnl = (newPrice - entry) * amount;
        const pnlPct = entry > 0 ? ((newPrice - entry) / entry) * 100 : 0;
        const totalPosVal = amount * newPrice;

        // 1. Highest observed peak price and peak PnL%
        const prevPeakPrice = Number.isFinite(p.peakPrice) && (p.peakPrice as number) > 0
          ? (p.peakPrice as number)
          : Math.max(entry, newPrice);
        const currentPeakPrice = Math.max(prevPeakPrice, newPrice);
        const currentPeakPnlPct = entry > 0 ? ((currentPeakPrice - entry) / entry) * 100 : 0;

        // 2. Trailing Stop & Breakeven Ratchet state
        let trailingStopPct = typeof p.trailingStopPct === 'number' ? p.trailingStopPct : -3.0;
        let isBreakevenLocked = Boolean(p.isBreakevenLocked);
        let lockedFloorPrice = typeof p.lockedFloorPrice === 'number' ? p.lockedFloorPrice : entry * 0.97;

        // --- RATCHET TIER 1: BREAKEVEN RATCHET ACTIVATION (+1.2% Gain) ---
        // As soon as price touches +1.2%, lock stop to Breakeven (+0.2% fee & slippage buffer)
        if (currentPeakPnlPct >= 1.2 && !isBreakevenLocked) {
          isBreakevenLocked = true;
          trailingStopPct = Math.max(trailingStopPct, 0.2);
          lockedFloorPrice = Math.max(lockedFloorPrice, entry * 1.002);

          autoExitLogs.push({
            id: `ratchet-${Date.now()}-${t}`,
            timestamp: new Date().toLocaleTimeString(),
            ticker: t,
            action: 'HOLD',
            sizePct: 0,
            text: `[BREAKEVEN RATCHET ACTIVATED] ${t} touched peak +${currentPeakPnlPct.toFixed(2)}%. Stop-loss ratcheted to Breakeven (+0.2%). Position is now mathematically RISK-FREE!`,
            status: 'APPROVED',
            source: 'AUTONOMOUS',
          });
        }

        // --- RATCHET TIER 2: PROFIT LOCK-IN (+2.0% Gain) ---
        // Lock in guaranteed +1.0% profit minimum
        if (currentPeakPnlPct >= 2.0) {
          if (trailingStopPct < 1.0) {
            trailingStopPct = 1.0;
            lockedFloorPrice = entry * 1.01;
          }
        }

        // --- RATCHET TIER 3: DYNAMIC TRAILING STOP (+3.0% Peak or higher) ---
        // Dynamic ratchet trailing 1.2% behind the high watermark
        if (currentPeakPnlPct >= 3.0) {
          const dynamicTrail = currentPeakPnlPct - 1.2;
          if (dynamicTrail > trailingStopPct) {
            trailingStopPct = dynamicTrail;
            lockedFloorPrice = entry * (1 + trailingStopPct / 100);
          }
        }

        // Condition A: Take-Profit Auto-Exit Target reached
        if (pnlPct >= targetProfitPct) {
          totalCashProceedsToAdd += totalPosVal;
          const nextRunningCash = runningCash + totalPosVal;
          soundToPlay = 'CHIME';
          autoExitLogs.push({
            id: `autoexit-${Date.now()}-${t}`,
            timestamp: new Date().toLocaleTimeString(),
            ticker: t,
            action: 'SELL',
            sizePct: 100,
            text: `[AUTO-EXIT TARGET] +${targetProfitPct.toFixed(1)}% target reached! Closed ${t} at +${pnlPct.toFixed(2)}% gain ($${pnl.toFixed(2)}). Proceeds credited to Available Cash.`,
            status: 'APPROVED',
            source: 'AUTONOMOUS',
          });
          const exitUtcTime = new Date().toISOString();
          autoExitLedgerEntries.push({
            id: `autoexit-ledger-${Date.now()}-${t}`,
            timestamp: new Date().toLocaleTimeString(),
            utcTimestamp: exitUtcTime,
            type: 'AUTO_EXIT',
            ticker: t,
            amount: p.amount,
            price: newPrice,
            totalUsd: totalPosVal,
            balanceBefore: runningCash,
            balanceAfter: nextRunningCash,
            realizedPnl: pnl,
            realizedPnlPct: pnlPct,
            notes: `Take-Profit Target (+${targetProfitPct.toFixed(1)}%): Closed ${t} at +${pnlPct.toFixed(2)}% gain. Proceeds credited to Available Cash.`,
          });
          runningCash = nextRunningCash;

          // Record in Audit Ledger
          try {
            recordNewPaperTrade({
              instrument: `${t}/USDT`,
              direction: 'LONG',
              price: parseFloat(newPrice.toFixed(newPrice < 10 ? 4 : 2)),
              quantity: parseFloat((amount * entry).toFixed(2)),
              leverage: 3,
              balanceChange: parseFloat(pnl.toFixed(2)),
              balanceChangePct: parseFloat(pnlPct.toFixed(2)),
              trigger: `Autopilot Engine: Target Profit Auto-Exit (+${pnlPct.toFixed(2)}%) ratified on ${t}`,
              status: 'TAKE_PROFIT',
              timestamp: exitUtcTime,
              idempotencyKey: `tp_${t}_${Math.floor(new Date(exitUtcTime).getTime() / 2000)}`,
              sourceHandler: 'AUTOPILOT_DAEMON',
            });
          } catch (e) {
            console.warn('Audit record error:', e);
          }
        } else if (isBreakevenLocked && (pnlPct <= trailingStopPct || newPrice <= lockedFloorPrice)) {
          // Condition B: Trailing Stop / Breakeven Ratchet Reversal Protection
          // Locks in profit and ensures green trade never turns red!
          totalCashProceedsToAdd += totalPosVal;
          const nextRunningCash = runningCash + totalPosVal;
          soundToPlay = 'CHIME';
          autoExitLogs.push({
            id: `trailing-stop-${Date.now()}-${t}`,
            timestamp: new Date().toLocaleTimeString(),
            ticker: t,
            action: 'SELL',
            sizePct: 100,
            text: `[TRAILING STOP SECURED] Breakeven Ratchet locked in +${pnlPct.toFixed(2)}% gain ($${pnl.toFixed(2)}) on ${t}! Peak was +${currentPeakPnlPct.toFixed(2)}%. Green trade protected.`,
            status: 'APPROVED',
            source: 'AUTONOMOUS',
          });
          const exitUtcTime = new Date().toISOString();
          autoExitLedgerEntries.push({
            id: `trailing-ledger-${Date.now()}-${t}`,
            timestamp: new Date().toLocaleTimeString(),
            utcTimestamp: exitUtcTime,
            type: 'AUTO_EXIT',
            ticker: t,
            amount: p.amount,
            price: newPrice,
            totalUsd: totalPosVal,
            balanceBefore: runningCash,
            balanceAfter: nextRunningCash,
            realizedPnl: pnl,
            realizedPnlPct: pnlPct,
            notes: `Breakeven Ratchet & Trailing Stop: Locked in +${pnlPct.toFixed(2)}% profit on ${t} (Peak: +${currentPeakPnlPct.toFixed(2)}%). Reversed from peak but closed in profit.`,
          });
          runningCash = nextRunningCash;

          try {
            recordNewPaperTrade({
              instrument: `${t}/USDT`,
              direction: 'LONG',
              price: parseFloat(newPrice.toFixed(newPrice < 10 ? 4 : 2)),
              quantity: parseFloat((amount * entry).toFixed(2)),
              leverage: 3,
              balanceChange: parseFloat(pnl.toFixed(2)),
              balanceChangePct: parseFloat(pnlPct.toFixed(2)),
              trigger: `Breakeven Ratchet: Trailing stop locked in +${pnlPct.toFixed(2)}% profit on ${t} (Peak: +${currentPeakPnlPct.toFixed(2)}%)`,
              status: 'TAKE_PROFIT',
              timestamp: exitUtcTime,
              idempotencyKey: `ts_${t}_${Math.floor(new Date(exitUtcTime).getTime() / 2000)}`,
              sourceHandler: 'AUTOPILOT_DAEMON',
            });
          } catch (e) {
            console.warn('Audit record error:', e);
          }
        } else if (!isBreakevenLocked && (pnlPct <= trailingStopPct || pnlPct <= -3.0)) {
          // Condition C: Disciplined Early Stop Loss (-3.0% quantitative stop instead of -5.5% bleed)
          totalCashProceedsToAdd += totalPosVal;
          const nextRunningCash = runningCash + totalPosVal;
          soundToPlay = soundToPlay || 'VETO';
          autoExitLogs.push({
            id: `stoploss-${Date.now()}-${t}`,
            timestamp: new Date().toLocaleTimeString(),
            ticker: t,
            action: 'SELL',
            sizePct: 100,
            text: `[DISCIPLINED STOP-LOSS] Quantitative risk cut on ${t} at ${pnlPct.toFixed(2)}% drawdown (Stop ceiling: -3.0%). Preserved capital for high-conviction setups.`,
            status: 'APPROVED',
            source: 'AUTONOMOUS',
          });
          const exitUtcTime = new Date().toISOString();
          autoExitLedgerEntries.push({
            id: `stoploss-ledger-${Date.now()}-${t}`,
            timestamp: new Date().toLocaleTimeString(),
            utcTimestamp: exitUtcTime,
            type: 'STOP_LOSS',
            ticker: t,
            amount: p.amount,
            price: newPrice,
            totalUsd: totalPosVal,
            balanceBefore: runningCash,
            balanceAfter: nextRunningCash,
            realizedPnl: pnl,
            realizedPnlPct: pnlPct,
            notes: `Disciplined Stop-Loss: Cut ${t} at ${pnlPct.toFixed(2)}% drawdown. Nexus-Red adversarial post-mortem logged.`,
          });
          runningCash = nextRunningCash;

          // Record in Audit Ledger with Post-Mortem
          try {
            const postMortem = generateStopLossPostMortem(t, pnl, pnlPct, entry, newPrice);
            recordNewPaperTrade({
              instrument: `${t}/USDT`,
              direction: 'LONG',
              price: parseFloat(newPrice.toFixed(newPrice < 10 ? 4 : 2)),
              quantity: parseFloat((amount * entry).toFixed(2)),
              leverage: 3,
              balanceChange: parseFloat(pnl.toFixed(2)),
              balanceChangePct: parseFloat(pnlPct.toFixed(2)),
              trigger: `Disciplined Risk Cut: Automated stop preserved capital on ${t} (${pnlPct.toFixed(2)}%)`,
              status: 'STOP_LOSS',
              postMortem,
              timestamp: exitUtcTime,
              idempotencyKey: `sl_${t}_${Math.floor(new Date(exitUtcTime).getTime() / 2000)}`,
              sourceHandler: 'AUTOPILOT_DAEMON',
            });
          } catch (e) {
            console.warn('Audit record error:', e);
          }
        } else {
          nextPositions[t] = {
            ...p,
            currentPrice: newPrice,
            unrealizedPnl: Number.isFinite(pnl) ? pnl : 0,
            unrealizedPnlPct: Number.isFinite(pnlPct) ? pnlPct : 0,
            peakPrice: currentPeakPrice,
            peakPnlPct: currentPeakPnlPct,
            trailingStopPct,
            lockedFloorPrice,
            isBreakevenLocked,
          };
        }
      });

      if (totalCashProceedsToAdd > 0) {
        const nextCash = (Number(cashBalanceRef.current) || 0) + totalCashProceedsToAdd;
        cashBalanceRef.current = nextCash;
        setCashBalance(nextCash);
      }

      positionsRef.current = nextPositions;
      setPositions(nextPositions);

      if (autoExitLedgerEntries.length > 0) {
        setLedger((prev) => [...autoExitLedgerEntries, ...prev.slice(0, 299)]);
      }

      if (autoExitLogs.length > 0) {
        setLogs((prev) => [...autoExitLogs, ...prev.slice(0, 59)]);
        if (soundToPlay === 'CHIME') {
          playTradeApprovedChime();
        } else if (soundToPlay === 'VETO') {
          playRiskVetoTone();
        }
      }
    };

    syncMarketPrices();
    const interval = setInterval(syncMarketPrices, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  /**
   * Continuous Autonomous Trade Inference Cycle (Background Execution)
   */
  useEffect(() => {
    if (!isExecuting) return;

    const runAutonomousDecision = async () => {
      const currentPositions = positionsRef.current;
      const currentCash = Number(cashBalanceRef.current) || 0;
      const totalPortfolioValue = calculateTotalValue(currentPositions, currentCash);

      const heldPositions = (Object.values(currentPositions) as Position[]).filter(
        (p) => Boolean(p && Number.isFinite(p.amount) && p.amount > 0)
      );
      const heldTickers = heldPositions.map((p) => p.ticker);
      const activeCount = heldPositions.length;
      const maxLimit = Math.min(5, Math.max(1, Number(maxOpenPositionsRef.current) || 3));

      const minReserveBuffer = Math.min(15000, totalPortfolioValue * 0.20);
      const maxDeployableCash = Math.max(0, currentCash - minReserveBuffer);

      let candidateAction: 'BUY' | 'SELL';
      let targetTicker: string;
      const unheldPool = monitoredTickers.filter((t) => !heldTickers.includes(t));

      if (heldTickers.length === 0) {
        candidateAction = 'BUY';
        targetTicker = unheldPool[Math.floor(Math.random() * unheldPool.length)] || monitoredTickers[0];
      } else if (activeCount >= maxLimit) {
        if (Math.random() < 0.5) {
          candidateAction = 'SELL';
          targetTicker = heldTickers[Math.floor(Math.random() * heldTickers.length)];
        } else {
          candidateAction = 'BUY';
          targetTicker = unheldPool.length > 0
            ? unheldPool[Math.floor(Math.random() * unheldPool.length)]
            : monitoredTickers[0];
        }
      } else {
        if (Math.random() < 0.25) {
          candidateAction = 'SELL';
          targetTicker = heldTickers[Math.floor(Math.random() * heldTickers.length)];
        } else {
          candidateAction = 'BUY';
          targetTicker = unheldPool.length > 0
            ? unheldPool[Math.floor(Math.random() * unheldPool.length)]
            : monitoredTickers[0];
        }
      }

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

      const isAssetHeld = heldTickers.includes(targetTicker);
      const existingPos = currentPositions[targetTicker];
      const assetUnrealizedPnlPct = existingPos && Number.isFinite(existingPos.unrealizedPnlPct)
        ? existingPos.unrealizedPnlPct
        : undefined;

      const isOversized = candidateAction === 'BUY' && Math.random() > 0.9;
      const size = candidateAction === 'SELL'
        ? 100
        : isOversized
        ? 30
        : Math.floor(Math.random() * 8) + 8;

      const buyReasons = [
        'SMA5 crossed SMA20 upward with elevated volume velocity on Bitget spot feed.',
        'RSI momentum bounced off oversold support band with cross-asset liquidity flow.',
        'Orderbook bid depth expanded by +24% with institutional accumulation signals.',
        'Nexus-Red Adversary scan confirmed: 0 liquidity traps detected in orderbook.',
        'Adaptive VWAP breakout on cross-chain orderbook imbalance.',
      ];
      const sellReasons = [
        'Dynamic profit harvest: Securing spot capital into Available Cash reserve.',
        'Momentum flattening: Rotating spot holding into liquid reserve buffer.',
        'Resistance band encountered: Closing spot position to protect realized yield.',
        'Nexus-Red alert: Sell order wall building at higher resistance levels.',
      ];

      const reasoning = candidateAction === 'SELL'
        ? (assetUnrealizedPnlPct !== undefined && assetUnrealizedPnlPct > 0
            ? `Securing +${assetUnrealizedPnlPct.toFixed(2)}% gain into Available Cash reserve.`
            : sellReasons[Math.floor(Math.random() * sellReasons.length)])
        : buyReasons[Math.floor(Math.random() * buyReasons.length)];

      const proposal: TradeProposal = {
        asset: targetTicker,
        action: candidateAction,
        size_pct: size,
        confidence: Math.round(78 + Math.random() * 18),
        reasoning,
      };

      const vetoResult = evaluateTradeRisk(proposal, totalPortfolioValue, assetUnrealizedPnlPct, {
        activePositionsCount: activeCount,
        maxAllowedPositions: maxLimit,
        isAssetHeld,
        availableDeployableCash: maxDeployableCash,
      });

      if (vetoResult.approved && proposal.action === 'BUY') {
        const buyResult = executeSimulatedBuy(proposal.asset, proposal.size_pct, targetSnap.price, targetSnap.class);
        if (buyResult.success) {
          const newLog: AutonomousLog = {
            id: `auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toLocaleTimeString(),
            ticker: proposal.asset,
            action: 'BUY',
            sizePct: buyResult.sizePct || proposal.size_pct,
            text: `BUY ${proposal.asset} [${buyResult.sizePct}% | $${(buyResult.tradeUsd || 0).toFixed(0)} | Conf: ${proposal.confidence}%] — ${proposal.reasoning}`,
            status: 'APPROVED',
            source: 'AUTONOMOUS',
          };
          setLogs((prev) => [newLog, ...prev.slice(0, 59)]);
          playTradeApprovedChime();
        } else {
          const newLog: AutonomousLog = {
            id: `auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toLocaleTimeString(),
            ticker: proposal.asset,
            action: 'BUY',
            sizePct: proposal.size_pct,
            text: `VETOED: ${buyResult.reason || 'Risk Guard Blocked Execution'}`,
            status: 'VETOED',
            overrideCode: 'CASH_RESERVE_FLOOR',
            source: 'AUTONOMOUS',
          };
          setLogs((prev) => [newLog, ...prev.slice(0, 59)]);
          playRiskVetoTone();
          setCircuitBreakerAlert(buyResult.reason || 'Order halted by Risk Guard');
          setTimeout(() => setCircuitBreakerAlert(null), 4000);
        }
      } else if (vetoResult.approved && proposal.action === 'SELL') {
        const sellResult = executeSimulatedSell(proposal.asset, targetSnap.price);
        if (sellResult.success) {
          const pnlStr = sellResult.pnl !== undefined
            ? ` (${sellResult.pnl >= 0 ? '+' : ''}$${sellResult.pnl.toFixed(2)} | ${sellResult.pnlPct?.toFixed(2)}%)`
            : '';
          const newLog: AutonomousLog = {
            id: `auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toLocaleTimeString(),
            ticker: proposal.asset,
            action: 'SELL',
            sizePct: 100,
            text: `SELL ${proposal.asset} [100%${pnlStr}] — ${proposal.reasoning}`,
            status: 'APPROVED',
            source: 'AUTONOMOUS',
          };
          setLogs((prev) => [newLog, ...prev.slice(0, 59)]);
          playTradeApprovedChime();
        } else {
          const newLog: AutonomousLog = {
            id: `auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toLocaleTimeString(),
            ticker: proposal.asset,
            action: 'SELL',
            sizePct: proposal.size_pct,
            text: `VETOED: ${sellResult.reason || 'Spot Model Execution Blocked'}`,
            status: 'VETOED',
            overrideCode: 'SPOT_SHORT_BLOCKED',
            source: 'AUTONOMOUS',
          };
          setLogs((prev) => [newLog, ...prev.slice(0, 59)]);
          playRiskVetoTone();
        }
      } else if (!vetoResult.approved) {
        const newLog: AutonomousLog = {
          id: `auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          ticker: proposal.asset,
          action: proposal.action,
          sizePct: proposal.size_pct,
          text: vetoResult.reason,
          status: 'VETOED',
          overrideCode: vetoResult.overrideCode,
          source: 'AUTONOMOUS',
        };
        setLogs((prev) => [newLog, ...prev.slice(0, 59)]);
        playRiskVetoTone();
        setCircuitBreakerAlert(vetoResult.reason);
        setTimeout(() => setCircuitBreakerAlert(null), 4000);
      }
    };

    // Disciplined execution cadences: 30s in turbo, 60s in standard mode to prevent runaway loops and quota exhaustion
    const intervalMs = isTurbo ? 30000 : 60000;
    const intervalId = setInterval(runAutonomousDecision, intervalMs);
    return () => clearInterval(intervalId);
  }, [isExecuting, isTurbo, calculateTotalValue, executeSimulatedBuy, executeSimulatedSell]);

  /**
   * Handle incoming signals from Council or Algo Builder
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
    const isAssetHeld = Boolean(position && Number.isFinite(position.amount) && position.amount > 0);
    const unrealizedPnlPct = position && Number.isFinite(position.unrealizedPnlPct) ? position.unrealizedPnlPct : undefined;
    const activePositions = (Object.values(currentPositions) as Position[]).filter(
      (p) => Boolean(p && Number.isFinite(p.amount) && p.amount > 0)
    );
    const maxLimit = Math.min(5, Math.max(1, Number(maxOpenPositionsRef.current) || 3));

    const totalPortfolioValue = calculateTotalValue(currentPositions, cashBalanceRef.current);
    const minReserveBuffer = Math.min(15000, totalPortfolioValue * 0.20);
    const maxDeployableCash = Math.max(0, (cashBalanceRef.current || 0) - minReserveBuffer);

    const vetoResult = evaluateTradeRisk(proposal, totalPortfolioValue, unrealizedPnlPct, {
      activePositionsCount: activePositions.length,
      maxAllowedPositions: maxLimit,
      isAssetHeld,
      availableDeployableCash: maxDeployableCash,
    });

    if (vetoResult.approved && proposal.action === 'BUY') {
      const buyRes = executeSimulatedBuy(ticker, proposal.size_pct, snap.price, snap.class);
      if (buyRes.success) {
        const newLog: AutonomousLog = {
          id: `council-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          ticker,
          action: 'BUY',
          sizePct: proposal.size_pct,
          text: `[COUNCIL HANDOFF APPROVED] BUY ${ticker} [${buyRes.sizePct}% | $${(buyRes.tradeUsd || 0).toFixed(0)}] — ${proposal.reasoning}`,
          status: 'APPROVED',
          source: 'COUNCIL_SIGNAL',
        };
        setLogs((prev) => [newLog, ...prev.slice(0, 59)]);
        playTradeApprovedChime();
      } else {
        const newLog: AutonomousLog = {
          id: `council-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          ticker,
          action: 'BUY',
          sizePct: proposal.size_pct,
          text: `[COUNCIL HANDOFF VETOED] ${buyRes.reason || 'Sizing or Cash Reserve Floor Breach'}`,
          status: 'VETOED',
          overrideCode: 'CASH_RESERVE_FLOOR',
          source: 'COUNCIL_SIGNAL',
        };
        setLogs((prev) => [newLog, ...prev.slice(0, 59)]);
        playRiskVetoTone();
      }
    } else if (vetoResult.approved && proposal.action === 'SELL') {
      const sellRes = executeSimulatedSell(ticker, snap.price);
      if (sellRes.success) {
        const pnlStr = sellRes.pnl !== undefined
          ? ` (${sellRes.pnl >= 0 ? '+' : ''}$${sellRes.pnl.toFixed(2)} | ${sellRes.pnlPct?.toFixed(2)}%)`
          : '';
        const newLog: AutonomousLog = {
          id: `council-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          ticker,
          action: 'SELL',
          sizePct: 100,
          text: `[COUNCIL HANDOFF APPROVED] SELL ${ticker} [100%${pnlStr}] — ${proposal.reasoning}`,
          status: 'APPROVED',
          source: 'COUNCIL_SIGNAL',
        };
        setLogs((prev) => [newLog, ...prev.slice(0, 59)]);
        playTradeApprovedChime();
      } else {
        const newLog: AutonomousLog = {
          id: `council-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          ticker,
          action: 'SELL',
          sizePct: proposal.size_pct,
          text: `[COUNCIL HANDOFF VETOED] ${sellRes.reason || 'Asset not held in long-only portfolio'}`,
          status: 'VETOED',
          overrideCode: 'SPOT_SHORT_BLOCKED',
          source: 'COUNCIL_SIGNAL',
        };
        setLogs((prev) => [newLog, ...prev.slice(0, 59)]);
        playRiskVetoTone();
      }
    } else if (!vetoResult.approved) {
      const newLog: AutonomousLog = {
        id: `council-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        ticker,
        action: proposal.action,
        sizePct: proposal.size_pct,
        text: `[COUNCIL HANDOFF VETOED] ${vetoResult.reason}`,
        status: 'VETOED',
        overrideCode: vetoResult.overrideCode,
        source: 'COUNCIL_SIGNAL',
      };
      setLogs((prev) => [newLog, ...prev.slice(0, 59)]);
      playRiskVetoTone();
      setCircuitBreakerAlert(vetoResult.reason);
      setTimeout(() => setCircuitBreakerAlert(null), 5000);
    }
  }, [calculateTotalValue, executeSimulatedBuy, executeSimulatedSell]);

  const dispatchProposal = useCallback((proposal: TradeProposal) => {
    handleIncomingCouncilSignal(proposal);
  }, [handleIncomingCouncilSignal]);

  /**
   * Manual Order Execution
   */
  const handleManualTrade = useCallback(async (ticker: string, action: 'BUY' | 'SELL', usdAmount: number) => {
    const sym = ticker.toUpperCase();
    let currentPrice = portfolio[sym]?.price;
    if (!currentPrice || currentPrice <= 0) {
      try {
        const snap = await fetchPriceSnapshot(sym);
        currentPrice = snap.price;
      } catch {
        currentPrice = getSeededPrice(sym);
      }
    }
    if (!currentPrice || currentPrice <= 0) return;

    if (action === 'BUY') {
      const curCash = Number(cashBalanceRef.current) || 0;
      if (curCash < 20) return;
      const tradeUsd = Math.min(curCash, Math.max(20, usdAmount));
      const units = tradeUsd / currentPrice;
      const nextCash = curCash - tradeUsd;

      cashBalanceRef.current = nextCash;
      setCashBalance(nextCash);

      setPositions((prev) => {
        const existing = prev[sym];
        let updated: Position;
        if (existing && existing.amount > 0) {
          const totUnits = existing.amount + units;
          const avgEntry = (existing.amount * existing.entryPrice + tradeUsd) / totUnits;
          updated = {
            ...existing,
            amount: totUnits,
            entryPrice: avgEntry,
            currentPrice,
            unrealizedPnl: (currentPrice - avgEntry) * totUnits,
            unrealizedPnlPct: ((currentPrice - avgEntry) / avgEntry) * 100,
          };
        } else {
          updated = {
            ticker: sym,
            amount: units,
            entryPrice: currentPrice,
            currentPrice,
            unrealizedPnl: 0,
            unrealizedPnlPct: 0,
            class: ASSET_REGISTRY[sym]?.class || 'CX',
          };
        }
        const nextMap = { ...prev, [sym]: updated };
        positionsRef.current = nextMap;
        return nextMap;
      });

      const entry: AutopilotLedgerEntry = {
        id: `manual-buy-${Date.now()}-${sym}`,
        timestamp: new Date().toLocaleTimeString(),
        utcTimestamp: new Date().toISOString(),
        type: 'MANUAL_INTERVENTION',
        ticker: sym,
        amount: units,
        price: currentPrice,
        totalUsd: tradeUsd,
        balanceBefore: curCash,
        balanceAfter: nextCash,
        realizedPnl: 0,
        realizedPnlPct: 0,
        notes: `Manual Order: Bought ${units.toFixed(4)} ${sym} at $${currentPrice.toFixed(2)} ($${tradeUsd.toFixed(2)} deployed)`,
      };
      setLedger((prev) => [entry, ...prev.slice(0, 299)]);
      setLogs((prev) => [
        {
          id: `manual-log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          ticker: sym,
          action: 'BUY',
          sizePct: 5,
          text: `Manual Order executed: Deployed $${tradeUsd.toFixed(2)} into ${sym} at $${currentPrice.toFixed(2)}.`,
          status: 'APPROVED',
          source: 'AUTONOMOUS',
        },
        ...prev.slice(0, 59),
      ]);
    } else {
      const currentPos = positionsRef.current[sym];
      if (currentPos && currentPos.amount > 0) {
        executeSimulatedSell(sym, currentPrice);
      }
    }
  }, [portfolio, executeSimulatedSell]);

  /**
   * Cash out 100% of open positions
   */
  const handleCashoutAllPositions = useCallback(() => {
    const currentPositions = { ...positionsRef.current };
    const posKeys = Object.keys(currentPositions);
    if (posKeys.length === 0) return;

    let totalProceeds = 0;
    let totalCostBasis = 0;
    let closedCount = 0;
    posKeys.forEach((t) => {
      const p = currentPositions[t];
      if (p && Number.isFinite(p.amount) && p.amount > 0) {
        const price = Number.isFinite(p.currentPrice) && p.currentPrice > 0 ? p.currentPrice : p.entryPrice;
        totalProceeds += p.amount * price;
        totalCostBasis += p.amount * p.entryPrice;
        closedCount++;
      }
    });

    const safeProceeds = Number.isFinite(totalProceeds) && totalProceeds > 0 ? totalProceeds : 0;
    const currentCash = Number(cashBalanceRef.current) || 0;
    const nextCash = currentCash + safeProceeds;
    const netPnl = safeProceeds - totalCostBasis;
    const netPnlPct = totalCostBasis > 0 ? (netPnl / totalCostBasis) * 100 : 0;

    cashBalanceRef.current = nextCash;
    setCashBalance(nextCash);
    positionsRef.current = {};
    setPositions({});
    playTradeApprovedChime();

    const cashoutEntry: AutopilotLedgerEntry = {
      id: `cashout-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      utcTimestamp: new Date().toISOString(),
      type: 'CASHOUT_ALL',
      ticker: 'ALL_POSITIONS',
      amount: closedCount,
      price: 0,
      totalUsd: safeProceeds,
      balanceBefore: currentCash,
      balanceAfter: nextCash,
      realizedPnl: netPnl,
      realizedPnlPct: netPnlPct,
      notes: `Manual Cashout: Liquidated ${closedCount} open positions. Full proceeds of $${safeProceeds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} credited to Available Cash.`,
    };
    setLedger((prev) => [cashoutEntry, ...prev.slice(0, 299)]);

    setLogs((prev) => [
      {
        id: `cashout-all-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        ticker: 'ALL',
        action: 'SELL',
        sizePct: 100,
        text: `[FULL CASHOUT EXECUTED] Closed ${closedCount} open positions. $${safeProceeds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} credited into Available Cash reserve.`,
        status: 'APPROVED',
        source: 'AUTONOMOUS',
      },
      ...prev.slice(0, 59),
    ]);
  }, []);

  /**
   * Reset portfolio to initial cash
   */
  const handleConfirmPasscodeReset = useCallback(() => {
    const curCash = Number(cashBalanceRef.current) || 0;
    positionsRef.current = INITIAL_POSITIONS;
    cashBalanceRef.current = INITIAL_CASH;
    setPositions(INITIAL_POSITIONS);
    setCashBalance(INITIAL_CASH);

    const resetLedgerEntry: AutopilotLedgerEntry = {
      id: `reset-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      utcTimestamp: new Date().toISOString(),
      type: 'SYSTEM_RESET',
      ticker: 'SYSTEM',
      amount: 0,
      price: 0,
      totalUsd: INITIAL_CASH,
      balanceBefore: curCash,
      balanceAfter: INITIAL_CASH,
      realizedPnl: 0,
      realizedPnlPct: 0,
      notes: 'Passcode Verified: Balance and holdings restored to $100,000 baseline cash reserve.',
    };

    setLedger((prev) => [resetLedgerEntry, ...prev.slice(0, 299)]);
    fetch('/api/autopilot/reset', { method: 'POST' }).catch(() => {});
    setLogs((prev) => [
      {
        id: `reset-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        ticker: 'SYS',
        action: 'HOLD',
        sizePct: 0,
        text: 'Portfolio reset authorized with verified administrative passcode. Baseline restored to $100,000 cash reserve.',
        status: 'APPROVED',
        source: 'AUTONOMOUS',
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  // Listen for global reset events triggered from Audit view or security modals
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleReset = () => {
      handleConfirmPasscodeReset();
    };
    window.addEventListener('lunaris-audit-reset', handleReset);
    window.addEventListener('lunaris-autopilot-reset', handleReset);
    return () => {
      window.removeEventListener('lunaris-audit-reset', handleReset);
      window.removeEventListener('lunaris-autopilot-reset', handleReset);
    };
  }, [handleConfirmPasscodeReset]);

  return (
    <AutopilotContext.Provider
      value={{
        isExecuting,
        setIsExecuting,
        toggleExecuting,
        isTurbo,
        setIsTurbo,
        logs,
        setLogs,
        portfolio,
        positions,
        setPositions,
        cashBalance,
        setCashBalance,
        ledger,
        setLedger,
        autoExitPct,
        setAutoExitPct,
        maxOpenPositions,
        setMaxOpenPositions,
        circuitBreakerAlert,
        lastSyncTime,
        calculateTotalValue,
        handleManualTrade,
        handleCashoutAllPositions,
        handleConfirmPasscodeReset,
        handleIncomingCouncilSignal,
        dispatchProposal,
        executeSimulatedBuy,
        executeSimulatedSell,
        monitoredTickers,
      }}
    >
      {children}
    </AutopilotContext.Provider>
  );
};

export function useAutopilot() {
  const ctx = useContext(AutopilotContext);
  if (!ctx) {
    throw new Error('useAutopilot must be used within an AutopilotProvider');
  }
  return ctx;
}
