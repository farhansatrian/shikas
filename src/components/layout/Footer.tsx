import React from "react";
import { ArrowUpRight } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";

export const Footer: React.FC = () => {
  const { store, t, notify } = useCashflow();
  const shizukuUrl = store.settings.shizukuWebsiteUrl.trim();

  const renderShizukuLink = () => {
    if (shizukuUrl) {
      return (
        <a
          href={shizukuUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-white/95 underline decoration-white/45 underline-offset-4 transition hover:text-white hover:decoration-white"
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
        className="inline-flex items-center gap-0.5 text-white/90 underline decoration-white/40 underline-offset-4 transition hover:text-white hover:decoration-white"
        title={t.settings.shizukuNotDeployedToast}
      >
        SHIZUKU
        <ArrowUpRight className="h-3 w-3" />
      </button>
    );
  };

  return (
    <footer className="shikas-footer-band relative z-10 mt-14 w-full px-6 py-9 text-center text-white md:py-12">
      <div className="mx-auto flex max-w-[960px] flex-col items-center gap-1.5">
        <p className="font-mono text-[10px] tracking-[0.26em] text-white/95 uppercase md:text-[11px] md:tracking-[0.32em]">
          © {new Date().getFullYear()} SHIKAS (雫)
          <span className="mx-2.5 text-white/45">·</span>
          {renderShizukuLink()}
        </p>
      </div>
    </footer>
  );
};
