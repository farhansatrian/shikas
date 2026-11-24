import React, { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Copy,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { CATEGORIES, CATEGORY_MAP, getCategoryLabel } from "../../data/categories";
import type { Transaction, TransactionType } from "../../types/cashflow";
import {
  formatDateHeading,
  formatIdr,
  formatMonthLabel,
  formatUsd,
} from "../../utils/format";
import { CategoryIcon } from "../common/CategoryIcon";
import { MoneyDisplay } from "../common/MoneyDisplay";

type FilterType = "all" | TransactionType;

export const LedgerView: React.FC = () => {
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
  const [walletFilter, setWalletFilter] = useState("all");
  const [query, setQuery] = useState("");

  const walletMap = useMemo(
    () => Object.fromEntries(store.wallets.map((w) => [w.id, w])),
    [store.wallets]
  );

  const filteredTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.transactions
      .filter((tx) => {
        if (!tx.date.startsWith(selectedMonth)) return false;
        if (typeFilter !== "all" && tx.type !== typeFilter) return false;
        if (categoryFilter !== "all" && tx.categoryId !== categoryFilter) return false;
        if (
          walletFilter !== "all" &&
          tx.walletId !== walletFilter &&
          tx.toWalletId !== walletFilter
        ) {
          return false;
        }
        if (!q) return true;
        const catLabel = getCategoryLabel(tx.categoryId, locale).toLowerCase();
        const wName = (walletMap[tx.walletId]?.name ?? "").toLowerCase();
        return (
          tx.note.toLowerCase().includes(q) ||
          (tx.merchant ?? "").toLowerCase().includes(q) ||
          catLabel.includes(q) ||
          wName.includes(q)
        );
      })
      .sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)
      );
  }, [
    store.transactions,
    selectedMonth,
    typeFilter,
    categoryFilter,
    walletFilter,
    query,
    locale,
    walletMap,
  ]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, { items: Transaction[]; dailyNet: number }>();
    for (const tx of filteredTransactions) {
      const entry = groups.get(tx.date) ?? { items: [], dailyNet: 0 };
      entry.items.push(tx);
      if (tx.type === "income") entry.dailyNet += tx.amountIdr;
      else if (tx.type === "expense") entry.dailyNet -= tx.amountIdr;
      else if (tx.type === "transfer" && tx.feeIdr) entry.dailyNet -= tx.feeIdr;
      groups.set(tx.date, entry);
    }
    return Array.from(groups.entries());
  }, [filteredTransactions]);

  const filteredTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === "income") income += tx.amountIdr;
      else if (tx.type === "expense") expense += tx.amountIdr;
      else if (tx.type === "transfer" && tx.feeIdr) expense += tx.feeIdr;
    }
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  const hasActiveFilter =
    typeFilter !== "all" || categoryFilter !== "all" || walletFilter !== "all" || query.trim() !== "";

  const resetFilters = () => {
    setTypeFilter("all");
    setCategoryFilter("all");
    setWalletFilter("all");
    setQuery("");
  };

  const tabs: Array<{ value: FilterType; label: string }> = [
    { value: "all", label: t.ledger.all },
    { value: "income", label: t.ledger.income },
    { value: "expense", label: t.ledger.expense },
    { value: "transfer", label: t.ledger.transfer },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-[#745bc7] uppercase">
            {formatMonthLabel(selectedMonth, locale)} · {filteredTransactions.length}{" "}
            {t.ledger.transactionsCount}
          </p>
          <h1 className="font-editorial mt-1.5 text-[30px] font-normal leading-none tracking-[7px] text-[#745bc7] uppercase sm:text-[36px] sm:tracking-[9px]">
            {t.ledger.title}
          </h1>
          <p className="mt-2 text-sm text-[#5d5370]">{t.ledger.subtitle}</p>
        </div>

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
        </div>
      </div>

      {/* Filter Bar */}
      <div className="tuyu-sheet rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* SHIZUKU Pipe-Separated Type Tabs */}
          <ul className="flex max-w-full flex-nowrap items-center overflow-x-auto no-scrollbar">
            {tabs.map((tab, idx) => {
              const active = typeFilter === tab.value;
              return (
                <li
                  key={tab.value}
                  className={`shrink-0 border-r border-[#745bc7]/50 ${idx === 0 ? "border-l" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setTypeFilter(tab.value)}
                    className={`px-3.5 py-1 font-editorial text-xs tracking-[0.18em] uppercase transition ${
                      active
                        ? "bg-[#745bc7]/14 font-bold text-[#745bc7]"
                        : "text-[#5d5370] hover:text-[#7650f3]"
                    }`}
                  >
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Search & Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-[#745bc7]/28 bg-white/90 px-3 py-1.5 sm:flex-initial">
              <Search className="h-3.5 w-3.5 text-[#745bc7]" />
              <input
                type="text"
                placeholder={t.ledger.searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-[#14100e] outline-none placeholder:text-[#5d5370]/70"
              />
            </div>

            <select
              aria-label={t.ledger.allCategories}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-[#745bc7]/28 bg-white/90 px-3 py-1.5 text-xs text-[#14100e] outline-none"
            >
              <option value="all">{t.ledger.allCategories}</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {locale === "id" ? c.nameId : c.nameEn}
                </option>
              ))}
            </select>

            <select
              aria-label={t.ledger.allWallets}
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              className="rounded-xl border border-[#745bc7]/28 bg-white/90 px-3 py-1.5 text-xs text-[#14100e] outline-none"
            >
              <option value="all">{t.ledger.allWallets}</option>
              {store.wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-[#745bc7]/30 px-2.5 py-1.5 text-xs font-medium text-[#745bc7] hover:bg-[#745bc7]/10"
              >
                <RotateCcw className="h-3 w-3" />
                {t.actions.resetFilters}
              </button>
            )}
          </div>
        </div>

        {/* Filtered Totals Ribbon */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#745bc7]/15 pt-3.5 text-xs">
          <div>
            <span className="font-mono text-[10px] tracking-wider text-[#5d5370] uppercase">
              {t.dashboard.income}
            </span>
            <div className="mt-0.5">
              <MoneyDisplay
                amountIdr={filteredTotals.income}
                primaryClassName="text-sm font-bold text-[#14866d]"
                secondaryClassName="text-[10px] text-[#5d5370]"
              />
            </div>
          </div>
          <div>
            <span className="font-mono text-[10px] tracking-wider text-[#5d5370] uppercase">
              {t.dashboard.expense}
            </span>
            <div className="mt-0.5">
              <MoneyDisplay
                amountIdr={filteredTotals.expense}
                primaryClassName="text-sm font-bold text-[#c23b7b]"
                secondaryClassName="text-[10px] text-[#5d5370]"
              />
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-[10px] tracking-wider text-[#5d5370] uppercase">
              {t.dashboard.netCashflow}
            </span>
            <div className="mt-0.5">
              <MoneyDisplay
                amountIdr={filteredTotals.net}
                showSign
                primaryClassName={`text-sm font-bold ${
                  filteredTotals.net >= 0 ? "text-[#745bc7]" : "text-[#c23b7b]"
                }`}
                secondaryClassName="text-[10px] text-[#5d5370]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Transactions */}
      {groupedByDate.length === 0 ? (
        <div className="tuyu-sheet rounded-2xl px-6 py-14 text-center">
          <p className="font-editorial text-lg font-semibold tracking-[0.14em] text-[#745bc7] uppercase">
            {t.ledger.emptyTitle}
          </p>
          <p className="mt-2 text-sm text-[#5d5370]">{t.ledger.emptyDesc}</p>
          <button
            type="button"
            onClick={() => openNewTxModal("expense")}
            className="tuyu-primary-btn mt-5 px-5 py-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.actions.addTransaction}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([dateIso, group]) => (
            <section key={dateIso} className="tuyu-sheet rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 pb-2">
                <span className="font-mono text-xs font-semibold tracking-[0.12em] text-[#745bc7] uppercase">
                  {formatDateHeading(dateIso, locale)}
                </span>
                <MoneyDisplay
                  amountIdr={group.dailyNet}
                  showSign
                  inline
                  primaryClassName={`text-xs font-bold ${
                    group.dailyNet >= 0 ? "text-[#14866d]" : "text-[#c23b7b]"
                  }`}
                  secondaryClassName="text-[10px] text-[#5d5370]"
                />
              </div>

              <div className="tuyu-raindrop-divider mb-2 opacity-80" />

              <ul className="divide-y divide-[#745bc7]/12">
                {group.items.map((tx) => {
                  const cat = CATEGORY_MAP[tx.categoryId];
                  const wallet = walletMap[tx.walletId];
                  const toWallet = tx.toWalletId ? walletMap[tx.toWalletId] : undefined;
                  const isIncome = tx.type === "income";
                  const isTransfer = tx.type === "transfer";

                  return (
                    <li
                      key={tx.id}
                      className="group flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                          style={{ backgroundColor: cat?.color ?? "#745bc7" }}
                        >
                          <CategoryIcon name={cat?.icon} className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold text-[#14100e]">
                              {tx.note}
                            </span>
                            {tx.originalCurrency === "USD" && (
                              <span className="rounded-full bg-[#7650f3]/12 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#7650f3]">
                                {t.ledger.originalUsdLabel} {formatUsd(tx.originalAmount)}
                                {tx.fxRateAtEntry ? ` @ ${formatIdr(tx.fxRateAtEntry)}` : ""}
                              </span>
                            )}
                            {isTransfer && tx.feeIdr && tx.feeIdr > 0 ? (
                              <span className="rounded-full bg-[#c23b7b]/10 px-2 py-0.5 font-mono text-[10px] font-medium text-[#c23b7b]">
                                {t.ledger.feeLabel}: {formatIdr(tx.feeIdr)}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-[#5d5370]">
                            <span className="font-medium text-[#745bc7]">
                              {getCategoryLabel(tx.categoryId, locale)}
                            </span>
                            {" · "}
                            {isTransfer && toWallet
                              ? `${wallet?.name ?? ""} → ${toWallet.name}`
                              : wallet?.name ?? ""}
                            {tx.merchant ? ` · ${tx.merchant}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-left sm:text-right">
                          <MoneyDisplay
                            amountIdr={
                              isIncome ? tx.amountIdr : isTransfer ? tx.amountIdr : -tx.amountIdr
                            }
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

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditTxModal(tx)}
                            aria-label={t.actions.edit}
                            title={t.actions.edit}
                            className="rounded-lg p-1.5 text-[#5d5370] transition hover:bg-[#745bc7]/12 hover:text-[#745bc7]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateTransaction(tx)}
                            aria-label={t.actions.duplicate}
                            title={t.actions.duplicate}
                            className="rounded-lg p-1.5 text-[#5d5370] transition hover:bg-[#745bc7]/12 hover:text-[#745bc7]"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTransaction(tx.id)}
                            aria-label={t.actions.delete}
                            title={t.actions.delete}
                            className="rounded-lg p-1.5 text-[#5d5370] transition hover:bg-[#c23b7b]/12 hover:text-[#c23b7b]"
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
