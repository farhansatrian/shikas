import React from "react";
import { ArrowUpRight } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import type { NavTab } from "../../types/cashflow";
import { formatFxTimestamp, formatIdr } from "../../utils/format";

export const Footer: React.FC = () => {
  const { setActiveTab, store, fx, t, locale } = useCashflow();
  const links: NavTab[] = ["dashboard", "ledger", "wallets", "budgets", "analytics", "planning", "settings"];

  return (
    <footer className="tuyu-footer-band relative z-10 mt-14 pb-20 text-white md:pb-8">
      <div className="mx-auto flex w-full max-w-[1160px] flex-col items-center gap-4 px-4 py-8 text-center sm:px-6">
        <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {links.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="font-editorial text-xs font-semibold tracking-[0.22em] text-white/90 uppercase transition hover:text-white hover:opacity-75"
            >
              {t.nav[tab]}
            </button>
          ))}
          <a
            href={store.settings.shizukuPortfolioUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-editorial text-xs font-semibold tracking-[0.22em] text-white/95 uppercase transition hover:opacity-75"
          >
            SHIZUKU
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </nav>

        <p className="font-mono text-[11px] text-white/85">
          1 USD = {formatIdr(fx.usdToIdr)} · {t.fx.source}: {fx.source}
          {fx.updatedAt ? ` · ${t.fx.updated}: ${formatFxTimestamp(fx.updatedAt, locale)}` : ""}
        </p>

        <p className="text-xs tracking-[0.14em] text-white/90">
          © {new Date().getFullYear()} SHIKAS ( 雫 ) · SHIZUKU Workspace · Farhan Satria Nugraha
        </p>
      </div>
    </footer>
  );
};
