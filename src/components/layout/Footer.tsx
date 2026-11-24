import React from "react";
import { ArrowUpRight } from "lucide-react";
import { SHIZUKU_ECOSYSTEM } from "../../config/ecosystem";
import { useCashflow } from "../../context/CashflowContext";

export const Footer: React.FC = () => {
  const { activeTab, store, t, notify } = useCashflow();

  // Only show quiet minimal text footer on HOME; hide on CASHFLOW / ANALYTICS
  if (activeTab !== "home") return null;

  const shizukuUrl =
    SHIZUKU_ECOSYSTEM.hubUrl || store.settings.shizukuWebsiteUrl.trim();

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

  return (
    <footer className="relative z-10 mx-auto w-full max-w-[960px] px-5 pt-1 pb-5 text-center font-mono text-[10px] tracking-[0.14em] text-[#5f5368]/80">
      <span>© {new Date().getFullYear()} SHIKAS (雫)</span>
      <span className="mx-2 text-[#14100e]/25">·</span>
      {renderShizukuLink()}
    </footer>
  );
};
