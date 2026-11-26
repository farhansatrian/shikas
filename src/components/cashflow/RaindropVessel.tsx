import React, { useEffect, useRef } from "react";
import { SHIKAS_ASSETS } from "../../config/assets";
import type { TxBurstEvent } from "../../context/CashflowContext";
import type { Locale } from "../../types/cashflow";
import { formatCompactIdr } from "../../utils/format";

export type VesselMood = "calm" | "balanced" | "drained" | "quiet";

interface RaindropVesselProps {
  liquidRatio: number;
  incomeIdr: number;
  dailyNetCashflowIdr: number;
  hasSavingsPockets: boolean;
  privacyMode: boolean;
  hasData: boolean;
  isDeficit: boolean;
  mood: VesselMood;
  locale: Locale;
  burstEvent: TxBurstEvent | null;
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
  { en: string; id: string; dotColor: string }
> = {
  calm: {
    en: "HEALTHY",
    id: "AMAN",
    dotColor: "#7dd3fc",
  },
  balanced: {
    en: "MODERATE",
    id: "CUKUP",
    dotColor: "#e5dcfb",
  },
  drained: {
    en: "TIGHT",
    id: "MENIPIS",
    dotColor: "#ff9ef5",
  },
  quiet: {
    en: "EMPTY",
    id: "KOSONG",
    dotColor: "#ffffff",
  },
};

const SKY_TOP_PAD = 88;
const FLOOR_BOTTOM_PAD = 12;

function pctToCanvasY(pct: number, height: number): number {
  const usable = Math.max(80, height - SKY_TOP_PAD - FLOOR_BOTTOM_PAD);
  const clamped = Math.max(0, Math.min(100, pct));
  return height - FLOOR_BOTTOM_PAD - (clamped / 100) * usable;
}

export const RaindropVessel: React.FC<RaindropVesselProps> = ({
  liquidRatio,
  incomeIdr,
  dailyNetCashflowIdr,
  hasSavingsPockets,
  privacyMode,
  hasData,
  isDeficit,
  mood,
  locale,
  burstEvent,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store exact percentage (0..100) so water crest matches 100%/75%/50%/25% ticks accurately
  const targetPctRef = useRef(0);
  const currentPctRef = useRef(0);
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
    if (!hasData || (incomeIdr <= 0 && !isDeficit && dailyNetCashflowIdr <= 0)) {
      targetPctRef.current = 0;
    } else if (isDeficit) {
      targetPctRef.current = 4;
    } else {
      targetPctRef.current = Math.max(0, Math.min(100, liquidRatio));
    }
  }, [liquidRatio, incomeIdr, dailyNetCashflowIdr, hasData, isDeficit, mood]);

