import React, { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { SHIKAS_ASSETS } from "../../config/assets";
import { useCashflow } from "../../context/CashflowContext";
import { CATEGORY_MAP, getCategoryLabel } from "../../data/categories";
import {
  computeBudgetProgress,
  computeMonthlySummary,
  computePercentDelta,
  computeSafeToSpendDaily,
  computeTotalNetBalance,
  computeWalletBalances,
} from "../../utils/calculations";
import {
  formatCompactCurrency,
  formatMonthLabel,
  formatShortDate,
  formatUsd,
  shiftMonthKey,
} from "../../utils/format";
import { MoneyDisplay } from "../common/MoneyDisplay";

export const DashboardView: React.FC = () => {
  const {
    store,
    fx,
    selectedMonth,
    t,
    locale,
    setActiveTab,
    openNewTxModal,
    openEditTxModal,
    setFxModalOpen,
  } = useCashflow();

  const activeWallets = useMemo(
    () => store.wallets.filter((w) => !w.isArchived),
    [store.wallets]
  );

  const walletMap = useMemo(
    () => Object.fromEntries(store.wallets.map((w) => [w.id, w])),
    [store.wallets]
  );

  const walletBalances = useMemo(
    () => computeWalletBalances(store.wallets, store.transactions),
    [store.wallets, store.transactions]
  );

  const totalNetBalance = useMemo(
    () => computeTotalNetBalance(store.wallets, walletBalances),
    [store.wallets, walletBalances]
  );

  const currentSummary = useMemo(
    () => computeMonthlySummary(store.transactions, selectedMonth),
    [store.transactions, selectedMonth]
  );

  const prevSummary = useMemo(
    () => computeMonthlySummary(store.transactions, shiftMonthKey(selectedMonth, -1)),
    [store.transactions, selectedMonth]
  );

  const incomeDelta = computePercentDelta(currentSummary.incomeIdr, prevSummary.incomeIdr);
  const expenseDelta = computePercentDelta(currentSummary.expenseIdr, prevSummary.expenseIdr);

  const safeToSpend = useMemo(
    () => computeSafeToSpendDaily(store.budgets, store.transactions, selectedMonth),
    [store.budgets, store.transactions, selectedMonth]
  );

  const topBudget = useMemo(
    () => computeBudgetProgress(store.budgets, store.transactions, selectedMonth)[0] ?? null,
    [store.budgets, store.transactions, selectedMonth]
  );

  const recentTx = useMemo(
    () =>
      store.transactions
        .filter((tx) => tx.date.startsWith(selectedMonth))
        .sort((a, b) =>
          a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)
        )
        .slice(0, 6),
    [store.transactions, selectedMonth]
  );

  const compactMode: "IDR" | "USD" =
    store.settings.displayCurrency === "USD" ? "USD" : "IDR";

  const formatDelta = (delta: number | null) => {
    if (delta === null) return "—";
    return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
  };

  return (
    <div className="space-y-12">
      {/* =====================================================================
          GALLERY DIPTYCH CENTERPIECE (Echoing Reference Image 1: Light | Dark)
         ===================================================================== */}
      <section className="grid grid-cols-1 border border-[#14100e]/18 bg-white/85 shadow-[0_18px_45px_-36px_rgba(20,16,14,0.45)] md:grid-cols-2">
        {/* Left Half: Quiet Framed Illustration / User Custom Asset Slot */}
        <div className="relative aspect-square overflow-hidden border-b border-[#14100e]/14 bg-[#f6f3f6] md:aspect-auto md:min-h-[430px] md:border-r md:border-b-0">
          <img
            src={SHIKAS_ASSETS.heroLeft}
            alt="SHIKAS (雫) editorial artwork"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Right Half: Stark Monochrome Dark Panel — Net Worth & Monthly Vitals */}
        <div className="gallery-dark relative flex flex-col justify-between overflow-hidden border-0 p-7 sm:p-9">
          {SHIKAS_ASSETS.heroRight ? (
            <img
              src={SHIKAS_ASSETS.heroRight}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-22"
            />
          ) : null}

          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2 font-mono text-[10px] tracking-[0.2em] text-white/55 uppercase">
              <span>{t.dashboard.totalBalance}</span>
              <span>
                {activeWallets.length} {t.dashboard.activeWallets}
              </span>
            </div>

            <div className="mt-4">
              <MoneyDisplay
                amountIdr={totalNetBalance}
                forceDual
                primaryClassName="text-3xl font-semibold tracking-tight text-white sm:text-[34px]"
                secondaryClassName="mt-1.5 text-sm text-white/60"
              />
            </div>

            {/* Minimalist 2x2 Monthly Vitals (zero boxes, pure typography) */}
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/14 pt-6">
              <div>
                <p className="font-mono text-[10px] tracking-[0.16em] text-white/50 uppercase">
                  {t.dashboard.income}
                </p>
                <div className="mt-1">
                  <MoneyDisplay
                    amountIdr={currentSummary.incomeIdr}
                    primaryClassName="text-sm font-medium text-[#7fe3c9] sm:text-base"
                    secondaryClassName="text-[11px] text-white/45"
                  />
                </div>
                <p className="mt-1 font-mono text-[10px] text-white/45">
                  {formatDelta(incomeDelta)} {t.dashboard.vsLastMonth}
                </p>
              </div>

              <div>
                <p className="font-mono text-[10px] tracking-[0.16em] text-white/50 uppercase">
                  {t.dashboard.expense}
                </p>
                <div className="mt-1">
                  <MoneyDisplay
                    amountIdr={currentSummary.expenseIdr}
                    primaryClassName="text-sm font-medium text-[#f49bc0] sm:text-base"
                    secondaryClassName="text-[11px] text-white/45"
                  />
                </div>
                <p className="mt-1 font-mono text-[10px] text-white/45">
                  {formatDelta(expenseDelta)} {t.dashboard.vsLastMonth}
                </p>
              </div>

              <div>
                <p className="font-mono text-[10px] tracking-[0.16em] text-white/50 uppercase">
                  {t.dashboard.netCashflow}
                </p>
                <div className="mt-1">
                  <MoneyDisplay
                    amountIdr={currentSummary.netCashflowIdr}
                    showSign
                    primaryClassName="text-sm font-medium text-white sm:text-base"
                    secondaryClassName="text-[11px] text-white/45"
                  />
                </div>
              </div>

              <div>
                <p className="font-mono text-[10px] tracking-[0.16em] text-white/50 uppercase">
                  {t.dashboard.savingsRate}
                </p>
                <p className="font-mono-num mt-1 text-base font-medium text-white">
                  {store.settings.privacyMode ? "••%" : `${currentSummary.savingsRate.toFixed(1)}%`}
                </p>
                <p className="mt-1 font-mono text-[10px] text-white/45">
                  {currentSummary.netCashflowIdr < 0
                    ? t.dashboard.deficit
                    : currentSummary.savingsRate >= 20
                      ? t.dashboard.healthy
                      : t.dashboard.caution}
                </p>
              </div>
            </div>
          </div>

          {/* Quiet Bottom Action Links inside Dark Half */}
          <div className="relative z-10 mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/14 pt-5 font-nav text-[14px] tracking-[0.14em] uppercase">
            <button
              type="button"
              onClick={() => openNewTxModal("expense")}
              className="border-b border-white pb-0.5 text-white transition hover:opacity-75"
            >
              + {t.actions.addTransaction}
            </button>
            <button
              type="button"
              onClick={() => openNewTxModal("transfer")}
              className="text-white/70 transition hover:text-white"
            >
              {t.actions.transfer}
            </button>
            <button
              type="button"
              onClick={() => setFxModalOpen(true)}
              className="text-white/70 transition hover:text-white"
            >
              {t.actions.fxConverter}
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          QUIET 3-COLUMN SUMMARY STRIP (Safe-to-Spend · Wallets · Budget)
         ===================================================================== */}
      <section className="gallery-sheet grid grid-cols-1 divide-y divide-[#14100e]/10 md:grid-cols-3 md:divide-x md:divide-y-0">
        {/* Safe to spend */}
        <div className="p-5">
          <p className="font-mono text-[10px] tracking-[0.18em] text-[#5f5368] uppercase">
            {t.dashboard.safeToSpendTitle}
          </p>
          {safeToSpend.totalBudgetIdr > 0 ? (
            <>
              <div className="mt-2">
                <MoneyDisplay
                  amountIdr={safeToSpend.dailySafeIdr}
                  primaryClassName="text-lg font-semibold text-[#14100e]"
                  secondaryClassName="text-[11px] text-[#5f5368]"
                />
              </div>
              <p className="mt-1.5 text-xs text-[#5f5368]">
                {safeToSpend.daysLeft > 0
                  ? `${safeToSpend.daysLeft} ${t.dashboard.safeToSpendSub}`
                  : formatMonthLabel(selectedMonth, locale)}
              </p>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab("plan")}
              className="mt-2 text-xs text-[#14100e] underline underline-offset-4"
            >
              {t.actions.addBudget}
            </button>
          )}
        </div>

        {/* Wallets compact overview */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-[0.18em] text-[#5f5368] uppercase">
              {t.nav.wallets}
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("wallets")}
              className="font-mono text-[10px] text-[#14100e]/70 hover:text-[#14100e] hover:underline"
            >
              {t.actions.viewAll} →
            </button>
          </div>
          <ul className="mt-2.5 space-y-1.5 text-xs">
            {activeWallets.slice(0, 3).map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-[#5f5368]">{w.name}</span>
                <span className="font-mono-num font-medium text-[#14100e]">
                  {store.settings.privacyMode
                    ? "••••"
                    : formatCompactCurrency(
                        walletBalances[w.id] ?? w.initialBalanceIdr,
                        compactMode,
                        fx.usdToIdr,
                        locale
                      )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Top Budget Watch */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-[0.18em] text-[#5f5368] uppercase">
              {t.dashboard.budgetWatch}
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("plan")}
              className="font-mono text-[10px] text-[#14100e]/70 hover:text-[#14100e] hover:underline"
            >
              {t.nav.plan} →
            </button>
          </div>
          {topBudget ? (
            <div className="mt-2.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-[#14100e]">
                  {getCategoryLabel(topBudget.budget.categoryId, locale)}
                </span>
                <span className="font-mono-num text-[11px] text-[#5f5368]">
                  {Math.round(topBudget.percentage)}%
                </span>
              </div>
              <div className="mt-2 h-[3px] w-full bg-[#14100e]/10">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(100, topBudget.percentage)}%`,
                    backgroundColor:
                      topBudget.status === "exceeded" ? "#b42e69" : "#14100e",
                  }}
                />
              </div>
              <div className="mt-2 text-[11px] text-[#5f5368]">
                <MoneyDisplay
                  amountIdr={topBudget.spentIdr}
                  inline
                  primaryClassName="text-[11px] font-medium text-[#14100e]"
                  secondaryClassName="text-[10px] text-[#5f5368]"
                />
              </div>
            </div>
          ) : (
            <p className="mt-2.5 text-xs text-[#5f5368]">{t.dashboard.noBudgetSet}</p>
          )}
        </div>
      </section>

      {/* =====================================================================
          RECENT ACTIVITY — EDITORIAL INDEX LIST
         ===================================================================== */}
      <section className="gallery-sheet p-6 sm:p-7">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-nav text-lg font-medium tracking-[0.16em] text-[#14100e] uppercase">
            {t.dashboard.recentActivity}
          </h2>
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className="inline-flex items-center gap-1 font-mono text-[11px] text-[#14100e]/75 transition hover:text-[#14100e] hover:underline"
          >
            {t.nav.ledger}
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="tuyu-raindrop-divider mt-3 mb-2" />

        {recentTx.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#5f5368]">
            {t.dashboard.noTransactionsYet}
          </p>
        ) : (
          <ul className="divide-y divide-[#14100e]/10">
            {recentTx.map((tx) => {
              const cat = CATEGORY_MAP[tx.categoryId];
              const wallet = walletMap[tx.walletId];
              const toWallet = tx.toWalletId ? walletMap[tx.toWalletId] : undefined;
              const isIncome = tx.type === "income";
              const isTransfer = tx.type === "transfer";

              return (
                <li key={tx.id}>
                  <button
                    type="button"
                    onClick={() => openEditTxModal(tx)}
                    className="flex w-full items-center justify-between gap-4 py-3.5 text-left transition hover:bg-[#14100e]/[0.025]"
                  >
                    <div className="flex min-w-0 items-baseline gap-3">
                      <span className="hidden w-14 shrink-0 font-mono text-[11px] text-[#5f5368] sm:inline">
                        {formatShortDate(tx.date, locale)}
                      </span>
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 self-start rounded-full"
                        style={{ backgroundColor: cat?.color ?? "#14100e" }}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-[#14100e]">
                            {tx.note}
                          </span>
                          {tx.originalCurrency === "USD" && (
                            <span className="font-mono text-[10px] text-[#745bc7]">
                              [{formatUsd(tx.originalAmount)}]
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-[#5f5368]">
                          <span className="sm:hidden">{formatShortDate(tx.date, locale)} · </span>
                          {getCategoryLabel(tx.categoryId, locale)} ·{" "}
                          {isTransfer && toWallet
                            ? `${wallet?.name ?? ""} → ${toWallet.name}`
                            : wallet?.name ?? ""}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <MoneyDisplay
                        amountIdr={isIncome ? tx.amountIdr : isTransfer ? tx.amountIdr : -tx.amountIdr}
                        showSign={!isTransfer}
                        primaryClassName={`text-sm font-medium ${
                          isIncome
                            ? "text-[#117a62]"
                            : isTransfer
                              ? "text-[#1e6c99]"
                              : "text-[#14100e]"
                        }`}
                        secondaryClassName="text-[10px] text-[#5f5368]"
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
