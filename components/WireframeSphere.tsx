// components/WireframeSphere.tsx
// 3D Interactive Wireframe Dual-Sphere & Cybernetic Particle Field inspired by Moonberg hero

import React, { useEffect, useRef, useState } from 'react';

interface WireframeSphereProps {
  onInteract?: () => void;
}

export function WireframeSphere({ onInteract }: WireframeSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    let height = (canvas.height = 360);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = Math.min(380, Math.max(280, window.innerHeight * 0.38));
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Mouse tracking for parallax tilt
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0.2;
    let currentRotY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX = x * 1.5;
      mouseY = y * 1.5;
    };

    window.addEventListener('mousemove', onMouseMove);

    // Generate 3D sphere points (Latitude & Longitude rings)
    const createSphereRings = (radius: number, latCount: number, lonCount: number) => {
      const points: { x: number; y: number; z: number; ringIndex: number; isVertex: boolean }[] = [];
      // Latitudinal rings
      for (let i = 1; i < latCount; i++) {
        const phi = (Math.PI * i) / latCount - Math.PI / 2;
        const ringRadius = radius * Math.cos(phi);
        const y = radius * Math.sin(phi);
        const segs = 32;
        for (let j = 0; j < segs; j++) {
          const theta = (2 * Math.PI * j) / segs;
          points.push({
            x: ringRadius * Math.cos(theta),
            y,
            z: ringRadius * Math.sin(theta),
            ringIndex: i,
            isVertex: j % 4 === 0,
          });
        }
      }
      return points;
    };

    // Ambient floating particles
    const particleCount = 45;
    const particles = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * 500,
      y: (Math.random() - 0.5) * 260,
      z: (Math.random() - 0.5) * 400,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      vz: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.8,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    const leftGlobePoints = createSphereRings(95, 10, 12);
    const rightGlobePoints = createSphereRings(95, 10, 12);

    let time = 0;

    const render = () => {
      time += 0.012;

      // Smooth damping toward mouse rotation
      targetRotY = time * 0.6 + mouseX;
      targetRotX = 0.25 + mouseY * 0.5;
      currentRotX += (targetRotX - currentRotX) * 0.06;
      currentRotY += (targetRotY - currentRotY) * 0.06;

      ctx.clearRect(0, 0, width, height);

      const fov = 400;
      const centerX = width / 2;
      const centerY = height / 2;

      // Responsive dual sphere offset
      const isMobile = width < 640;
      const sphereSpacing = isMobile ? 0 : Math.min(130, width * 0.16);

      // Render function for a single 3D wireframe sphere
      const drawSphere = (
        points: typeof leftGlobePoints,
        offsetX: number,
        rotSpeedMultiplier: number,
        tintColor: string,
        glowColor: string
      ) => {
        const cosY = Math.cos(currentRotY * rotSpeedMultiplier);
        const sinY = Math.sin(currentRotY * rotSpeedMultiplier);
        const cosX = Math.cos(currentRotX);
        const sinX = Math.sin(currentRotX);

        // Project and sort points for depth
        const projected: { px: number; py: number; pz: number; alpha: number; isVertex: boolean }[] = [];

        for (let i = 0; i < points.length; i++) {
          const p = points[i];

          // Y rotation
          const x1 = p.x * cosY + p.z * sinY;
          const z1 = -p.x * sinY + p.z * cosY;

          // X rotation
          const y2 = p.y * cosX - z1 * sinX;
          const z2 = p.y * sinX + z1 * cosX;

          // 3D Perspective projection
          const distance = fov + z2;
          if (distance > 10) {
            const scale = fov / distance;
            const px = (x1 + offsetX) * scale + centerX;
            const py = y2 * scale + centerY;
            const depthAlpha = Math.max(0.08, Math.min(1, (z2 + 100) / 200));

            projected.push({
              px,
              py,
              pz: z2,
              alpha: depthAlpha,
              isVertex: p.isVertex,
            });
          }
        }

        // Draw connecting wireframe lines along rings
        ctx.lineWidth = 1;
        const segs = 32;
        for (let i = 0; i < projected.length - 1; i++) {
          if ((i + 1) % segs !== 0) {
            const p1 = projected[i];
            const p2 = projected[i + 1];
            if (p1 && p2) {
              const avgAlpha = (p1.alpha + p2.alpha) * 0.35;
              ctx.strokeStyle = `rgba(${tintColor}, ${avgAlpha})`;
              ctx.beginPath();
              ctx.moveTo(p1.px, p1.py);
              ctx.lineTo(p2.px, p2.py);
              ctx.stroke();
            }
          }
        }

        // Draw glowing vertex nodes
        for (let i = 0; i < projected.length; i += 4) {
          const p = projected[i];
          if (p && p.alpha > 0.4) {
            ctx.fillStyle = `rgba(${glowColor}, ${p.alpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(p.px, p.py, p.isVertex ? 1.8 : 1.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };

      // Draw background ambient particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        if (p.x > 250) p.x = -250;
        if (p.x < -250) p.x = 250;
        if (p.y > 130) p.y = -130;
        if (p.y < -130) p.y = 130;

        const distance = fov + p.z;
        if (distance > 20) {
          const scale = fov / distance;
          const px = p.x * scale + centerX;
          const py = p.y * scale + centerY;
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.35})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size * scale * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Left Sphere: Primary Crypto Mesh (Cyan orbital rings with Golden-Yellow nodes)
      drawSphere(leftGlobePoints, -sphereSpacing, 1.0, '0, 240, 255', '250, 204, 21');

      // Draw Right Sphere: Tokenized Equities Mesh (Deep Indigo/Purple rings with Magenta/Pink nodes)
      if (!isMobile) {
        drawSphere(rightGlobePoints, sphereSpacing, -0.9, '129, 140, 248', '244, 114, 182');

        // Draw cross-asset synthetic entanglement beam between the two globes
        const beamAlpha = 0.25 + 0.1 * Math.sin(time * 3);
        const grad = ctx.createLinearGradient(centerX - sphereSpacing, centerY, centerX + sphereSpacing, centerY);
        grad.addColorStop(0, `rgba(0, 240, 255, ${beamAlpha})`);
        grad.addColorStop(0.5, `rgba(250, 204, 21, ${beamAlpha * 1.2})`);
        grad.addColorStop(1, `rgba(236, 72, 153, ${beamAlpha})`);

        ctx.strokeStyle = grad;
        ctx.setLineDash([3, 5]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX - sphereSpacing + 60, centerY);
        ctx.lineTo(centerX + sphereSpacing - 60, centerY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onInteract}
      className="relative w-full overflow-hidden flex items-center justify-center cursor-pointer select-none py-2"
    >
      <canvas
        ref={canvasRef}
        className="w-full block"
      />


      {isHovered && (
        <div className="absolute bottom-4 text-[11px] font-mono text-zinc-200 bg-zinc-900/90 border border-white/20 px-3.5 py-1 rounded-full backdrop-blur-md transition-all">
          Tilt Cursor • Click to Launch Terminal
        </div>
      )}
    </div>
  );
}
