import React, { useEffect, useRef, useState } from "react";
import { SHIKAS_ASSETS } from "../../config/assets";
import type { TxBurstEvent } from "../../context/CashflowContext";
import type { Locale } from "../../types/cashflow";

export type VesselMood = "calm" | "balanced" | "drained" | "quiet";

interface RaindropVesselProps {
  savedRatio: number;
  hasData: boolean;
  isDeficit: boolean;
  mood: VesselMood;
  locale: Locale;
  burstEvent: TxBurstEvent | null;
  onUserRipple?: () => void;
}

interface DropParticle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  len: number;
  color: string;
  alpha: number;
  isBurst?: boolean;
}

interface SplashBead {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  alpha: number;
}

interface SurfaceRipple {
  x: number;
  rx: number;
  maxRx: number;
  color: string;
  alpha: number;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  alpha: number;
}

const MOOD_LABELS: Record<
  VesselMood,
  { en: string; id: string; jp: string; dotColor: string }
> = {
  calm: {
    en: "CALM DRIZZLE",
    id: "GERIMIS TENANG",
    jp: "穏",
    dotColor: "#7dd3fc",
  },
  balanced: {
    en: "STEADY SHOWER",
    id: "HUJAN TERATUR",
    jp: "時雨",
    dotColor: "#e5dcfb",
  },
  drained: {
    en: "MAGENTA DOWNPOUR",
    id: "HUJAN DERAS",
    jp: "豪雨",
    dotColor: "#ff9ef5",
  },
  quiet: {
    en: "STILL VESSEL",
    id: "WADAH TENANG",
    jp: "静",
    dotColor: "#ffffff",
  },
};

