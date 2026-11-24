import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import type { NavTab } from "../../types/cashflow";
import { formatMonthLabel, shiftMonthKey } from "../../utils/format";

const NAV_TABS: NavTab[] = ["home", "ledger", "wallets", "plan", "analytics", "data"];

function ShizukuUmbrellaMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path d="M16 4V6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M5 17.5C5 11.425 9.925 6.5 16 6.5C22.075 6.5 27 11.425 27 17.5C24.8 16.2 22.8 16.2 21 17.5C19.2 16.2 17.4 16.2 16 17.5C14.6 16.2 12.8 16.2 11 17.5C9.2 16.2 7.2 16.2 5 17.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path
        d="M16 17.5V24.5C16 26.2 14.7 27.5 13 27.5C11.7 27.5 10.6 26.6 10.3 25.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8.5" r="1.1" fill="currentColor" fillOpacity="0.7" />
      <circle cx="25.5" cy="9.5" r="1.3" fill="currentColor" fillOpacity="0.55" />
    </svg>
  );
}

export const MinimalNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedMonth,
    setSelectedMonth,
    setLocale,
    t,
    locale,
  } = useCashflow();

  const isHome = activeTab === "home";

  return (
    <header className="relative z-20 w-full">
      {/* Desktop: exact mathematical 1fr | auto | 1fr centering so nav aligns 100% with hero center */}
      <div className="mx-auto w-full max-w-[1440px] px-5 pt-6 pb-4 sm:px-10 sm:pt-8">
        <div className="flex flex-col gap-4 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-4">
          {/* Top row on mobile (Logo left + EN|ID right); Col 1 on desktop */}
          <div className="flex items-center justify-between md:justify-start">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              aria-label="SHIKAS Home"
              className="group inline-flex items-center gap-2 text-[#745bc7] transition-opacity hover:opacity-75 focus:outline-none"
            >
              <span className="font-editorial text-[20px] font-medium tracking-[0.28em] uppercase sm:text-[23px]">
                SHIKAS
              </span>
              <ShizukuUmbrellaMark className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            {/* Mobile Language Switcher */}
            <div
              role="group"
              aria-label="Language switcher"
              className="flex items-center gap-1.5 font-editorial text-xs font-bold tracking-[0.18em] md:hidden"
            >
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={
                  locale === "en"
                    ? "text-[#745bc7]"
                    : "text-[#745bc7]/40 transition hover:text-[#745bc7]/80"
                }
              >
                EN
              </button>
              <span className="text-[#745bc7]/30">|</span>
              <button
                type="button"
                onClick={() => setLocale("id")}
                className={
                  locale === "id"
                    ? "text-[#745bc7]"
                    : "text-[#745bc7]/40 transition hover:text-[#745bc7]/80"
                }
              >
                ID
              </button>
            </div>
          </div>

          {/* Center Nav: Dead-center of viewport on both Desktop & Mobile */}
          <nav aria-label="Primary navigation" className="flex justify-center">
            <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 sm:gap-x-8">
              {NAV_TABS.map((tab) => {
                const active = activeTab === tab;
                return (
                  <li key={tab}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`font-nav pb-0.5 text-[14px] tracking-[0.12em] uppercase transition sm:text-[16px] sm:tracking-[0.14em] ${
                        active
                          ? "border-b-[1.5px] border-[#14100e] font-medium text-[#14100e]"
                          : "border-b-[1.5px] border-transparent font-normal text-[#14100e]/65 hover:text-[#14100e]"
                      }`}
                    >
                      {t.nav[tab]}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Desktop Right: Quiet SHIZUKU EN | ID switcher (balances 1fr right column) */}
          <div
            role="group"
            aria-label="Language switcher"
            className="hidden items-center justify-end gap-2 font-editorial text-[13px] font-bold tracking-[0.18em] md:flex"
          >
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={
                locale === "en"
                  ? "text-[#745bc7]"
                  : "text-[#745bc7]/40 transition hover:text-[#745bc7]/80"
              }
            >
              EN
            </button>
            <span className="text-[#745bc7]/30">|</span>
            <button
              type="button"
              onClick={() => setLocale("id")}
              className={
                locale === "id"
                  ? "text-[#745bc7]"
                  : "text-[#745bc7]/40 transition hover:text-[#745bc7]/80"
              }
            >
              ID
            </button>
          </div>
        </div>
      </div>

      {/* Minimal Month Bar on Workspace Pages (hidden on HOME) */}
      {!isHome && (
        <div className="mx-auto w-full max-w-[960px] px-5 pt-2 pb-4 sm:px-8">
          <div className="flex items-center justify-between border-b border-[#14100e]/12 pb-2.5 font-mono text-[11px] text-[#5f5368]">
            <div className="flex items-center gap-2 text-[#14100e]">
              <button
                type="button"
                onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))}
                aria-label="Previous month"
                className="p-0.5 text-[#5f5368] hover:text-[#14100e]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[110px] text-center font-medium">
                {formatMonthLabel(selectedMonth, locale)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, 1))}
                aria-label="Next month"
                className="p-0.5 text-[#5f5368] hover:text-[#14100e]"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="tracking-[0.14em] uppercase">IDR</span>
          </div>
        </div>
      )}
    </header>
  );
};
