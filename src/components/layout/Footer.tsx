import React from "react";
import { ArrowUpRight } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { formatFxTimestamp, formatIdr } from "../../utils/format";

export const Footer: React.FC = () => {
  const { store, fx, t, locale } = useCashflow();

  return (
    <footer className="relative z-10 mx-auto mt-16 w-full max-w-[960px] px-5 pb-12 sm:px-8">
      <div className="border-t border-[#14100e]/12 pt-6 text-center font-mono text-[11px] text-[#5f5368]">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          <span>
            © {new Date().getFullYear()} SHIKAS (雫) · Farhan Satria Nugraha
          </span>
          <span className="hidden text-[#14100e]/25 sm:inline">·</span>
          <a
            href={store.settings.shizukuPortfolioUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-[#14100e]/80 transition hover:text-[#14100e] hover:underline"
          >
            SHIZUKU WORKSPACE
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
        <p className="mt-2 text-[10px] text-[#5f5368]/80">
          1 USD = {formatIdr(fx.usdToIdr)} · {t.fx.source}: {fx.source}
          {fx.updatedAt ? ` · ${formatFxTimestamp(fx.updatedAt, locale)}` : ""}
        </p>
      </div>
    </footer>
  );
};
