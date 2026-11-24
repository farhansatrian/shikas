import React, { useMemo, useState } from "react";
import { Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { CATEGORIES, CATEGORY_MAP, getCategoryLabel } from "../../data/categories";
import { idrToUsd } from "../../services/fxService";
import { computeBudgetProgress, computeSafeToSpendDaily } from "../../utils/calculations";
import { formatMonthLabel, formatUsd } from "../../utils/format";
import { CategoryIcon } from "../common/CategoryIcon";
import { MoneyDisplay } from "../common/MoneyDisplay";

export const BudgetsView: React.FC = () => {
  const {
    store,
    fx,
    selectedMonth,
    t,
    locale,
    upsertBudget,
    deleteBudget,
    copyBudgetsFromPreviousMonth,
    notify,
  } = useCashflow();

  const [modalOpen, setModalOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("food");
  const [limitInput, setLimitInput] = useState("1500000");

  const expenseCategories = useMemo(
    () => CATEGORIES.filter((c) => c.type === "expense"),
    []
  );

  const items = useMemo(
    () => computeBudgetProgress(store.budgets, store.transactions, selectedMonth),
    [store.budgets, store.transactions, selectedMonth]
  );

  const safeSummary = useMemo(
    () => computeSafeToSpendDaily(store.budgets, store.transactions, selectedMonth),
    [store.budgets, store.transactions, selectedMonth]
  );

  const openModal = (catId?: string, existingLimit?: number) => {
    const used = new Set(items.map((i) => i.budget.categoryId));
    const firstUnused = expenseCategories.find((c) => !used.has(c.id))?.id ?? "food";
    setCategoryId(catId ?? firstUnused);
    setLimitInput(String(existingLimit ?? 1_500_000));
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Math.round(Number(limitInput) || 0);
    if (val <= 0) return;
    upsertBudget(selectedMonth, categoryId, val);
    setModalOpen(false);
  };

  const handleCopyPrev = () => {
    const ok = copyBudgetsFromPreviousMonth(selectedMonth);
    notify(ok ? t.budgets.copiedToast : t.budgets.noPrevBudgetToast, ok ? "success" : "iris");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-[#745bc7] uppercase">
            SPENDING CEILINGS · {formatMonthLabel(selectedMonth, locale)}
          </p>
          <h1 className="font-editorial mt-1.5 text-[30px] font-normal leading-none tracking-[7px] text-[#745bc7] uppercase sm:text-[36px] sm:tracking-[9px]">
            {t.budgets.title}
          </h1>
          <p className="mt-2 text-sm text-[#5d5370]">{t.budgets.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openModal()}
            className="tuyu-primary-btn px-4 py-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.actions.addBudget}
          </button>
          <button
            type="button"
            onClick={handleCopyPrev}
            className="tuyu-pill-btn px-3.5 py-2 text-[11px]"
          >
            <Copy className="h-3.5 w-3.5" />
            {t.actions.copyPrevBudget}
          </button>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="tuyu-sheet rounded-2xl p-4">
          <p className="font-mono text-[10px] tracking-[0.14em] text-[#5d5370] uppercase">
            {t.budgets.totalAllocated}
          </p>
          <div className="mt-2">
            <MoneyDisplay
              amountIdr={safeSummary.totalBudgetIdr}
              primaryClassName="text-lg font-bold text-[#14100e]"
              secondaryClassName="text-[11px] text-[#5d5370]"
            />
          </div>
        </div>

        <div className="tuyu-sheet rounded-2xl p-4">
          <p className="font-mono text-[10px] tracking-[0.14em] text-[#5d5370] uppercase">
            {t.budgets.totalSpent}
          </p>
          <div className="mt-2">
            <MoneyDisplay
              amountIdr={safeSummary.totalSpentBudgetedIdr}
              primaryClassName="text-lg font-bold text-[#c23b7b]"
              secondaryClassName="text-[11px] text-[#5d5370]"
            />
          </div>
        </div>

        <div className="tuyu-sheet rounded-2xl p-4">
          <p className="font-mono text-[10px] tracking-[0.14em] text-[#5d5370] uppercase">
            {t.budgets.remaining}
          </p>
          <div className="mt-2">
            <MoneyDisplay
              amountIdr={safeSummary.remainingIdr}
              primaryClassName={`text-lg font-bold ${
                safeSummary.remainingIdr >= 0 ? "text-[#14866d]" : "text-[#c23b7b]"
              }`}
              secondaryClassName="text-[11px] text-[#5d5370]"
            />
          </div>
        </div>

        <div className="twilight-card rounded-2xl p-4 text-white">
          <p className="font-mono text-[10px] tracking-[0.14em] text-[#e5dcfb]/75 uppercase">
            {t.budgets.safeDaily}
          </p>
          <div className="mt-2">
            <MoneyDisplay
              amountIdr={safeSummary.dailySafeIdr}
              primaryClassName="text-lg font-bold text-white"
              secondaryClassName="text-[11px] text-[#e5dcfb]/75"
            />
          </div>
        </div>
      </div>

      {/* Category Budget Cards */}
      {items.length === 0 ? (
        <div className="tuyu-sheet rounded-2xl px-6 py-14 text-center">
          <p className="font-editorial text-lg font-semibold tracking-[0.14em] text-[#745bc7] uppercase">
            {t.budgets.emptyTitle}
          </p>
          <p className="mt-2 text-sm text-[#5d5370]">{t.budgets.emptyDesc}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => openModal()}
              className="tuyu-primary-btn px-5 py-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.actions.addBudget}
            </button>
            <button
              type="button"
              onClick={handleCopyPrev}
              className="tuyu-pill-btn px-4 py-2 text-xs"
            >
              {t.actions.copyPrevBudget}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => {
            const cat = CATEGORY_MAP[item.budget.categoryId];
            const statusStyle =
              item.status === "exceeded"
                ? { label: t.budgets.statusExceeded, cls: "bg-[#c23b7b]/14 text-[#c23b7b]", bar: "#c23b7b" }
                : item.status === "warning"
                  ? { label: t.budgets.statusWarn, cls: "bg-[#b7791f]/15 text-[#b7791f]", bar: "#b7791f" }
                  : { label: t.budgets.statusSafe, cls: "bg-[#14866d]/12 text-[#14866d]", bar: cat?.color ?? "#745bc7" };

            return (
              <article key={item.budget.id} className="tuyu-sheet tuyu-sheet-hover rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: cat?.color ?? "#745bc7" }}
                    >
                      <CategoryIcon name={cat?.icon} className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#14100e]">
                        {getCategoryLabel(item.budget.categoryId, locale)}
                      </h3>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyle.cls}`}
                      >
                        {statusStyle.label} · {Math.round(item.percentage)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openModal(item.budget.categoryId, item.budget.limitIdr)}
                      aria-label={t.actions.edit}
                      className="rounded-lg p-1.5 text-[#5d5370] hover:bg-[#745bc7]/12 hover:text-[#745bc7]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBudget(item.budget.id)}
                      aria-label={t.actions.delete}
                      className="rounded-lg p-1.5 text-[#5d5370] hover:bg-[#c23b7b]/12 hover:text-[#c23b7b]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#745bc7]/14">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, item.percentage)}%`,
                      backgroundColor: statusStyle.bar,
                    }}
                  />
                </div>

                {/* Spent vs Limit */}
                <div className="mt-3 flex items-end justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[11px] text-[#5d5370]">{t.budgets.totalSpent}</span>
                    <div className="mt-0.5">
                      <MoneyDisplay
                        amountIdr={item.spentIdr}
                        primaryClassName="text-sm font-bold text-[#14100e]"
                        secondaryClassName="text-[10px] text-[#5d5370]"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#5d5370]">
                      {item.remainingIdr >= 0 ? t.budgets.left : t.budgets.overBy}
                    </span>
                    <div className="mt-0.5">
                      <MoneyDisplay
                        amountIdr={Math.abs(item.remainingIdr)}
                        primaryClassName={`text-sm font-bold ${
                          item.remainingIdr >= 0 ? "text-[#14866d]" : "text-[#c23b7b]"
                        }`}
                        secondaryClassName="text-[10px] text-[#5d5370]"
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Set Budget Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b1530]/55 p-4 backdrop-blur-xs"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#745bc7]/30 bg-[#f8f5ff] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-editorial text-xl font-semibold tracking-[0.16em] text-[#745bc7] uppercase">
                {t.budgets.modalTitle}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-[#5d5370] hover:bg-[#745bc7]/12"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                  {t.txModal.category}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#7650f3]"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {locale === "id" ? c.nameId : c.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                  {t.budgets.monthlyLimit}
                </label>
                <input
                  type="number"
                  min="1000"
                  step="50000"
                  required
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  className="font-mono-num mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2.5 text-base font-bold text-[#14100e] outline-none focus:border-[#7650f3]"
                />
                {Number(limitInput) > 0 && (
                  <p className="mt-1.5 font-mono text-[11px] text-[#745bc7]">
                    ≈ {formatUsd(idrToUsd(Number(limitInput), fx.usdToIdr))} /{" "}
                    {formatMonthLabel(selectedMonth, locale)}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-[#745bc7]/30 px-4 py-2 text-xs font-semibold text-[#5d5370]"
                >
                  {t.actions.cancel}
                </button>
                <button type="submit" className="tuyu-primary-btn px-5 py-2 text-xs">
                  {t.actions.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
