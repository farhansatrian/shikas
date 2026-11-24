import React, { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { CATEGORY_MAP, getCategoryLabel } from "../../data/categories";
import type { Transaction, TransactionType } from "../../types/cashflow";
import {
  computeCumulativeNetBalance,
  computeMonthlySummary,
} from "../../utils/calculations";
import {
  formatDateHeading,
  formatMonthLabel,
  shiftMonthKey,
} from "../../utils/format";
import { CategoryIcon } from "../common/CategoryIcon";
import { MoneyDisplay } from "../common/MoneyDisplay";

type FilterType = "all" | TransactionType;

export const CashflowView: React.FC = () => {
  const {
    store,
    selectedMonth,
    setSelectedMonth,
    t,
    locale,
    openNewTxModal,
    openEditTxModal,
    duplicateTransaction,
    deleteTransaction,
  } = useCashflow();

  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [query, setQuery] = useState("");

  const monthTransactions = useMemo(
    () => store.transactions.filter((tx) => tx.date.startsWith(selectedMonth)),
    [store.transactions, selectedMonth]
  );

  const monthSummary = useMemo(
    () => computeMonthlySummary(store.transactions, selectedMonth),
    [store.transactions, selectedMonth]
  );

  const cumulativeBalance = useMemo(
    () => computeCumulativeNetBalance(store.transactions),
    [store.transactions]
  );

  // Only show categories that actually appear in the selected month (+ filter type) for clean chips
  const activeMonthCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tx of monthTransactions) {
      if (typeFilter !== "all" && tx.type !== typeFilter) continue;
      ids.add(tx.categoryId);
    }
    return Array.from(ids);
  }, [monthTransactions, typeFilter]);

  const filteredTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monthTransactions
      .filter((tx) => {
        if (typeFilter !== "all" && tx.type !== typeFilter) return false;
        if (categoryFilter !== "all" && tx.categoryId !== categoryFilter) return false;
        if (!q) return true;
        const catLabel = getCategoryLabel(tx.categoryId, locale).toLowerCase();
        return (
          tx.note.toLowerCase().includes(q) ||
          (tx.merchant ?? "").toLowerCase().includes(q) ||
          catLabel.includes(q)
        );
      })
      .sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)
      );
  }, [monthTransactions, typeFilter, categoryFilter, query, locale]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, { items: Transaction[]; dailyNet: number }>();
    for (const tx of filteredTransactions) {
      const entry = groups.get(tx.date) ?? { items: [], dailyNet: 0 };
      entry.items.push(tx);
      entry.dailyNet += tx.type === "income" ? tx.amountIdr : -tx.amountIdr;
      groups.set(tx.date, entry);
    }
    return Array.from(groups.entries());
  }, [filteredTransactions]);

  const spentRatio =
    monthSummary.incomeIdr > 0
      ? Math.min(100, (monthSummary.expenseIdr / monthSummary.incomeIdr) * 100)
      : monthSummary.expenseIdr > 0
        ? 100
        : 0;

  const savedRatio =
    monthSummary.incomeIdr > 0
      ? Math.max(0, 100 - spentRatio)
      : 0;

  const hasActiveFilter =
    typeFilter !== "all" || categoryFilter !== "all" || query.trim() !== "";

  const handleSetTypeFilter = (next: FilterType) => {
    setTypeFilter(next);
    setCategoryFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Clean Single Top Bar: Title + Integrated Month Switcher + Tactile Pill Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-nav text-2xl font-medium tracking-[0.14em] text-[#1a1423] uppercase sm:text-[28px]">
            {t.cashflow.title}
          </h1>

          {/* Integrated Sleek Month Pill */}
          <div className="inline-flex items-center gap-1 rounded-full border border-[#745bc7]/20 bg-white/80 px-1.5 py-1 shadow-2xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                setSelectedMonth(shiftMonthKey(selectedMonth, -1));
                setCategoryFilter("all");
              }}
              aria-label="Previous month"
              className="flex h-6.5 w-6.5 items-center justify-center rounded-full text-[#655978] transition hover:bg-[#745bc7]/10 hover:text-[#745bc7]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[116px] text-center text-xs font-semibold text-[#1a1423]">
              {formatMonthLabel(selectedMonth, locale)}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedMonth(shiftMonthKey(selectedMonth, 1));
                setCategoryFilter("all");
              }}
              aria-label="Next month"
              className="flex h-6.5 w-6.5 items-center justify-center rounded-full text-[#655978] transition hover:bg-[#745bc7]/10 hover:text-[#745bc7]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Crisp Tactile Action Pills */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => openNewTxModal("income")}
            className="shikas-btn-soft px-4 py-2 text-xs text-[#108469] hover:border-[#108469]/50 hover:text-[#108469]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.actions.addIncome}
          </button>
          <button
            type="button"
            onClick={() => openNewTxModal("expense")}
            className="shikas-btn-primary px-4.5 py-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.actions.addExpense}
          </button>
        </div>
      </div>

      {/* =====================================================================
          TACTILE BENTO SUMMARY (Hero Net Cashflow + Interactive Income/Expense)
         ===================================================================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Hero Net Cashflow & Ratio Card */}
        <div className="glass-card flex flex-col justify-between rounded-2xl p-6 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-[#655978]">
                {t.cashflow.netCashflow}
              </span>
              {monthSummary.incomeIdr > 0 && (
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                    monthSummary.netCashflowIdr >= 0
                      ? "bg-[#108469]/12 text-[#108469]"
                      : "bg-[#c43673]/12 text-[#c43673]"
                  }`}
                >
                  {monthSummary.netCashflowIdr >= 0
                    ? `${savedRatio.toFixed(0)}% ${locale === "id" ? "tersimpan" : "saved"}`
                    : locale === "id"
                      ? "Defisit"
                      : "Deficit"}
                </span>
              )}
            </div>

            <div className="mt-2.5">
              <MoneyDisplay
                amountIdr={monthSummary.netCashflowIdr}
                showSign
                className={`text-3xl font-bold tracking-tight sm:text-[34px] ${
                  monthSummary.netCashflowIdr >= 0 ? "text-[#1a1423]" : "text-[#c43673]"
                }`}
              />
            </div>

            {/* Sleek Income vs Expense Ratio Meter */}
            <div className="mt-5">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#745bc7]/12">
                {monthSummary.incomeIdr > 0 && (
                  <>
                    <div
                      className="h-full rounded-l-full bg-gradient-to-r from-[#108469] to-[#26a68a] transition-all duration-300"
                      style={{ width: `${savedRatio}%` }}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-[#d958b8] to-[#c43673] transition-all duration-300"
                      style={{ width: `${spentRatio}%` }}
                    />
                  </>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[#655978]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#108469]" />
                  {locale === "id" ? "Tersimpan" : "Saved"} ({savedRatio.toFixed(0)}%)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#c43673]" />
                  {locale === "id" ? "Terpakai" : "Spent"} ({spentRatio.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#745bc7]/12 pt-3.5 text-xs text-[#655978]">
            <span>
              {t.cashflow.totalSaved}:{" "}
              <MoneyDisplay
                amountIdr={cumulativeBalance}
                className="font-semibold text-[#745bc7]"
              />
            </span>
            <span className="font-mono text-[11px]">
              {monthSummary.txCount} {t.cashflow.entriesCount}
            </span>
          </div>
        </div>

        {/* Right: 2 Crisp Stacked Income & Expense Interactive Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          {/* Income Card */}
          <div
            onClick={() => handleSetTypeFilter(typeFilter === "income" ? "all" : "income")}
            className={`glass-card glass-card-interactive flex cursor-pointer items-center justify-between rounded-2xl p-5 ${
              typeFilter === "income" ? "ring-2 ring-[#108469]/45" : ""
            }`}
          >
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#108469]/12 text-[#108469]">
                <ArrowDownLeft className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-[#655978]">{t.cashflow.income}</p>
                <div className="mt-0.5">
                  <MoneyDisplay
                    amountIdr={monthSummary.incomeIdr}
                    className="text-xl font-bold text-[#108469]"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openNewTxModal("income");
              }}
              aria-label="Quick add income"
              title={t.actions.addIncome}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#108469]/10 text-[#108469] transition hover:bg-[#108469] hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Expense Card */}
          <div
            onClick={() => handleSetTypeFilter(typeFilter === "expense" ? "all" : "expense")}
            className={`glass-card glass-card-interactive flex cursor-pointer items-center justify-between rounded-2xl p-5 ${
              typeFilter === "expense" ? "ring-2 ring-[#c43673]/45" : ""
            }`}
          >
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#c43673]/12 text-[#c43673]">
                <ArrowUpRight className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-[#655978]">{t.cashflow.expense}</p>
                <div className="mt-0.5">
                  <MoneyDisplay
                    amountIdr={monthSummary.expenseIdr}
                    className="text-xl font-bold text-[#c43673]"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openNewTxModal("expense");
              }}
              aria-label="Quick add expense"
              title={t.actions.addExpense}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c43673]/10 text-[#c43673] transition hover:bg-[#c43673] hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          UNIFIED FROSTED GLASS LEDGER SHEET (Zero fragmented day boxes!)
         ===================================================================== */}
      <section className="glass-card overflow-hidden rounded-2xl">
        {/* Top Filter & Search Bar */}
        <div className="border-b border-[#745bc7]/12 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Soft Segmented Type Pill */}
            <div className="inline-flex w-fit rounded-full bg-[#f3edfc] p-1">
              {(["all", "income", "expense"] as const).map((tab) => {
                const active = typeFilter === tab;
                const label =
                  tab === "all"
                    ? t.cashflow.all
                    : tab === "income"
                      ? t.cashflow.income
                      : t.cashflow.expense;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleSetTypeFilter(tab)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-white text-[#745bc7] shadow-xs"
                        : "text-[#655978] hover:text-[#1a1423]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Rounded Search Input */}
            <div className="flex flex-1 items-center gap-2 rounded-full border border-[#745bc7]/16 bg-[#f7f4fc]/85 px-3.5 py-1.5 transition focus-within:border-[#745bc7]/45 focus-within:bg-white sm:max-w-[280px]">
              <Search className="h-3.5 w-3.5 shrink-0 text-[#745bc7]/75" />
              <input
                type="text"
                placeholder={t.cashflow.searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-[#1a1423] outline-none placeholder:text-[#655978]/70"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="text-[#655978] hover:text-[#1a1423]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tappable Category Filter Chips (replaces raw OS <select>) */}
          {activeMonthCategoryIds.length > 0 && (
            <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar sm:flex-wrap sm:overflow-visible">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition ${
                  categoryFilter === "all"
                    ? "bg-[#745bc7] text-white"
                    : "bg-[#f4effc] text-[#655978] hover:bg-[#ebe3fa] hover:text-[#1a1423]"
                }`}
              >
                {t.cashflow.allCategories}
              </button>
              {activeMonthCategoryIds.map((catId) => {
                const cat = CATEGORY_MAP[catId];
                const active = categoryFilter === catId;
                return (
                  <button
                    key={catId}
                    type="button"
                    onClick={() => setCategoryFilter(active ? "all" : catId)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition ${
                      active
                        ? "bg-[#745bc7] text-white"
                        : "bg-[#f4effc] text-[#655978] hover:bg-[#ebe3fa] hover:text-[#1a1423]"
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: active ? "#ffffff" : cat?.color ?? "#745bc7" }}
                    />
                    {getCategoryLabel(catId, locale)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Entries List inside Unified Sheet */}
        {groupedByDate.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-[#1a1423]">{t.cashflow.emptyTitle}</p>
            <p className="mt-1 text-xs text-[#655978]">{t.cashflow.emptyDesc}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("all");
                    setCategoryFilter("all");
                    setQuery("");
                  }}
                  className="shikas-btn-soft px-4 py-2 text-xs"
                >
                  {t.actions.resetFilters}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openNewTxModal("income")}
                    className="shikas-btn-soft px-4 py-2 text-xs text-[#108469]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.actions.addIncome}
                  </button>
                  <button
                    type="button"
                    onClick={() => openNewTxModal("expense")}
                    className="shikas-btn-primary px-4 py-2 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.actions.addExpense}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div>
            {groupedByDate.map(([dateIso, group], groupIdx) => (
              <div key={dateIso} className={groupIdx > 0 ? "border-t border-[#745bc7]/10" : ""}>
                {/* Subtle Date Group Strip */}
                <div className="flex items-center justify-between bg-[#745bc7]/[0.045] px-5 py-2">
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-[#655978] uppercase">
                    {formatDateHeading(dateIso, locale)}
                  </span>
                  <MoneyDisplay
                    amountIdr={group.dailyNet}
                    showSign
                    className={`text-[11px] font-semibold ${
                      group.dailyNet >= 0 ? "text-[#108469]" : "text-[#655978]"
                    }`}
                  />
                </div>

                {/* Transaction Rows */}
                <ul className="divide-y divide-[#745bc7]/8">
                  {group.items.map((tx) => {
                    const cat = CATEGORY_MAP[tx.categoryId];
                    const isIncome = tx.type === "income";
                    const color = cat?.color ?? "#745bc7";

                    return (
                      <li
                        key={tx.id}
                        className="group flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-[#745bc7]/[0.035] sm:px-5"
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor: `${color}18`,
                              color,
                            }}
                          >
                            <CategoryIcon name={cat?.icon} className="h-4.5 w-4.5" />
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#1a1423]">
                              {tx.note}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[#655978]">
                              {getCategoryLabel(tx.categoryId, locale)}
                              {tx.merchant ? ` · ${tx.merchant}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <MoneyDisplay
                            amountIdr={isIncome ? tx.amountIdr : -tx.amountIdr}
                            showSign
                            className={`text-sm font-bold ${
                              isIncome ? "text-[#108469]" : "text-[#1a1423]"
                            }`}
                          />

                          <div className="flex items-center gap-0.5 sm:opacity-30 sm:transition sm:group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => openEditTxModal(tx)}
                              aria-label={t.actions.edit}
                              className="rounded-lg p-1.5 text-[#655978] transition hover:bg-[#745bc7]/12 hover:text-[#745bc7]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateTransaction(tx)}
                              aria-label={t.actions.duplicate}
                              className="rounded-lg p-1.5 text-[#655978] transition hover:bg-[#745bc7]/12 hover:text-[#745bc7]"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTransaction(tx.id)}
                              aria-label={t.actions.delete}
                              className="rounded-lg p-1.5 text-[#655978] transition hover:bg-[#c43673]/12 hover:text-[#c43673]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
