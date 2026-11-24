import React, { useMemo, useState } from "react";
import { Copy, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { CATEGORIES, CATEGORY_MAP, getCategoryLabel } from "../../data/categories";
import type { Transaction, TransactionType } from "../../types/cashflow";
import { computeCumulativeNetBalance } from "../../utils/calculations";
import { formatDateHeading, formatMonthLabel } from "../../utils/format";
import { MoneyDisplay } from "../common/MoneyDisplay";

type FilterType = "all" | TransactionType;

export const CashflowView: React.FC = () => {
  const {
    store,
    selectedMonth,
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

  const filteredTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.transactions
      .filter((tx) => {
        if (!tx.date.startsWith(selectedMonth)) return false;
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
  }, [store.transactions, selectedMonth, typeFilter, categoryFilter, query, locale]);

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

  const filteredTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === "income") income += tx.amountIdr;
      else expense += tx.amountIdr;
    }
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  const cumulativeBalance = useMemo(
    () => computeCumulativeNetBalance(store.transactions),
    [store.transactions]
  );

  const hasActiveFilter =
    typeFilter !== "all" || categoryFilter !== "all" || query.trim() !== "";

  const resetFilters = () => {
    setTypeFilter("all");
    setCategoryFilter("all");
    setQuery("");
  };

  const tabs: Array<{ value: FilterType; label: string }> = [
    { value: "all", label: t.cashflow.all },
    { value: "income", label: t.cashflow.income },
    { value: "expense", label: t.cashflow.expense },
  ];

  return (
    <div className="space-y-7">
      {/* Header + 1-Click Income / Expense Buttons */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#5f5368] uppercase">
            {formatMonthLabel(selectedMonth, locale)} · {filteredTransactions.length}{" "}
            {t.cashflow.entriesCount}
          </p>
          <h1 className="font-nav mt-1 text-2xl font-medium tracking-[0.16em] text-[#14100e] uppercase sm:text-3xl">
            {t.cashflow.title}
          </h1>
          <p className="mt-1 text-xs text-[#5f5368]">{t.cashflow.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => openNewTxModal("income")}
            className="inline-flex items-center gap-1.5 border border-[#117a62] bg-white/75 px-4 py-2 font-nav text-xs font-medium tracking-[0.14em] text-[#117a62] uppercase transition hover:bg-[#117a62] hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.actions.addIncome}
          </button>
          <button
            type="button"
            onClick={() => openNewTxModal("expense")}
            className="gallery-btn-solid px-4 py-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.actions.addExpense}
          </button>
        </div>
      </div>

      {/* Filter & Totals Sheet */}
      <div className="gallery-sheet p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <ul className="flex items-center gap-6">
            {tabs.map((tab) => {
              const active = typeFilter === tab.value;
              return (
                <li key={tab.value}>
                  <button
                    type="button"
                    onClick={() => setTypeFilter(tab.value)}
                    className={`font-nav pb-1 text-sm tracking-[0.14em] uppercase transition ${
                      active
                        ? "border-b-[1.5px] border-[#14100e] font-medium text-[#14100e]"
                        : "border-b-[1.5px] border-transparent text-[#5f5368] hover:text-[#14100e]"
                    }`}
                  >
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[200px] flex-1 items-center gap-2 border-b border-[#14100e]/25 pb-1 sm:flex-initial">
              <Search className="h-3.5 w-3.5 text-[#5f5368]" />
              <input
                type="text"
                placeholder={t.cashflow.searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-[#14100e] outline-none placeholder:text-[#5f5368]/70"
              />
            </div>

            <select
              aria-label={t.cashflow.allCategories}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border-b border-[#14100e]/25 bg-transparent pb-1 text-xs text-[#14100e] outline-none"
            >
              <option value="all">{t.cashflow.allCategories}</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {locale === "id" ? c.nameId : c.nameEn}
                </option>
              ))}
            </select>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-[#5f5368] hover:text-[#14100e]"
              >
                <RotateCcw className="h-3 w-3" />
                {t.actions.resetFilters}
              </button>
            )}
          </div>
        </div>

        {/* Clean 4-Metric Summary Strip */}
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#14100e]/10 pt-4 text-xs sm:grid-cols-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
              {t.cashflow.income}
            </p>
            <div className="mt-1">
              <MoneyDisplay
                amountIdr={filteredTotals.income}
                className="text-sm font-semibold text-[#117a62]"
              />
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
              {t.cashflow.expense}
            </p>
            <div className="mt-1">
              <MoneyDisplay
                amountIdr={filteredTotals.expense}
                className="text-sm font-semibold text-[#b42e69]"
              />
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
              {t.cashflow.netCashflow}
            </p>
            <div className="mt-1">
              <MoneyDisplay
                amountIdr={filteredTotals.net}
                showSign
                className="text-sm font-semibold text-[#14100e]"
              />
            </div>
          </div>

          <div className="sm:text-right">
            <p className="font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
              {t.cashflow.totalSaved}
            </p>
            <div className="mt-1">
              <MoneyDisplay
                amountIdr={cumulativeBalance}
                className="text-sm font-semibold text-[#745bc7]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Daily Entries */}
      {groupedByDate.length === 0 ? (
        <div className="gallery-sheet px-6 py-14 text-center">
          <p className="font-nav text-lg tracking-[0.14em] text-[#14100e] uppercase">
            {t.cashflow.emptyTitle}
          </p>
          <p className="mt-2 text-xs text-[#5f5368]">{t.cashflow.emptyDesc}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={() => openNewTxModal("income")}
              className="gallery-btn px-4 py-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.actions.addIncome}
            </button>
            <button
              type="button"
              onClick={() => openNewTxModal("expense")}
              className="gallery-btn-solid px-4 py-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.actions.addExpense}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByDate.map(([dateIso, group]) => (
            <section key={dateIso} className="gallery-sheet p-5">
              <div className="flex items-baseline justify-between gap-2 pb-2">
                <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-[#14100e] uppercase">
                  {formatDateHeading(dateIso, locale)}
                </span>
                <MoneyDisplay
                  amountIdr={group.dailyNet}
                  showSign
                  className={`text-xs font-medium ${
                    group.dailyNet >= 0 ? "text-[#117a62]" : "text-[#5f5368]"
                  }`}
                />
              </div>

              <div className="tuyu-raindrop-divider mb-1.5" />

              <ul className="divide-y divide-[#14100e]/10">
                {group.items.map((tx) => {
                  const cat = CATEGORY_MAP[tx.categoryId];
                  const isIncome = tx.type === "income";

                  return (
                    <li
                      key={tx.id}
                      className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: cat?.color ?? "#14100e" }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#14100e]">{tx.note}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-[#5f5368]">
                            {getCategoryLabel(tx.categoryId, locale)}
                            {tx.merchant ? ` · ${tx.merchant}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <MoneyDisplay
                          amountIdr={isIncome ? tx.amountIdr : -tx.amountIdr}
                          showSign
                          className={`text-sm font-medium ${
                            isIncome ? "text-[#117a62]" : "text-[#14100e]"
                          }`}
                        />

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditTxModal(tx)}
                            aria-label={t.actions.edit}
                            className="p-1.5 text-[#5f5368] transition hover:text-[#14100e]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateTransaction(tx)}
                            aria-label={t.actions.duplicate}
                            className="p-1.5 text-[#5f5368] transition hover:text-[#14100e]"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTransaction(tx.id)}
                            aria-label={t.actions.delete}
                            className="p-1.5 text-[#5f5368] transition hover:text-[#b42e69]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