export const RaindropVessel: React.FC<RaindropVesselProps> = ({
  savedRatio,
  hasData,
  isDeficit,
  mood,
  locale,
  burstEvent,
  onUserRipple,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rippleCount, setRippleCount] = useState(0);

  // Mutable simulation refs so React re-renders never reset wave motion
  const targetRatioRef = useRef(0.5);
  const currentRatioRef = useRef(0.35);
  const waveEnergyRef = useRef(0.35);
  const moodRef = useRef<VesselMood>(mood);
  const isDeficitRef = useRef(isDeficit);
  const dropsRef = useRef<DropParticle[]>([]);
  const splashesRef = useRef<SplashBead[]>([]);
  const ripplesRef = useRef<SurfaceRipple[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  const lastBurstIdRef = useRef<number | null>(null);

  useEffect(() => {
    moodRef.current = mood;
    isDeficitRef.current = isDeficit;
    if (!hasData) {
      targetRatioRef.current = 0.14;
    } else if (isDeficit) {
      targetRatioRef.current = 0.13;
    } else {
      // Visual fill gracefully spans 18%..82% so umbrella & sky always have room
      targetRatioRef.current = 0.18 + (Math.max(0, Math.min(100, savedRatio)) / 100) * 0.64;
    }
  }, [savedRatio, hasData, isDeficit, mood]);

  // Trigger dramatic silent visual droplet burst when user saves/duplicates an entry
  useEffect(() => {
    if (!burstEvent || burstEvent.id === lastBurstIdRef.current) return;
    lastBurstIdRef.current = burstEvent.id;

    const canvas = canvasRef.current;
    const width = canvas ? canvas.clientWidth : 300;
    const height = canvas ? canvas.clientHeight : 280;
    const waterY = height * (1 - currentRatioRef.current);

    if (burstEvent.type === "income") {
      // Celebratory rain-blue drops pouring in
      for (let i = 0; i < 14; i++) {
        dropsRef.current.push({
          x: width * (0.14 + Math.random() * 0.72),
          y: -10 - Math.random() * 90,
          vy: 4.2 + Math.random() * 2.8,
          vx: 0,
          len: 14 + Math.random() * 12,
          color: i % 2 === 0 ? "#2276a8" : "#569fd4",
          alpha: 0.9,
          isBurst: true,
        });
      }
      waveEnergyRef.current = Math.min(2.6, waveEnergyRef.current + 1.3);
    } else {
      // Vivid magenta splash rising from the water surface
      for (let i = 0; i < 14; i++) {
        const sx = width * (0.18 + Math.random() * 0.64);
        splashesRef.current.push({
          x: sx,
          y: waterY,
          vx: (Math.random() - 0.5) * 2.8,
          vy: -(1.8 + Math.random() * 2.6),
          r: 2 + Math.random() * 2.2,
          color: i % 2 === 0 ? "#d749d5" : "#ef85e8",
          alpha: 0.92,
        });
      }
      for (let i = 0; i < 3; i++) {
        ripplesRef.current.push({
          x: width * (0.25 + i * 0.25),
          rx: 6,
          maxRx: 52 + Math.random() * 24,
          color: "#d749d5",
          alpha: 0.85,
        });
      }
      waveEnergyRef.current = Math.min(2.8, waveEnergyRef.current + 1.5);
    }
  }, [burstEvent]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = container.clientWidth || 300;
    let height = container.clientHeight || 280;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(180, Math.floor(rect.width));
      height = Math.max(220, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Seed gentle bubbles
    if (bubblesRef.current.length === 0) {
      for (let i = 0; i < 10; i++) {
        bubblesRef.current.push({
          x: Math.random() * width,
          y: height * (0.55 + Math.random() * 0.42),
          r: 1.2 + Math.random() * 2.2,
          vy: 0.22 + Math.random() * 0.38,
          alpha: 0.2 + Math.random() * 0.35,
        });
      }
    }

    let rafId = 0;
    let t = 0;
    let spawnAccumulator = 0;

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      // Smoothly interpolate fill level & wave energy
      currentRatioRef.current +=
        (targetRatioRef.current - currentRatioRef.current) * (reducedMotion ? 0.25 : 0.045);
      waveEnergyRef.current += (0.45 - waveEnergyRef.current) * 0.025;

      const waterY = height * (1 - currentRatioRef.current);
      const currentMood = moodRef.current;
      const deficit = isDeficitRef.current;

      // Subtle atmospheric inner sky wash (matches SHIZUKU lavender/pink watercolor)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, "rgba(239, 233, 253, 0.52)");
      skyGrad.addColorStop(0.65, "rgba(253, 244, 252, 0.25)");
      skyGrad.addColorStop(1, "rgba(229, 220, 251, 0.4)");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Spawn ambient falling raindrop streaks based on current mood
      if (!reducedMotion) {
        const spawnRate =
          currentMood === "drained"
            ? 0.24
            : currentMood === "balanced"
              ? 0.12
              : currentMood === "calm"
                ? 0.075
                : 0.04;
        spawnAccumulator += spawnRate;
        while (spawnAccumulator >= 1) {
          spawnAccumulator -= 1;
          dropsRef.current.push({
            x: 10 + Math.random() * (width - 20),
            y: -16,
            vy:
              currentMood === "drained"
                ? 5.0 + Math.random() * 2.4
                : 3.0 + Math.random() * 1.8,
            vx: currentMood === "drained" ? -0.65 : 0,
            len: currentMood === "drained" ? 18 + Math.random() * 10 : 12 + Math.random() * 9,
            color:
              currentMood === "drained"
                ? Math.random() > 0.35
                  ? "#d749d5"
                  : "#745bc7"
                : Math.random() > 0.3
                  ? "#2276a8"
                  : "#745bc7",
            alpha: currentMood === "drained" ? 0.62 : 0.5,
          });
        }
      }

      // Draw & update falling raindrops
      const nextDrops: DropParticle[] = [];
      for (const drop of dropsRef.current) {
        if (!reducedMotion) {
          drop.x += drop.vx;
          drop.y += drop.vy;
        }

        if (drop.y >= waterY) {
          // Spawn surface ripple + subtle beads
          ripplesRef.current.push({
            x: drop.x,
            rx: 2,
            maxRx: drop.isBurst ? 34 : 20,
            color: drop.color,
            alpha: drop.isBurst ? 0.78 : 0.52,
          });
          if (drop.isBurst) {
            for (let b = 0; b < 2; b++) {
              splashesRef.current.push({
                x: drop.x,
                y: waterY,
                vx: (Math.random() - 0.5) * 2.1,
                vy: -(1.2 + Math.random() * 1.6),
                r: 1.6,
                color: drop.color,
                alpha: 0.85,
              });
            }
          }
          waveEnergyRef.current = Math.min(2.4, waveEnergyRef.current + (drop.isBurst ? 0.08 : 0.02));
          continue;
        }

        ctx.save();
        ctx.strokeStyle = drop.color;
        ctx.globalAlpha = drop.alpha;
        ctx.lineWidth = drop.isBurst ? 1.6 : 1.1;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y - drop.len);
        ctx.lineTo(drop.x + drop.vx * 2, drop.y);
        ctx.stroke();
        ctx.restore();

        if (drop.x > -20 && drop.x < width + 20) {
          nextDrops.push(drop);
        }
      }
      dropsRef.current = nextDrops.slice(-70);

      // Wave helper
      const ampBase = (reducedMotion ? 2.5 : 3.2 + waveEnergyRef.current * 2.8);
      const getWaveY = (x: number, phaseOffset: number, freq: number, ampScale: number) =>
        waterY +
        Math.sin(x * freq + t * 0.032 + phaseOffset) * (ampBase * ampScale) +
        Math.cos(x * freq * 1.7 - t * 0.021 + phaseOffset) * (ampBase * 0.42 * ampScale);

      // Back translucent iris/lavender wave
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 6) {
        ctx.lineTo(x, getWaveY(x, 2.1, 0.022, 0.85));
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = deficit
        ? "rgba(215, 73, 213, 0.26)"
        : "rgba(116, 91, 199, 0.28)";
      ctx.fill();

      // Front primary SHIZUKU gradient water body
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 5) {
        ctx.lineTo(x, getWaveY(x, 0, 0.026, 1));
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const waterGrad = ctx.createLinearGradient(0, waterY - 8, 0, height);
      if (deficit) {
        waterGrad.addColorStop(0, "rgba(239, 133, 232, 0.68)");
        waterGrad.addColorStop(0.5, "rgba(215, 73, 213, 0.62)");
        waterGrad.addColorStop(1, "rgba(116, 91, 199, 0.72)");
      } else if (currentMood === "calm") {
        waterGrad.addColorStop(0, "rgba(56, 152, 204, 0.56)");
        waterGrad.addColorStop(0.48, "rgba(116, 91, 199, 0.58)");
        waterGrad.addColorStop(1, "rgba(192, 92, 230, 0.52)");
      } else {
        waterGrad.addColorStop(0, "rgba(116, 91, 199, 0.54)");
        waterGrad.addColorStop(0.55, "rgba(192, 92, 230, 0.58)");
        waterGrad.addColorStop(1, "rgba(215, 73, 213, 0.55)");
      }
      ctx.fillStyle = waterGrad;
      ctx.fill();

      // Shimmering water surface crest line
      ctx.beginPath();
      for (let x = 0; x <= width; x += 5) {
        const y = getWaveY(x, 0, 0.026, 1);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Subtle rising bubbles inside water
      for (const b of bubblesRef.current) {
        if (!reducedMotion) {
          b.y -= b.vy;
          b.x += Math.sin(t * 0.02 + b.y * 0.05) * 0.18;
        }
        if (b.y < waterY + 8) {
          b.y = height - 4;
          b.x = 12 + Math.random() * (width - 24);
        }
        if (b.y > waterY + 6 && b.y < height) {
          ctx.save();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
          ctx.globalAlpha = b.alpha;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Expanding water surface ripples
      const nextRipples: SurfaceRipple[] = [];
      for (const rip of ripplesRef.current) {
        if (!reducedMotion) {
          rip.rx += 1.05;
          rip.alpha *= 0.945;
        }
        if (rip.rx < rip.maxRx && rip.alpha > 0.04) {
          const ry = getWaveY(rip.x, 0, 0.026, 1);
          ctx.save();
          ctx.strokeStyle = rip.color;
          ctx.globalAlpha = rip.alpha;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.ellipse(rip.x, ry + 1.5, rip.rx, Math.max(2, rip.rx * 0.24), 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          nextRipples.push(rip);
        }
      }
      ripplesRef.current = nextRipples.slice(-30);

      // Splash beads
      const nextSplashes: SplashBead[] = [];
      for (const sp of splashesRef.current) {
        if (!reducedMotion) {
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.14;
          sp.alpha *= 0.955;
        }
        if (sp.alpha > 0.05 && sp.y < height) {
          ctx.save();
          ctx.fillStyle = sp.color;
          ctx.globalAlpha = sp.alpha;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          nextSplashes.push(sp);
        }
      }
      splashesRef.current = nextSplashes.slice(-40);

      // Beaker graduation marks along right inner wall
      ctx.save();
      ctx.strokeStyle = "rgba(116, 91, 199, 0.42)";
      ctx.fillStyle = "rgba(93, 83, 112, 0.72)";
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.textAlign = "right";
      const ticks = [
        { pct: 0.82, label: "100" },
        { pct: 0.61, label: "75" },
        { pct: 0.45, label: "50" },
        { pct: 0.28, label: "25" },
      ];
      for (const tick of ticks) {
        const ty = Math.round(height * (1 - tick.pct));
        ctx.beginPath();
        ctx.moveTo(width - 10, ty);
        ctx.lineTo(width, ty);
        ctx.stroke();
        ctx.fillText(tick.label, width - 13, ty + 3);
      }
      ctx.restore();

      t += 1;
      if (!reducedMotion) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();

    return () => {
      ro.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const handleVesselClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clickX = Math.max(14, Math.min(rect.width - 14, e.clientX - rect.left));
    const clickY = Math.max(8, e.clientY - rect.top);
    const waterY = rect.height * (1 - currentRatioRef.current);

    if (clickY < waterY) {
      // Drop from tap point down into water
      dropsRef.current.push({
        x: clickX,
        y: clickY,
        vy: 5.4,
        vx: 0,
        len: 16,
        color: isDeficit ? "#d749d5" : "#2276a8",
        alpha: 0.95,
        isBurst: true,
      });
    } else {
      // Direct water surface ripple + splashes
      ripplesRef.current.push({
        x: clickX,
        rx: 4,
        maxRx: 52,
        color: isDeficit ? "#d749d5" : "#2276a8",
        alpha: 0.9,
      });
      for (let i = 0; i < 5; i++) {
        splashesRef.current.push({
          x: clickX,
          y: waterY,
          vx: (Math.random() - 0.5) * 2.6,
          vy: -(1.4 + Math.random() * 2.2),
          r: 1.8,
          color: i % 2 === 0 ? "#745bc7" : "#ef85e8",
          alpha: 0.9,
        });
      }
    }

    waveEnergyRef.current = Math.min(2.5, waveEnergyRef.current + 0.95);
    setRippleCount((c) => c + 1);
    onUserRipple?.();
  };

  const moodMeta = MOOD_LABELS[mood];

  return (
    <div className="vn-frame flex h-full flex-col overflow-hidden">
      {/* Vivid SHIZUKU Watercolor Band Header Strip */}
      <div className="shikas-band-strip flex items-center justify-between px-3.5 py-2 text-white">
        <span className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
          VESSEL // 雫
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase drop-shadow-2xs">
          <span
            className="h-1.5 w-1.5 shrink-0"
            style={{ backgroundColor: moodMeta.dotColor }}
          />
          {locale === "id" ? moodMeta.id : moodMeta.en}
        </span>
      </div>

      {/* Interactive Canvas Chamber */}
      <div
        ref={containerRef}
        onClick={handleVesselClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            const w = containerRef.current?.clientWidth ?? 260;
            dropsRef.current.push({
              x: w * (0.25 + Math.random() * 0.5),
              y: 20,
              vy: 5.2,
              vx: 0,
              len: 16,
              color: isDeficit ? "#d749d5" : "#2276a8",
              alpha: 0.95,
              isBurst: true,
            });
            waveEnergyRef.current = Math.min(2.5, waveEnergyRef.current + 0.9);
            setRippleCount((c) => c + 1);
            onUserRipple?.();
          }
        }}
        aria-label={
          locale === "id"
            ? "Wadah hujan interaktif — klik untuk menjatuhkan tetesan"
            : "Interactive raindrop vessel — click to drop a ripple"
        }
        className="relative min-h-[250px] w-full flex-1 cursor-crosshair select-none overflow-hidden sm:min-h-[300px]"
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        {/* Gently Floating SHIZUKU Watercolor Umbrella */}
        <div className="pointer-events-none absolute inset-x-0 top-5 flex justify-center">
          <img
            src={SHIKAS_ASSETS.umbrella}
            alt="SHIZUKU umbrella"
            className="animate-umbrella-float h-20 w-auto opacity-90 drop-shadow-[0_6px_14px_rgba(116,91,199,0.22)] sm:h-24"
          />
        </div>

        {/* Crisp Corner Reserve Readout */}
        <div className="pointer-events-none absolute bottom-3 left-3 border border-[#745bc7]/50 bg-[#fdf9ff]/88 px-2.5 py-1 backdrop-blur-xs">
          <p className="font-mono text-[9px] tracking-[0.16em] text-[#5d5370] uppercase">
            {isDeficit
              ? locale === "id"
                ? "STATUS"
                : "STATUS"
              : locale === "id"
                ? "CADANGAN"
                : "RESERVE"}
          </p>
          <p
            className={`font-mono-num text-sm font-bold leading-tight ${
              isDeficit ? "text-[#c837a5]" : "text-[#745bc7]"
            }`}
          >
            {isDeficit
              ? locale === "id"
                ? "DEFISIT"
                : "DEFICIT"
              : `${savedRatio.toFixed(0)}%`}
          </p>
        </div>

        {/* Subtle Interactive Hint */}
        <div className="pointer-events-none absolute right-3 bottom-3 bg-[#14100e]/65 px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] text-white/95 uppercase">
          {rippleCount > 0
            ? locale === "id"
              ? `RIAK ×${rippleCount}`
              : `RIPPLE ×${rippleCount}`
            : locale === "id"
              ? "KLIK AIR"
              : "TAP WATER"}
        </div>
      </div>
    </div>
  );
};
