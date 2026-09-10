// components/UnifiedDataConstellation.tsx
// Animated Cross-Asset Constellation Network Graph (Unified Data Layer as featured in Moonberg)

import React, { useEffect, useRef, useState } from 'react';
import { Database, Radio, ArrowUpRight, TrendingUp, Sparkles } from 'lucide-react';
import { playCyberClick } from '@/lib/soundSynth';

interface NodeData {
  id: string;
  name: string;
  class: 'CX' | 'EQ' | 'HUB';
  price: string;
  change: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface UnifiedDataConstellationProps {
  onSelectNode?: (ticker: string) => void;
}

export function UnifiedDataConstellation({ onSelectNode }: UnifiedDataConstellationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CX' | 'EQ'>('ALL');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = 240);

    const updateDimensions = () => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      if (rect.width > 0 && (canvas.width !== Math.floor(rect.width) || canvas.height !== 240)) {
        width = canvas.width = Math.floor(rect.width);
        height = canvas.height = 240;
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const nodeDefs = [
      { id: 'HUB', name: 'PROCESSED DATA', class: 'HUB' as const, price: 'AGGREGATOR', change: '0.0%', relX: 0, relY: 0, radius: 16, color: '#facc15', phaseX: 0, phaseY: 0 },
      { id: 'BTC', name: 'BTC', class: 'CX' as const, price: '$87,450', change: '+3.2%', relX: -0.58, relY: -0.52, radius: 10, color: '#00f0ff', phaseX: 0.8, phaseY: 1.2 },
      { id: 'ETH', name: 'ETH', class: 'CX' as const, price: '$2,740', change: '+1.8%', relX: -0.45, relY: 0.62, radius: 9, color: '#00f0ff', phaseX: 2.1, phaseY: 0.5 },
      { id: 'SOL', name: 'SOL', class: 'CX' as const, price: '$182.4', change: '+6.4%', relX: -0.80, relY: 0.08, radius: 9, color: '#00f0ff', phaseX: 1.4, phaseY: 2.8 },
      { id: 'NVDA', name: 'NVDA', class: 'EQ' as const, price: '$138.2', change: '+2.1%', relX: 0.58, relY: -0.52, radius: 10, color: '#ec4899', phaseX: 3.2, phaseY: 1.7 },
      { id: 'MSTR', name: 'MSTR', class: 'EQ' as const, price: '$362.5', change: '+5.7%', relX: 0.80, relY: 0.12, radius: 9, color: '#ec4899', phaseX: 0.5, phaseY: 3.1 },
      { id: 'COIN', name: 'COIN', class: 'EQ' as const, price: '$215.8', change: '+4.3%', relX: 0.45, relY: 0.62, radius: 8, color: '#ec4899', phaseX: 2.7, phaseY: 0.9 },
    ];

    // Constellation nodes (Crypto & Tokenized Equities)
    const nodes: NodeData[] = nodeDefs.map((d) => ({
      id: d.id,
      name: d.name,
      class: d.class,
      price: d.price,
      change: d.change,
      x: width / 2,
      y: height / 2,
      vx: 0,
      vy: 0,
      radius: d.radius,
      color: d.color,
    }));

    // Animated data packets traveling along edges
    const packets = [
      { from: 1, to: 0, progress: 0.1, speed: 0.008 },
      { from: 2, to: 0, progress: 0.5, speed: 0.01 },
      { from: 3, to: 0, progress: 0.8, speed: 0.007 },
      { from: 4, to: 0, progress: 0.3, speed: 0.009 },
      { from: 5, to: 0, progress: 0.6, speed: 0.008 },
      { from: 6, to: 0, progress: 0.2, speed: 0.011 },
      { from: 1, to: 5, progress: 0.4, speed: 0.006 }, // Cross-asset BTC-MSTR correlation beam
      { from: 3, to: 4, progress: 0.7, speed: 0.007 }, // Cross-asset SOL-NVDA beta beam
    ];

    let t = 0;

    const render = () => {
      t += 0.02;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Safe responsive orbit radii: guarantees at least 48px from horizontal walls and 32px from vertical walls
      const rx = Math.max(70, Math.min(width * 0.36, cx - 48));
      const ry = Math.max(45, Math.min(height * 0.34, cy - 32));

      // Calculate live positions with bounded gentle harmonic float
      nodeDefs.forEach((def, i) => {
        if (i === 0) {
          nodes[0].x = cx;
          nodes[0].y = cy;
        } else {
          const anchorX = cx + def.relX * rx;
          const anchorY = cy + def.relY * ry;
          const floatX = Math.sin(t * 1.5 + def.phaseX) * 6;
          const floatY = Math.cos(t * 1.3 + def.phaseY) * 5;

          nodes[i].x = Math.max(42, Math.min(width - 42, anchorX + floatX));
          nodes[i].y = Math.max(28, Math.min(height - 28, anchorY + floatY));
        }
      });

      // Draw connections
      ctx.lineWidth = 1;
      for (let i = 1; i < nodes.length; i++) {
        const n = nodes[i];
        ctx.strokeStyle = n.class === 'CX' ? 'rgba(0, 240, 255, 0.22)' : 'rgba(236, 72, 153, 0.22)';
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      }

      // Cross-asset correlation links
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.3)';
      ctx.beginPath();
      ctx.moveTo(nodes[1].x, nodes[1].y);
      ctx.lineTo(nodes[5].x, nodes[5].y); // BTC -> MSTR
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(nodes[3].x, nodes[3].y);
      ctx.lineTo(nodes[4].x, nodes[4].y); // SOL -> NVDA
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw moving data packets
      packets.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;
        const start = nodes[p.from];
        const end = nodes[p.to];
        if (start && end) {
          const px = start.x + (end.x - start.x) * p.progress;
          const py = start.y + (end.y - start.y) * p.progress;
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw nodes
      nodes.forEach((n) => {
        // Outer halo
        ctx.fillStyle = n.class === 'HUB' ? 'rgba(250, 204, 21, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 5, 0, Math.PI * 2);
        ctx.fill();

        // Core circle
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (n.class === 'HUB') {
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 7px monospace';
          ctx.fillText('DATA HUB', n.x, n.y);
        } else {
          ctx.fillText(n.name, n.x, n.y - n.radius - 4);
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    // Canvas click interaction to select node
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      for (const n of nodes) {
        if (n.id === 'HUB') continue;
        const dx = clickX - n.x;
        const dy = clickY - n.y;
        if (Math.sqrt(dx * dx + dy * dy) < n.radius + 8) {
          playCyberClick();
          setSelectedNode(n);
          if (onSelectNode) {
            onSelectNode(n.id);
          }
          break;
        }
      }
    };

    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      canvas.removeEventListener('click', handleClick);
    };
  }, [onSelectNode]);

  return (
    <div className="relative bg-[#0b0b0f] border border-[var(--lunaris-panel-border)] rounded-xl p-5 font-mono shadow-2xl overflow-hidden">
      {/* Tactical Coordinates & Badge */}
      <div className="absolute top-2 left-2 text-[10px] text-cyan-400/40 select-none">[+]</div>
      <div className="absolute top-2 right-2 text-[10px] text-cyan-400/40 select-none">01 // DATA_LAYER</div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-cyan-400/10 border border-cyan-400/30 text-cyan-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-wider text-white flex items-center gap-2">
              UNIFIED DATA LAYER
              <span className="text-[10px] text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-1.5 py-0.5 rounded uppercase">
                Real-Time Aggregation
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Cross-asset liquidity aggregation: On-chain DEXs, CEX WebSockets & Equities.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> CX: Crypto
          </span>
          <span className="flex items-center gap-1 text-pink-400">
            <span className="w-2 h-2 rounded-full bg-pink-500" /> EQ: Equities
          </span>
          <span className="flex items-center gap-1 text-yellow-400">
            <span className="w-2 h-2 rounded-full bg-yellow-400" /> Aggregator Hub
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative bg-[#070709] border border-white/10 rounded-lg overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full block cursor-pointer" />

        {selectedNode && (
          <div className="absolute bottom-3 left-3 bg-black/80 border border-cyan-400/40 p-2.5 rounded text-xs backdrop-blur-md flex items-center gap-3">
            <span className="font-bold text-cyan-300">{selectedNode.name}</span>
            <span className="text-gray-300">{selectedNode.price}</span>
            <span className="text-emerald-400">{selectedNode.change}</span>
            <span className="text-[10px] text-gray-400 uppercase">Class: {selectedNode.class}</span>
          </div>
        )}

        <div className="absolute top-2 right-2 text-[10px] text-gray-500 bg-black/60 px-2 py-0.5 rounded border border-white/5">
          Click node to route into Council
        </div>
      </div>
    </div>
  );
}
