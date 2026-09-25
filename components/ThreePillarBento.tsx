// components/ThreePillarBento.tsx
// Ultra-clean 3-Column Bento Showcase inspired directly by Moonberg reference video (00:10-00:15)

import React, { useState, useEffect, useRef } from 'react';
import { Database, Cpu, Zap, Sparkles, Terminal, ArrowRight, Check, Play, ShieldCheck } from 'lucide-react';
import { TradeProposal } from '@/lib/riskVeto';
import { playCyberClick, playTradeApprovedChime } from '@/lib/soundSynth';
import { useLiveMarketQuotes } from '@/lib/livePrices';

interface ThreePillarBentoProps {
  onLaunchTerminal: () => void;
  onDeployAlgo: (proposal: TradeProposal) => void;
  onSelectNode: (ticker: string) => void;
  onOpenStudio?: () => void;
}

export function ThreePillarBento({
  onLaunchTerminal,
  onDeployAlgo,
  onSelectNode,
  onOpenStudio,
}: ThreePillarBentoProps) {
  const { getQuote } = useLiveMarketQuotes();
  // --- COLUMN 01: Interactive Constellation Canvas ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 340);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 200);

    // Normalized relative node definitions (fractions of dynamic rx and ry)
    const nodeDefs = [
      { id: 'HUB', name: 'PROCESSED DATA', class: 'HUB', relX: 0, relY: 0, radius: 13, color: '#facc15', phaseX: 0, phaseY: 0 },
      { id: 'BTC', name: 'BTC', class: 'CX', relX: -0.58, relY: -0.52, radius: 8, color: '#00f0ff', phaseX: 0.8, phaseY: 1.2 },
      { id: 'ETH', name: 'ETH', class: 'CX', relX: -0.48, relY: 0.62, radius: 8, color: '#00f0ff', phaseX: 2.1, phaseY: 0.5 },
      { id: 'SOL', name: 'SOL', class: 'CX', relX: -0.82, relY: 0.08, radius: 7, color: '#00f0ff', phaseX: 1.4, phaseY: 2.8 },
      { id: 'NVDA', name: 'NVDA', class: 'EQ', relX: 0.58, relY: -0.52, radius: 8, color: '#ec4899', phaseX: 3.2, phaseY: 1.7 },
      { id: 'MSTR', name: 'MSTR', class: 'EQ', relX: 0.82, relY: 0.12, radius: 8, color: '#ec4899', phaseX: 0.5, phaseY: 3.1 },
      { id: 'COIN', name: 'COIN', class: 'EQ', relX: 0.48, relY: 0.62, radius: 7, color: '#ec4899', phaseX: 2.7, phaseY: 0.9 },
    ];

    interface LiveNode {
      id: string;
      name: string;
      class: string;
      x: number;
      y: number;
      radius: number;
      color: string;
    }

    const liveNodes: LiveNode[] = nodeDefs.map((d) => ({
      id: d.id,
      name: d.name,
      class: d.class,
      x: width / 2,
      y: height / 2,
      radius: d.radius,
      color: d.color,
    }));

    const packets = [
      { from: 1, to: 0, progress: 0.1, speed: 0.012 },
      { from: 2, to: 0, progress: 0.5, speed: 0.014 },
      { from: 3, to: 0, progress: 0.8, speed: 0.01 },
      { from: 4, to: 0, progress: 0.3, speed: 0.013 },
      { from: 5, to: 0, progress: 0.6, speed: 0.011 },
      { from: 6, to: 0, progress: 0.2, speed: 0.015 },
    ];

    const updateDimensions = () => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      if (rect.width > 0 && (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height || 200))) {
        width = canvas.width = Math.floor(rect.width);
        height = canvas.height = Math.floor(rect.height || 200);
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    let t = 0;

    const render = () => {
      t += 0.02;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Safe responsive orbit radii: leaves at least 42px on the left/right and 28px on top/bottom
      const rx = Math.max(60, Math.min(width * 0.36, cx - 44));
      const ry = Math.max(40, Math.min(height * 0.34, cy - 28));

      // Calculate live positions with bounded gentle harmonic float
      nodeDefs.forEach((def, i) => {
        if (i === 0) {
          // Central hub stays firmly centered
          liveNodes[0].x = cx;
          liveNodes[0].y = cy;
        } else {
          const anchorX = cx + def.relX * rx;
          const anchorY = cy + def.relY * ry;
          // Smooth micro-float (max +/- 6px horizontal, +/- 5px vertical)
          const floatX = Math.sin(t * 1.6 + def.phaseX) * 6;
          const floatY = Math.cos(t * 1.4 + def.phaseY) * 5;

          // Clamped within safe box boundaries (min 36px from left, 36px from right)
          liveNodes[i].x = Math.max(38, Math.min(width - 38, anchorX + floatX));
          liveNodes[i].y = Math.max(26, Math.min(height - 24, anchorY + floatY));
        }
      });

      // Draw subtle filaments from hub to asset nodes
      ctx.lineWidth = 1;
      for (let i = 1; i < liveNodes.length; i++) {
        const n = liveNodes[i];
        ctx.strokeStyle = n.class === 'CX' ? 'rgba(0, 240, 255, 0.22)' : 'rgba(236, 72, 153, 0.22)';
        ctx.beginPath();
        ctx.moveTo(liveNodes[0].x, liveNodes[0].y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      }

      // Draw cross-asset correlation link (BTC <-> MSTR)
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
      ctx.beginPath();
      ctx.moveTo(liveNodes[1].x, liveNodes[1].y);
      ctx.lineTo(liveNodes[5].x, liveNodes[5].y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw traveling data packets along filaments
      packets.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;
        const fromNode = liveNodes[p.from];
        const toNode = liveNodes[p.to];
        if (fromNode && toNode) {
          const px = fromNode.x + (toNode.x - fromNode.x) * p.progress;
          const py = fromNode.y + (toNode.y - fromNode.y) * p.progress;

          ctx.fillStyle = fromNode.color;
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw central hub
      const hub = liveNodes[0];
      ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, hub.radius + 7 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, hub.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PROCESSED', hub.x, hub.y - 3);
      ctx.fillText('DATA', hub.x, hub.y + 4);

      // Draw asset nodes with glow and text labels
      for (let i = 1; i < liveNodes.length; i++) {
        const n = liveNodes[i];

        // Soft outer glow
        ctx.fillStyle = n.class === 'CX' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(236, 72, 153, 0.15)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 4, 0, Math.PI * 2);
        ctx.fill();

        // Node circle
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();

        // Label above or below node
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8.5px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(n.name, n.x, n.y - n.radius - 2);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    // Hit-testing click listener on canvas
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      for (let i = 1; i < liveNodes.length; i++) {
        const n = liveNodes[i];
        const dx = clickX - n.x;
        const dy = clickY - n.y;
        if (Math.sqrt(dx * dx + dy * dy) < n.radius + 10) {
          playCyberClick();
          playTradeApprovedChime();
          onSelectNode(n.id);
          break;
        }
      }
    };

    // Hover cursor feedback
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let isHovering = false;
      for (let i = 1; i < liveNodes.length; i++) {
        const n = liveNodes[i];
        const dx = mx - n.x;
        const dy = my - n.y;
        if (Math.sqrt(dx * dx + dy * dy) < n.radius + 10) {
          isHovering = true;
          break;
        }
      }
      canvas.style.cursor = isHovering ? 'pointer' : 'default';
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [onSelectNode]);

  // --- COLUMN 02: Interactive Algo Pulse ---
  const [pulseActive, setPulseActive] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [algoAsset, setAlgoAsset] = useState<'SOL' | 'BTC' | 'NVDA'>('SOL');

  const triggerAlgoPulse = () => {
    playCyberClick();
    setPulseActive(true);
    setActiveStep(1);

    setTimeout(() => setActiveStep(2), 350);
    setTimeout(() => setActiveStep(3), 700);
    setTimeout(() => {
      setActiveStep(4);
      playTradeApprovedChime();
    }, 1050);

    setTimeout(() => {
      setPulseActive(false);
      setActiveStep(0);
    }, 1800);
  };

  const handleQuickDeploy = () => {
    playCyberClick();
    playTradeApprovedChime();
    setDeploySuccess(true);
    setTimeout(() => setDeploySuccess(false), 2200);

    const liveQuote = getQuote(algoAsset);
    const livePrice = liveQuote.price > 0 ? liveQuote.price : (algoAsset === 'SOL' ? 134.5 : algoAsset === 'BTC' ? 86200 : 118.2);

    const proposal: TradeProposal = {
      asset: algoAsset,
      action: 'BUY',
      size_pct: 12.0,
      confidence: 0.94,
      reasoning: `Visual Algo Builder: [PRICE > MA] AND [VOL > 2X] triggered on ${algoAsset} at live Bitget price $${livePrice.toLocaleString()}. Bitget Risk Veto passed.`,
    };
    onDeployAlgo(proposal);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
      {/* ========================================================
          COLUMN 01: UNIFIED DATA LAYER (Exact match to Moonberg)
         ======================================================== */}
      <div className="relative bg-[#09090d] border border-white/10 hover:border-cyan-500/40 transition-all rounded-xl p-6 flex flex-col justify-between group shadow-xl">
        {/* Top Reticles */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-cyan-400/50 font-bold select-none">[+]</span>
          <span className="text-xs font-black tracking-widest text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-2 py-0.5 rounded">
            01
          </span>
        </div>

        {/* Visual Graph Box */}
        <div className="relative my-2 w-full h-[200px] bg-[#050508] border border-white/5 rounded-lg overflow-hidden flex items-center justify-center">
          <canvas ref={canvasRef} className="w-full h-full block" />
          <div className="absolute top-2 left-2 text-[9px] text-gray-500 bg-black/60 px-1.5 py-0.5 rounded border border-white/5">
            LIVE MULTI-ASSET AGGREGATION
          </div>
        </div>

        {/* Bottom Label & Subtitle (Moonberg Typography) */}
        <div className="mt-4 pt-3 border-t border-white/5">
          <h3 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
            UNIFIED DATA LAYER
          </h3>
          <p className="mt-1 text-xs text-gray-400 font-sans font-light leading-relaxed">
            Real-time aggregation of on-chain, social, and cross-asset market data feeds into a normalized stream.
          </p>
        </div>
      </div>

      {/* ========================================================
          COLUMN 02: VISUAL ALGO BUILDER (Exact match to Moonberg)
         ======================================================== */}
      <div className="relative bg-[#09090d] border border-white/10 hover:border-yellow-400/40 transition-all rounded-xl p-6 flex flex-col justify-between group shadow-xl">
        {/* Top Reticles */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-yellow-400/50 font-bold select-none">[+]</span>
          <span className="text-xs font-black tracking-widest text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded">
            02
          </span>
        </div>

        {/* Visual Flowchart Diagram */}
        <div className="relative my-2 w-full h-[200px] bg-[#050508] border border-white/5 rounded-lg p-3 flex flex-col justify-between overflow-hidden">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

          {/* Top Asset & Pulse Trigger */}
          <div className="relative z-10 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Target:</span>
              <button
                onClick={() => setAlgoAsset('SOL')}
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${algoAsset === 'SOL' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'text-gray-500'}`}
              >
                SOL
              </button>
              <button
                onClick={() => setAlgoAsset('BTC')}
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${algoAsset === 'BTC' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'text-gray-500'}`}
              >
                BTC
              </button>
              <button
                onClick={() => setAlgoAsset('NVDA')}
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${algoAsset === 'NVDA' ? 'bg-pink-500/20 text-pink-300 border border-pink-400/40' : 'text-gray-500'}`}
              >
                NVDA
              </button>
            </div>

            <button
              onClick={triggerAlgoPulse}
              disabled={pulseActive}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-[10px] font-bold cursor-pointer transition-colors"
            >
              <Zap className={`w-3 h-3 ${pulseActive ? 'animate-bounce' : ''}`} />
              <span>{pulseActive ? 'Pulsing...' : 'Test Pulse'}</span>
            </button>
          </div>

          {/* Flowchart Node Blocks (Horizontal Pipeline) */}
          <div className="relative z-10 grid grid-cols-4 gap-1.5 my-auto text-center items-center">
            {/* Node 1 */}
            <div
              className={`p-1.5 rounded border text-[9px] font-bold transition-all ${
                activeStep === 1
                  ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300 scale-105 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                  : 'bg-[#101017] border-white/10 text-gray-300'
              }`}
            >
              <div className="text-[8px] text-gray-500">COND</div>
              <div>PRICE &gt; MA</div>
            </div>

            {/* Node 2 */}
            <div
              className={`p-1.5 rounded border text-[9px] font-bold transition-all ${
                activeStep === 2
                  ? 'bg-purple-500/30 border-purple-400 text-purple-300 scale-105 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                  : 'bg-[#101017] border-white/10 text-gray-300'
              }`}
            >
              <div className="text-[8px] text-gray-500">FILTER</div>
              <div>VOL &gt; 2X</div>
            </div>

            {/* Node 3 */}
            <div
              className={`p-1.5 rounded border text-[9px] font-bold transition-all ${
                activeStep === 3
                  ? 'bg-amber-500/30 border-amber-400 text-amber-300 scale-105 shadow-[0_0_10px_rgba(250,204,21,0.4)]'
                  : 'bg-[#101017] border-white/10 text-gray-300'
              }`}
            >
              <div className="text-[8px] text-gray-500">VETO</div>
              <div>MAX 25%</div>
            </div>

            {/* Node 4 */}
            <div
              className={`p-1.5 rounded border text-[9px] font-bold transition-all ${
                activeStep === 4
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 scale-105 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'bg-[#101017] border-white/10 text-gray-300'
              }`}
            >
              <div className="text-[8px] text-gray-500">OUT</div>
              <div>EXECUTE</div>
            </div>
          </div>

          {/* Quick Deploy Trigger */}
          <div className="relative z-10 flex items-center justify-between pt-1 border-t border-white/5">
            <span className="text-[9px] text-gray-500">Deterministic pipeline</span>
            <button
              onClick={handleQuickDeploy}
              className="flex items-center gap-1 text-[10px] text-yellow-400 hover:text-yellow-300 font-bold cursor-pointer"
            >
              {deploySuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Play className="w-2.5 h-2.5 fill-yellow-400" />}
              <span>{deploySuccess ? 'Pushed to Autopilot' : 'Deploy Rule'}</span>
              {!deploySuccess && <ArrowRight className="w-3 h-3 text-yellow-400" />}
            </button>
          </div>
        </div>

        {/* Bottom Label & Subtitle (Moonberg Typography) */}
        <div className="mt-4 pt-3 border-t border-white/5">
          <h3 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
            VISUAL ALGO BUILDER
          </h3>
          <p className="mt-1 text-xs text-gray-400 font-sans font-light leading-relaxed">
            Visual strategy builder with zero-code logic chaining and one-click deployment directly into Bitget paper liquidity.
          </p>
        </div>
      </div>

      {/* ========================================================
          COLUMN 03: WHAT LUNARIS DOES (Exact match to Moonberg)
         ======================================================== */}
      <div className="relative bg-[#09090d] border border-white/10 hover:border-purple-500/40 transition-all rounded-xl p-6 flex flex-col justify-between group shadow-xl">
        {/* Top Reticles */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-purple-400/50 font-bold select-none">[+]</span>
          <span className="text-xs font-black tracking-widest text-purple-400 bg-purple-400/10 border border-purple-400/30 px-2 py-0.5 rounded">
            03
          </span>
        </div>

        {/* Headline & Body Text */}
        <div className="my-auto space-y-3">
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
            What <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300">LUNARIS</span> does
          </h3>

          <p className="text-xs text-gray-300 font-sans font-light leading-relaxed">
            Human-only trading is already the exception in modern markets, not the rule. Crypto is following the exact same trajectory.
            AI won&apos;t just assist traders — <b>it will become the operating system for how markets function.</b>
          </p>

          {/* Sub-cards */}
          <div className="space-y-2 pt-1">
            <div className="p-2.5 rounded bg-[#050508] border border-white/5 flex items-start gap-2 text-[10px]">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <b className="text-white">AI-READY INFRASTRUCTURE:</b>
                <span className="text-gray-400 font-sans ml-1">Multi-agent consensus quorums and zero-latency feeds.</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#050508] border border-white/5 flex items-start gap-2 text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <b className="text-white">DETERMINISTIC VETO:</b>
                <span className="text-gray-400 font-sans ml-1">Hard 25% single-position ceiling & automated stop-loss.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button at bottom */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-gray-500">Autonomous Core</span>
          <button
            onClick={() => {
              playCyberClick();
              onLaunchTerminal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-black font-bold text-xs cursor-pointer shadow-[0_0_12px_rgba(250,204,21,0.3)] transition-all"
          >
            <span>Launch Terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