  // Silent visual droplet burst when user saves/duplicates an entry
  useEffect(() => {
    if (!burstEvent || burstEvent.id === lastBurstIdRef.current) return;
    lastBurstIdRef.current = burstEvent.id;

    const canvas = canvasRef.current;
    const width = canvas ? canvas.clientWidth : 300;
    const height = canvas ? canvas.clientHeight : 280;
    const waterY = pctToCanvasY(currentPctRef.current, height);

    if (burstEvent.action === "reimbursed") {
      for (let i = 0; i < 10; i++) {
        dropsRef.current.push({
          x: width * (0.16 + Math.random() * 0.68),
          y: -10 - Math.random() * 65,
          vy: 3.8 + Math.random() * 2.2,
          vx: 0,
          len: 12 + Math.random() * 8,
          color: i % 2 === 0 ? "#1f8f6b" : "#2276a8",
          alpha: 0.88,
          isBurst: true,
        });
      }
      for (let i = 0; i < 3; i++) {
        ripplesRef.current.push({
          x: width * (0.24 + i * 0.26),
          rx: 5,
          maxRx: 46 + Math.random() * 18,
          color: "#1f8f6b",
          alpha: 0.8,
        });
      }
      waveEnergyRef.current = Math.min(2.2, waveEnergyRef.current + 0.95);
    } else if (burstEvent.type === "income") {
      for (let i = 0; i < 14; i++) {
        dropsRef.current.push({
          x: width * (0.14 + Math.random() * 0.72),
          y: -10 - Math.random() * 80,
          vy: 4.2 + Math.random() * 2.6,
          vx: 0,
          len: 14 + Math.random() * 10,
          color: i % 2 === 0 ? "#2276a8" : "#569fd4",
          alpha: 0.9,
          isBurst: true,
        });
      }
      waveEnergyRef.current = Math.min(2.5, waveEnergyRef.current + 1.25);
    } else if (burstEvent.type === "transfer") {
      for (let i = 0; i < 4; i++) {
        ripplesRef.current.push({
          x: width * (0.2 + i * 0.2),
          rx: 5,
          maxRx: 44 + Math.random() * 18,
          color: "#745bc7",
          alpha: 0.75,
        });
      }
      waveEnergyRef.current = Math.min(2.0, waveEnergyRef.current + 0.75);
    } else {
      for (let i = 0; i < 14; i++) {
        const sx = width * (0.18 + Math.random() * 0.64);
        splashesRef.current.push({
          x: sx,
          y: waterY,
          vx: (Math.random() - 0.5) * 2.8,
          vy: -(1.8 + Math.random() * 2.4),
          r: 2 + Math.random() * 2,
          color: i % 2 === 0 ? "#d749d5" : "#ef85e8",
          alpha: 0.9,
        });
      }
      for (let i = 0; i < 3; i++) {
        ripplesRef.current.push({
          x: width * (0.25 + i * 0.25),
          rx: 6,
          maxRx: 50 + Math.random() * 22,
          color: "#d749d5",
          alpha: 0.82,
        });
      }
      waveEnergyRef.current = Math.min(2.6, waveEnergyRef.current + 1.4);
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
      height = Math.max(230, Math.floor(rect.height));
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

    if (bubblesRef.current.length === 0) {
      for (let i = 0; i < 9; i++) {
        bubblesRef.current.push({
          x: Math.random() * width,
          y: height * (0.6 + Math.random() * 0.36),
          r: 1.2 + Math.random() * 2,
          vy: 0.22 + Math.random() * 0.34,
          alpha: 0.2 + Math.random() * 0.3,
        });
      }
    }

    let rafId = 0;
    let t = 0;
    let spawnAccumulator = 0;

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      currentPctRef.current +=
        (targetPctRef.current - currentPctRef.current) * (reducedMotion ? 0.3 : 0.05);
      waveEnergyRef.current += (0.4 - waveEnergyRef.current) * 0.025;

      const waterY = pctToCanvasY(currentPctRef.current, height);
      const currentMood = moodRef.current;
      const deficit = isDeficitRef.current;

      // Atmospheric lavender sky backdrop inside the tank
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, "rgba(239, 233, 253, 0.5)");
      skyGrad.addColorStop(0.65, "rgba(253, 244, 252, 0.22)");
      skyGrad.addColorStop(1, "rgba(229, 220, 251, 0.35)");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Ambient falling rain streaks
      if (!reducedMotion) {
        const spawnRate =
          currentMood === "drained"
            ? 0.22
            : currentMood === "balanced"
              ? 0.11
              : currentMood === "calm"
                ? 0.07
                : 0.035;
        spawnAccumulator += spawnRate;
        while (spawnAccumulator >= 1) {
          spawnAccumulator -= 1;
          dropsRef.current.push({
            x: 10 + Math.random() * (width - 20),
            y: -16,
            vy:
              currentMood === "drained"
                ? 4.8 + Math.random() * 2.2
                : 2.9 + Math.random() * 1.7,
            vx: currentMood === "drained" ? -0.55 : 0,
            len: currentMood === "drained" ? 16 + Math.random() * 9 : 11 + Math.random() * 8,
            color:
              currentMood === "drained"
                ? Math.random() > 0.35
                  ? "#d749d5"
                  : "#745bc7"
                : Math.random() > 0.3
                  ? "#2276a8"
                  : "#745bc7",
            alpha: currentMood === "drained" ? 0.6 : 0.48,
          });
        }
      }

      // Update & draw falling raindrops
      const nextDrops: DropParticle[] = [];
      for (const drop of dropsRef.current) {
        if (!reducedMotion) {
          drop.x += drop.vx;
          drop.y += drop.vy;
        }

        if (drop.y >= waterY) {
          ripplesRef.current.push({
            x: drop.x,
            rx: 2,
            maxRx: drop.isBurst ? 34 : 18,
            color: drop.color,
            alpha: drop.isBurst ? 0.78 : 0.48,
          });
          waveEnergyRef.current = Math.min(2.3, waveEnergyRef.current + (drop.isBurst ? 0.08 : 0.018));
          continue;
        }

        ctx.save();
        ctx.strokeStyle = drop.color;
        ctx.globalAlpha = drop.alpha;
        ctx.lineWidth = drop.isBurst ? 1.5 : 1.05;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y - drop.len);
        ctx.lineTo(drop.x + drop.vx * 2, drop.y);
        ctx.stroke();
        ctx.restore();

        if (drop.x > -20 && drop.x < width + 20) {
          nextDrops.push(drop);
        }
      }
      dropsRef.current = nextDrops.slice(-65);

      // Wave helper anchored precisely at waterY
      const ampBase =
        currentPctRef.current <= 0.5
          ? 0.8
          : reducedMotion
            ? 2.0
            : 2.6 + waveEnergyRef.current * 2.4;

      const getWaveY = (x: number, phaseOffset: number, freq: number, ampScale: number) =>
        waterY +
        Math.sin(x * freq + t * 0.03 + phaseOffset) * (ampBase * ampScale) +
        Math.cos(x * freq * 1.65 - t * 0.02 + phaseOffset) * (ampBase * 0.4 * ampScale);

      // Back translucent wave
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 6) {
        ctx.lineTo(x, getWaveY(x, 2.0, 0.022, 0.85));
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = deficit
        ? "rgba(215, 73, 213, 0.25)"
        : "rgba(116, 91, 199, 0.25)";
      ctx.fill();

      // Primary gradient water fill
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 5) {
        ctx.lineTo(x, getWaveY(x, 0, 0.026, 1));
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const waterGrad = ctx.createLinearGradient(0, waterY - 6, 0, height);
      if (deficit) {
        waterGrad.addColorStop(0, "rgba(239, 133, 232, 0.66)");
        waterGrad.addColorStop(0.55, "rgba(215, 73, 213, 0.6)");
        waterGrad.addColorStop(1, "rgba(116, 91, 199, 0.7)");
      } else if (currentMood === "calm") {
        waterGrad.addColorStop(0, "rgba(56, 152, 204, 0.54)");
        waterGrad.addColorStop(0.5, "rgba(116, 91, 199, 0.56)");
        waterGrad.addColorStop(1, "rgba(192, 92, 230, 0.5)");
      } else {
        waterGrad.addColorStop(0, "rgba(116, 91, 199, 0.52)");
        waterGrad.addColorStop(0.55, "rgba(192, 92, 230, 0.56)");
        waterGrad.addColorStop(1, "rgba(215, 73, 213, 0.54)");
      }
      ctx.fillStyle = waterGrad;
      ctx.fill();

      // Shimmering surface crest line
      ctx.beginPath();
      for (let x = 0; x <= width; x += 5) {
        const y = getWaveY(x, 0, 0.026, 1);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Subtle rising bubbles
      for (const b of bubblesRef.current) {
        if (!reducedMotion) {
          b.y -= b.vy;
          b.x += Math.sin(t * 0.02 + b.y * 0.05) * 0.16;
        }
        if (b.y < waterY + 8) {
          b.y = height - 4;
          b.x = 12 + Math.random() * (width - 24);
        }
        if (b.y > waterY + 6 && b.y < height) {
          ctx.save();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
          ctx.globalAlpha = b.alpha;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Surface ripples
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
      ripplesRef.current = nextRipples.slice(-28);

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
      splashesRef.current = nextSplashes.slice(-36);

      // Accurate percentage scale ticks along right wall (100% / 75% / 50% / 25%)
      ctx.save();
      ctx.strokeStyle = "rgba(116, 91, 199, 0.36)";
      ctx.fillStyle = "rgba(74, 62, 99, 0.78)";
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.textAlign = "right";
      for (const pct of [100, 75, 50, 25]) {
        const ty = Math.round(pctToCanvasY(pct, height));
        ctx.beginPath();
        ctx.moveTo(width - 9, ty);
        ctx.lineTo(width, ty);
        ctx.stroke();
        ctx.fillText(`${pct}%`, width - 12, ty + 3);
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
    const waterY = pctToCanvasY(currentPctRef.current, rect.height);

    if (clickY < waterY) {
      dropsRef.current.push({
        x: clickX,
        y: clickY,
        vy: 5.2,
        vx: 0,
        len: 16,
        color: isDeficit ? "#d749d5" : "#2276a8",
        alpha: 0.95,
        isBurst: true,
      });
    } else {
      ripplesRef.current.push({
        x: clickX,
        rx: 4,
        maxRx: 48,
        color: isDeficit ? "#d749d5" : "#2276a8",
        alpha: 0.9,
      });
      for (let i = 0; i < 4; i++) {
        splashesRef.current.push({
          x: clickX,
          y: waterY,
          vx: (Math.random() - 0.5) * 2.4,
          vy: -(1.3 + Math.random() * 2),
          r: 1.7,
          color: i % 2 === 0 ? "#745bc7" : "#ef85e8",
          alpha: 0.88,
        });
      }
    }

    waveEnergyRef.current = Math.min(2.4, waveEnergyRef.current + 0.9);
  };

  const moodMeta = MOOD_LABELS[mood];

  const compactDetail = (() => {
    if (!hasData || (incomeIdr <= 0 && !isDeficit && dailyNetCashflowIdr <= 0)) {
      return locale === "id" ? "Belum ada pemasukan" : "No income recorded yet";
    }
    if (privacyMode) {
      return locale === "id" ? "Nominal disembunyikan" : "Amounts hidden";
    }
    if (isDeficit) {
      return locale === "id"
        ? `Dana harian minus ${formatCompactIdr(Math.abs(dailyNetCashflowIdr), locale)}`
        : `Daily cashflow short by ${formatCompactIdr(Math.abs(dailyNetCashflowIdr), locale)}`;
    }
    if (incomeIdr <= 0) {
      return locale === "id"
        ? `+${formatCompactIdr(dailyNetCashflowIdr, locale)} dana cair`
        : `+${formatCompactIdr(dailyNetCashflowIdr, locale)} liquid available`;
    }
    return locale === "id"
      ? `${formatCompactIdr(dailyNetCashflowIdr, locale)} dari ${formatCompactIdr(incomeIdr, locale)}`
      : `${formatCompactIdr(dailyNetCashflowIdr, locale)} of ${formatCompactIdr(incomeIdr, locale)}`;
  })();

  const headerTitle = hasSavingsPockets
    ? locale === "id"
      ? "LEVEL HARIAN // 雫"
      : "DAILY LIQUID // 雫"
    : locale === "id"
      ? "SISA BULAN INI // 雫"
      : "LIQUID LEVEL // 雫";

  return (
    <div className="vn-frame flex h-full flex-col overflow-hidden">
      {/* Vivid SHIZUKU Watercolor Band Header Strip */}
      <div className="shikas-band-strip flex items-center justify-between px-3.5 py-2 text-white">
        <span className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase drop-shadow-2xs">
          {headerTitle}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase drop-shadow-2xs">
          <span
            className="h-1.5 w-1.5 shrink-0"
            style={{ backgroundColor: moodMeta.dotColor }}
          />
          {locale === "id" ? moodMeta.id : moodMeta.en}
        </span>
      </div>

      {/* Interactive Water Tank Chamber */}
      <div
        ref={containerRef}
        onClick={handleVesselClick}
        className="group relative min-h-[250px] w-full flex-1 cursor-pointer select-none overflow-hidden sm:min-h-[290px]"
        title={
          locale === "id"
            ? "Tinggi air menunjukkan sisa dana cair harian bulan ini (di luar alokasi tabungan)"
            : "Water height shows remaining liquid daily cashflow this month (excluding savings allocation)"
        }
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        {/* Gently Floating SHIZUKU Watercolor Umbrella in dedicated sky zone */}
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <img
            src={SHIKAS_ASSETS.umbrella}
            alt="SHIZUKU umbrella"
            className="animate-umbrella-float h-16 w-auto opacity-92 drop-shadow-[0_6px_12px_rgba(116,91,199,0.2)] sm:h-[72px]"
          />
        </div>

        {/* Crystal-Clear Human-Readable Liquid Daily Readout */}
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-24px)] border border-[#745bc7]/50 bg-[#fdf9ff]/92 px-3 py-1.5 backdrop-blur-xs">
          <p
            className={`font-mono-num text-sm font-bold leading-tight ${
              isDeficit ? "text-[#c837a5]" : "text-[#14100e]"
            }`}
          >
            {isDeficit
              ? locale === "id"
                ? "DEFISIT"
                : "DEFICIT"
              : !hasData || (incomeIdr <= 0 && dailyNetCashflowIdr <= 0)
                ? "0%"
                : `${liquidRatio.toFixed(0)}% ${locale === "id" ? "CAIR" : "LIQUID"}`}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#5d5370]">
            {compactDetail}
          </p>
        </div>
      </div>
    </div>
  );
};
