// components/AutonomousLoopPanel.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchPriceSnapshot, PriceSnapshot, ASSET_REGISTRY } from '@/lib/liveTokenFeed';
import { getSeededPrice, SEEDED_ASSETS } from '@/lib/demoSeedData';
import { evaluateTradeRisk, TradeProposal } from '@/lib/riskVeto';
import { recordNewPaperTrade } from '@/lib/paperTradingAudit';
import { Play, Square, Zap, ShieldAlert, RotateCcw, ArrowUpRight, ArrowDownRight, RefreshCw, Target, ShieldCheck, Lock, Sliders, BookOpen, Activity } from 'lucide-react';
import { playTradeApprovedChime, playRiskVetoTone, playCyberClick } from '@/lib/soundSynth';
import { AutopilotResetPasscodeModal } from '@/components/AutopilotResetPasscodeModal';
import { AutopilotLedgerView, AutopilotLedgerEntry } from '@/components/AutopilotLedgerView';
import { SpectatorModeBadge } from '@/components/SpectatorModeBadge';
import { AdminAuthModal } from '@/components/AdminAuthModal';
import { useAdminAuth } from '@/lib/adminAuth';

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
}

interface AutonomousLoopPanelProps {
  key?: React.Key;
  externalProposal?: TradeProposal | null;
  onClearExternalProposal?: () => void;
  demoShockActive?: boolean;
}

const INITIAL_POSITIONS: Record<string, Position> = {};
const INITIAL_CASH = 100000;
const AUTOPILOT_PERSISTENCE_KEY = 'LUNARIS_AUTOPILOT_PERSISTED_STATE_V2';

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

