import React from "react";
import { ArrowUpRight } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";

export const Footer: React.FC = () => {
  const { activeTab, store, t, notify } = useCashflow();
  const shizukuUrl = store.settings.shizukuWebsiteUrl.trim();

  const renderShizukuLink = () => {
    if (shizukuUrl) {
      return (
        <a
          href={shizukuUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-[#14100e]/80 transition hover:text-[#14100e] hover:underline"
        >
          SHIZUKU
          <ArrowUpRight className="h-3 w-3" />
        </a>
      );
    }

    return (
      <button
        type="button"
        onClick={() => notify(t.settings.shizukuNotDeployedToast, "iris")}
        className="inline-flex items-center gap-0.5 text-[#14100e]/75 transition hover:text-[#14100e]"
        title={t.settings.shizukuNotDeployedToast}
      >
        SHIZUKU
        <ArrowUpRight className="h-3 w-3" />
      </button>
    );
  };

  if (activeTab === "home") {
    return (
      <footer className="relative z-10 mx-auto w-full max-w-[960px] px-5 pb-6 text-center font-mono text-[10px] tracking-[0.14em] text-[#5f5368]/80">
        <span>© {new Date().getFullYear()} SHIKAS (雫)</span>
        <span className="mx-2 text-[#14100e]/25">·</span>
        {renderShizukuLink()}
      </footer>
    );
  }

  return (
    <footer className="relative z-10 mx-auto mt-14 w-full max-w-[960px] px-5 pb-10 sm:px-8">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-[#14100e]/12 pt-5 text-center font-mono text-[11px] tracking-[0.12em] text-[#5f5368]">
        <span>© {new Date().getFullYear()} SHIKAS (雫)</span>
        <span className="text-[#14100e]/25">·</span>
        {renderShizukuLink()}
      </div>
    </footer>
  );
};
