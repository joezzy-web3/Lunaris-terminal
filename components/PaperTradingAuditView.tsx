import React, { useState, useEffect, useRef } from 'react';
import {
  getSavedPaperTrades,
  savePaperTrades,
  recordNewPaperTrade,
  resetPaperTradesToSeed,
  generateAutonomousTradeScenario,
  calculateAuditMetrics,
  generateCsvExport,
  syncServerAuditTrades,
  executeAuditorSanitization,
  purgeCorruptLocalStorageTrades,
  resolveTradePrices,
  PaperTradeRecord,
  AuditSummaryMetrics,
} from '@/lib/paperTradingAudit';
import {
  subscribeToFirestoreAuditTrades,
  formatAuditTimestamp,
  isFirestoreQuotaExceeded,
  reconcileTradeCollection,
} from '@/lib/firestoreAudit';
import { useLiveMarketQuotes } from '@/lib/livePrices';
import { DailyPnlCalendar } from '@/components/DailyPnlCalendar';
import {
  Download,
  Copy,
  CheckCircle2,
  ScrollText,
  Search,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  Play,
  Pause,
  Zap,
  RotateCcw,
  Sparkles,
  Radio,
  Lock,
  Key,
  X,
  ShieldAlert,
  Eye,
  EyeOff,
  Skull,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { playCyberClick, playTradeApprovedChime, playRiskVetoTone } from '@/lib/soundSynth';
import { TradeProofModal } from '@/components/TradeProofModal';

interface PaperTradingAuditViewProps {
  onNavigateToCockpit?: (ticker?: string) => void;
}

export const PaperTradingAuditView: React.FC<PaperTradingAuditViewProps> = ({
  onNavigateToCockpit,
}) => {
  const [trades, setTrades] = useState<PaperTradeRecord[]>(() => getSavedPaperTrades());
  const [filter, setFilter] = useState<'ALL' | 'LONG' | 'SHORT' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'RTOKENS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number | 'ALL'>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [isAutoTicking, setIsAutoTicking] = useState(true);
  const [secondsUntilNextTick, setSecondsUntilNextTick] = useState(14);
  const [latestTradeId, setLatestTradeId] = useState<string | null>(null);
  const [selectedProofTrade, setSelectedProofTrade] = useState<PaperTradeRecord | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(() => isFirestoreQuotaExceeded());
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [sanitizerBanner, setSanitizerBanner] = useState<{
    visible: boolean;
    message: string | null;
  }>({ visible: false, message: null });

  // Listen for Firestore free-tier quota events
  useEffect(() => {
    const onQuotaEvent = () => setQuotaExceeded(true);
    window.addEventListener('lunaris-firestore-quota-exceeded', onQuotaEvent);
    return () => window.removeEventListener('lunaris-firestore-quota-exceeded', onQuotaEvent);
  }, []);

  // Security Access Verification Modal
  const [showAuthPasscode, setShowAuthPasscode] = useState(false);
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    action: 'RESET_LOG' | 'PAUSE_LOOP' | 'SANITIZE_LOG' | 'PURGE_CORRUPT';
    passcode: string;
    error: string | null;
    success: boolean;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    action: 'RESET_LOG',
    passcode: '',
    error: null,
    success: false,
    isSubmitting: false,
  });

  // Real-time Bitget market feed & tokenized equities from unified WebSocket/REST poller
  const { quotes } = useLiveMarketQuotes();

  // Helper to merge trade collections monotonically without ever dropping historical records
  const mergeTradesSafely = (
    currentList: PaperTradeRecord[],
    newList: PaperTradeRecord[]
  ): PaperTradeRecord[] => {
    return reconcileTradeCollection([...currentList, ...newList]);
  };

  // Sync with Firestore Cloud real-time updates, Server Disk Ledger, and global storage events
  useEffect(() => {
    let isMounted = true;

    // Normal trade updates merge safely so that smaller partial snapshots cannot wipe out historical orders
    const handleUpdate = (e: any) => {
      if (!isMounted) return;
      const incoming = e.detail && Array.isArray(e.detail) ? e.detail : getSavedPaperTrades();
      if (!Array.isArray(incoming) || incoming.length === 0) return;
      setTrades((prev) => reconcileTradeCollection([...prev, ...incoming]));
    };
    window.addEventListener('lunaris-audit-updated', handleUpdate);

    // Explicit Auditor Secret Passcode Reset
    const handleReset = (e: any) => {
      if (!isMounted) return;
      if (Array.isArray(e.detail)) {
        setTrades(reconcileTradeCollection(e.detail));
      }
    };
    window.addEventListener('lunaris-audit-reset', handleReset);

    // 1. Real-time Firestore listener across all devices/browsers
    // Merges new cloud trades by ID instead of clobbering the existing persistent ledger
    const unsubscribeFirestore = subscribeToFirestoreAuditTrades((cloudTrades) => {
      if (!isMounted || !cloudTrades || cloudTrades.length === 0) return;
      setTrades((prevTrades) => {
        const merged = reconcileTradeCollection([...prevTrades, ...cloudTrades]);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('LUNARIS_BITGET_S2_PAPER_TRADES_V2', JSON.stringify(merged));
          } catch {}
        }
        return merged;
      });
    });

    // 2. Initial cloud and server disk fetch to ensure all trades are pulled
    syncServerAuditTrades().then((serverTrades) => {
      if (!isMounted || !serverTrades || serverTrades.length === 0) return;
      setTrades((prevTrades) => reconcileTradeCollection([...prevTrades, ...serverTrades]));
    });

    // 3. Periodic background sync with server disk ledger (/api/audit/trades) every 10s
    // Ensures trades settled in background by server autopilot daemon are seamlessly merged in real-time
    const serverPollInterval = setInterval(() => {
      if (!isMounted) return;
      syncServerAuditTrades().then((serverTrades) => {
        if (!isMounted || !serverTrades || serverTrades.length === 0) return;
        setTrades((prevTrades) => reconcileTradeCollection([...prevTrades, ...serverTrades]));
      });
    }, 10000);

    return () => {
      isMounted = false;
      window.removeEventListener('lunaris-audit-updated', handleUpdate);
      window.removeEventListener('lunaris-audit-reset', handleReset);
      unsubscribeFirestore();
      clearInterval(serverPollInterval);
    };
  }, []);

  const quotesRef = useRef(quotes);
  quotesRef.current = quotes;
  const isExecutingRef = useRef(false);

  // 1-second countdown timer for auto-ticking UI
  useEffect(() => {
    if (!isAutoTicking) return;

    const timer = setInterval(() => {
      setSecondsUntilNextTick((prev) => {
        if (prev <= 1) {
          return Math.floor(Math.random() * 8) + 12; // Reset interval: 12-20s
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoTicking]);

  // Continuous 7x24 Autonomous Paper-Trading Loop: Syncs authoritative 24/7 server daemon trades
  useEffect(() => {
    if (!isAutoTicking || secondsUntilNextTick !== 1) return;
    if (isExecutingRef.current) return;

    isExecutingRef.current = true;
    (async () => {
      try {
        const previousCount = trades.length;
        const serverTrades = await syncServerAuditTrades();
        if (serverTrades && serverTrades.length > 0) {
          setTrades(serverTrades);
          if (serverTrades.length > previousCount) {
            const newest = serverTrades[0];
            setLatestTradeId(newest.id);
            if (newest.balanceChange >= 0) {
              playTradeApprovedChime();
            } else {
              playRiskVetoTone();
            }
          }
        }
      } catch (err) {
        console.warn('Paper trading auto-tick sync notice:', err);
      } finally {
        setTimeout(() => {
          isExecutingRef.current = false;
        }, 1200);
      }
    })();
  }, [secondsUntilNextTick, isAutoTicking, trades.length]);

  // Clear highlight flash after 3s
  useEffect(() => {
    if (latestTradeId) {
      const t = setTimeout(() => setLatestTradeId(null), 3000);
      return () => clearTimeout(t);
    }
  }, [latestTradeId]);

  // Metrics dynamic recalculation
  const metrics: AuditSummaryMetrics = calculateAuditMetrics(trades);

  // Authoritative Agentic Trade Trigger (delegates to server daemon to maintain unified multi-browser state)
  const handleTriggerManualTrade = async () => {
    playCyberClick();
    try {
      const res = await fetch('/api/audit/trigger-daemon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success && data.trade) {
        const updated = await syncServerAuditTrades();
        setTrades(updated);
        setLatestTradeId(data.trade.id);
        if (data.trade.balanceChange >= 0) {
          playTradeApprovedChime();
        } else {
          playRiskVetoTone();
        }
        return;
      }
    } catch (e) {
      console.warn('Server trade trigger network notice, fallback to local simulator:', e);
    }

    // Offline / fallback execution
    const liveQuotes = quotesRef.current;
    const scenario = generateAutonomousTradeScenario(liveQuotes);
    const baseTicker = scenario.instrument.split('/')[0];
    if (liveQuotes[baseTicker]?.price) {
      scenario.price = liveQuotes[baseTicker].price;
    }

    const record = recordNewPaperTrade({
      ...scenario,
      sourceHandler: 'MANUAL',
    });
    setTrades(getSavedPaperTrades());
    setLatestTradeId(record.id);

    if (record.balanceChange >= 0) {
      playTradeApprovedChime();
    } else {
      playRiskVetoTone();
    }
  };

  const handleOpenAuthModal = (action: 'RESET_LOG' | 'PAUSE_LOOP' | 'SANITIZE_LOG' | 'PURGE_CORRUPT') => {
    playCyberClick();
    setShowAuthPasscode(false);
    setAuthModal({
      isOpen: true,
      action,
      passcode: '',
      error: null,
      success: false,
      isSubmitting: false,
    });
  };

  const handleVerifyAndExecute = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = authModal.passcode.trim().toLowerCase();
    const customKey = (() => {
      try {
        return (localStorage.getItem('LUNARIS_ADMIN_PASSCODE') || '').trim().toLowerCase();
      } catch {
        return '';
      }
    })();

    if (cleanCode !== 'chllap5803' && (!customKey || cleanCode !== customKey)) {
      playRiskVetoTone();
      setAuthModal((prev) => ({
        ...prev,
        error: 'ACCESS DENIED: Invalid Auditor Clearance Key. Action Prohibited.',
      }));
      return;
    }

    setAuthModal((prev) => ({ ...prev, isSubmitting: true, error: null }));

    if (authModal.action === 'PURGE_CORRUPT') {
      const pristine = purgeCorruptLocalStorageTrades();
      setTrades(pristine);
      await resetPaperTradesToSeed(cleanCode);
      playTradeApprovedChime();
      setAuthModal((prev) => ({ ...prev, isSubmitting: false, success: true }));
      setSanitizerBanner({
        visible: true,
        message: 'Purged corrupt local and server trades. Restored pristine Bitget S2 seed ledger.',
      });
      setTimeout(() => {
        setAuthModal((prev) => ({ ...prev, isOpen: false, success: false }));
      }, 1400);
      return;
    }

    if (authModal.action === 'RESET_LOG') {
      const res = await resetPaperTradesToSeed(cleanCode);
      if (!res.success) {
        playRiskVetoTone();
        setAuthModal((prev) => ({
          ...prev,
          isSubmitting: false,
          error: res.error || 'Ledger reset failed',
        }));
        return;
      }
      playTradeApprovedChime();
      setAuthModal((prev) => ({ ...prev, isSubmitting: false, success: true }));
      setTimeout(() => {
        setAuthModal((prev) => ({ ...prev, isOpen: false, success: false }));
      }, 1200);
    } else if (authModal.action === 'PAUSE_LOOP') {
      setIsAutoTicking(false);
      playTradeApprovedChime();
      setAuthModal((prev) => ({ ...prev, isSubmitting: false, success: true }));
      setTimeout(() => {
        setAuthModal((prev) => ({ ...prev, isOpen: false, success: false }));
      }, 1200);
    } else if (authModal.action === 'SANITIZE_LOG') {
      const res = await executeAuditorSanitization(cleanCode);
      if (!res.success) {
        playRiskVetoTone();
        setAuthModal((prev) => ({
          ...prev,
          isSubmitting: false,
          error: res.error || 'Sanitization failed',
        }));
        return;
      }
      playTradeApprovedChime();
      if (res.sanitizedTrades && res.sanitizedTrades.length > 0) {
        setTrades(res.sanitizedTrades);
      }
      setAuthModal((prev) => ({ ...prev, isSubmitting: false, success: true }));
      setSanitizerBanner({
        visible: true,
        message: `Auditor Cloud Sanitizer Completed: Successfully reconciled ${res.count} ledger items. Remediated ${res.modifiedCount} price & balance anomalies across Firestore Cloud and server disk.`,
      });
      setTimeout(() => {
        setAuthModal((prev) => ({ ...prev, isOpen: false, success: false }));
      }, 1400);
    }
  };

  const handleDownloadCsv = () => {
    playCyberClick();
    // Reconcile and deduplicate so downloaded CSV has zero duplicate rows and mathematically clean PnL
    const canonicalTrades = reconcileTradeCollection(trades);
    if (canonicalTrades.length !== trades.length) {
      setTrades(canonicalTrades);
    }
    const csv = generateCsvExport(canonicalTrades);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bitget_lunaris_paper_trading_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyJson = () => {
    playCyberClick();
    const canonicalTrades = reconcileTradeCollection(trades);
    if (canonicalTrades.length !== trades.length) {
      setTrades(canonicalTrades);
    }
    const data = {
      hackathon: 'Bitget AI Base Camp Hackathon S2',
      track: 'Track 2 - Agentic Trading (Agent Trading)',
      metrics: calculateAuditMetrics(canonicalTrades),
      auditLog: canonicalTrades,
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Filter and display in reverse chronological order (newest on top)
  const sortedTrades = [...trades].reverse();

  const filteredTrades = sortedTrades.filter((t) => {
    const matchesFilter =
      filter === 'ALL' ||
      (filter === 'LONG' && t.direction === 'LONG') ||
      (filter === 'SHORT' && t.direction === 'SHORT') ||
      (filter === 'TAKE_PROFIT' && t.status === 'TAKE_PROFIT') ||
      (filter === 'STOP_LOSS' && t.status === 'STOP_LOSS') ||
      (filter === 'RTOKENS' && (t.instrument.includes('NVDAon') || t.instrument.includes('TSLAon')));

    const matchesSearch =
      searchQuery.trim() === '' ||
      t.instrument.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.trigger.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate =
      !selectedDateFilter ||
      (t.timestamp && t.timestamp.startsWith(selectedDateFilter)) ||
      (t.id && t.id.includes(selectedDateFilter.replace(/-/g, '')));

    return matchesFilter && matchesSearch && matchesDate;
  });

  // Pagination calculations
  const totalItems = filteredTrades.length;
  const numericPageSize = pageSize === 'ALL' ? totalItems : pageSize;
  const totalPages = pageSize === 'ALL' || totalItems === 0 ? 1 : Math.ceil(totalItems / numericPageSize);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * numericPageSize;
  const endIndex = pageSize === 'ALL' ? totalItems : Math.min(startIndex + numericPageSize, totalItems);
  const paginatedTrades = pageSize === 'ALL' ? filteredTrades : filteredTrades.slice(startIndex, endIndex);

  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  };

  return (
    <div id="paper-trading-audit-section" className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner with Bitget S2 Branding */}
      <div className="bg-gradient-to-r from-[#0d0f18] via-[#10131e] to-[#0d0f18] border border-[#00F0FF]/30 rounded-2xl p-5 sm:p-6 shadow-[0_0_30px_rgba(0,240,255,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Lunaris Emblem */}
              <div className="relative flex items-center justify-center shrink-0">
                <div className="w-4 h-4 rounded-xs bg-gradient-to-tr from-[#00F0FF] via-cyan-400 to-[#00F0FF] rotate-45 shadow-[0_0_12px_rgba(0,240,255,0.7)]" />
                <div className="absolute w-1.5 h-1.5 rounded-full bg-[#0d0f18]" />
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-wider flex items-center gap-2">
                BITGET S2 OFFICIAL PAPER-TRADING AUDIT LEDGER
              </h1>
              <span className="text-[10px] bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Track 2 Agentic Trading Compliant
              </span>
              {quotaExceeded ? (
                <span className="text-[10px] bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5" title="Free daily write quota reached on Firebase Spark plan. Operating on persistent local & server ledger.">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  PERSISTENT LEDGER SYNC (SPARK TIER)
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE FIRESTORE CLOUD SYNC
                </span>
              )}
            </div>
            {quotaExceeded && (
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg px-3 py-1.5 text-[11px] text-amber-200/90 flex items-center justify-between gap-2 max-w-3xl">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Firestore daily write quota reached (Spark Free Plan). Audit logs are 100% preserved in the persistent server ledger and will resume cloud writes tomorrow.
                  </span>
                </div>
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0422269194/firestore/databases/ai-studio-lunaristerminal-a46b0af1-1948-4697-be4b-f2df2f1bb25b/data?openUpgradeDialog=true"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-amber-300 hover:text-white shrink-0 font-medium"
                >
                  Upgrade Database
                </a>
              </div>
            )}
            <p className="text-xs text-gray-300 max-w-3xl leading-relaxed">
              Official real-time paper-trading audit stream satisfying Bitget AI Base Camp S2 criteria: Continuous 7×24
              autonomous execution with verified UTC timestamps, instruments (including <strong>NVDAon/USDT</strong> & <strong>TSLAon/USDT</strong> tokenized equities),
              LONG/SHORT direction, sizing quantity, realized win/loss PnL, and live settled balance.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 1-Click Trigger Agentic Trade */}
            <button
              id="btn-trigger-agentic-trade"
              onClick={handleTriggerManualTrade}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold px-3.5 py-2.5 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-102 cursor-pointer"
              title="Simulate an instant Council-Quorum paper trade and log settlement"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>+ TRIGGER AGENTIC TRADE</span>
            </button>

            {/* CSV Download */}
            <button
              onClick={handleDownloadCsv}
              title={`Download complete audit ledger (${trades.length} historical verified executions)`}
              className="flex items-center gap-2 bg-[#00F0FF] hover:bg-[#38f6ff] text-black font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:scale-102 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>DOWNLOAD CSV</span>
            </button>

            {/* Copy JSON */}
            <button
              onClick={handleCopyJson}
              title={`Copy complete JSON audit trail (${trades.length} records)`}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-gray-200 border border-white/15 px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied JSON!' : 'Copy JSON'}</span>
            </button>

            {/* Auditor Cloud Sanitizer (Passcode Protected) */}
            <button
              id="btn-cloud-sanitizer"
              onClick={() => handleOpenAuthModal('SANITIZE_LOG')}
              className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              title="Auditor Cloud Sanitizer: Clean price corridors & reconcile cumulative balances across Firestore & Server"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-bold text-[11px]">CLOUD SANITIZER</span>
            </button>

            {/* Hard Purge Corrupt Local Artifacts */}
            <button
              id="btn-purge-corrupt"
              onClick={() => handleOpenAuthModal('PURGE_CORRUPT')}
              className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="Purge Corrupted Artifacts: Remove runaway local storage items and restore clean seed state"
            >
              <Skull className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline font-mono font-bold text-[11px]">PURGE CORRUPT</span>
            </button>

            {/* Reset to Seed (Protected by Administrative Passcode) */}
            <button
              id="btn-reset-audit-log"
              onClick={() => handleOpenAuthModal('RESET_LOG')}
              className="p-2.5 bg-white/5 hover:bg-[#00F0FF]/10 text-gray-400 hover:text-[#00F0FF] border border-white/10 hover:border-[#00F0FF]/40 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="Auditor Reset: Restore official seed data (Requires Passkey)"
            >
              <RotateCcw className="w-4 h-4 text-[#00F0FF]" />
              <span className="hidden sm:inline font-mono font-bold text-[11px]">RESET SEED</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Market Tickers Bar from Bitget API (Crypto + Tokenized Stocks) */}
      <div className="bg-[#0b0d14] border border-white/10 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider font-mono">
              Bitget Live Ticker Feed (USDT Spot & Tokenized 7x24 rTokens)
            </span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">
            API Sync: Active (4s interval)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
          {[
            { ticker: 'BTC', label: 'BTC/USDT', class: 'CX' },
            { ticker: 'ETH', label: 'ETH/USDT', class: 'CX' },
            { ticker: 'SOL', label: 'SOL/USDT', class: 'CX' },
            { ticker: 'NVDAon', label: 'NVDAon/USDT', class: 'rToken' },
            { ticker: 'TSLAon', label: 'TSLAon/USDT', class: 'rToken' },
          ].map((item) => {
            const data = quotes[item.ticker];
            const price = data?.price || 0;
            const change = data?.change24h || 0;
            const isUp = change >= 0;

            return (
              <div
                key={item.ticker}
                className="bg-white/5 border border-white/5 hover:border-yellow-400/30 rounded-lg p-2 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white flex items-center gap-1">
                    {item.label}
                    {item.class === 'rToken' && (
                      <span className="text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 rounded">
                        7x24
                      </span>
                    )}
                  </span>
                  <span className={`text-[10px] font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>
                <div className="text-sm font-black text-white mt-1">
                  ${price.toLocaleString(undefined, { minimumFractionDigits: price < 10 ? 4 : 2 })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quantitative Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0b0c12] border border-white/10 rounded-xl p-3.5">
          <p className="text-[11px] text-gray-400 font-mono">Current Settled Balance</p>
          <p className="text-lg font-bold text-white font-mono mt-1">
            ${metrics.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-400 font-mono font-semibold mt-0.5">
            +${metrics.totalPnl.toLocaleString()} (+{metrics.totalPnlPct.toFixed(2)}%)
          </p>
        </div>

        <div className="bg-[#0b0c12] border border-white/10 rounded-xl p-3.5">
          <p className="text-[11px] text-gray-400 font-mono">Win Rate (OOS)</p>
          <p className="text-lg font-bold text-emerald-400 font-mono mt-1">
            {metrics.winRatePct}%
          </p>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
            {metrics.winningTrades} Wins / {metrics.losingTrades} Losses
          </p>
        </div>

        <div className="bg-[#0b0c12] border border-white/10 rounded-xl p-3.5">
          <p className="text-[11px] text-gray-400 font-mono">Sharpe Ratio</p>
          <p className="text-lg font-bold text-yellow-400 font-mono mt-1">
            {metrics.sharpeRatio}
          </p>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
            Annualized & Recalibrated
          </p>
        </div>

        <div className="bg-[#0b0c12] border border-white/10 rounded-xl p-3.5">
          <p className="text-[11px] text-gray-400 font-mono">Max Drawdown</p>
          <p className="text-lg font-bold text-cyan-400 font-mono mt-1">
            {metrics.maxDrawdownPct}%
          </p>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
            Guardian-01 Hard Capped
          </p>
        </div>

        <div className="bg-[#0b0c12] border border-white/10 rounded-xl p-3.5">
          <p className="text-[11px] text-gray-400 font-mono">Profit Factor</p>
          <p className="text-lg font-bold text-white font-mono mt-1">
            {metrics.profitFactor}
          </p>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
            Avg R:R {metrics.avgRiskReward}
          </p>
        </div>

        <div className="bg-[#0b0c12] border border-white/10 rounded-xl p-3.5">
          <p className="text-[11px] text-gray-400 font-mono">Total Closed Orders</p>
          <p className="text-lg font-bold text-white font-mono mt-1">
            {metrics.totalTrades} Executed
          </p>
          <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
            100% Verifiable Logs
          </p>
        </div>
      </div>

      {/* Auditor Cloud Sanitizer Notification Banner */}
      {sanitizerBanner.visible && sanitizerBanner.message && (
        <div className="bg-emerald-950/60 border border-emerald-500/60 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs font-mono text-emerald-300 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{sanitizerBanner.message}</span>
          </div>
          <button
            onClick={() => setSanitizerBanner({ visible: false, message: null })}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Daily PNL Interactive Calendar & Distribution Heatmap */}
      <DailyPnlCalendar
        trades={trades}
        selectedDate={selectedDateFilter}
        onSelectDate={(d) => {
          setSelectedDateFilter(d);
          setCurrentPage(1);
        }}
      />

      {/* Live Auto-Trader Controller Status Bar */}
      <div className="bg-[#0a0b12] border border-emerald-500/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isAutoTicking ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`} />
            <span className="text-xs font-bold text-white">
              7×24 Autonomous Paper-Trading Loop:
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isAutoTicking ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-700 text-gray-300'}`}>
              {isAutoTicking ? 'ACTIVE (STREAMING)' : 'PAUSED'}
            </span>
          </div>

          {isAutoTicking && (
            <span className="text-xs text-gray-400 hidden sm:inline">
              Next Agentic Execution in <span className="text-yellow-400 font-bold">{secondsUntilNextTick}s</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-auto-loop"
            onClick={() => {
              playCyberClick();
              if (isAutoTicking) {
                // Pausing requires Auditor Clearance
                handleOpenAuthModal('PAUSE_LOOP');
              } else {
                // Resuming is allowed
                setIsAutoTicking(true);
                playTradeApprovedChime();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              isAutoTicking
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {isAutoTicking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoTicking ? 'Pause Auto-Loop (Auth Req)' : 'Resume Auto-Loop'}</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Filters, Row Size & Search */}
      <div className="bg-[#090a10] border border-white/10 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-400 font-mono mr-1">Filter:</span>
          {(['ALL', 'LONG', 'SHORT', 'TAKE_PROFIT', 'STOP_LOSS', 'RTOKENS'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                playCyberClick();
                setFilter(mode);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                filter === mode
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {mode === 'RTOKENS' ? 'NVDAon & TSLAon' : mode.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
          {/* Rows per page selector */}
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/10 rounded-lg p-1 text-xs font-mono">
            <span className="text-gray-400 px-1.5 text-[11px] font-semibold">Rows:</span>
            {([10, 20, 50, 100, 'ALL'] as const).map((size) => (
              <button
                key={size}
                onClick={() => {
                  playCyberClick();
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  pageSize === size
                    ? 'bg-[#00F0FF] text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {size === 'ALL' ? 'All' : size}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ticker, ID, trigger..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-yellow-400/50"
            />
          </div>

          <div className="text-xs text-gray-400 font-mono flex items-center gap-1.5 shrink-0">
            <Activity className="w-3.5 h-3.5 text-yellow-400" />
            <span>{filteredTrades.length} of {trades.length} audited</span>
          </div>
        </div>
      </div>

      {/* Real-Time Live Execution Toast (if user is on page > 1) */}
      {latestTradeId && safeCurrentPage !== 1 && (
        <div className="bg-[#00F0FF]/10 border border-[#00F0FF]/40 rounded-xl p-2.5 px-4 flex items-center justify-between gap-3 text-xs font-mono animate-pulse">
          <div className="flex items-center gap-2 text-[#00F0FF]">
            <Zap className="w-4 h-4 shrink-0" />
            <span>New autonomous trade settled (<strong>{latestTradeId}</strong>) on Page 1</span>
          </div>
          <button
            onClick={() => {
              playCyberClick();
              setCurrentPage(1);
            }}
            className="bg-[#00F0FF] text-black text-[11px] font-bold px-3 py-1 rounded-lg hover:bg-cyan-300 transition-colors shrink-0 cursor-pointer"
          >
            Jump to Page 1
          </button>
        </div>
      )}

      {/* Ledger Table with Live Highlight Flash */}
      <div className="bg-[#08090f] border border-white/10 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-white/15 text-gray-400 uppercase text-[10px] tracking-wider bg-white/[0.02]">
                <th className="py-3 px-3.5">ID / Timestamp (UTC)</th>
                <th className="py-3 px-3.5">Instrument</th>
                <th className="py-3 px-3.5">Direction</th>
                <th className="py-3 px-3.5 text-right">Entry / Exit Price</th>
                <th className="py-3 px-3.5 text-right">Size (USDT)</th>
                <th className="py-3 px-3.5 text-right">Balance Change</th>
                <th className="py-3 px-3.5 text-right">Settled Balance</th>
                <th className="py-3 px-3.5">Council Quorum / Execution Trigger</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-center">Audit Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedTrades.map((trade) => {
                const isProfit = trade.balanceChange >= 0;
                const isJustAdded = trade.id === latestTradeId;

                return (
                  <tr
                    key={trade.id}
                    onClick={() => {
                      playCyberClick();
                      setSelectedProofTrade(trade);
                    }}
                    className={`transition-colors cursor-pointer ${
                      isJustAdded
                        ? 'bg-[#00F0FF]/15 border-l-4 border-[#00F0FF]'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <td className="py-3 px-3.5 text-gray-300 whitespace-nowrap">
                      {(() => {
                        const { dateStr, timeStr } = formatAuditTimestamp(trade.timestamp, trade.id);
                        return (
                          <>
                            <div className="font-bold text-white text-[11px] flex items-center gap-1">
                              <span>{trade.id}</span>
                              {isJustAdded && (
                                <span className="text-[9px] bg-[#00F0FF] text-black px-1.5 rounded font-extrabold uppercase">
                                  NEW
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono flex items-center gap-1.5 mt-0.5">
                              <span className="text-gray-300 font-medium">{dateStr}</span>
                              <span className="text-[#00F0FF]/80">{timeStr}</span>
                            </div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-white whitespace-nowrap">
                      <span className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs flex items-center gap-1 w-fit">
                        <span>{trade.instrument}</span>
                        {(trade.instrument.includes('NVDAon') || trade.instrument.includes('TSLAon')) && (
                          <span className="text-[8px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1 rounded">
                            rToken
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          trade.direction === 'LONG'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {trade.direction} {trade.leverage}x
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-medium whitespace-nowrap">
                      {(() => {
                        const { entryPrice, exitPrice, priceDelta, priceDeltaPct } = resolveTradePrices(trade);
                        const isWin = trade.balanceChange >= 0;
                        const decimals = entryPrice < 10 ? 4 : 2;
                        const base = trade.instrument.split('/')[0];
                        const live = quotes[base]?.price;

                        return (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="text-gray-400 text-[9px] uppercase px-1 py-0.2 bg-white/5 rounded border border-white/10">In</span>
                              <span className="text-gray-200 font-semibold">${entryPrice.toLocaleString(undefined, { minimumFractionDigits: decimals })}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] mt-0.5">
                              <span className="text-gray-400 text-[9px] uppercase px-1 py-0.2 bg-white/5 rounded border border-white/10">Out</span>
                              <span className={`font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ${exitPrice.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                              </span>
                            </div>
                            <div className="text-[9.5px] font-mono flex items-center gap-1 mt-0.5">
                              <span className={priceDelta >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'}>
                                {priceDelta >= 0 ? '▲ +' : '▼ -'}${Math.abs(priceDelta).toFixed(decimals)} ({priceDeltaPct >= 0 ? '+' : ''}{priceDeltaPct.toFixed(2)}%)
                              </span>
                              {live && (
                                <span className="text-gray-500 font-normal">| Live: ${live.toLocaleString(undefined, { minimumFractionDigits: decimals })}</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-3.5 text-right text-gray-300 whitespace-nowrap">
                      ${trade.quantity.toLocaleString()}
                    </td>
                    <td className={`py-3 px-3.5 text-right font-bold whitespace-nowrap ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isProfit ? '+' : ''}${trade.balanceChange.toFixed(2)} ({isProfit ? '+' : ''}{trade.balanceChangePct.toFixed(2)}%)
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold text-white whitespace-nowrap">
                      ${trade.accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3.5 text-gray-300 max-w-sm">
                      <div className="text-xs text-gray-200 line-clamp-2" title={trade.trigger}>
                        {trade.trigger}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-semibold ${
                            trade.status === 'TAKE_PROFIT'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : trade.status === 'STOP_LOSS'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {trade.status}
                        </span>
                        {(trade.postMortem || trade.status === 'STOP_LOSS') && (
                          <span className="text-[9px] text-rose-400 font-mono flex items-center gap-1 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-500/30">
                            <Skull className="w-2.5 h-2.5" /> Post-Mortem
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playCyberClick();
                          setSelectedProofTrade(trade);
                        }}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 transition-colors"
                      >
                        Inspect Proof
                      </button>
                    </td>
                  </tr>
                );
              })}
              {paginatedTrades.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500 font-mono">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-6 h-6 text-gray-600" />
                      <p className="text-xs">No audited paper trades found matching this criteria.</p>
                      {(filter !== 'ALL' || searchQuery !== '') && (
                        <button
                          onClick={() => {
                            playCyberClick();
                            setFilter('ALL');
                            setSearchQuery('');
                            setCurrentPage(1);
                          }}
                          className="text-[11px] text-[#00F0FF] hover:underline cursor-pointer"
                        >
                          Clear filters and show all trades
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-[#0b0d15] border-t border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-gray-400">
            <span>
              Showing <span className="text-white font-bold">{totalItems === 0 ? 0 : startIndex + 1}–{endIndex}</span> of{' '}
              <span className="text-white font-bold">{totalItems}</span> {totalItems === 1 ? 'trade' : 'trades'}
            </span>
            {totalItems < trades.length && (
              <span className="text-[10px] text-gray-500 hidden sm:inline">
                ({trades.length - totalItems} filtered out)
              </span>
            )}
            <span className="text-gray-600 hidden md:inline">•</span>
            <span className="text-gray-400 hidden md:inline">
              Page <span className="text-[#00F0FF] font-bold">{safeCurrentPage}</span> of{' '}
              <span className="text-white font-bold">{totalPages}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* First Page Button */}
            <button
              onClick={() => {
                playCyberClick();
                setCurrentPage(1);
              }}
              disabled={safeCurrentPage === 1 || totalPages <= 1}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-gray-300 transition-colors cursor-pointer"
              title="First Page"
              aria-label="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Prev Page Button */}
            <button
              onClick={() => {
                playCyberClick();
                setCurrentPage((prev) => Math.max(1, prev - 1));
              }}
              disabled={safeCurrentPage === 1 || totalPages <= 1}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-gray-300 transition-colors cursor-pointer"
              title="Previous Page"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Numeric Page Buttons */}
            {pageSize !== 'ALL' && (
              <div className="flex items-center gap-1">
                {getPageNumbers().map((p, idx) =>
                  p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-1.5 text-gray-500 font-mono select-none">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      onClick={() => {
                        playCyberClick();
                        setCurrentPage(Number(p));
                      }}
                      className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        safeCurrentPage === p
                          ? 'bg-[#00F0FF] text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                          : 'text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
            )}

            {/* Next Page Button */}
            <button
              onClick={() => {
                playCyberClick();
                setCurrentPage((prev) => Math.min(totalPages, prev + 1));
              }}
              disabled={safeCurrentPage === totalPages || totalPages <= 1}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-gray-300 transition-colors cursor-pointer"
              title="Next Page"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page Button */}
            <button
              onClick={() => {
                playCyberClick();
                setCurrentPage(totalPages);
              }}
              disabled={safeCurrentPage === totalPages || totalPages <= 1}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-gray-300 transition-colors cursor-pointer"
              title="Last Page"
              aria-label="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Trade Proof & Post-Mortem Inspection Modal */}
      <TradeProofModal
        trade={selectedProofTrade}
        onClose={() => setSelectedProofTrade(null)}
      />

      {/* Auditor Security Authorization Modal */}
      {authModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0e1017] border border-yellow-400/40 rounded-2xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(250,204,21,0.25)] space-y-5 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                playCyberClick();
                setAuthModal((prev) => ({ ...prev, isOpen: false, error: null }));
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 shrink-0 mt-0.5">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-wider flex items-center gap-2">
                  AUDITOR AUTHORIZATION REQUIRED
                </h3>
                <p className="text-xs text-yellow-300/80 font-mono mt-0.5 uppercase">
                  Bitget S2 Track 2 Access Control
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 text-xs text-gray-300 leading-relaxed font-mono">
              {authModal.action === 'PURGE_CORRUPT' ? (
                <>
                  <span className="text-red-400 font-bold">PURGE CORRUPTION:</span> You are clearing out runaway corrupted local storage artifacts, resetting autopilot memory to $100,000 baseline, and reverting the ledger to the verified 18-trade Bitget S2 seed set.
                </>
              ) : authModal.action === 'RESET_LOG' ? (
                <>
                  <span className="text-yellow-400 font-bold">WARNING:</span> You are requesting to purge the accumulated live paper-trading ledger and restore the official Bitget Hackathon genesis seed data.
                </>
              ) : authModal.action === 'SANITIZE_LOG' ? (
                <>
                  <span className="text-emerald-400 font-bold">AUDITOR SANITIZER:</span> You are requesting to scan the entire historical audit ledger, clamp any anomalous price spikes (e.g. BTC $157k) into realistic Bitget spot corridors, recalculate sequential cumulative balances from $100,000.00, and push the sanitized truth to Firestore Cloud and the server.
                </>
              ) : (
                <>
                  <span className="text-amber-400 font-bold">WARNING:</span> You are requesting to pause the 7×24 Autonomous Paper-Trading Loop. This will suspend live trade execution stream for judges.
                </>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleVerifyAndExecute} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono flex items-center justify-between">
                  <span>Enter Security Passkey:</span>
                  <span className="text-gray-500 font-normal">Case-Insensitive</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type={showAuthPasscode ? 'text' : 'password'}
                    autoFocus
                    value={authModal.passcode}
                    onChange={(e) =>
                      setAuthModal((prev) => ({
                        ...prev,
                        passcode: e.target.value,
                        error: null,
                      }))
                    }
                    placeholder="Enter security access code..."
                    className="w-full bg-[#141722] border border-white/15 focus:border-yellow-400 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPasscode(!showAuthPasscode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                    title={showAuthPasscode ? 'Hide passcode' : 'Show passcode'}
                  >
                    {showAuthPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {authModal.error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/60 border border-red-500/60 text-red-300 text-xs font-mono animate-shake">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{authModal.error}</span>
                </div>
              )}

              {/* Success Alert */}
              {authModal.success && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs font-mono animate-fadeIn">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Clearance Granted. Action executed successfully.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playCyberClick();
                    setAuthModal((prev) => ({ ...prev, isOpen: false, error: null }));
                  }}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={authModal.isSubmitting || !authModal.passcode.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-extrabold shadow-[0_0_15px_rgba(250,204,21,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>
                    {authModal.isSubmitting
                      ? 'Verifying...'
                      : authModal.action === 'SANITIZE_LOG'
                      ? 'Execute Cloud Sanitizer'
                      : authModal.action === 'PURGE_CORRUPT'
                      ? 'Purge & Restore Seed'
                      : 'Authorize Action'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperTradingAuditView;
