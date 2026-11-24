import React from "react";
import {
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

  return (
    <header className="relative z-20 mx-auto w-full max-w-[960px] px-5 pt-8 pb-6 sm:px-8 sm:pt-12 sm:pb-8">
      {/* Exact Reference Image 1 Centered Minimalist Condensed Navigation */}
      <nav aria-label="Primary navigation" className="flex justify-center">
        <ul className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2 sm:gap-x-9">
          {NAV_TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <li key={tab}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`font-nav pb-1 text-[14px] tracking-[0.11em] uppercase transition sm:text-[17px] sm:tracking-[0.12em] ${
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

      {/* Whisper-quiet hairline utility bar (no pills, no visual clutter) */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#14100e]/12 pb-2.5 font-mono text-[11px] text-[#5f5368]">
        {/* Left: Brand mark + Month Switcher */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className="font-semibold tracking-[0.18em] text-[#14100e] uppercase"
          >
            SHIKAS <span className="font-normal text-[#5f5368]">(雫)</span>
          </button>
          <span className="text-[#14100e]/25">/</span>
          <div className="flex items-center gap-1.5 text-[#14100e]">
            <button
              type="button"
              onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))}
              aria-label="Previous month"
              className="p-0.5 text-[#5f5368] transition hover:text-[#14100e]"
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
              className="p-0.5 text-[#5f5368] transition hover:text-[#14100e]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Quiet Live FX, Currency, Privacy, Locale, Quick Add */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFxModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[#14100e] transition hover:underline"
              title={t.fx.converterSubtitle}
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
              className="p-0.5 text-[#5f5368] transition hover:text-[#14100e]"
            >
              <RefreshCw className={`h-3 w-3 ${fx.status === "loading" ? "animate-spin" : ""}`} />
            </button>
          </div>

          <span className="text-[#14100e]/20">·</span>

          <button
            type="button"
            onClick={cycleCurrency}
            className="font-medium text-[#14100e] transition hover:underline"
            title="Switch IDR / USD / Dual"
          >
            {currencyLabel}
          </button>

          <span className="text-[#14100e]/20">·</span>

          <button
            type="button"
            onClick={togglePrivacyMode}
            aria-label={t.settings.privacyLabel}
            title={t.settings.privacyLabel}
            className={`transition hover:text-[#14100e] ${
              store.settings.privacyMode ? "text-[#14100e]" : "text-[#5f5368]"
            }`}
          >
            {store.settings.privacyMode ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
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

          <span className="text-[#14100e]/20">·</span>

          <button
            type="button"
            onClick={() => openNewTxModal("expense")}
            className="inline-flex items-center gap-1 font-semibold text-[#14100e] underline decoration-[#14100e]/40 underline-offset-4 transition hover:decoration-[#14100e]"
          >
            <Plus className="h-3 w-3" />
            {locale === "id" ? "Catat" : "Record"}
          </button>
        </div>
      </div>
    </header>
  );
};
