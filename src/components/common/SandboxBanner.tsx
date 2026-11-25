import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";

export const SandboxBanner: React.FC = () => {
  const { user, authReady, t, openAuthModal, openAccountPanel } = useCashflow();

  if (!authReady || user) return null;

  return (
    <div className="vn-frame-subtle flex flex-col justify-between gap-2.5 px-3.5 py-2.5 sm:flex-row sm:items-center sm:px-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 sm:flex-nowrap">
        <span className="shrink-0 border border-[#745bc7] bg-[#745bc7]/12 px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-[#5a3fb5] uppercase">
          ▶ {t.sandbox.tag}
        </span>
        <p className="min-w-0 font-mono text-[11px] leading-snug text-[#4a3e63]">
          {t.sandbox.message}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-nowrap">
        <button
          type="button"
          onClick={openAccountPanel}
          className="vn-btn-action flex-1 px-2.5 py-1.5 text-[10px] sm:flex-initial"
        >
          <SlidersHorizontal className="h-3 w-3 shrink-0" />
          <span className="whitespace-nowrap">{t.actions.prefs}</span>
        </button>
        <button
          type="button"
          onClick={() => openAuthModal("signin")}
          className="vn-btn-band flex-1 px-3 py-1.5 text-[10px] sm:flex-initial"
        >
          <span className="whitespace-nowrap">▶ {t.sandbox.cta}</span>
        </button>
      </div>
    </div>
  );
};
