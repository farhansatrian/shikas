import React, { useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Calculator,
  PiggyBank,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCashflow } from "../../context/CashflowContext";
import { CATEGORY_MAP, getCategoryLabel } from "../../data/categories";
import {
  computeBudgetProgress,
  computeCategoryBreakdown,
  computeMonthlySummary,
  computeMultiMonthSeries,
  computePercentDelta,
  computeSafeToSpendDaily,
  computeTotalNetBalance,
  computeWalletBalances,
} from "../../utils/calculations";
import {
  formatCompactCurrency,
  formatIdr,
  formatIdrAsUsd,
  formatMonthLabel,
  formatShortDate,
  formatUsd,
  shiftMonthKey,
} from "../../utils/format";
import { CategoryIcon } from "../common/CategoryIcon";
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

  const prevMonth = shiftMonthKey(selectedMonth, -1);
  const prevSummary = useMemo(
    () => computeMonthlySummary(store.transactions, prevMonth),
    [store.transactions, prevMonth]
  );

  const incomeDelta = computePercentDelta(currentSummary.incomeIdr, prevSummary.incomeIdr);
  const expenseDelta = computePercentDelta(currentSummary.expenseIdr, prevSummary.expenseIdr);

  const safeToSpend = useMemo(
    () => computeSafeToSpendDaily(store.budgets, store.transactions, selectedMonth),
    [store.budgets, store.transactions, selectedMonth]
  );

  const budgetProgress = useMemo(
    () => computeBudgetProgress(store.budgets, store.transactions, selectedMonth).slice(0, 4),
    [store.budgets, store.transactions, selectedMonth]
  );

  const topCategories = useMemo(
    () => computeCategoryBreakdown(store.transactions, selectedMonth, "expense").slice(0, 4),
    [store.transactions, selectedMonth]
  );

  const sixMonthSeries = useMemo(
    () =>
      computeMultiMonthSeries(store.wallets, store.transactions, selectedMonth, 6).map((item) => ({
        ...item,
        label: formatMonthLabel(item.month, locale, true),
      })),
    [store.wallets, store.transactions, selectedMonth, locale]
  );

  const recentTx = useMemo(
    () =>
      store.transactions
        .filter((tx) => tx.date.startsWith(selectedMonth))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)))
        .slice(0, 6),
    [store.transactions, selectedMonth]
  );

  const chartCurrencyMode: "IDR" | "USD" =
    store.settings.displayCurrency === "USD" ? "USD" : "IDR";

  const healthStatus =
    currentSummary.netCashflowIdr < 0
      ? { label: t.dashboard.deficit, cls: "bg-[#c23b7b]/14 text-[#c23b7b]" }
      : currentSummary.savingsRate >= 20
        ? { label: t.dashboard.healthy, cls: "bg-[#14866d]/14 text-[#14866d]" }
        : { label: t.dashboard.caution, cls: "bg-[#b7791f]/14 text-[#b7791f]" };

  const formatDelta = (delta: number | null) => {
    if (delta === null) return "—";
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta.toFixed(1)}%`;
  };

  return (
    <div className="space-y-7">
      {/* Editorial Section Heading */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-[#745bc7] uppercase">
            {t.dashboard.eyebrow}
          </p>
          <h1 className="font-editorial mt-1.5 text-[30px] font-normal leading-none tracking-[7px] text-[#745bc7] uppercase sm:text-[36px] sm:tracking-[9px]">
            {t.dashboard.title}
          </h1>
        </div>

        {/* Quick Action Pill Row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openNewTxModal("expense")}
            className="tuyu-primary-btn px-4 py-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.actions.addTransaction}
          </button>
          <button
            type="button"
            onClick={() => openNewTxModal("transfer")}
            className="tuyu-pill-btn px-3.5 py-2 text-[11px]"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {t.actions.transfer}
          </button>
          <button
            type="button"
            onClick={() => setFxModalOpen(true)}
            className="tuyu-pill-btn px-3.5 py-2 text-[11px]"
          >
            <Calculator className="h-3.5 w-3.5" />
            {t.actions.fxConverter}
          </button>
        </div>
      </div>

      {/* Hero Twilight Net Balance + Daily Safe-to-Spend */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="twilight-card relative overflow-hidden rounded-2xl p-6 text-white lg:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/12 text-[#e5dcfb]">
                  <WalletIcon className="h-4 w-4" />
                </span>
                <p className="font-mono text-[11px] tracking-[0.18em] text-[#e5dcfb]/80 uppercase">
                  {t.dashboard.totalBalance} · {activeWallets.length} {t.dashboard.activeWallets}
                </p>
              </div>
              <div className="mt-3">
                <MoneyDisplay
                  amountIdr={totalNetBalance}
                  forceDual
                  primaryClassName="text-3xl font-bold tracking-tight text-white sm:text-4xl"
                  secondaryClassName="mt-1 text-sm font-medium text-[#e5dcfb]/80"
                />
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[11px] text-[#e5dcfb]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#7ee3cb]" />
                {healthStatus.label} · {currentSummary.savingsRate.toFixed(1)}%
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("wallets")}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#e5dcfb]/80 transition hover:text-white"
              >
                {t.nav.wallets}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Wallet mini chips strip */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/15 pt-4">
            {activeWallets.slice(0, 5).map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-2 rounded-xl border border-white/14 bg-white/8 px-3 py-1.5 text-xs"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: w.color }}
                />
                <span className="text-[#e5dcfb]/85">{w.name}</span>
                <span className="font-mono-num font-semibold text-white">
                  {store.settings.privacyMode
                    ? "••••"
                    : formatCompactCurrency(
                        walletBalances[w.id] ?? w.initialBalanceIdr,
                        chartCurrencyMode,
                        fx.usdToIdr,
                        locale
                      )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Safe-to-Spend Card */}
        <div className="tuyu-sheet flex flex-col justify-between rounded-2xl p-5 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] font-semibold tracking-[0.16em] text-[#745bc7] uppercase">
                {t.dashboard.safeToSpendTitle}
              </p>
              <PiggyBank className="h-4.5 w-4.5 text-[#745bc7]" />
            </div>

            {safeToSpend.totalBudgetIdr > 0 ? (
              <div className="mt-3">
                <MoneyDisplay
                  amountIdr={safeToSpend.dailySafeIdr}
                  primaryClassName="text-2xl font-bold text-[#14100e]"
                  secondaryClassName="text-xs text-[#5d5370]"
                />
                <p className="mt-1.5 text-xs text-[#5d5370]">
                  {safeToSpend.daysLeft > 0
                    ? `${safeToSpend.daysLeft} ${t.dashboard.safeToSpendSub}`
                    : formatMonthLabel(selectedMonth, locale)}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#5d5370]">{t.dashboard.noBudgetSet}</p>
            )}
          </div>

          <div className="mt-4 border-t border-[#745bc7]/15 pt-3">
            {safeToSpend.totalBudgetIdr > 0 ? (
              <>
                <div className="flex items-center justify-between text-[11px] text-[#5d5370]">
                  <span>{t.budgets.totalSpent}</span>
                  <span className="font-mono-num font-semibold text-[#14100e]">
                    {Math.min(
                      999,
                      Math.round(
                        (safeToSpend.totalSpentBudgetedIdr / safeToSpend.totalBudgetIdr) * 100
                      )
                    )}
                    %
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#745bc7]/14">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (safeToSpend.totalSpentBudgetedIdr / safeToSpend.totalBudgetIdr) * 100
                      )}%`,
                      background:
                        safeToSpend.remainingIdr < 0
                          ? "#c23b7b"
                          : "linear-gradient(90deg, #745bc7, #d749d5)",
                    }}
                  />
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab("budgets")}
                className="text-xs font-semibold text-[#745bc7] hover:text-[#7650f3]"
              >
                {t.actions.addBudget} →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Income */}
        <div className="tuyu-sheet tuyu-sheet-hover rounded-2xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] tracking-[0.14em] text-[#5d5370] uppercase">
              {t.dashboard.income}
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#14866d]/12 text-[#14866d]">
              <ArrowDownLeft className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <MoneyDisplay
              amountIdr={currentSummary.incomeIdr}
              primaryClassName="text-xl font-bold text-[#14866d]"
              secondaryClassName="text-[11px] text-[#5d5370]"
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-[#5d5370]">
            <span className="font-semibold text-[#14866d]">{formatDelta(incomeDelta)}</span>{" "}
            {t.dashboard.vsLastMonth}
          </p>
        </div>

        {/* Expense */}
        <div className="tuyu-sheet tuyu-sheet-hover rounded-2xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] tracking-[0.14em] text-[#5d5370] uppercase">
              {t.dashboard.expense}
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c23b7b]/12 text-[#c23b7b]">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <MoneyDisplay
              amountIdr={currentSummary.expenseIdr}
              primaryClassName="text-xl font-bold text-[#c23b7b]"
              secondaryClassName="text-[11px] text-[#5d5370]"
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-[#5d5370]">
            <span className="font-semibold text-[#c23b7b]">{formatDelta(expenseDelta)}</span>{" "}
            {t.dashboard.vsLastMonth}
          </p>
        </div>

        {/* Net Cashflow */}
        <div className="tuyu-sheet tuyu-sheet-hover rounded-2xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] tracking-[0.14em] text-[#5d5370] uppercase">
              {t.dashboard.netCashflow}
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#745bc7]/12 text-[#745bc7]">
              {currentSummary.netCashflowIdr >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </span>
          </div>
          <div className="mt-2.5">
            <MoneyDisplay
              amountIdr={currentSummary.netCashflowIdr}
              showSign
              primaryClassName={`text-xl font-bold ${
                currentSummary.netCashflowIdr >= 0 ? "text-[#745bc7]" : "text-[#c23b7b]"
              }`}
              secondaryClassName="text-[11px] text-[#5d5370]"
            />
          </div>
          <p className="mt-2 text-[11px] text-[#5d5370]">
            {currentSummary.netCashflowIdr >= 0 ? t.dashboard.surplus : t.dashboard.deficit} ·{" "}
            {currentSummary.txCount} {t.ledger.transactionsCount}
          </p>
        </div>

        {/* Savings Rate */}
        <div className="tuyu-sheet tuyu-sheet-hover rounded-2xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] tracking-[0.14em] text-[#5d5370] uppercase">
              {t.dashboard.savingsRate}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${healthStatus.cls}`}>
              {healthStatus.label}
            </span>
          </div>
          <p className="font-mono-num mt-2.5 text-2xl font-bold text-[#14100e]">
            {store.settings.privacyMode ? "••%" : `${currentSummary.savingsRate.toFixed(1)}%`}
          </p>
          <p className="mt-2 text-[11px] text-[#5d5370]">
            {currentSummary.transferFeesIdr > 0
              ? `${t.dashboard.transferFeesNote} (${formatIdr(currentSummary.transferFeesIdr)})`
              : formatMonthLabel(selectedMonth, locale)}
          </p>
        </div>
      </div>

      {/* Main Analytics Preview + Top Categories */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 6-Month Cashflow Bar Chart */}
        <div className="tuyu-sheet rounded-2xl p-5 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-editorial text-lg font-semibold tracking-[0.18em] text-[#745bc7] uppercase">
              {t.dashboard.cashflowTrend}
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className="text-xs font-semibold text-[#745bc7] hover:text-[#7650f3]"
            >
              {t.actions.viewAll} →
            </button>
          </div>

          <div className="mt-4 h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sixMonthSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(116,91,199,0.14)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#5d5370", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#5d5370", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    store.settings.privacyMode
                      ? "••"
                      : formatCompactCurrency(v, chartCurrencyMode, fx.usdToIdr, locale)
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(116,91,199,0.08)" }}
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.96)",
                    borderColor: "rgba(116,91,199,0.28)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => [
                    store.settings.privacyMode
                      ? "••••"
                      : chartCurrencyMode === "USD"
                        ? formatIdrAsUsd(value, fx.usdToIdr)
                        : `${formatIdr(value)} (${formatIdrAsUsd(value, fx.usdToIdr)})`,
                    name === "incomeIdr" ? t.analytics.incomeLegend : t.analytics.expenseLegend,
                  ]}
                />
                <Bar dataKey="incomeIdr" fill="#745bc7" radius={[6, 6, 0, 0]} maxBarSize={24} />
                <Bar dataKey="expenseIdr" fill="#d749d5" radius={[6, 6, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Watch + Top Spending */}
        <div className="tuyu-sheet flex flex-col justify-between rounded-2xl p-5 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-editorial text-lg font-semibold tracking-[0.18em] text-[#745bc7] uppercase">
                {budgetProgress.length > 0 ? t.dashboard.budgetWatch : t.dashboard.topExpenses}
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab(budgetProgress.length > 0 ? "budgets" : "analytics")}
                className="text-xs font-semibold text-[#745bc7] hover:text-[#7650f3]"
              >
                {t.actions.viewAll} →
              </button>
            </div>

            {budgetProgress.length > 0 ? (
              <div className="mt-4 space-y-3.5">
                {budgetProgress.map((item) => {
                  const cat = CATEGORY_MAP[item.budget.categoryId];
                  const barColor =
                    item.status === "exceeded"
                      ? "#c23b7b"
                      : item.status === "warning"
                        ? "#b7791f"
                        : cat?.color ?? "#745bc7";
                  return (
                    <div key={item.budget.id}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-medium text-[#14100e]">
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-white"
                            style={{ backgroundColor: cat?.color ?? "#745bc7" }}
                          >
                            <CategoryIcon name={cat?.icon} className="h-3.5 w-3.5" />
                          </span>
                          {getCategoryLabel(item.budget.categoryId, locale)}
                        </span>
                        <span className="font-mono-num text-[11px] font-semibold text-[#5d5370]">
                          {Math.round(item.percentage)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#745bc7]/12">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, item.percentage)}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-[#5d5370]">
                        <MoneyDisplay
                          amountIdr={item.spentIdr}
                          inline
                          primaryClassName="text-[11px] font-medium text-[#14100e]"
                          secondaryClassName="text-[10px] text-[#5d5370]"
                        />
                        <span className="font-mono-num text-[10px]">
                          / {store.settings.privacyMode ? "••••" : formatCompactCurrency(item.budget.limitIdr, chartCurrencyMode, fx.usdToIdr, locale)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : topCategories.length > 0 ? (
              <div className="mt-4 space-y-3">
                {topCategories.map((c) => {
                  const cat = CATEGORY_MAP[c.categoryId];
                  return (
                    <div key={c.categoryId} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2 font-medium text-[#14100e]">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat?.color ?? "#745bc7" }}
                        />
                        {getCategoryLabel(c.categoryId, locale)}
                      </span>
                      <span className="font-mono-num font-semibold text-[#14100e]">
                        {c.percentage.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 text-sm text-[#5d5370]">{t.dashboard.noTransactionsYet}</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity with SHIZUKU Signature Raindrop Dividers */}
      <section className="tuyu-sheet rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-editorial text-lg font-semibold tracking-[0.2em] text-[#745bc7] uppercase">
            {t.dashboard.recentActivity}
          </h2>
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className="tuyu-pill-btn px-4 py-1 text-[11px]"
          >
            MORE
          </button>
        </div>

        {recentTx.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#5d5370]">
            {t.dashboard.noTransactionsYet}
          </p>
        ) : (
          <ul className="mt-4">
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
                    className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:bg-[#745bc7]/5 sm:px-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs"
                        style={{ backgroundColor: cat?.color ?? "#745bc7" }}
                      >
                        <CategoryIcon name={cat?.icon} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-[#14100e]">
                            {tx.note}
                          </span>
                          {tx.originalCurrency === "USD" && (
                            <span className="rounded-full bg-[#7650f3]/12 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#7650f3]">
                              {formatUsd(tx.originalAmount)}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-[#5d5370]">
                          {formatShortDate(tx.date, locale)} ·{" "}
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
                        primaryClassName={`text-sm font-bold ${
                          isIncome
                            ? "text-[#14866d]"
                            : isTransfer
                              ? "text-[#2276a8]"
                              : "text-[#c23b7b]"
                        }`}
                        secondaryClassName="text-[11px] text-[#5d5370]"
                      />
                    </div>
                  </button>
                  <div className="tuyu-raindrop-divider opacity-75" />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
