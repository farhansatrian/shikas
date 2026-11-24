import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";

export const SandboxBanner: React.FC = () => {
  const { user, authReady, t, openAuthModal, openAccountPanel } = useCashflow();

  if (!authReady || user) return null;

  return (
    <div className="vn-frame-subtle flex flex-col justify-between gap-3 px-4 py-2.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 border border-[#745bc7] bg-[#745bc7]/12 px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.16em] text-[#5a3fb5] uppercase">
          ▶ {t.sandbox.tag}
        </span>
        <p className="font-mono text-[11px] leading-snug text-[#4a3e63]">
          {t.sandbox.message}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={openAccountPanel}
          className="vn-btn-action px-2.5 py-1.5 text-[10px]"
        >
          <SlidersHorizontal className="h-3 w-3" />
          <span>{t.actions.prefs}</span>
        </button>
        <button
          type="button"
          onClick={() => openAuthModal("signin")}
          className="vn-btn-band px-3 py-1.5 text-[10px]"
        >
          <span>▶ {t.sandbox.cta}</span>
        </button>
      </div>
    </div>
  );
};
