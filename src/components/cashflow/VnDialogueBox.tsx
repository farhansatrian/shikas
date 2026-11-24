import React, { useEffect, useState } from "react";
import { SHIKAS_ASSETS } from "../../config/assets";
import type { Locale } from "../../types/cashflow";
import type { VesselMood } from "./RaindropVessel";

interface VnDialogueBoxProps {
  lines: string[];
  activeIndex: number;
  onAdvance: () => void;
  mood: VesselMood;
  locale: Locale;
}

const MOOD_TAG: Record<VesselMood, { en: string; id: string; color: string }> = {
  calm: { en: "CALM", id: "TENANG", color: "#2276a8" },
  balanced: { en: "STEADY", id: "STABIL", color: "#745bc7" },
  drained: { en: "DRAINED", id: "DERAS", color: "#c837a5" },
  quiet: { en: "QUIET", id: "SEPI", color: "#5d5370" },
};

export const VnDialogueBox: React.FC<VnDialogueBoxProps> = ({
  lines,
  activeIndex,
  onAdvance,
  mood,
  locale,
}) => {
  const safeIndex = lines.length > 0 ? activeIndex % lines.length : 0;
  const fullText = lines[safeIndex] ?? "";
  const [visibleChars, setVisibleChars] = useState(fullText.length);

  // Silent visual typewriter animation (zero SFX)
  useEffect(() => {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion || fullText.length === 0) {
      setVisibleChars(fullText.length);
      return;
    }

    setVisibleChars(0);
    let current = 0;
    const id = window.setInterval(() => {
      current += 2;
      if (current >= fullText.length) {
        setVisibleChars(fullText.length);
        window.clearInterval(id);
      } else {
        setVisibleChars(current);
      }
    }, 18);

    return () => window.clearInterval(id);
  }, [fullText]);

  const isTyping = visibleChars < fullText.length;

  const handleClick = () => {
    if (isTyping) {
      setVisibleChars(fullText.length);
    } else {
      onAdvance();
    }
  };

  const tag = MOOD_TAG[mood];

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="vn-dialogue group cursor-pointer select-none p-4 transition hover:border-[#7650f3] sm:p-5"
      aria-label={
        locale === "id"
          ? "Kotak dialog status — klik untuk catatan berikutnya"
          : "Status dialogue box — click for next reflection"
      }
    >
      <div className="flex items-start gap-4">
        {/* SHIZUKU Portrait Frame */}
        <div className="hidden shrink-0 flex-col items-center sm:flex">
          <div className="relative flex h-16 w-16 items-center justify-center border border-[#745bc7] bg-gradient-to-b from-[#efe9fd] to-[#fde8f6] p-2">
            <img
              src={SHIKAS_ASSETS.umbrella}
              alt="SHIZUKU"
              className="h-11 w-auto object-contain"
            />
          </div>
          <span
            className="mt-1.5 w-full border border-current px-1.5 py-0.5 text-center font-mono text-[9px] font-bold tracking-[0.16em] uppercase"
            style={{ color: tag.color }}
          >
            {locale === "id" ? tag.id : tag.en}
          </span>
        </div>

        {/* Visual Novel Text Body */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#745bc7]/20 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-editorial text-sm font-bold tracking-[0.22em] text-[#745bc7] uppercase">
                SHIZUKU
              </span>
              <span className="font-mono text-[10px] text-[#5d5370]">(雫)</span>
              <span
                className="border border-current px-1.5 py-0.2 font-mono text-[9px] font-bold tracking-[0.14em] uppercase sm:hidden"
                style={{ color: tag.color }}
              >
                {locale === "id" ? tag.id : tag.en}
              </span>
            </div>

            <span className="font-mono text-[10px] tracking-[0.14em] text-[#5d5370]">
              {String(safeIndex + 1).padStart(2, "0")} / {String(Math.max(1, lines.length)).padStart(2, "0")}
            </span>
          </div>

          <p className="mt-2.5 min-h-[42px] font-mono text-xs leading-relaxed text-[#14100e] sm:text-[13px]">
            {fullText.slice(0, visibleChars)}
            {isTyping && (
              <span className="ml-0.5 inline-block h-3.5 w-1.5 bg-[#d749d5] align-middle" />
            )}
          </p>

          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-[9px] tracking-[0.16em] text-[#5d5370]/80 uppercase">
              {locale === "id"
                ? "KLIK DIALOG UNTUK LANJUT"
                : "CLICK DIALOGUE TO CONTINUE"}
            </span>
            <span className="animate-vn-next font-mono text-[11px] font-bold text-[#d749d5]">
              ▼
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
