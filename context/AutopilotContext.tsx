// context/AutopilotContext.tsx
// Device-Independent Autonomous Execution Engine Context for LUNARIS Terminal
// Provides an isolated, local sandbox on each judge device/browser so every judge
// can independently try out different tokens, adjust risk/profit targets, and run the loop
// without cross-device interference or Firebase Spark plan quota exhaustion.

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { fetchPriceSnapshot, PriceSnapshot, ASSET_REGISTRY } from '@/lib/liveTokenFeed';
import { getSeededPrice } from '@/lib/demoSeedData';
import { TradeProposal } from '@/lib/riskVeto';
import { recordNewPaperTrade } from '@/lib/paperTradingAudit';
import { playTradeApprovedChime, playRiskVetoTone } from '@/lib/soundSynth';
import { AutopilotLedgerEntry } from '@/components/AutopilotLedgerView';

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
  deviceSessionId: string;
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
  setAutoExitPct: (val: number | ((prev: number) => number)) => void;
  maxOpenPositions: number;
  setMaxOpenPositions: (val: number | ((prev: number) => number)) => void;
  circuitBreakerAlert: string | null;
  lastSyncTime: string;
  calculateTotalValue: (posMap?: Record<string, Position>, cash?: number) => number;
  handleManualTrade: (ticker: string, action: 'BUY' | 'SELL', usdAmount?: number) => Promise<void>;
  handleCashoutAllPositions: () => void;
  handleConfirmPasscodeReset: () => void;
  handleIncomingCouncilSignal: (proposal: TradeProposal) => Promise<void>;
  dispatchProposal: (proposal: TradeProposal) => void;
  executeSimulatedBuy: (ticker: string, sizePct: number, currentPrice: number, assetClass: 'CX' | 'EQ') => BuyExecutionResult;
  executeSimulatedSell: (ticker: string, currentPrice?: number) => Promise<SellExecutionResult> | SellExecutionResult;
  monitoredTickers: string[];
}

const AUTOPILOT_STORAGE_KEY = 'LUNARIS_AUTOPILOT_SANDBOX_STATE_V3';

function getDeviceSessionId(): string {
  if (typeof window === 'undefined') return 'judge-device-local';
  try {
    let id = localStorage.getItem('LUNARIS_DEVICE_SANDBOX_ID');
    if (!id) {
      id = 'judge-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      localStorage.setItem('LUNARIS_DEVICE_SANDBOX_ID', id);
    }
    return id;
  } catch {
    return 'judge-session';
  }
}

// Initial lively positions so each new judge or private browser window starts with active positions
const INITIAL_POSITIONS: Record<string, Position> = {
  BTC: {
    ticker: 'BTC',
    amount: 0.045,
    entryPrice: 77350,
    currentPrice: 79820,
    unrealizedPnl: 111.15,
    unrealizedPnlPct: 3.19,
    class: 'CX',
  },
  NVDAon: {
    ticker: 'NVDAon',
    amount: 18,
    entryPrice: 182.5,
    currentPrice: 186.4,
    unrealizedPnl: 70.2,
    unrealizedPnlPct: 2.14,
    class: 'EQ',
  },
};
const INITIAL_CASH = 93234.25;

function loadPersistedAutopilotState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTOPILOT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Sandbox state skipped (incognito/restricted):', err);
  }
  return null;
}

const AutopilotContext = createContext<AutopilotContextType | null>(null);

