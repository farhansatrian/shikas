import React from "react";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import type { DisplayCurrencyMode, NavTab } from "../../types/cashflow";
import { formatIdr, formatMonthLabel, shiftMonthKey } from "../../utils/format";

const NAV_TABS: NavTab[] = ["home", "ledger", "wallets", "plan", "analytics", "data"];

export const MinimalNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedMonth,
    setSelectedMonth,
    store,
    fx,
    refreshFx,
    setFxModalOpen,
    setDisplayCurrency,
    setLocale,
    togglePrivacyMode,
    openNewTxModal,
    t,
    locale,
  } = useCashflow();

  const cycleCurrency = () => {
    const order: DisplayCurrencyMode[] = ["DUAL", "IDR", "USD"];
    const next = order[(order.indexOf(store.settings.displayCurrency) + 1) % order.length];
    setDisplayCurrency(next);
  };

  const currencyLabel =
    store.settings.displayCurrency === "DUAL"
      ? "IDR+USD"
      : store.settings.displayCurrency;

  const isHome = activeTab === "home";

  return (
    <header className="relative z-20 w-full">
      {/* Exact omocat.com 3-zone airy top bar: tiny emblem left · centered 6-item nav · tiny icons right */}
      <div className="mx-auto grid w-full max-w-[1380px] grid-cols-[auto_1fr_auto] items-center gap-3 px-5 pt-6 pb-4 sm:px-10 sm:pt-8">
        {/* Left: Compact SHIKAS (雫) Emblem */}
        <button
          type="button"
          onClick={() => setActiveTab("home")}
          title="SHIKAS (雫) — Personal Cashflow"
          aria-label="SHIKAS Home"
          className="group flex h-8 w-8 items-center justify-center border border-[#14100e]/22 bg-white/85 transition hover:border-[#14100e] hover:bg-[#14100e]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 fill-none stroke-[#14100e] stroke-[1.7] transition group-hover:stroke-white"
          >
            <path d="M12 3.5C12 3.5 6.5 10.2 6.5 14.3A5.5 5.5 0 0 0 17.5 14.3C17.5 10.2 12 3.5 12 3.5Z" />
          </svg>
        </button>

        {/* Center: Pure Condensed Uppercase Navigation */}
        <nav aria-label="Primary navigation" className="flex justify-center">
          <ul className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 sm:gap-x-8">
            {NAV_TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <li key={tab}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`font-nav pb-0.5 text-[14px] tracking-[0.11em] uppercase transition sm:text-[16px] sm:tracking-[0.13em] ${
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

        {/* Right: 3 Quiet Minimal Monochrome Icons (echoing omocat.com top-right icons) */}
        <div className="flex items-center justify-end gap-2.5 text-[#14100e]/80 sm:gap-3.5">
          <button
            type="button"
            onClick={() => setFxModalOpen(true)}
            aria-label={t.actions.fxConverter}
            title={`1 USD = ${formatIdr(fx.usdToIdr)} (${t.actions.fxConverter})`}
            className="p-1 transition hover:text-[#14100e]"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={togglePrivacyMode}
            aria-label={t.settings.privacyLabel}
            title={t.settings.privacyLabel}
            className="hidden p-1 transition hover:text-[#14100e] sm:inline-flex"
          >
            {store.settings.privacyMode ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => openNewTxModal("expense")}
            aria-label={t.actions.addTransaction}
            title={t.actions.addTransaction}
            className="p-1 transition hover:text-[#14100e]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Context Utility Strip: Hidden on HOME so HOME remains ultra-clean like omocat.com */}
      {!isHome && (
        <div className="mx-auto w-full max-w-[960px] px-5 pt-2 pb-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#14100e]/12 pb-2.5 font-mono text-[11px] text-[#5f5368]">
            <div className="flex items-center gap-2 text-[#14100e]">
              <button
                type="button"
                onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))}
                aria-label="Previous month"
                className="p-0.5 text-[#5f5368] hover:text-[#14100e]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[104px] text-center font-medium">
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

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFxModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[#14100e] hover:underline"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      fx.status === "live"
                        ? "bg-[#117a62]"
                        : fx.status === "loading"
                          ? "bg-[#745bc7] animate-pulse"
                          : "bg-[#a66a14]"
                    }`}
                  />
                  <span className="font-mono-num">1 USD = {formatIdr(fx.usdToIdr)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void refreshFx(true)}
                  aria-label={t.actions.refreshRate}
                  className="p-0.5 text-[#5f5368] hover:text-[#14100e]"
                >
                  <RefreshCw className={`h-3 w-3 ${fx.status === "loading" ? "animate-spin" : ""}`} />
                </button>
              </div>

              <span className="text-[#14100e]/20">·</span>

              <button
                type="button"
                onClick={cycleCurrency}
                className="font-medium text-[#14100e] hover:underline"
              >
                {currencyLabel}
              </button>

              <span className="text-[#14100e]/20">·</span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLocale("id")}
                  className={locale === "id" ? "font-semibold text-[#14100e]" : "text-[#5f5368] hover:text-[#14100e]"}
                >
                  ID
                </button>
                <span className="text-[#14100e]/25">/</span>
                <button
                  type="button"
                  onClick={() => setLocale("en")}
                  className={locale === "en" ? "font-semibold text-[#14100e]" : "text-[#5f5368] hover:text-[#14100e]"}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
