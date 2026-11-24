import React from "react";
import {
  BarChart3,
  BookText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Database,
  LayoutDashboard,
  PieChart,
  Target,
  Wallet as WalletIcon,
} from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import type { DisplayCurrencyMode, NavTab } from "../../types/cashflow";
import { formatMonthLabel, shiftMonthKey } from "../../utils/format";

const NAV_ITEMS: Array<{
  id: NavTab;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "dashboard", icon: LayoutDashboard },
  { id: "ledger", icon: BookText },
  { id: "wallets", icon: WalletIcon },
  { id: "budgets", icon: PieChart },
  { id: "analytics", icon: BarChart3 },
  { id: "planning", icon: Target },
  { id: "settings", icon: Database },
];

export const NavigationBar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedMonth,
    setSelectedMonth,
    store,
    setDisplayCurrency,
    t,
    locale,
  } = useCashflow();

  const currencyModes: DisplayCurrencyMode[] = ["IDR", "USD", "DUAL"];

  return (
    <>
      {/* Desktop & Tablet Editorial Pipe-Separated Navigation + Month Switcher */}
      <div className="relative z-20 mx-auto w-full max-w-[1160px] px-4 pt-5 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Pipe-separated tabs (exact SHIZUKU aesthetic) */}
          <nav aria-label="Main navigation" className="hidden overflow-x-auto no-scrollbar md:block">
            <ul className="flex flex-nowrap items-center">
              {NAV_ITEMS.map((item, idx) => {
                const active = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <li
                    key={item.id}
                    className={`shrink-0 border-r border-[#745bc7]/45 ${
                      idx === 0 ? "border-l" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 font-editorial text-[13px] tracking-[0.16em] uppercase transition ${
                        active
                          ? "bg-[#745bc7]/12 font-bold text-[#745bc7]"
                          : "font-medium text-[#5d5370] hover:text-[#7650f3]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 opacity-80" />
                      {t.nav[item.id]}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Month Selector + Mobile Display Currency Switcher */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-full border border-[#745bc7]/28 bg-white/75 px-1.5 py-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))}
                aria-label="Previous month"
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#745bc7] transition hover:bg-[#745bc7]/12"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex min-w-[132px] items-center justify-center gap-1.5 px-2 text-xs font-semibold text-[#14100e]">
                <Calendar className="h-3.5 w-3.5 text-[#745bc7]" />
                <span>{formatMonthLabel(selectedMonth, locale)}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, 1))}
                aria-label="Next month"
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#745bc7] transition hover:bg-[#745bc7]/12"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile currency pill switcher */}
            <div className="flex items-center rounded-full border border-[#745bc7]/25 bg-white/70 p-0.5 md:hidden">
              {currencyModes.map((mode) => {
                const active = store.settings.displayCurrency === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDisplayCurrency(mode)}
                    className={`rounded-full px-2 py-1 font-mono text-[10px] font-semibold transition ${
                      active ? "bg-[#745bc7] text-white" : "text-[#5d5370]"
                    }`}
                  >
                    {mode === "DUAL" ? "2x" : mode}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#745bc7]/20 bg-[#efe9fd]/95 px-1 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
      >
        <div className="grid grid-cols-7 gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition ${
                  active
                    ? "bg-[#745bc7]/14 font-semibold text-[#745bc7]"
                    : "text-[#5d5370]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate text-[9px] leading-tight">
                  {t.navShort[item.id]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
