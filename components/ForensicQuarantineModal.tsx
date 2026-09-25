import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  Hash, 
  ExternalLink, 
  X, 
  AlertTriangle, 
  Layers, 
  CheckCircle2, 
  Search,
  Filter,
  RefreshCw,
  Terminal,
  Database
} from 'lucide-react';
import { playCyberClick } from '@/lib/soundSynth';

interface QuarantineRecord {
  id: string;
  quarantinedAt?: string;
  timestamp?: string;
  quarantineReason: string;
  instrument?: string;
  direction?: string;
  price?: number;
  entryPrice?: number;
  exitPrice?: number;
  quantity?: number;
  balanceChange?: number;
  status?: string;
  proofHash?: string;
}

interface QuarantineArchiveData {
  success: boolean;
  totalQuarantined: number;
  archiveSha256: string;
  reasonBreakdown: Record<string, number>;
  records: QuarantineRecord[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ForensicQuarantineModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<QuarantineArchiveData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('ALL');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/audit/quarantine-archive')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: QuarantineArchiveData) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load forensic quarantine archive');
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const records = data?.records || [];
  const filteredRecords = records.filter((r) => {
    const matchesReason = selectedReason === 'ALL' || r.quarantineReason === selectedReason;
    const q = searchFilter.toLowerCase();
    const matchesSearch = !q || 
      (r.id && r.id.toLowerCase().includes(q)) || 
      (r.instrument && r.instrument.toLowerCase().includes(q)) ||
      (r.quarantineReason && r.quarantineReason.toLowerCase().includes(q)) ||
      (r.proofHash && r.proofHash.toLowerCase().includes(q));
    return matchesReason && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 font-mono">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#090b10] border border-rose-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Glowing Header Accent */}
        <div className="h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-[#00F0FF]" />

        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-start justify-between bg-black/50">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-wide">
                  REJECTED TRADES & INGESTION ARCHIVE
                </h3>
                <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full">
                  ISOLATED FROM TRADING LEDGER
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Raw events rejected at the pre-trade ingestion boundary (test harness pulses, missing symbols, and anomalous price spikes). None of these bad records ever entered the authoritative trading ledger or impacted settled portfolio equity. Preserved in full with raw payloads & cryptographic hashes for hackathon judge verification.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playCyberClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Integrity Banner */}
          <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-zinc-400 text-[11px]">Quarantine Corpus Integrity Hash:</span>
                <div className="font-mono text-[10px] text-zinc-200 font-bold select-all break-all">
                  SHA-256: {data?.archiveSha256 || 'CALCULATING...'}
                </div>
              </div>
            </div>

            {/* Direct Download Buttons */}
            <div className="flex items-center gap-2">
              <a
                href="/api/audit/quarantine-archive?format=json"
                download="lunaris_quarantined_records_forensic.json"
                onClick={() => playCyberClick()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-400/30 font-bold text-xs transition-colors cursor-pointer"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Download .JSON</span>
              </a>

              <a
                href="/api/audit/quarantine-archive?format=csv"
                download="lunaris_quarantined_records_forensic.csv"
                onClick={() => playCyberClick()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold text-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Download .CSV</span>
              </a>
            </div>
          </div>

          {/* Reason Breakdown Pills */}
          {data?.reasonBreakdown && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3 h-3 text-amber-400" />
                <span>Rejection Reason Classification ({data.totalQuarantined} Total Events)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    playCyberClick();
                    setSelectedReason('ALL');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    selectedReason === 'ALL'
                      ? 'bg-amber-400 text-black'
                      : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  All ({data.totalQuarantined})
                </button>
                {Object.entries(data.reasonBreakdown).map(([reason, count]) => (
                  <button
                    key={reason}
                    onClick={() => {
                      playCyberClick();
                      setSelectedReason(reason);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      selectedReason === reason
                        ? 'bg-amber-400 text-black font-bold'
                        : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {reason} ({count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Filter Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Raw ID, ticker, reason, or proof hash..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Table of Quarantined Events */}
          <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#0c0e14] border-b border-white/10 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-2.5 pl-3">Raw Event ID</th>
                    <th className="p-2.5">Instrument</th>
                    <th className="p-2.5">Ingestion Rejection Reason</th>
                    <th className="p-2.5 text-right">Raw Notional</th>
                    <th className="p-2.5 pr-3 text-right">Proof Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                          <span>Streaming forensic archive records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500">
                        No quarantined records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r, idx) => (
                      <tr key={`${r.id || idx}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-2.5 pl-3 font-bold text-zinc-200">
                          {r.id || 'N/A'}
                        </td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-bold">
                            {r.instrument || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="p-2.5 text-amber-300 font-medium">
                          {r.quarantineReason}
                        </td>
                        <td className="p-2.5 text-right text-zinc-400">
                          {r.quantity ? `$${Number(r.quantity).toLocaleString()}` : '—'}
                        </td>
                        <td className="p-2.5 pr-3 text-right text-[10px] text-zinc-500 truncate max-w-[120px]" title={r.proofHash || ''}>
                          {r.proofHash ? r.proofHash.substring(0, 12) + '...' : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Institutional Integrity Explanation */}
          <div className="p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 text-xs space-y-1.5 text-zinc-300">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Institutional FIX Ingress Gateway Architecture</span>
            </div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Just as financial exchange FIX gateways log wire-level raw execution requests while clearinghouses settle only valid credit-checked executions, Lunaris permanently stores all raw test pulses and non-conforming ticks in this forensic quarantine archive without allowing them to dilute verified trading Alpha or distort the authoritative ledger.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-black/60 flex items-center justify-between text-xs">
          <span className="text-zinc-400 text-[11px]">
            Showing {filteredRecords.length} of {data?.totalQuarantined || 0} quarantined events
          </span>
          <button
            onClick={() => {
              playCyberClick();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
