import React, { useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { CATEGORIES, CATEGORY_MAP, getCategoryLabel } from "../../data/categories";
import { usdToIdrAmount } from "../../services/fxService";
import type { EntryCurrency, SavingsGoal } from "../../types/cashflow";
import { computeMonthlySummary } from "../../utils/calculations";
import { formatMonthLabel, formatUsd } from "../../utils/format";
import { CategoryIcon } from "../common/CategoryIcon";
import { MoneyDisplay } from "../common/MoneyDisplay";

const GOAL_COLORS = ["#745bc7", "#d749d5", "#2276a8", "#14866d", "#7650f3"];

export const PlanningView: React.FC = () => {
  const {
    store,
    fx,
    selectedMonth,
    t,
    locale,
    saveRecurring,
    deleteRecurring,
    logRecurringForMonth,
    saveGoal,
    contributeGoal,
    deleteGoal,
  } = useCashflow();

  const [recModalOpen, setRecModalOpen] = useState(false);
  const [recTitle, setRecTitle] = useState("");
  const [recType, setRecType] = useState<"income" | "expense">("expense");
  const [recCat, setRecCat] = useState("subscriptions");
  const [recWallet, setRecWallet] = useState(store.wallets[0]?.id ?? "");
  const [recDay, setRecDay] = useState("10");
  const [recCurrency, setRecCurrency] = useState<EntryCurrency>("IDR");
  const [recAmount, setRecAmount] = useState("");
  const [recNote, setRecNote] = useState("");

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("15000000");
  const [goalSaved, setGoalSaved] = useState("0");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalColor, setGoalColor] = useState(GOAL_COLORS[0]);
  const [goalNote, setGoalNote] = useState("");

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

  const currentSummary = useMemo(
    () => computeMonthlySummary(store.transactions, selectedMonth),
    [store.transactions, selectedMonth]
  );

  const filteredRecCats = useMemo(
    () => CATEGORIES.filter((c) => c.type === recType),
    [recType]
  );

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
    setRecModalOpen(false);
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
    setGoalModalOpen(false);
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="font-mono text-[11px] tracking-[0.22em] text-[#745bc7] uppercase">
          COMMITMENTS & MILESTONES · {formatMonthLabel(selectedMonth, locale)}
        </p>
        <h1 className="font-editorial mt-1.5 text-[30px] font-normal leading-none tracking-[7px] text-[#745bc7] uppercase sm:text-[36px] sm:tracking-[9px]">
          {t.planning.title}
        </h1>
        <p className="mt-2 text-sm text-[#5d5370]">{t.planning.subtitle}</p>
      </div>

      {/* SECTION 1: RECURRING ITEMS */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4.5 w-4.5 text-[#745bc7]" />
            <h2 className="font-editorial text-lg font-semibold tracking-[0.18em] text-[#745bc7] uppercase">
              {t.planning.recurringSection}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setRecModalOpen(true)}
            className="tuyu-primary-btn px-4 py-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.actions.addRecurring}
          </button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="tuyu-sheet rounded-2xl p-4">
            <p className="font-mono text-[10px] tracking-[0.14em] text-[#5d5370] uppercase">
              {t.planning.activeIncomeTotal}
            </p>
            <div className="mt-1.5">
              <MoneyDisplay
                amountIdr={recurringTotals.incomeIdr}
                primaryClassName="text-lg font-bold text-[#14866d]"
                secondaryClassName="text-[11px] text-[#5d5370]"
              />
            </div>
          </div>
          <div className="tuyu-sheet rounded-2xl p-4">
            <p className="font-mono text-[10px] tracking-[0.14em] text-[#5d5370] uppercase">
              {t.planning.activeBillsTotal}
            </p>
            <div className="mt-1.5">
              <MoneyDisplay
                amountIdr={recurringTotals.expenseIdr}
                primaryClassName="text-lg font-bold text-[#c23b7b]"
                secondaryClassName="text-[11px] text-[#5d5370]"
              />
            </div>
          </div>
        </div>

        {/* Recurring List */}
        <div className="tuyu-sheet rounded-2xl p-4 sm:p-5">
          {store.recurring.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#5d5370]">
              {locale === "id" ? "Belum ada item rutin." : "No recurring commitments yet."}
            </p>
          ) : (
            <ul className="divide-y divide-[#745bc7]/14">
              {store.recurring.map((item) => {
                const cat = CATEGORY_MAP[item.categoryId];
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
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: cat?.color ?? "#745bc7" }}
                      >
                        <CategoryIcon name={cat?.icon} className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-[#14100e]">{item.title}</span>
                          {item.currency === "USD" && (
                            <span className="rounded-full bg-[#7650f3]/12 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#7650f3]">
                              {formatUsd(item.amount)} · Live FX
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[#5d5370]">
                          {t.planning.dueDay} {item.dayOfMonth} {t.planning.everyMonth} ·{" "}
                          {getCategoryLabel(item.categoryId, locale)} ·{" "}
                          {walletMap[item.walletId]?.name ?? ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <MoneyDisplay
                          amountIdr={item.type === "income" ? amountIdr : -amountIdr}
                          showSign
                          primaryClassName={`text-sm font-bold ${
                            item.type === "income" ? "text-[#14866d]" : "text-[#c23b7b]"
                          }`}
                          secondaryClassName="text-[10px] text-[#5d5370]"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isLogged ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#14866d]/14 px-3 py-1 text-[11px] font-semibold text-[#14866d]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t.actions.logged}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => logRecurringForMonth(item, selectedMonth)}
                            className="tuyu-pill-btn px-3 py-1 text-[10px]"
                          >
                            {t.actions.logNow}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteRecurring(item.id)}
                          aria-label={t.actions.delete}
                          className="rounded-lg p-1.5 text-[#5d5370] hover:bg-[#c23b7b]/12 hover:text-[#c23b7b]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <div className="tuyu-raindrop-divider opacity-75" />

      {/* SECTION 2: SAVINGS GOALS */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-[#745bc7]" />
            <h2 className="font-editorial text-lg font-semibold tracking-[0.18em] text-[#745bc7] uppercase">
              {t.planning.goalsSection}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setGoalModalOpen(true)}
            className="tuyu-primary-btn px-4 py-1.5 text-xs"
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
                className="tuyu-sheet tuyu-sheet-hover flex flex-col justify-between rounded-2xl p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className="inline-block h-2.5 w-8 rounded-full"
                        style={{ backgroundColor: goal.color }}
                      />
                      <h3 className="mt-2 text-base font-bold text-[#14100e]">{goal.name}</h3>
                      {goal.note && <p className="mt-0.5 text-xs text-[#5d5370]">{goal.note}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteGoal(goal.id)}
                      aria-label={t.actions.delete}
                      className="rounded-lg p-1 text-[#5d5370] hover:bg-[#c23b7b]/12 hover:text-[#c23b7b]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-[#745bc7]">{pct.toFixed(0)}%</span>
                      {remaining === 0 ? (
                        <span className="font-semibold text-[#14866d]">{t.planning.completed}</span>
                      ) : etaMonths ? (
                        <span className="font-mono text-[11px] text-[#5d5370]">
                          {t.planning.goalEta}: ~{etaMonths} {t.planning.monthsUnit}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#745bc7]/14">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: goal.color }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-[#5d5370] uppercase">{t.planning.goalSaved}</p>
                      <MoneyDisplay
                        amountIdr={goal.savedIdr}
                        primaryClassName="text-xs font-bold text-[#14100e]"
                        secondaryClassName="text-[10px] text-[#5d5370]"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#5d5370] uppercase">{t.planning.goalTarget}</p>
                      <MoneyDisplay
                        amountIdr={goal.targetIdr}
                        primaryClassName="text-xs font-bold text-[#745bc7]"
                        secondaryClassName="text-[10px] text-[#5d5370]"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#745bc7]/14 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setContribGoal(goal);
                      setContribAmount("500000");
                    }}
                    className="tuyu-pill-btn w-full py-1.5 text-[11px]"
                  >
                    <Plus className="h-3 w-3" />
                    {t.actions.contribute}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Add Recurring Modal */}
      {recModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b1530]/55 p-4 backdrop-blur-xs"
          onClick={() => setRecModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#745bc7]/30 bg-[#f8f5ff] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-editorial text-xl font-semibold tracking-[0.16em] text-[#745bc7] uppercase">
                {t.planning.addRecurringTitle}
              </h2>
              <button
                type="button"
                onClick={() => setRecModalOpen(false)}
                className="rounded-full p-1.5 text-[#5d5370] hover:bg-[#745bc7]/12"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRec} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#745bc7]/22 bg-white p-1">
                {(["expense", "income"] as const).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => {
                      setRecType(tp);
                      setRecCat(tp === "income" ? "salary" : "subscriptions");
                    }}
                    className={`rounded-lg py-1.5 text-xs font-semibold uppercase ${
                      recType === tp
                        ? tp === "income"
                          ? "bg-[#14866d] text-white"
                          : "bg-[#c23b7b] text-white"
                        : "text-[#5d5370]"
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
                className="w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm outline-none focus:border-[#7650f3]"
              />

              <div className="grid grid-cols-3 gap-2">
                <select
                  value={recCurrency}
                  onChange={(e) => setRecCurrency(e.target.value as EntryCurrency)}
                  className="rounded-xl border border-[#745bc7]/28 bg-white px-2.5 py-2 font-mono text-xs font-semibold outline-none"
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
                  className="font-mono-num col-span-2 rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#7650f3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={recCat}
                  onChange={(e) => setRecCat(e.target.value)}
                  className="rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-xs outline-none"
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
                  className="rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-xs outline-none"
                >
                  {activeWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-mono text-[10px] text-[#5d5370] uppercase">
                    {t.planning.dueDay} (1-28)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={recDay}
                    onChange={(e) => setRecDay(e.target.value)}
                    className="font-mono-num mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-mono text-[10px] text-[#5d5370] uppercase">
                    {t.txModal.note}
                  </label>
                  <input
                    type="text"
                    value={recNote}
                    onChange={(e) => setRecNote(e.target.value)}
                    placeholder="Opsional"
                    className="mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecModalOpen(false)}
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

      {/* Add Goal Modal */}
      {goalModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b1530]/55 p-4 backdrop-blur-xs"
          onClick={() => setGoalModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#745bc7]/30 bg-[#f8f5ff] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-editorial text-xl font-semibold tracking-[0.16em] text-[#745bc7] uppercase">
                {t.planning.addGoalTitle}
              </h2>
              <button
                type="button"
                onClick={() => setGoalModalOpen(false)}
                className="rounded-full p-1.5 text-[#5d5370] hover:bg-[#745bc7]/12"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="mt-4 space-y-3.5">
              <input
                type="text"
                required
                placeholder="cth. Dana Darurat / Trip Jepang"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                className="w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm outline-none focus:border-[#7650f3]"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-mono text-[10px] text-[#5d5370] uppercase">
                    {t.planning.goalTarget} (IDR)
                  </label>
                  <input
                    type="number"
                    required
                    min="10000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="font-mono-num mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-[#5d5370] uppercase">
                    {t.planning.goalSaved} (IDR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={goalSaved}
                    onChange={(e) => setGoalSaved(e.target.value)}
                    className="font-mono-num mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm font-bold outline-none"
                  />
                </div>
              </div>
              <input
                type="date"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                className="w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm outline-none"
              />
              <input
                type="text"
                placeholder={t.txModal.notePlaceholder}
                value={goalNote}
                onChange={(e) => setGoalNote(e.target.value)}
                className="w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm outline-none"
              />
              <div className="flex items-center gap-2">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setGoalColor(c)}
                    style={{ backgroundColor: c }}
                    className={`h-7 w-7 rounded-full ${
                      goalColor === c ? "ring-2 ring-[#14100e] ring-offset-2" : "opacity-75"
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(false)}
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

      {/* Contribute to Goal Modal */}
      {contribGoal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b1530]/55 p-4 backdrop-blur-xs"
          onClick={() => setContribGoal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#745bc7]/30 bg-[#f8f5ff] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-editorial text-lg font-semibold tracking-[0.14em] text-[#745bc7] uppercase">
              {t.planning.contributeTitle}
            </h2>
            <p className="mt-1 text-xs font-medium text-[#5d5370]">{contribGoal.name}</p>
            <form onSubmit={handleContribute} className="mt-4 space-y-4">
              <div>
                <label className="block font-mono text-[10px] text-[#5d5370] uppercase">
                  {t.planning.contributeAmount}
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="50000"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  className="font-mono-num mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-base font-bold outline-none focus:border-[#7650f3]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setContribGoal(null)}
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