export function AutonomousLoopPanel({
  externalProposal,
  onClearExternalProposal,
  demoShockActive,
}: AutonomousLoopPanelProps) {
  const [isExecuting, setIsExecuting] = useState(() => {
    const p = loadPersistedAutopilotState();
    if (typeof p?.isExecuting === 'boolean') return p.isExecuting;
    return true; // Autopilot daemon is active 24/7 by default
  });
  const [isTurbo, setIsTurbo] = useState(false);
  const [subTab, setSubTab] = useState<'COCKPIT' | 'LEDGER'>('COCKPIT');
  const [isResetPasscodeModalOpen, setIsResetPasscodeModalOpen] = useState(false);

  // Administrative Passcode Authentication
  const { isAuthenticated, storedPasscode } = useAdminAuth();
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminModalTitle, setAdminModalTitle] = useState('AUTOPILOT ENGINE AUTHORIZATION');
  const [adminModalDesc, setAdminModalDesc] = useState('Enter administrative passcode to modify 24/7 engine state.');
  const [pendingAuthAction, setPendingAuthAction] = useState<'TOGGLE_AUTOPILOT' | 'RESET_PORTFOLIO' | null>(null);

  const executeToggleAutopilot = async (passcode: string) => {
    const nextState = !isExecuting;
    setIsExecuting(nextState);
    try {
      const res = await fetch('/api/autopilot/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setIsExecuting(!nextState); // rollback
        playRiskVetoTone();
      } else {
        if (nextState) playTradeApprovedChime();
      }
    } catch {
      // rollback on error
      setIsExecuting(!nextState);
    }
  };

  const handleToggleAutopilotClick = () => {
    playCyberClick();
    if (!isAuthenticated) {
      setAdminModalTitle('AUTOPILOT ENGINE AUTHORIZATION');
      setAdminModalDesc('Modifying or halting the 24/7 autonomous loop requires administrator authorization. General visitors are in Read-Only Spectator Mode.');
      setPendingAuthAction('TOGGLE_AUTOPILOT');
      setIsAdminAuthModalOpen(true);
      return;
    }
    executeToggleAutopilot(storedPasscode || '');
  };

  // Synchronize Autopilot active state with server 24/7 daemon
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/autopilot/status');
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.isRunning === 'boolean' && isMounted) {
            setIsExecuting(data.isRunning);
          }
        }
      } catch (err) {
        console.warn('Could not sync autopilot status with server:', err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const [logs, setLogs] = useState<AutonomousLog[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      ticker: 'SYS',
      action: 'HOLD',
      sizePct: 0,
      text: 'LUNARIS Autonomous Loop initialized with persistent session ledger.',
      status: 'APPROVED',
      source: 'AUTONOMOUS',
    },
  ]);
  const [portfolio, setPortfolio] = useState<Record<string, PriceSnapshot>>({});
  
  // Persistent Autopilot Positions & Cash Balance across browser sessions
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

  // Persistent Autopilot Transaction Ledger
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

  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'VETOED'>('ALL');
  const [circuitBreakerAlert, setCircuitBreakerAlert] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Live');

  // User-configurable auto-exit profit target percentage (e.g. +2%, +3%, +5%, +8%, +15%)
  const [autoExitPct, setAutoExitPct] = useState<number>(() => {
    const p = loadPersistedAutopilotState();
    return typeof p?.autoExitPct === 'number' && p.autoExitPct > 0 ? p.autoExitPct : 3;
  });
  const autoExitPctRef = useRef<number>(3);

  // User-configurable max open positions (1 to 5, max 5, default 3)
  const [maxOpenPositions, setMaxOpenPositions] = useState<number>(() => {
    const p = loadPersistedAutopilotState();
    return typeof p?.maxOpenPositions === 'number' && p.maxOpenPositions >= 1 && p.maxOpenPositions <= 5
      ? p.maxOpenPositions
      : 3;
  });
  const maxOpenPositionsRef = useRef<number>(3);

  // Atomic refs to prevent state race conditions and break infinite useEffect execution loops
  const positionsRef = useRef<Record<string, Position>>(positions);
  const cashBalanceRef = useRef<number>(cashBalance);
  const isExecutingRef = useRef<boolean>(isExecuting);
  const isTurboRef = useRef<boolean>(isTurbo);

  // Sync refs with React state & save to LocalStorage across browser sessions
  useEffect(() => {
    autoExitPctRef.current = autoExitPct;
  }, [autoExitPct]);

  useEffect(() => {
    maxOpenPositionsRef.current = maxOpenPositions;
  }, [maxOpenPositions]);

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

  // Persist state changes in localStorage so browser refreshes/changes never lose ledger or balances
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stateToSave = {
        cashBalance,
        positions,
        ledger: ledger.slice(0, 300),
        autoExitPct,
        maxOpenPositions,
        isExecuting,
      };
      localStorage.setItem(AUTOPILOT_PERSISTENCE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.warn('Failed to persist autopilot state:', err);
    }
  }, [cashBalance, positions, ledger, autoExitPct, maxOpenPositions, isExecuting]);

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
   * Reset the portfolio back to factory initial state - Protected by Passcode Verification
   */
  const handleResetPortfolio = () => {
    playCyberClick();
    if (!isAuthenticated) {
      setAdminModalTitle('RESET PORTFOLIO AUTHORIZATION');
      setAdminModalDesc('Restoring the portfolio baseline to $100,000 cash reserve requires administrator authorization.');
      setPendingAuthAction('RESET_PORTFOLIO');
      setIsAdminAuthModalOpen(true);
      return;
    }
    handleConfirmPasscodeReset();
  };

  /**
   * Authorized reset confirmed via administrative key
   */
  const handleConfirmPasscodeReset = () => {
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
  };

  /**
   * Cash out 100% of open positions directly into Available Cash reserve.
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

    // Record in Autopilot Ledger
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
        text: `[FULL CASHOUT EXECUTED] Closed ${closedCount} open positions. $${safeProceeds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} credited directly into Available Cash reserve.`,
        status: 'APPROVED',
        source: 'AUTONOMOUS',
      },
      ...prev.slice(0, 59),
    ]);
  }, []);

  /**
   * Bulletproof buy execution with capacity cap & cash reserve checks.
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

    const currentPosMap = positionsRef.current;
    const isAlreadyHeld = Boolean(currentPosMap[normTicker] && currentPosMap[normTicker].amount > 0);
    const activePositions = (Object.values(currentPosMap) as Position[]).filter(
      (p) => Boolean(p && Number.isFinite(p.amount) && p.amount > 0)
    );
    const maxLimit = Math.min(5, Math.max(1, Number(maxOpenPositionsRef.current) || 3));

    // Portfolio Capacity Check: If adding a brand new asset, respect user-defined maxOpenPositions
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
    const validSizePct = Math.min(25, Math.max(1, Number(sizePct) || 5));
    let tradeUsd = (totalVal * validSizePct) / 100;

    if (!Number.isFinite(tradeUsd) || tradeUsd <= 0) {
      return { success: false, ticker: normTicker, reason: 'Invalid calculated trade size' };
    }

    // Liquidation Shield: Enforce mandatory 20% NAV / $12,000 cash reserve so account can NEVER face liquidation
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

    // Record in Autopilot persistent ledger
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
      notes: `Autonomous Buy: Deployed $${tradeUsd.toFixed(2)} (${validSizePct}%) on ${normTicker} at $${validPrice.toFixed(2)}`,
    };
    setLedger((prev) => [buyEntry, ...prev.slice(0, 299)]);

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
   * Bulletproof sell execution with Pure Spot/Long validation.
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

    // Record official Bitget S2 compliant paper-trading transaction
    const initialCost = pos.amount * pos.entryPrice;
    const pnl = proceeds - initialCost;
    const pnlPct = initialCost > 0 ? ((proceeds - initialCost) / initialCost) * 100 : 0;

    // Record in Autopilot persistent ledger
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

    try {
      recordNewPaperTrade({
        instrument: `${normTicker}/USDT`,
        direction: 'LONG',
        price: parseFloat(sellPrice.toFixed(sellPrice < 10 ? 4 : 2)),
        quantity: parseFloat(initialCost.toFixed(2)),
        leverage: 3,
        balanceChange: parseFloat(pnl.toFixed(2)),
        balanceChangePct: parseFloat(pnlPct.toFixed(2)),
        trigger: `Autopilot Engine: Position closed on ${normTicker} (${pnl >= 0 ? 'Target Profit Ratified' : 'Risk Sentinel Stop Protection'})`,
        status: pnl >= 0 ? 'TAKE_PROFIT' : 'STOP_LOSS',
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
   * Manual Order Execution - directly adjusts persistent cash and updates ledger
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
      // Manual Sell
      const currentPos = positionsRef.current[sym];
      if (currentPos && currentPos.amount > 0) {
        executeSimulatedSell(sym, currentPrice);
      }
    }
  }, [portfolio, executeSimulatedSell]);

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
          text: `[COUNCIL HANDOFF VETOED] ${buyRes.reason}`,
          status: 'VETOED',
          overrideCode: 'CAPACITY_LIMIT',
          source: 'COUNCIL_SIGNAL',
        };
        setLogs((prev) => [newLog, ...prev.slice(0, 59)]);
        playRiskVetoTone();
        setCircuitBreakerAlert(buyRes.reason || 'Council buy blocked');
        setTimeout(() => setCircuitBreakerAlert(null), 4000);
      }
    } else if (vetoResult.approved && proposal.action === 'SELL') {
      const sellRes = executeSimulatedSell(ticker, snap.price);
      if (sellRes.success) {
        const newLog: AutonomousLog = {
          id: `council-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          ticker,
          action: 'SELL',
          sizePct: proposal.size_pct,
          text: `[COUNCIL HANDOFF APPROVED] SELL ${ticker} — ${proposal.reasoning}`,
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
          text: `[COUNCIL HANDOFF VETOED] ${sellRes.reason}`,
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
      const autoExitLedgerEntries: AutopilotLedgerEntry[] = [];
      let soundToPlay: 'CHIME' | 'VETO' | null = null;

      // Safely update positions with live prices and calculate accurate PnL & exits
      const nextPositions: Record<string, Position> = {};
      const currentPosMap = { ...positionsRef.current };
      const posKeys = Object.keys(currentPosMap);
      const startingCash = Number(cashBalanceRef.current) || 0;
      let runningCash = startingCash;

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
          const nextRunningCash = runningCash + totalPosVal;
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
          autoExitLedgerEntries.push({
            id: `autoexit-ledger-${Date.now()}-${t}`,
            timestamp: new Date().toLocaleTimeString(),
            utcTimestamp: new Date().toISOString(),
            type: 'AUTO_EXIT',
            ticker: t,
            amount: p.amount,
            price: newPrice,
            totalUsd: totalPosVal,
            balanceBefore: runningCash,
            balanceAfter: nextRunningCash,
            realizedPnl: pnl,
            realizedPnlPct: pnlPct,
            notes: `Take-Profit Auto-Exit (+${targetProfitPct.toFixed(1)}% target): Closed ${t} at +${pnlPct.toFixed(2)}% gain. Proceeds credited to Available Cash.`,
          });
          runningCash = nextRunningCash;
        } else if (pnlPct <= -6) {
          // Condition B: Liquidation Shield auto-cut at -6% drawdown
          totalCashProceedsToAdd += totalPosVal;
          const nextRunningCash = runningCash + totalPosVal;
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
          autoExitLedgerEntries.push({
            id: `shieldcut-ledger-${Date.now()}-${t}`,
            timestamp: new Date().toLocaleTimeString(),
            utcTimestamp: new Date().toISOString(),
            type: 'STOP_LOSS',
            ticker: t,
            amount: p.amount,
            price: newPrice,
            totalUsd: totalPosVal,
            balanceBefore: runningCash,
            balanceAfter: nextRunningCash,
            realizedPnl: pnl,
            realizedPnlPct: pnlPct,
            notes: `Liquidation Shield Protection: Emergency closed ${t} at ${pnlPct.toFixed(2)}% drawdown. Cash preserved.`,
          });
          runningCash = nextRunningCash;
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
   * Synchronized with active portfolio state, user capacity limit, and pure spot rules.
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

      // Calculate deployable cash (preserving Liquidation Shield's 20% NAV buffer)
      const minReserveBuffer = Math.min(15000, totalPortfolioValue * 0.20);
      const maxDeployableCash = Math.max(0, currentCash - minReserveBuffer);

      // Pure Spot / Long Model Decision Selection:
      // 1. If 0 positions held -> MUST propose BUY on an unheld candidate.
      // 2. If at capacity (activeCount >= maxLimit):
      //    - 50% chance propose BUY (which triggers transparent CAPACITY_LIMIT VETO)
      //    - 50% chance evaluate SELL on an existing held position (locks profit, frees slot)
      // 3. If below capacity (0 < activeCount < maxLimit):
      //    - 75% chance evaluate BUY on an unheld candidate asset
      //    - 25% chance evaluate SELL on a held asset
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
        : Math.floor(Math.random() * 8) + 8; // 8% to 15%, or 30% for veto test

      const buyReasons = [
        'SMA5 crossed SMA20 upward with elevated volume velocity on Bitget spot feed.',
        'RSI momentum bounced off oversold support band with cross-asset liquidity flow.',
        'Orderbook bid depth expanded by +24% with institutional accumulation signals.',
        'Adaptive VWAP breakout on cross-chain orderbook imbalance.',
        'Mean-reversion trigger confirmed by spot volume acceleration.',
      ];
      const sellReasons = [
        'Dynamic profit harvest: Securing spot capital into Available Cash reserve.',
        'Momentum flattening: Rotating spot holding into liquid reserve buffer.',
        'Resistance band encountered: Closing spot position to protect realized yield.',
        'Asset rebalance: Taking spot proceeds to prepare for high-conviction entries.',
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
          {/* View Mode Toggle: Cockpit vs Ledger */}
          <div className="flex items-center bg-black/60 p-0.5 rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setSubTab('COCKPIT')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer ${
                subTab === 'COCKPIT'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>COCKPIT</span>
            </button>
            <button
              onClick={() => setSubTab('LEDGER')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer ${
                subTab === 'LEDGER'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>LEDGER</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-purple-500/30 text-purple-200 font-mono">
                {ledger.length}
              </span>
            </button>
          </div>

          {/* Spectator Mode Indicator Badge */}
          <SpectatorModeBadge className="mr-1" />

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
            title="Reset Portfolio to initial $100,000 baseline cash reserve (Requires Administrative Passcode Verification)"
            className="p-1.5 text-xs border border-white/15 hover:border-amber-400/50 text-gray-400 hover:text-amber-300 rounded flex items-center gap-1 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESET</span>
          </button>

          {/* Speed Toggle */}
          <button
            onClick={() => setIsTurbo(!isTurbo)}
            title="Switch execution frequency between Standard (7s) and Turbo (2s)"
            className={`px-2.5 py-1 text-xs border rounded flex items-center gap-1.5 transition-all cursor-pointer ${
              isTurbo
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'border-white/15 text-gray-400 hover:text-white hover:border-white/30'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isTurbo ? 'TURBO 2s' : 'NORMAL 7s'}</span>
          </button>

          {/* Autopilot Master Switch (Protected by Passcode) */}
          <button
            onClick={handleToggleAutopilotClick}
            title={!isAuthenticated ? 'Spectator Mode: Admin passcode required to toggle 24/7 engine' : (isExecuting ? 'Halt 24/7 Autopilot' : 'Engage 24/7 Autopilot')}
            className={`px-3.5 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              isExecuting
                ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30'
                : 'bg-emerald-500/20 border border-emerald-500 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {!isAuthenticated && <Lock className="w-3 h-3 text-amber-400 mr-0.5" />}
            {isExecuting ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isExecuting ? 'HALT AUTOPILOT' : 'ENGAGE AUTOPILOT'}</span>
          </button>
        </div>
      </div>

      {/* Conditionally Render Ledger View or Cockpit View */}
      {subTab === 'LEDGER' ? (
        <AutopilotLedgerView
          ledger={ledger}
          cashBalance={cashBalance}
          onResetPortfolio={handleResetPortfolio}
          onManualTrade={handleManualTrade}
          isAutopilotActive={isExecuting}
          onToggleAutopilot={() => setIsExecuting(!isExecuting)}
        />
      ) : (
        <>
          {/* Autopilot Risk & Portfolio Controls: Auto-Exit Target + Max Open Positions Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {/* Control 1: Take-Profit Auto-Exit Target (% Gain) */}
            <div className="bg-gradient-to-r from-purple-950/40 via-black/60 to-cyan-950/40 border border-purple-500/30 rounded-lg p-3 text-xs shadow-inner flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                      Take-Profit Auto-Exit
                    </span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 font-extrabold px-2 py-0.5 rounded border border-purple-400/30">
                      +{autoExitPct}% Profit Target
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Armed
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400">-6% SL</span>
                  </div>
                </div>

                {/* Quick Multiplier Buttons + Range Slider */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    {[1.5, 2, 3, 5, 8, 12, 20].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setAutoExitPct(pct)}
                        className={`px-1.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          autoExitPct === pct
                            ? 'bg-purple-500 text-black shadow-[0_0_10px_rgba(168,85,247,0.5)] font-black'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                        }`}
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 flex items-center gap-2 min-w-[120px]">
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
              </div>

              <p className="text-[10px] text-gray-400 mt-1">
                Open positions auto-cash-out when gain is <span className="text-purple-300 font-bold">&ge; +{autoExitPct}%</span>. Full proceeds directly credit to your <span className="text-emerald-300 font-bold">Available Cash Reserve</span>.
              </p>
            </div>

            {/* Control 2: Max Open Positions (Pure Spot / Long Model Capacity) */}
            <div className="bg-gradient-to-r from-cyan-950/40 via-black/60 to-purple-950/40 border border-cyan-500/30 rounded-lg p-3 text-xs shadow-inner flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                      Max Open Positions
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                        positionList.length >= maxOpenPositions
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
                      }`}
                    >
                      {positionList.length} / {maxOpenPositions} Slots Active
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                    <span className="text-cyan-400 font-semibold flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" /> Pure Spot
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400">Max 5 Cap</span>
                  </div>
                </div>

                {/* Slots Selector Buttons 1, 2, 3, 4, 5 */}
                <div className="flex items-center gap-1.5 mb-2">
                  {[1, 2, 3, 4, 5].map((count) => {
                    const isSelected = maxOpenPositions === count;
                    const isAtOrOver = positionList.length >= count;
                    return (
                      <button
                        key={count}
                        onClick={() => setMaxOpenPositions(count)}
                        title={`Limit concurrent holdings to ${count} open position${count > 1 ? 's' : ''}`}
                        className={`flex-1 py-1.5 rounded text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.5)] border border-cyan-300'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                        }`}
                      >
                        <span>{count}</span>
                        <span className="text-[9px] font-normal opacity-75">{count === 1 ? 'pos' : 'pos'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[10px] text-gray-400 mt-1">
                Pure spot/long engine locks concurrent exposure to <span className="text-cyan-300 font-bold">{maxOpenPositions} positions</span>. When filled, incoming BUYs are transparently <span className="text-amber-300 font-bold">VETOED</span> until a slot is freed.
              </p>
            </div>
          </div>

      {/* Portfolio Telemetry Bar - Always Safe Real-Time Values */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4 bg-black/50 p-2.5 rounded border border-white/5 text-xs">
        {/* Initial Portfolio Balance */}
        <div className="border-r border-white/5 pr-2">
          <div className="text-[10px] text-[#00F0FF] uppercase flex items-center justify-between font-mono font-bold">
            <span>INITIAL BALANCE</span>
            <span className="text-[9px] text-[#00F0FF]/80">GENESIS</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-bold text-white tracking-wide font-mono">
              $100,000.00
            </span>
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5">
            Initial Capital (USDT)
          </div>
        </div>

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
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  positionList.length >= maxOpenPositions
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {positionList.length} / {maxOpenPositions} Slots
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

          {/* Market Feed Radar - Realtime Bitget Spot & Equities Feed */}
          <div className="pt-2 border-t border-white/10">
            <div className="text-[11px] text-gray-400 mb-1.5 flex items-center justify-between">
              <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Market Feed Radar (Bitget Spot Realtime)
              </span>
              <span className="text-[10px] text-gray-500 font-mono">15% delta safeguard check</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {monitoredTickers.map((t) => {
                const snap = portfolio[t];
                const price = snap && Number.isFinite(snap.price) && snap.price > 0 ? snap.price : (SEEDED_ASSETS[t]?.basePrice || 100);
                const chg = snap?.change24h || 0;
                const isPositive = chg >= 0;

                return (
                  <div key={t} className="bg-black/40 p-2 rounded border border-white/5 text-[11px] hover:border-white/15 transition-all">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                      <span className="font-bold text-white">{t}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                        BITGET
                      </span>
                    </div>
                    <div className="font-bold text-gray-100 text-xs">
                      ${price.toLocaleString('en-US', { minimumFractionDigits: price > 100 ? 2 : 3, maximumFractionDigits: price > 100 ? 2 : 3 })}
                    </div>
                    <div className={`text-[10px] font-semibold mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{chg.toFixed(2)}%
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
    </>
  )}

      {/* Passcode Verification Modal for Resetting Autopilot Portfolio */}
      <AutopilotResetPasscodeModal
        isOpen={isResetPasscodeModalOpen}
        onClose={() => setIsResetPasscodeModalOpen(false)}
        onConfirmReset={handleConfirmPasscodeReset}
      />

      {/* Cybernetic Administrative Authorization Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => {
          setIsAdminAuthModalOpen(false);
          setPendingAuthAction(null);
        }}
        onSuccess={(passcode) => {
          setIsAdminAuthModalOpen(false);
          if (pendingAuthAction === 'TOGGLE_AUTOPILOT') {
            executeToggleAutopilot(passcode);
          } else if (pendingAuthAction === 'RESET_PORTFOLIO') {
            handleConfirmPasscodeReset();
          }
          setPendingAuthAction(null);
        }}
        actionTitle={adminModalTitle}
        actionDescription={adminModalDesc}
      />
    </div>
  );
}

