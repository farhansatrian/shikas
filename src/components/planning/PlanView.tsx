import React, { useMemo, useState } from "react";
import { Check, Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { CATEGORIES, CATEGORY_MAP, getCategoryLabel } from "../../data/categories";
import { idrToUsd, usdToIdrAmount } from "../../services/fxService";
import type { EntryCurrency, SavingsGoal } from "../../types/cashflow";
import {
  computeBudgetProgress,
  computeMonthlySummary,
  computeSafeToSpendDaily,
} from "../../utils/calculations";
import { formatMonthLabel, formatUsd } from "../../utils/format";
import { MoneyDisplay } from "../common/MoneyDisplay";

type PlanSubTab = "budgets" | "recurring" | "goals";
const GOAL_COLORS = ["#14100e", "#745bc7", "#b42e69", "#1e6c99", "#117a62"];

export const PlanView: React.FC = () => {
  const {
    store,
    fx,
    selectedMonth,
    t,
    locale,
    upsertBudget,
    deleteBudget,
    copyBudgetsFromPreviousMonth,
    saveRecurring,
    deleteRecurring,
    logRecurringForMonth,
    saveGoal,
    contributeGoal,
    deleteGoal,
    notify,
  } = useCashflow();

  const [subTab, setSubTab] = useState<PlanSubTab>("budgets");

  // Budget modal state
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetCat, setBudgetCat] = useState("food");
  const [budgetLimit, setBudgetLimit] = useState("1500000");

  // Recurring modal state
  const [recModal, setRecModal] = useState(false);
  const [recTitle, setRecTitle] = useState("");
  const [recType, setRecType] = useState<"income" | "expense">("expense");
  const [recCat, setRecCat] = useState("subscriptions");
  const [recWallet, setRecWallet] = useState(store.wallets[0]?.id ?? "");
  const [recDay, setRecDay] = useState("10");
  const [recCurrency, setRecCurrency] = useState<EntryCurrency>("IDR");
  const [recAmount, setRecAmount] = useState("");
  const [recNote, setRecNote] = useState("");

  // Goal modal state
  const [goalModal, setGoalModal] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("15000000");
  const [goalSaved, setGoalSaved] = useState("0");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalColor, setGoalColor] = useState(GOAL_COLORS[0]);
  const [goalNote, setGoalNote] = useState("");

  // Contribute modal state
  const [contribGoal, setContribGoal] = useState<SavingsGoal | null>(null);
  const [contribAmount, setContribAmount] = useState("500000");

  const activeWallets = useMemo(
    () => store.wallets.filter((w) => !w.isArchived),
    [store.wallets]
  );
  const walletMap = useMemo(
    () => Object.fromEntries(store.wallets.map((w) => [w.id, w])),
    [store.wallets]
  );
  const expenseCategories = useMemo(
    () => CATEGORIES.filter((c) => c.type === "expense"),
    []
  );
  const filteredRecCats = useMemo(
    () => CATEGORIES.filter((c) => c.type === recType),
    [recType]
  );

  const budgetItems = useMemo(
    () => computeBudgetProgress(store.budgets, store.transactions, selectedMonth),
    [store.budgets, store.transactions, selectedMonth]
  );
  const safeSummary = useMemo(
    () => computeSafeToSpendDaily(store.budgets, store.transactions, selectedMonth),
    [store.budgets, store.transactions, selectedMonth]
  );
  const currentSummary = useMemo(
    () => computeMonthlySummary(store.transactions, selectedMonth),
    [store.transactions, selectedMonth]
  );

  const loggedRecurringIds = useMemo(() => {
    const set = new Set<string>();
    for (const tx of store.transactions) {
      if (tx.date.startsWith(selectedMonth) && tx.recurringId) {
        set.add(tx.recurringId);
      }
    }
    return set;
  }, [store.transactions, selectedMonth]);

  const recurringTotals = useMemo(() => {
    let incomeIdr = 0;
    let expenseIdr = 0;
    for (const item of store.recurring) {
      if (!item.active) continue;
      const valIdr =
        item.currency === "USD" ? usdToIdrAmount(item.amount, fx.usdToIdr) : item.amount;
      if (item.type === "income") incomeIdr += valIdr;
      else expenseIdr += valIdr;
    }
    return { incomeIdr, expenseIdr };
  }, [store.recurring, fx.usdToIdr]);

  const openBudgetModal = (catId?: string, existing?: number) => {
    const used = new Set(budgetItems.map((i) => i.budget.categoryId));
    const firstUnused = expenseCategories.find((c) => !used.has(c.id))?.id ?? "food";
    setBudgetCat(catId ?? firstUnused);
    setBudgetLimit(String(existing ?? 1_500_000));
    setBudgetModal(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Math.round(Number(budgetLimit) || 0);
    if (val <= 0) return;
    upsertBudget(selectedMonth, budgetCat, val);
    setBudgetModal(false);
  };

  const handleCopyPrev = () => {
    const ok = copyBudgetsFromPreviousMonth(selectedMonth);
    notify(ok ? t.budgets.copiedToast : t.budgets.noPrevBudgetToast, ok ? "success" : "iris");
  };

  const handleSaveRec = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(recAmount) || 0;
    if (!recTitle.trim() || num <= 0) return;
    saveRecurring({
      title: recTitle.trim(),
      type: recType,
      categoryId: recCat,
      walletId: recWallet || activeWallets[0]?.id || "",
      dayOfMonth: Math.min(28, Math.max(1, Number(recDay) || 1)),
      currency: recCurrency,
      amount: num,
      note: recNote.trim() || undefined,
      active: true,
    });
    setRecModal(false);
    setRecTitle("");
    setRecAmount("");
    setRecNote("");
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Math.round(Number(goalTarget) || 0);
    if (!goalName.trim() || target <= 0) return;
    saveGoal({
      name: goalName.trim(),
      targetIdr: target,
      savedIdr: Math.max(0, Math.round(Number(goalSaved) || 0)),
      deadline: goalDeadline || undefined,
      color: goalColor,
      note: goalNote.trim() || undefined,
    });
    setGoalModal(false);
    setGoalName("");
    setGoalNote("");
  };

  const handleContribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribGoal) return;
    const val = Math.round(Number(contribAmount) || 0);
    if (val <= 0) return;
    contributeGoal(contribGoal.id, val);
    setContribGoal(null);
  };

  const subTabs: Array<{ id: PlanSubTab; label: string }> = [
    { id: "budgets", label: locale === "id" ? "ANGGARAN" : "BUDGETS" },
    { id: "recurring", label: locale === "id" ? "RUTIN" : "RECURRING" },
    { id: "goals", label: locale === "id" ? "TARGET" : "GOALS" },
  ];

  return (
    <div className="space-y-7">
      {/* Header + Minimalist Sub-Nav */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#5f5368] uppercase">
            BUDGETS · RECURRING · GOALS · {formatMonthLabel(selectedMonth, locale)}
          </p>
          <h1 className="font-nav mt-1 text-2xl font-medium tracking-[0.16em] text-[#14100e] uppercase sm:text-3xl">
            {t.nav.plan}
          </h1>
        </div>

        <ul className="flex items-center gap-6">
          {subTabs.map((tab) => {
            const active = subTab === tab.id;
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => setSubTab(tab.id)}
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
      </div>

      {/* ================= SUB-TAB 1: BUDGETS ================= */}
      {subTab === "budgets" && (
        <div className="space-y-6">
          <div className="gallery-sheet grid grid-cols-2 divide-x divide-y divide-[#14100e]/10 lg:grid-cols-4 lg:divide-y-0">
            <div className="p-4.5">
              <p className="font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                {t.budgets.totalAllocated}
              </p>
              <div className="mt-1.5">
                <MoneyDisplay
                  amountIdr={safeSummary.totalBudgetIdr}
                  primaryClassName="text-base font-semibold text-[#14100e]"
                  secondaryClassName="text-[10px] text-[#5f5368]"
                />
              </div>
            </div>
            <div className="p-4.5">
              <p className="font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                {t.budgets.totalSpent}
              </p>
              <div className="mt-1.5">
                <MoneyDisplay
                  amountIdr={safeSummary.totalSpentBudgetedIdr}
                  primaryClassName="text-base font-semibold text-[#b42e69]"
                  secondaryClassName="text-[10px] text-[#5f5368]"
                />
              </div>
            </div>
            <div className="p-4.5">
              <p className="font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                {t.budgets.remaining}
              </p>
              <div className="mt-1.5">
                <MoneyDisplay
                  amountIdr={safeSummary.remainingIdr}
                  primaryClassName={`text-base font-semibold ${
                    safeSummary.remainingIdr >= 0 ? "text-[#117a62]" : "text-[#b42e69]"
                  }`}
                  secondaryClassName="text-[10px] text-[#5f5368]"
                />
              </div>
            </div>
            <div className="bg-[#111015] p-4.5 text-white">
              <p className="font-mono text-[10px] tracking-[0.14em] text-white/55 uppercase">
                {t.budgets.safeDaily}
              </p>
              <div className="mt-1.5">
                <MoneyDisplay
                  amountIdr={safeSummary.dailySafeIdr}
                  primaryClassName="text-base font-semibold text-white"
                  secondaryClassName="text-[10px] text-white/55"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleCopyPrev}
              className="gallery-btn px-4 py-1.5 text-xs"
            >
              <Copy className="h-3.5 w-3.5" />
              {t.actions.copyPrevBudget}
            </button>
            <button
              type="button"
              onClick={() => openBudgetModal()}
              className="gallery-btn-solid px-4 py-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.actions.addBudget}
            </button>
          </div>

          {budgetItems.length === 0 ? (
            <div className="gallery-sheet px-6 py-12 text-center">
              <p className="font-nav text-lg tracking-[0.14em] text-[#14100e] uppercase">
                {t.budgets.emptyTitle}
              </p>
              <p className="mt-2 text-xs text-[#5f5368]">{t.budgets.emptyDesc}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {budgetItems.map((item) => {
                const cat = CATEGORY_MAP[item.budget.categoryId];
                const barColor =
                  item.status === "exceeded"
                    ? "#b42e69"
                    : item.status === "warning"
                      ? "#a66a14"
                      : "#14100e";
                return (
                  <article key={item.budget.id} className="gallery-sheet p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cat?.color ?? "#14100e" }}
                          />
                          <h3 className="text-sm font-semibold text-[#14100e]">
                            {getCategoryLabel(item.budget.categoryId, locale)}
                          </h3>
                        </div>
                        <p className="mt-1 font-mono text-[10px] text-[#5f5368] uppercase">
                          {item.status === "exceeded"
                            ? t.budgets.statusExceeded
                            : item.status === "warning"
                              ? t.budgets.statusWarn
                              : t.budgets.statusSafe}{" "}
                          · {Math.round(item.percentage)}%
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openBudgetModal(item.budget.categoryId, item.budget.limitIdr)}
                          className="p-1 text-[#5f5368] hover:text-[#14100e]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBudget(item.budget.id)}
                          className="p-1 text-[#5f5368] hover:text-[#b42e69]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 h-[3px] w-full bg-[#14100e]/10">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${Math.min(100, item.percentage)}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>

                    <div className="mt-3 flex items-end justify-between text-xs">
                      <MoneyDisplay
                        amountIdr={item.spentIdr}
                        primaryClassName="text-sm font-medium text-[#14100e]"
                        secondaryClassName="text-[10px] text-[#5f5368]"
                      />
                      <div className="text-right">
                        <p className="font-mono text-[10px] text-[#5f5368] uppercase">
                          {item.remainingIdr >= 0 ? t.budgets.left : t.budgets.overBy}
                        </p>
                        <MoneyDisplay
                          amountIdr={Math.abs(item.remainingIdr)}
                          primaryClassName={`text-xs font-semibold ${
                            item.remainingIdr >= 0 ? "text-[#117a62]" : "text-[#b42e69]"
                          }`}
                          secondaryClassName="text-[10px] text-[#5f5368]"
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= SUB-TAB 2: RECURRING ================= */}
      {subTab === "recurring" && (
        <div className="space-y-5">
          <div className="gallery-sheet grid grid-cols-1 divide-y divide-[#14100e]/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="p-4.5">
              <p className="font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                {t.planning.activeIncomeTotal}
              </p>
              <div className="mt-1.5">
                <MoneyDisplay
                  amountIdr={recurringTotals.incomeIdr}
                  primaryClassName="text-base font-semibold text-[#117a62]"
                  secondaryClassName="text-[10px] text-[#5f5368]"
                />
              </div>
            </div>
            <div className="p-4.5">
              <p className="font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                {t.planning.activeBillsTotal}
              </p>
              <div className="mt-1.5">
                <MoneyDisplay
                  amountIdr={recurringTotals.expenseIdr}
                  primaryClassName="text-base font-semibold text-[#b42e69]"
                  secondaryClassName="text-[10px] text-[#5f5368]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setRecModal(true)}
              className="gallery-btn-solid px-4 py-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.actions.addRecurring}
            </button>
          </div>

          <div className="gallery-sheet p-5">
            <ul className="divide-y divide-[#14100e]/10">
              {store.recurring.map((item) => {
                const isLogged = loggedRecurringIds.has(item.id);
                const amountIdr =
                  item.currency === "USD"
                    ? usdToIdrAmount(item.amount, fx.usdToIdr)
                    : item.amount;
                return (
                  <li
                    key={item.id}
                    className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-[#14100e]">{item.title}</span>
                        {item.currency === "USD" && (
                          <span className="font-mono text-[10px] text-[#745bc7]">
                            [{formatUsd(item.amount)} · Live FX]
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-[#5f5368]">
                        {t.planning.dueDay} {item.dayOfMonth} {t.planning.everyMonth} ·{" "}
                        {getCategoryLabel(item.categoryId, locale)} ·{" "}
                        {walletMap[item.walletId]?.name ?? ""}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <MoneyDisplay
                        amountIdr={item.type === "income" ? amountIdr : -amountIdr}
                        showSign
                        primaryClassName={`text-sm font-medium ${
                          item.type === "income" ? "text-[#117a62]" : "text-[#14100e]"
                        }`}
                        secondaryClassName="text-[10px] text-[#5f5368]"
                      />
                      <div className="flex items-center gap-2">
                        {isLogged ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#117a62]">
                            <Check className="h-3.5 w-3.5" />
                            {t.actions.logged}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => logRecurringForMonth(item, selectedMonth)}
                            className="gallery-btn px-3 py-1 text-[11px]"
                          >
                            {t.actions.logNow}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteRecurring(item.id)}
                          className="p-1 text-[#5f5368] hover:text-[#b42e69]"
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
        </div>
      )}

      {/* ================= SUB-TAB 3: GOALS ================= */}
      {subTab === "goals" && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setGoalModal(true)}
              className="gallery-btn-solid px-4 py-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.actions.addGoal}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {store.goals.map((goal) => {
              const pct = goal.targetIdr > 0 ? Math.min(100, (goal.savedIdr / goal.targetIdr) * 100) : 0;
              const remaining = Math.max(0, goal.targetIdr - goal.savedIdr);
              const monthlyPace = Math.max(0, currentSummary.netCashflowIdr * 0.45);
              const etaMonths =
                remaining > 0 && monthlyPace > 0 ? Math.ceil(remaining / monthlyPace) : null;

              return (
                <article
                  key={goal.id}
                  className="gallery-sheet flex flex-col justify-between p-5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className="inline-block h-1 w-7"
                          style={{ backgroundColor: goal.color }}
                        />
                        <h3 className="mt-2 text-sm font-semibold text-[#14100e]">{goal.name}</h3>
                        {goal.note && <p className="mt-1 text-xs text-[#5f5368]">{goal.note}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteGoal(goal.id)}
                        className="p-1 text-[#5f5368] hover:text-[#b42e69]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between font-mono text-[11px]">
                        <span className="font-semibold text-[#14100e]">{pct.toFixed(0)}%</span>
                        {remaining === 0 ? (
                          <span className="text-[#117a62]">{t.planning.completed}</span>
                        ) : etaMonths ? (
                          <span className="text-[#5f5368]">
                            ~{etaMonths} {t.planning.monthsUnit}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 h-[3px] w-full bg-[#14100e]/10">
                        <div
                          className="h-full"
                          style={{ width: `${pct}%`, backgroundColor: goal.color }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="font-mono text-[10px] text-[#5f5368] uppercase">
                          {t.planning.goalSaved}
                        </p>
                        <MoneyDisplay
                          amountIdr={goal.savedIdr}
                          primaryClassName="text-xs font-semibold text-[#14100e]"
                          secondaryClassName="text-[10px] text-[#5f5368]"
                        />
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[10px] text-[#5f5368] uppercase">
                          {t.planning.goalTarget}
                        </p>
                        <MoneyDisplay
                          amountIdr={goal.targetIdr}
                          primaryClassName="text-xs font-semibold text-[#14100e]"
                          secondaryClassName="text-[10px] text-[#5f5368]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[#14100e]/10 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setContribGoal(goal);
                        setContribAmount("500000");
                      }}
                      className="gallery-btn w-full py-1.5 text-xs"
                    >
                      + {t.actions.contribute}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}
      {budgetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111015]/55 p-4 backdrop-blur-xs"
          onClick={() => setBudgetModal(false)}
        >
          <div
            className="w-full max-w-md border border-[#14100e]/25 bg-[#fdfbfd] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#14100e]/12 pb-3">
              <h2 className="font-nav text-lg font-medium tracking-[0.14em] text-[#14100e] uppercase">
                {t.budgets.modalTitle}
              </h2>
              <button type="button" onClick={() => setBudgetModal(false)} className="p-1 text-[#5f5368]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBudget} className="mt-5 space-y-4">
              <select
                value={budgetCat}
                onChange={(e) => setBudgetCat(e.target.value)}
                className="w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm outline-none focus:border-[#14100e]"
              >
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "id" ? c.nameId : c.nameEn}
                  </option>
                ))}
              </select>
              <div>
                <input
                  type="number"
                  min="1000"
                  step="50000"
                  required
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  className="font-mono-num w-full border border-[#14100e]/22 bg-white px-3 py-2 text-base font-semibold outline-none focus:border-[#14100e]"
                />
                {Number(budgetLimit) > 0 && (
                  <p className="mt-1 font-mono text-[11px] text-[#5f5368]">
                    ≈ {formatUsd(idrToUsd(Number(budgetLimit), fx.usdToIdr))}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setBudgetModal(false)} className="gallery-btn px-4 py-2 text-xs">
                  {t.actions.cancel}
                </button>
                <button type="submit" className="gallery-btn-solid px-5 py-2 text-xs">
                  {t.actions.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {recModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111015]/55 p-4 backdrop-blur-xs"
          onClick={() => setRecModal(false)}
        >
          <div
            className="w-full max-w-md border border-[#14100e]/25 bg-[#fdfbfd] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#14100e]/12 pb-3">
              <h2 className="font-nav text-lg font-medium tracking-[0.14em] text-[#14100e] uppercase">
                {t.planning.addRecurringTitle}
              </h2>
              <button type="button" onClick={() => setRecModal(false)} className="p-1 text-[#5f5368]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRec} className="mt-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                {(["expense", "income"] as const).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => {
                      setRecType(tp);
                      setRecCat(tp === "income" ? "salary" : "subscriptions");
                    }}
                    className={`border py-2 font-nav text-xs tracking-[0.14em] uppercase ${
                      recType === tp
                        ? "border-[#14100e] bg-[#14100e] text-white"
                        : "border-[#14100e]/20 bg-white text-[#5f5368]"
                    }`}
                  >
                    {t.ledger[tp]}
                  </button>
                ))}
              </div>
              <input
                type="text"
                required
                placeholder="cth. Langganan Cloud / Kost"
                value={recTitle}
                onChange={(e) => setRecTitle(e.target.value)}
                className="w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm outline-none focus:border-[#14100e]"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={recCurrency}
                  onChange={(e) => setRecCurrency(e.target.value as EntryCurrency)}
                  className="border border-[#14100e]/22 bg-white px-2.5 py-2 font-mono text-xs outline-none"
                >
                  <option value="IDR">IDR</option>
                  <option value="USD">USD</option>
                </select>
                <input
                  type="number"
                  required
                  min="0"
                  step={recCurrency === "USD" ? "0.01" : "1000"}
                  placeholder={recCurrency === "USD" ? "20" : "350000"}
                  value={recAmount}
                  onChange={(e) => setRecAmount(e.target.value)}
                  className="font-mono-num col-span-2 border border-[#14100e]/22 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#14100e]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={recCat}
                  onChange={(e) => setRecCat(e.target.value)}
                  className="border border-[#14100e]/22 bg-white px-3 py-2 text-xs outline-none"
                >
                  {filteredRecCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {locale === "id" ? c.nameId : c.nameEn}
                    </option>
                  ))}
                </select>
                <select
                  value={recWallet}
                  onChange={(e) => setRecWallet(e.target.value)}
                  className="border border-[#14100e]/22 bg-white px-3 py-2 text-xs outline-none"
                >
                  {activeWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={recDay}
                  onChange={(e) => setRecDay(e.target.value)}
                  className="font-mono-num border border-[#14100e]/22 bg-white px-3 py-2 text-sm outline-none"
                />
                <input
                  type="text"
                  value={recNote}
                  onChange={(e) => setRecNote(e.target.value)}
                  placeholder="Catatan opsional"
                  className="col-span-2 border border-[#14100e]/22 bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRecModal(false)} className="gallery-btn px-4 py-2 text-xs">
                  {t.actions.cancel}
                </button>
                <button type="submit" className="gallery-btn-solid px-5 py-2 text-xs">
                  {t.actions.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {goalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111015]/55 p-4 backdrop-blur-xs"
          onClick={() => setGoalModal(false)}
        >
          <div
            className="w-full max-w-md border border-[#14100e]/25 bg-[#fdfbfd] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#14100e]/12 pb-3">
              <h2 className="font-nav text-lg font-medium tracking-[0.14em] text-[#14100e] uppercase">
                {t.planning.addGoalTitle}
              </h2>
              <button type="button" onClick={() => setGoalModal(false)} className="p-1 text-[#5f5368]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveGoal} className="mt-5 space-y-3.5">
              <input
                type="text"
                required
                placeholder="cth. Dana Darurat / Trip Jepang"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                className="w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm outline-none focus:border-[#14100e]"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number"
                  required
                  min="10000"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  placeholder="Target IDR"
                  className="font-mono-num border border-[#14100e]/22 bg-white px-3 py-2 text-sm font-semibold outline-none"
                />
                <input
                  type="number"
                  min="0"
                  value={goalSaved}
                  onChange={(e) => setGoalSaved(e.target.value)}
                  placeholder="Terkumpul IDR"
                  className="font-mono-num border border-[#14100e]/22 bg-white px-3 py-2 text-sm font-semibold outline-none"
                />
              </div>
              <input
                type="date"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                className="w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm outline-none"
              />
              <input
                type="text"
                placeholder={t.txModal.notePlaceholder}
                value={goalNote}
                onChange={(e) => setGoalNote(e.target.value)}
                className="w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm outline-none"
              />
              <div className="flex items-center gap-2">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setGoalColor(c)}
                    style={{ backgroundColor: c }}
                    className={`h-6 w-6 rounded-full ${
                      goalColor === c ? "ring-2 ring-[#14100e] ring-offset-2" : "opacity-70"
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setGoalModal(false)} className="gallery-btn px-4 py-2 text-xs">
                  {t.actions.cancel}
                </button>
                <button type="submit" className="gallery-btn-solid px-5 py-2 text-xs">
                  {t.actions.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {contribGoal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111015]/55 p-4 backdrop-blur-xs"
          onClick={() => setContribGoal(null)}
        >
          <div
            className="w-full max-w-sm border border-[#14100e]/25 bg-[#fdfbfd] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-nav text-lg font-medium tracking-[0.14em] text-[#14100e] uppercase">
              {t.planning.contributeTitle}
            </h2>
            <p className="mt-1 text-xs text-[#5f5368]">{contribGoal.name}</p>
            <form onSubmit={handleContribute} className="mt-4 space-y-4">
              <input
                type="number"
                required
                min="1000"
                step="50000"
                value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)}
                className="font-mono-num w-full border border-[#14100e]/22 bg-white px-3 py-2 text-base font-semibold outline-none focus:border-[#14100e]"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setContribGoal(null)} className="gallery-btn px-4 py-2 text-xs">
                  {t.actions.cancel}
                </button>
                <button type="submit" className="gallery-btn-solid px-5 py-2 text-xs">
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