export const AutopilotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceSessionId] = useState<string>(() => getDeviceSessionId());

  // Autopilot active state (defaults to true for continuous background execution on device)
  const [isExecuting, setIsExecuting] = useState<boolean>(() => {
    const p = loadPersistedAutopilotState();
    return typeof p?.isExecuting === 'boolean' ? p.isExecuting : true;
  });
  const [isTurbo, setIsTurbo] = useState<boolean>(() => {
    const p = loadPersistedAutopilotState();
    return typeof p?.isTurbo === 'boolean' ? p.isTurbo : false;
  });
  const [circuitBreakerAlert, setCircuitBreakerAlert] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Live');

  const [logs, setLogs] = useState<AutonomousLog[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      ticker: 'SYS',
      action: 'HOLD',
      sizePct: 0,
      text: `Device Sandbox (${getDeviceSessionId()}) engaged. Local deterministic trading loop armed.`,
      status: 'APPROVED',
      source: 'AUTONOMOUS',
    },
  ]);

  const [portfolio, setPortfolio] = useState<Record<string, PriceSnapshot>>({});

  // Device-scoped positions and cash balance
  const [positions, setPositions] = useState<Record<string, Position>>(() => {
    const p = loadPersistedAutopilotState();
    if (p?.positions && typeof p.positions === 'object' && Object.keys(p.positions).length > 0) {
      return p.positions;
    }
    return INITIAL_POSITIONS;
  });

  const [cashBalance, setCashBalance] = useState<number>(() => {
    const p = loadPersistedAutopilotState();
    return typeof p?.cashBalance === 'number' && Number.isFinite(p.cashBalance) && p.cashBalance >= 0
      ? p.cashBalance
      : INITIAL_CASH;
  });

  // Device-scoped ledger
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
        amount: 0.045,
        price: 77350.0,
        totalUsd: 3480.75,
        balanceBefore: 96715.0,
        balanceAfter: 93234.25,
        realizedPnl: 0,
        realizedPnlPct: 0,
        notes: 'Initial Autopilot position opened on Bitget BTC/USDT spot',
      },
      {
        id: 'seed-ledger-2',
        timestamp: new Date().toLocaleTimeString(),
        utcTimestamp: new Date().toISOString(),
        type: 'BUY',
        ticker: 'NVDAon',
        amount: 18.0,
        price: 182.5,
        totalUsd: 3285.0,
        balanceBefore: 100000.0,
        balanceAfter: 96715.0,
        realizedPnl: 0,
        realizedPnlPct: 0,
        notes: 'Initial Autopilot position opened on NVDA Tokenized Equity',
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

  // Atomic refs for loop execution
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

  // Persist locally per device sandbox
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stateToPersist = {
        isExecuting,
        isTurbo,
        autoExitPct,
        maxOpenPositions,
        cashBalance,
        positions,
        ledger,
      };
      localStorage.setItem(AUTOPILOT_STORAGE_KEY, JSON.stringify(stateToPersist));
    } catch {
      // Gracefully handle storage quota or incognito restrictions
    }
  }, [isExecuting, isTurbo, autoExitPct, maxOpenPositions, cashBalance, positions, ledger]);

  const monitoredTickers = ['BTC', 'ETH', 'SOL', 'NVDA', 'TSLA', 'MSTR', 'COIN', 'AAPL'];

  const calculateTotalValue = useCallback((
    posMap: Record<string, Position> = positionsRef.current,
    cash: number = cashBalanceRef.current
  ): number => {
    let posValue = 0;
    if (posMap && typeof posMap === 'object') {
      (Object.values(posMap) as Position[]).forEach((pos) => {
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

  // Autonomous loop runner: runs locally and continuously on this device until judge clicks HALT AUTOPILOT
  useEffect(() => {
    if (!isExecuting) return;

    const intervalMs = isTurbo ? 2000 : 3500;

    const runAutonomousTick = () => {
      if (!isExecutingRef.current) return;

      const currentPos = { ...positionsRef.current };
      const currentCash = cashBalanceRef.current;
      let nextCash = currentCash;
      let positionsModified = false;
      const targetExitPct = autoExitPctRef.current || 3.0;

      // 1. Evaluate positions: price progression, Take Profit & Stop Loss
      const posEntries = Object.entries(currentPos) as [string, Position][];
      for (const [ticker, pos] of posEntries) {
        if (!pos || !pos.amount || pos.amount <= 0) {
          delete currentPos[ticker];
          positionsModified = true;
          continue;
        }

        const quote = portfolio[ticker]?.price || getSeededPrice(ticker);
        const lastPrice = (typeof pos.currentPrice === 'number' && pos.currentPrice > 0)
          ? pos.currentPrice
          : (quote || pos.entryPrice);

        // Realistic momentum drift between -0.3% and +1.1% per cycle with council upside alpha
        const drift = (Math.random() * 0.014 - 0.003);
        const newPrice = parseFloat((lastPrice * (1 + drift)).toFixed(lastPrice < 10 ? 4 : 2));

        const cost = pos.amount * pos.entryPrice;
        const currentVal = pos.amount * newPrice;
        const pnl = currentVal - cost;
        const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

        pos.currentPrice = newPrice;
        pos.unrealizedPnl = parseFloat(pnl.toFixed(2));
        pos.unrealizedPnlPct = parseFloat(pnlPct.toFixed(2));
        positionsModified = true;

        // Auto Take Profit target reached
        if (pnlPct >= targetExitPct) {
          const proceeds = parseFloat(currentVal.toFixed(2));
          const prevCash = nextCash;
          nextCash = parseFloat((nextCash + proceeds).toFixed(2));
          delete currentPos[ticker];

          const tpLedger: AutopilotLedgerEntry = {
            id: `tp-auto-${Date.now()}-${ticker}`,
            timestamp: new Date().toLocaleTimeString(),
            utcTimestamp: new Date().toISOString(),
            type: 'TAKE_PROFIT',
            ticker,
            amount: pos.amount,
            price: newPrice,
            totalUsd: proceeds,
            balanceBefore: prevCash,
            balanceAfter: nextCash,
            realizedPnl: parseFloat(pnl.toFixed(2)),
            realizedPnlPct: parseFloat(pnlPct.toFixed(2)),
            notes: `Auto-Exit Take Profit (+${pnlPct.toFixed(2)}%): Closed ${pos.amount.toFixed(4)} ${ticker} at $${newPrice.toLocaleString()}. Full proceeds of +$${proceeds.toFixed(2)} credited to Available Cash.`,
          };

          setLedger((prev) => [tpLedger, ...prev.slice(0, 299)]);
          setLogs((prev) => [
            {
              id: `log-tp-${Date.now()}-${ticker}`,
              timestamp: new Date().toLocaleTimeString(),
              ticker,
              action: 'SELL',
              sizePct: 100,
              text: `[AUTO TAKE PROFIT] Closed ${ticker} at $${newPrice.toLocaleString()} (+${pnlPct.toFixed(2)}%). Full proceeds of $${proceeds.toFixed(2)} credited to Cash Reserve.`,
              status: 'APPROVED',
              source: 'AUTONOMOUS',
            },
            ...prev.slice(0, 59),
          ]);
          playTradeApprovedChime();
          continue;
        }

        // Stop Loss protection
        if (pnlPct <= -2.4) {
          const proceeds = parseFloat(currentVal.toFixed(2));
          const prevCash = nextCash;
          nextCash = parseFloat((nextCash + proceeds).toFixed(2));
          delete currentPos[ticker];

          const slLedger: AutopilotLedgerEntry = {
            id: `sl-auto-${Date.now()}-${ticker}`,
            timestamp: new Date().toLocaleTimeString(),
            utcTimestamp: new Date().toISOString(),
            type: 'STOP_LOSS',
            ticker,
            amount: pos.amount,
            price: newPrice,
            totalUsd: proceeds,
            balanceBefore: prevCash,
            balanceAfter: nextCash,
            realizedPnl: parseFloat(pnl.toFixed(2)),
            realizedPnlPct: parseFloat(pnlPct.toFixed(2)),
            notes: `Risk Sentinel Stop-Loss: Closed ${pos.amount.toFixed(4)} ${ticker} at $${newPrice.toLocaleString()}. Capital preserved.`,
          };

          setLedger((prev) => [slLedger, ...prev.slice(0, 299)]);
          playRiskVetoTone();
          continue;
        }
      }

      // 2. Opportunistic position entry if below max capacity
      const activeCount = (Object.values(currentPos) as Position[]).filter((p: Position) => Boolean(p && p.amount > 0)).length;
      const maxSlots = maxOpenPositionsRef.current || 3;
      if (activeCount < maxSlots && nextCash >= 1500) {
        const candidateTickers = ['BTC', 'ETH', 'SOL', 'SUI', 'NVDAon', 'TSLAon', 'BGB', 'MSTR'];
        const unheld = candidateTickers.filter((t) => {
          const cleanT = t.toUpperCase().replace('/USDT', '').replace('ON', '');
          return !Object.keys(currentPos).some((k) => {
            const cleanK = k.toUpperCase().replace('/USDT', '').replace('ON', '');
            return cleanK === cleanT;
          });
        });

        if (unheld.length > 0) {
          const chosenTicker = unheld[Math.floor(Math.random() * unheld.length)];
          const quote = portfolio[chosenTicker]?.price || getSeededPrice(chosenTicker);
          const entryPrice = parseFloat(quote.toFixed(quote < 10 ? 4 : 2));
          const targetSizeUsd = Math.min(6000, Math.max(1500, parseFloat((nextCash * 0.12).toFixed(2))));
          const units = parseFloat((targetSizeUsd / entryPrice).toFixed(entryPrice < 10 ? 2 : 4));
          const actualCost = parseFloat((units * entryPrice).toFixed(2));

          if (nextCash >= actualCost && actualCost > 0) {
            const prevCash = nextCash;
            nextCash = parseFloat((nextCash - actualCost).toFixed(2));
            currentPos[chosenTicker] = {
              ticker: chosenTicker,
              amount: units,
              entryPrice,
              currentPrice: entryPrice,
              unrealizedPnl: 0,
              unrealizedPnlPct: 0,
              class: chosenTicker.toLowerCase().includes('on') ? 'EQ' : 'CX',
            };
            positionsModified = true;

            const buyLedger: AutopilotLedgerEntry = {
              id: `buy-auto-${Date.now()}-${chosenTicker}`,
              timestamp: new Date().toLocaleTimeString(),
              utcTimestamp: new Date().toISOString(),
              type: 'BUY',
              ticker: chosenTicker,
              amount: units,
              price: entryPrice,
              totalUsd: actualCost,
              balanceBefore: prevCash,
              balanceAfter: nextCash,
              realizedPnl: 0,
              realizedPnlPct: 0,
              notes: `Autonomous Entry: Deployed $${actualCost.toLocaleString()} into ${units.toFixed(4)} ${chosenTicker} at $${entryPrice.toLocaleString()}.`,
            };
            setLedger((prev) => [buyLedger, ...prev.slice(0, 299)]);
            setLogs((prev) => [
              {
                id: `log-buy-${Date.now()}-${chosenTicker}`,
                timestamp: new Date().toLocaleTimeString(),
                ticker: chosenTicker,
                action: 'BUY',
                sizePct: Math.round((actualCost / (nextCash + actualCost)) * 100),
                text: `[AUTONOMOUS ENTRY] Deployed $${actualCost.toLocaleString()} into ${chosenTicker} at $${entryPrice.toLocaleString()}`,
                status: 'APPROVED',
                source: 'AUTONOMOUS',
              },
              ...prev.slice(0, 59),
            ]);
            playTradeApprovedChime();
          }
        }
      }

      if (positionsModified) {
        setPositions(currentPos);
        positionsRef.current = currentPos;
      }
      if (nextCash !== currentCash) {
        setCashBalance(nextCash);
        cashBalanceRef.current = nextCash;
      }
    };

    const timer = setInterval(runAutonomousTick, intervalMs);
    const initialTimer = setTimeout(runAutonomousTick, 1200);

    return () => {
      clearInterval(timer);
      clearTimeout(initialTimer);
    };
  }, [isExecuting, isTurbo, portfolio]);

  const toggleExecuting = useCallback(() => {
    setIsExecuting((prev) => {
      const next = !prev;
      playTradeApprovedChime();
      isExecutingRef.current = next;
      return next;
    });
  }, []);

  const handleSetAutoExitPct = useCallback((val: number | ((prev: number) => number)) => {
    setAutoExitPct((prev) => {
      const next = typeof val === 'function' ? (val as (p: number) => number)(prev) : val;
      autoExitPctRef.current = next;
      return next;
    });
  }, []);

  const handleSetMaxOpenPositions = useCallback((val: number | ((prev: number) => number)) => {
    setMaxOpenPositions((prev) => {
      const next = typeof val === 'function' ? (val as (p: number) => number)(prev) : val;
      maxOpenPositionsRef.current = next;
      return next;
    });
  }, []);

  const handleSetIsTurbo = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setIsTurbo((prev) => {
      const next = typeof val === 'function' ? (val as (p: boolean) => boolean)(prev) : val;
      isTurboRef.current = next;
      return next;
    });
  }, []);

  /**
   * Buy execution: executes immediately within the device sandbox
   */
  const executeSimulatedBuy = useCallback((
    ticker: string,
    sizePct: number,
    currentPrice: number,
    assetClass: 'CX' | 'EQ'
  ): BuyExecutionResult => {
    const normTicker = ticker.toUpperCase();
    const validPrice = Number(currentPrice) || getSeededPrice(normTicker);
    const validSizePct = Math.min(15, Math.max(1, Number(sizePct) || 5));
    const totalVal = calculateTotalValue();
    const tradeUsd = Math.min(25000, (totalVal * validSizePct) / 100);
    const units = parseFloat((tradeUsd / validPrice).toFixed(validPrice < 10 ? 2 : 4));
    const actualCost = parseFloat((units * validPrice).toFixed(2));

    if (cashBalanceRef.current >= actualCost && actualCost > 0) {
      const prevCash = cashBalanceRef.current;
      const nextCash = parseFloat((prevCash - actualCost).toFixed(2));
      setCashBalance(nextCash);
      cashBalanceRef.current = nextCash;

      const nextPositions = { ...positionsRef.current };
      nextPositions[normTicker] = {
        ticker: normTicker,
        amount: units,
        entryPrice: validPrice,
        currentPrice: validPrice,
        unrealizedPnl: 0,
        unrealizedPnlPct: 0,
        class: assetClass,
      };
      setPositions(nextPositions);
      positionsRef.current = nextPositions;

      const buyLedger: AutopilotLedgerEntry = {
        id: `buy-manual-${Date.now()}-${normTicker}`,
        timestamp: new Date().toLocaleTimeString(),
        utcTimestamp: new Date().toISOString(),
        type: 'BUY',
        ticker: normTicker,
        amount: units,
        price: validPrice,
        totalUsd: actualCost,
        balanceBefore: prevCash,
        balanceAfter: nextCash,
        realizedPnl: 0,
        realizedPnlPct: 0,
        notes: `Manual Cockpit Buy: Allocated $${actualCost.toLocaleString()} into ${units.toFixed(4)} ${normTicker} at $${validPrice.toLocaleString()}.`,
      };
      setLedger((prev) => [buyLedger, ...prev.slice(0, 299)]);
      playTradeApprovedChime();
    }

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
   * Sell / Take Profit execution:
   * Instantly closes position on this device, adds full proceeds to Available Cash,
   * appends ledger entry, and plays chime.
   */
  const executeSimulatedSell = useCallback((ticker: string, currentPrice?: number): SellExecutionResult => {
    const cleanTicker = String(ticker || '').trim();

    const currentPositions = { ...positionsRef.current };
    const posKey = Object.keys(currentPositions).find((k) => {
      const upperK = k.toUpperCase().replace('/USDT', '').replace('ON', '');
      const upperT = cleanTicker.toUpperCase().replace('/USDT', '').replace('ON', '');
      return k.toUpperCase() === cleanTicker.toUpperCase() || upperK === upperT;
    }) || cleanTicker;

    const existingPos = currentPositions[posKey] || currentPositions[cleanTicker];
    const exitPrice = (typeof currentPrice === 'number' && currentPrice > 0)
      ? currentPrice
      : (existingPos?.currentPrice || existingPos?.entryPrice || 0);

    const units = existingPos?.amount || 0;
    const entryPrice = existingPos?.entryPrice || exitPrice;
    const totalProceeds = parseFloat((units * exitPrice).toFixed(2));
    const totalCost = parseFloat((units * entryPrice).toFixed(2));
    const pnl = parseFloat((totalProceeds - totalCost).toFixed(2));
    const pnlPct = totalCost > 0 ? parseFloat((((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2)) : 0;

    if (existingPos && units > 0) {
      delete currentPositions[posKey];
      delete currentPositions[cleanTicker];
      for (const k of Object.keys(currentPositions)) {
        if (k.toUpperCase().replace('/USDT', '').replace('ON', '') === cleanTicker.toUpperCase().replace('/USDT', '').replace('ON', '')) {
          delete currentPositions[k];
        }
      }
      const prevCash = cashBalanceRef.current;
      const nextCash = parseFloat((prevCash + totalProceeds).toFixed(2));

      setCashBalance(nextCash);
      cashBalanceRef.current = nextCash;
      setPositions(currentPositions);
      positionsRef.current = currentPositions;

      const manualLedger: AutopilotLedgerEntry = {
        id: `tp-manual-${Date.now()}-${cleanTicker}`,
        timestamp: new Date().toLocaleTimeString(),
        utcTimestamp: new Date().toISOString(),
        type: pnl >= 0 ? 'TAKE_PROFIT' : 'STOP_LOSS',
        ticker: cleanTicker,
        amount: units,
        price: exitPrice,
        totalUsd: totalProceeds,
        balanceBefore: prevCash,
        balanceAfter: nextCash,
        realizedPnl: pnl,
        realizedPnlPct: pnlPct,
        notes: `Take Profit Executed: Closed ${units.toFixed(4)} ${cleanTicker} at $${exitPrice.toLocaleString()} (${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%). Full proceeds +$${totalProceeds.toFixed(2)} credited to Available Cash.`,
      };

      setLedger((prev) => [manualLedger, ...prev.slice(0, 299)]);
      if (pnl >= 0) {
        playTradeApprovedChime();
      } else {
        playRiskVetoTone();
      }
    }

    return {
      success: true,
      ticker: cleanTicker,
      units,
      price: exitPrice,
      proceeds: totalProceeds,
      pnl,
      pnlPct,
    };
  }, []);

  /**
   * Continuous Market Prices Sync across terminal
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
    };

    syncMarketPrices();
    const interval = setInterval(syncMarketPrices, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  /**
   * Handle incoming signals from Council or Algo Builder within device sandbox
   */
  const handleIncomingCouncilSignal = useCallback(async (proposal: TradeProposal) => {
    if (!proposal || !proposal.asset) return;
    const ticker = proposal.asset.toUpperCase();
    const quote = portfolio[ticker]?.price || getSeededPrice(ticker);
    const targetSizeUsd = 3000;
    const units = parseFloat((targetSizeUsd / quote).toFixed(quote < 10 ? 2 : 4));
    const cost = parseFloat((units * quote).toFixed(2));

    if (cashBalanceRef.current >= cost) {
      const prevCash = cashBalanceRef.current;
      const nextCash = parseFloat((prevCash - cost).toFixed(2));
      setCashBalance(nextCash);
      cashBalanceRef.current = nextCash;
      const nextPositions = { ...positionsRef.current };
      nextPositions[ticker] = {
        ticker,
        amount: units,
        entryPrice: quote,
        currentPrice: quote,
        unrealizedPnl: 0,
        unrealizedPnlPct: 0,
        class: ticker.toLowerCase().includes('on') ? 'EQ' : 'CX',
      };
      setPositions(nextPositions);
      positionsRef.current = nextPositions;
      playTradeApprovedChime();
    }
  }, [portfolio]);

  const dispatchProposal = useCallback((proposal: TradeProposal) => {
    handleIncomingCouncilSignal(proposal);
  }, [handleIncomingCouncilSignal]);

  /**
   * Manual Cockpit Order Execution
   */
  const handleManualTrade = useCallback(async (ticker: string, action: 'BUY' | 'SELL', usdAmount?: number) => {
    const sym = ticker.toUpperCase();
    const tradeUsd = usdAmount || 2500;
    const quote = portfolio[sym]?.price || getSeededPrice(sym);

    if (action === 'BUY') {
      const units = parseFloat((tradeUsd / quote).toFixed(quote < 10 ? 2 : 4));
      const actualCost = parseFloat((units * quote).toFixed(2));
      if (cashBalanceRef.current >= actualCost) {
        const prevCash = cashBalanceRef.current;
        const nextCash = parseFloat((prevCash - actualCost).toFixed(2));
        setCashBalance(nextCash);
        cashBalanceRef.current = nextCash;
        const nextPositions = { ...positionsRef.current };
        nextPositions[sym] = {
          ticker: sym,
          amount: units,
          entryPrice: quote,
          currentPrice: quote,
          unrealizedPnl: 0,
          unrealizedPnlPct: 0,
          class: sym.toLowerCase().includes('on') ? 'EQ' : 'CX',
        };
        setPositions(nextPositions);
        positionsRef.current = nextPositions;

        const manualEntry: AutopilotLedgerEntry = {
          id: `manual-buy-${Date.now()}-${sym}`,
          timestamp: new Date().toLocaleTimeString(),
          utcTimestamp: new Date().toISOString(),
          type: 'BUY',
          ticker: sym,
          amount: units,
          price: quote,
          totalUsd: actualCost,
          balanceBefore: prevCash,
          balanceAfter: nextCash,
          realizedPnl: 0,
          realizedPnlPct: 0,
          notes: `Manual Cockpit Buy: Allocated $${actualCost.toLocaleString()} into ${units.toFixed(4)} ${sym} at $${quote.toLocaleString()}.`,
        };
        setLedger((prev) => [manualEntry, ...prev.slice(0, 299)]);
        playTradeApprovedChime();
      }
    } else {
      executeSimulatedSell(sym, quote);
    }
  }, [portfolio, executeSimulatedSell]);

  /**
   * Cash out 100% of open positions into Available Cash on this device
   */
  const handleCashoutAllPositions = useCallback(() => {
    const currentPositions = { ...positionsRef.current };
    const posList = (Object.values(currentPositions) as Position[]).filter((p: Position) => Boolean(p && p.amount > 0));
    if (posList.length === 0) return;

    let totalProceeds = 0;
    const newLedgerEntries: AutopilotLedgerEntry[] = [];
    const prevCash = cashBalanceRef.current;

    for (const pos of posList) {
      const livePrice = pos.currentPrice || pos.entryPrice;
      const proceeds = parseFloat((pos.amount * livePrice).toFixed(2));
      const cost = parseFloat((pos.amount * pos.entryPrice).toFixed(2));
      const pnl = parseFloat((proceeds - cost).toFixed(2));
      const pnlPct = cost > 0 ? parseFloat((((livePrice - pos.entryPrice) / pos.entryPrice) * 100).toFixed(2)) : 0;
      totalProceeds += proceeds;

      newLedgerEntries.push({
        id: `cashout-all-${Date.now()}-${pos.ticker}`,
        timestamp: new Date().toLocaleTimeString(),
        utcTimestamp: new Date().toISOString(),
        type: pnl >= 0 ? 'TAKE_PROFIT' : 'STOP_LOSS',
        ticker: pos.ticker,
        amount: pos.amount,
        price: livePrice,
        totalUsd: proceeds,
        balanceBefore: prevCash,
        balanceAfter: prevCash + totalProceeds,
        realizedPnl: pnl,
        realizedPnlPct: pnlPct,
        notes: `Cashout All Executed: Closed ${pos.ticker} at $${livePrice.toLocaleString()} (${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%). Full proceeds credited to Available Cash.`,
      });
    }

    const nextCash = parseFloat((prevCash + totalProceeds).toFixed(2));
    setPositions({});
    positionsRef.current = {};
    setCashBalance(nextCash);
    cashBalanceRef.current = nextCash;
    setLedger((prev) => [...newLedgerEntries, ...prev.slice(0, 299)]);
    playTradeApprovedChime();
  }, []);

  /**
   * Reset portfolio to initial $100,000 cash on this device
   */
  const handleConfirmPasscodeReset = useCallback(() => {
    const prevCash = cashBalanceRef.current;
    setCashBalance(100000);
    cashBalanceRef.current = 100000;
    setPositions({});
    positionsRef.current = {};
    const resetEntry: AutopilotLedgerEntry = {
      id: `reset-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      utcTimestamp: new Date().toISOString(),
      type: 'MANUAL_INTERVENTION',
      ticker: 'USD',
      amount: 1,
      price: 100000,
      totalUsd: 100000,
      balanceBefore: prevCash,
      balanceAfter: 100000,
      realizedPnl: 0,
      realizedPnlPct: 0,
      notes: 'Administrative reset: Portfolio re-initialized to $100,000 baseline cash reserve.',
    };
    setLedger([resetEntry]);
    playTradeApprovedChime();
  }, []);

  // Global reset listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleReset = () => {
      handleConfirmPasscodeReset();
    };
    window.addEventListener('lunaris-autopilot-reset', handleReset);
    return () => {
      window.removeEventListener('lunaris-autopilot-reset', handleReset);
    };
  }, [handleConfirmPasscodeReset]);

  return (
    <AutopilotContext.Provider
      value={{
        deviceSessionId,
        isExecuting,
        setIsExecuting,
        toggleExecuting,
        isTurbo,
        setIsTurbo: handleSetIsTurbo,
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
        setAutoExitPct: handleSetAutoExitPct,
        maxOpenPositions,
        setMaxOpenPositions: handleSetMaxOpenPositions,
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
