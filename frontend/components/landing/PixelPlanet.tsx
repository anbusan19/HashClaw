"use client";

import { useEffect, useRef } from "react";

interface Props { color?: string }

const PixelPlanet = ({ color = "#ffffff" }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId: number;
    let time = 0;

    const globeRadius = 260;
    canvas.width = 800;
    canvas.height = 800;

    const createPoints = () => {
      const points: { x: number; y: number; z: number; baseX: number; baseZ: number }[] = [];
      const count = 1800;
      const goldenRatio = (1 + 5 ** 0.5) / 2;
      for (let i = 0; i < count; i++) {
        const theta = (2 * Math.PI * i) / goldenRatio;
        const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
        points.push({
          x: globeRadius * Math.sin(phi) * Math.cos(theta),
          y: globeRadius * Math.sin(phi) * Math.sin(theta),
          z: globeRadius * Math.cos(phi),
          baseX: globeRadius * Math.sin(phi) * Math.cos(theta),
          baseZ: globeRadius * Math.cos(phi),
        });
      }
      return points;
    };

    const points = createPoints();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      time += 0.004;

      points.forEach((point) => {
        const x = point.baseX * Math.cos(time) - point.baseZ * Math.sin(time);
        const z = point.baseX * Math.sin(time) + point.baseZ * Math.cos(time);
        if (z < -globeRadius / 1.5) return;

        const alpha = (z + globeRadius) / (globeRadius * 2);
        // Front dots are larger, back dots are smaller
        const radius = z > 0 ? 2.2 : 1.4;

        ctx.beginPath();
        ctx.arc(cx + x, cy + point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.max(0.04, Math.min(0.75, alpha));
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-contain"
    />
  );
};

export default PixelPlanet;
