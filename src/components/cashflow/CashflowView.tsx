import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { CATEGORY_MAP, getCategoryLabel } from "../../data/categories";
import type { Transaction, TransactionType } from "../../types/cashflow";
import {
  computeCategoryBreakdown,
  computeCumulativeNetBalance,
  computeMonthlySummary,
  computePercentDelta,
} from "../../utils/calculations";
import {
  formatDateHeading,
  formatIdr,
  formatMonthLabel,
  shiftMonthKey,
} from "../../utils/format";
import { CategoryIcon } from "../common/CategoryIcon";
import { MoneyDisplay } from "../common/MoneyDisplay";
import { RaindropVessel, type VesselMood } from "./RaindropVessel";
import { VnDialogueBox } from "./VnDialogueBox";

type FilterType = "all" | TransactionType;

const GAUGE_SEGMENTS = 20;

const SegmentedRpgBar: React.FC<{
  percent: number;
  variant: "reserve" | "spent";
}> = ({ percent, variant }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const filledCount = Math.round((clamped / 100) * GAUGE_SEGMENTS);

  return (
    <div
      className="grid gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${GAUGE_SEGMENTS}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {Array.from({ length: GAUGE_SEGMENTS }).map((_, i) => {
        const active = i < filledCount;
        let bg = "rgba(116, 91, 199, 0.13)";
        if (active) {
          if (variant === "reserve") {
            bg = i < 10 ? "#2276a8" : "#745bc7";
          } else {
            bg = i < 10 ? "#d749d5" : "#b8339f";
          }
        }
        return (
          <span
            key={i}
            className="h-2.5 w-full transition-colors duration-200"
            style={{ backgroundColor: bg }}
          />
        );
      })}
    </div>
  );
};

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
    isTxModalOpen,
    lastTxEvent,
  } = useCashflow();

  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedCmd, setSelectedCmd] = useState(0);
  const [dialogueIdx, setDialogueIdx] = useState(0);

  const monthTransactions = useMemo(
    () => store.transactions.filter((tx) => tx.date.startsWith(selectedMonth)),
    [store.transactions, selectedMonth]
  );

  const monthSummary = useMemo(
    () => computeMonthlySummary(store.transactions, selectedMonth),
    [store.transactions, selectedMonth]
  );

  const prevSummary = useMemo(
    () => computeMonthlySummary(store.transactions, shiftMonthKey(selectedMonth, -1)),
    [store.transactions, selectedMonth]
  );

  const topExpenseCat = useMemo(
    () => computeCategoryBreakdown(store.transactions, selectedMonth, "expense")[0],
    [store.transactions, selectedMonth]
  );

  const cumulativeBalance = useMemo(
    () => computeCumulativeNetBalance(store.transactions),
    [store.transactions]
  );

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
    monthSummary.incomeIdr > 0 ? Math.max(0, 100 - spentRatio) : 0;

  const isDeficit = monthSummary.netCashflowIdr < 0;
  const hasData = monthSummary.txCount > 0;

  const mood: VesselMood = !hasData
    ? "quiet"
    : isDeficit || savedRatio < 15
      ? "drained"
      : savedRatio >= 40
        ? "calm"
        : "balanced";

  const mask = (amount: number) =>
    store.settings.privacyMode ? "Rp •••••••" : formatIdr(amount);

  // Dynamic Visual Novel chronicle lines (reacts to transactions & monthly health)
  const dialogueLines = useMemo(() => {
    const monthLabel = formatMonthLabel(selectedMonth, locale);
    const lines: string[] = [];

    if (lastTxEvent) {
      if (lastTxEvent.type === "income") {
        lines.push(
          locale === "id"
            ? `Tetesan baru tertangkap: +${mask(lastTxEvent.amountIdr)} (${lastTxEvent.note}). Permukaan air di wadah kembali naik.`
            : `Raindrop caught: +${mask(lastTxEvent.amountIdr)} (${lastTxEvent.note}). The vessel rises calmly.`
        );
      } else {
        lines.push(
          locale === "id"
            ? `Riak magenta tercatat: -${mask(lastTxEvent.amountIdr)} untuk "${lastTxEvent.note}". Arus kas bulan ini langsung diperbarui.`
            : `Magenta ripple logged: -${mask(lastTxEvent.amountIdr)} for "${lastTxEvent.note}". Monthly reserve updated.`
        );
      }
    }

    if (!hasData) {
      lines.push(
        locale === "id"
          ? `Wadah ${monthLabel} masih hening. Pilih perintah [+ INCOME] atau [- EXPENSE] untuk mulai menampung arus kas.`
          : `${monthLabel}'s vessel is completely still. Pick [+ INCOME] or [- EXPENSE] from the command menu to begin.`
      );
    } else if (isDeficit) {
      lines.push(
        locale === "id"
          ? `Hujan di ${monthLabel} cukup deras — pengeluaran melebihi pemasukan sebesar ${mask(Math.abs(monthSummary.netCashflowIdr))}.`
          : `Heavy magenta downpour in ${monthLabel} — spending outpaced income by ${mask(Math.abs(monthSummary.netCashflowIdr))}.`
      );
    } else {
      lines.push(
        locale === "id"
          ? `Arus ${monthLabel} terkendali: ${mask(monthSummary.netCashflowIdr)} tersimpan di wadah (${savedRatio.toFixed(0)}% dari total pemasukan).`
          : `${monthLabel}'s rain holds steady — ${mask(monthSummary.netCashflowIdr)} remains in the vessel (${savedRatio.toFixed(0)}% of monthly inflow).`
      );
    }

    if (topExpenseCat) {
      const catName = getCategoryLabel(topExpenseCat.categoryId, locale);
      lines.push(
        locale === "id"
          ? `Riak pengeluaran terbesar bulan ini berasal dari ${catName} (${topExpenseCat.percentage.toFixed(0)}% · ${mask(topExpenseCat.amountIdr)}).`
          : `Biggest spending ripple this month comes from ${catName} (${topExpenseCat.percentage.toFixed(0)}% · ${mask(topExpenseCat.amountIdr)}).`
      );
    }

    const expDelta = computePercentDelta(monthSummary.expenseIdr, prevSummary.expenseIdr);
    if (expDelta !== null) {
      const prevLabel = formatMonthLabel(shiftMonthKey(selectedMonth, -1), locale);
      lines.push(
        locale === "id"
          ? `Dibanding ${prevLabel}, total pengeluaran ${expDelta <= 0 ? "turun" : "naik"} ${Math.abs(expDelta).toFixed(1)}%.`
          : `Compared to ${prevLabel}, total spending ${expDelta <= 0 ? "dropped" : "rose"} by ${Math.abs(expDelta).toFixed(1)}%.`
      );
    }

    return lines;
  }, [
    selectedMonth,
    locale,
    lastTxEvent,
    hasData,
    isDeficit,
    monthSummary,
    prevSummary,
    savedRatio,
    topExpenseCat,
    store.settings.privacyMode,
  ]);

  // Reset dialogue index to latest burst line when a transaction is saved
  useEffect(() => {
    if (lastTxEvent) {
      setDialogueIdx(0);
    }
  }, [lastTxEvent]);

  const handleSetTypeFilter = (next: FilterType) => {
    setTypeFilter(next);
    setCategoryFilter("all");
  };

  const cycleFilter = () => {
    const order: FilterType[] = ["all", "income", "expense"];
    const next = order[(order.indexOf(typeFilter) + 1) % order.length];
    handleSetTypeFilter(next);
  };

  const commands = useMemo(
    () => [
      {
        id: "income",
        label: locale === "id" ? "+ CATAT PEMASUKAN" : "+ RECORD INCOME",
        tag: "IN",
        accent: "#2276a8",
        run: () => openNewTxModal("income"),
      },
      {
        id: "expense",
        label: locale === "id" ? "- CATAT PENGELUARAN" : "- RECORD EXPENSE",
        tag: "OUT",
        accent: "#c837a5",
        run: () => openNewTxModal("expense"),
      },
      {
        id: "filter",
        label:
          locale === "id"
            ? `FILTER: ${typeFilter === "all" ? "SEMUA" : typeFilter === "income" ? "PEMASUKAN" : "PENGELUARAN"}`
            : `FILTER: ${typeFilter.toUpperCase()}`,
        tag: "TAB",
        accent: "#745bc7",
        run: cycleFilter,
      },
      {
        id: "dialogue",
        label: locale === "id" ? "CATATAN LANJUT" : "NEXT CHRONICLE",
        tag: "LOG",
        accent: "#7650f3",
        run: () => setDialogueIdx((i) => i + 1),
      },
    ],
    [locale, openNewTxModal, typeFilter]
  );

  // Silent RPG Keyboard Navigation (↑ ↓ Enter) when modal & inputs are inactive
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTxModalOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCmd((prev) => (prev + 1) % commands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCmd((prev) => (prev - 1 + commands.length) % commands.length);
      } else if (e.key === "Enter" && document.activeElement === document.body) {
        e.preventDefault();
        commands[selectedCmd]?.run();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isTxModalOpen, commands, selectedCmd]);

  const hasActiveFilter =
    typeFilter !== "all" || categoryFilter !== "all" || query.trim() !== "";

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. INTERACTIVE STAGE: SHIZUKU Raindrop Vessel + Anime RPG Status Menu
         ===================================================================== */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Live Interactive Raindrop Vessel */}
        <div className="lg:col-span-5">
          <RaindropVessel
            savedRatio={savedRatio}
            hasData={hasData}
            isDeficit={isDeficit}
            mood={mood}
            locale={locale}
            burstEvent={lastTxEvent}
          />
        </div>

        {/* Right: RPG Status & Command Panel (SHIZUKU Violet-Magenta Palette) */}
        <div className="vn-frame flex flex-col justify-between overflow-hidden lg:col-span-7">
          {/* Vivid Watercolor Header Strip with Integrated Month Switcher */}
          <div className="shikas-band-strip flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-white">
            <span className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
              {t.cashflow.title} // IDR
            </span>

            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth(shiftMonthKey(selectedMonth, -1));
                  setCategoryFilter("all");
                }}
                aria-label="Previous month"
                className="flex h-6 w-6 items-center justify-center border border-white/40 bg-white/15 text-white transition hover:bg-white/30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[116px] text-center font-mono text-[11px] font-semibold tracking-[0.12em] uppercase drop-shadow-2xs">
                {formatMonthLabel(selectedMonth, locale)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth(shiftMonthKey(selectedMonth, 1));
                  setCategoryFilter("all");
                }}
                aria-label="Next month"
                className="flex h-6 w-6 items-center justify-center border border-white/40 bg-white/15 text-white transition hover:bg-white/30"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between gap-4 p-4 sm:p-5">
            {/* Net Balance + Cumulative Header */}
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#745bc7]/20 pb-3.5">
              <div>
                <p className="font-mono text-[10px] tracking-[0.18em] text-[#5d5370] uppercase">
                  {t.cashflow.netCashflow}
                </p>
                <div className="mt-1">
                  <MoneyDisplay
                    amountIdr={monthSummary.netCashflowIdr}
                    showSign
                    className={`text-2xl font-bold tracking-tight sm:text-[30px] ${
                      isDeficit ? "text-[#c837a5]" : "text-[#14100e]"
                    }`}
                  />
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="font-mono text-[10px] tracking-[0.16em] text-[#5d5370] uppercase">
                  {t.cashflow.totalSaved}
                </p>
                <MoneyDisplay
                  amountIdr={cumulativeBalance}
                  className="mt-0.5 text-sm font-bold text-[#745bc7]"
                />
              </div>
            </div>

            {/* Notched 20-Segment Anime RPG Gauges */}
            <div className="space-y-2.5">
              <div>
                <div className="mb-1 flex items-center justify-between font-mono text-[10px] tracking-[0.14em] uppercase">
                  <span className="font-semibold text-[#2276a8]">
                    HP // {locale === "id" ? "CADANGAN" : "RESERVE"}
                  </span>
                  <span className="font-semibold text-[#14100e]">
                    {savedRatio.toFixed(0)}%
                  </span>
                </div>
                <SegmentedRpgBar percent={savedRatio} variant="reserve" />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between font-mono text-[10px] tracking-[0.14em] uppercase">
                  <span className="font-semibold text-[#c837a5]">
                    SP // {locale === "id" ? "TERPAKAI" : "SPENT"}
                  </span>
                  <span className="font-semibold text-[#14100e]">
                    {spentRatio.toFixed(0)}%
                  </span>
                </div>
                <SegmentedRpgBar percent={spentRatio} variant="spent" />
              </div>
            </div>

            {/* Inline Interactive IN / OUT Stat Strip (No Bento Cards) */}
            <div className="grid grid-cols-2 border border-[#745bc7]/30 bg-white/60">
              <button
                type="button"
                onClick={() =>
                  handleSetTypeFilter(typeFilter === "income" ? "all" : "income")
                }
                className={`border-r border-[#745bc7]/30 px-3 py-2 text-left transition ${
                  typeFilter === "income"
                    ? "bg-[#2276a8]/12"
                    : "hover:bg-[#e5dcfb]/45"
                }`}
              >
                <span className="flex items-center justify-between font-mono text-[9px] tracking-[0.16em] text-[#5d5370] uppercase">
                  <span>{t.cashflow.income}</span>
                  {typeFilter === "income" && (
                    <span className="text-[#2276a8]">▶</span>
                  )}
                </span>
                <MoneyDisplay
                  amountIdr={monthSummary.incomeIdr}
                  className="mt-0.5 text-sm font-bold text-[#2276a8] sm:text-base"
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSetTypeFilter(typeFilter === "expense" ? "all" : "expense")
                }
                className={`px-3 py-2 text-left transition ${
                  typeFilter === "expense"
                    ? "bg-[#d749d5]/12"
                    : "hover:bg-[#e5dcfb]/45"
                }`}
              >
                <span className="flex items-center justify-between font-mono text-[9px] tracking-[0.16em] text-[#5d5370] uppercase">
                  <span>{t.cashflow.expense}</span>
                  {typeFilter === "expense" && (
                    <span className="text-[#c837a5]">▶</span>
                  )}
                </span>
                <MoneyDisplay
                  amountIdr={monthSummary.expenseIdr}
                  className="mt-0.5 text-sm font-bold text-[#c837a5] sm:text-base"
                />
              </button>
            </div>

            {/* Interactive RPG Command Menu (Keyboard ↑↓ Enter + Click) */}
            <div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {commands.map((cmd, idx) => {
                  const selected = selectedCmd === idx;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      data-selected={selected}
                      onMouseEnter={() => setSelectedCmd(idx)}
                      onFocus={() => setSelectedCmd(idx)}
                      onClick={cmd.run}
                      className="vn-cmd px-3 py-2 text-left font-mono text-[11px] font-semibold tracking-[0.08em]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`w-3 shrink-0 ${selected ? "animate-vn-cursor opacity-100" : "opacity-0"}`}
                          style={{ color: cmd.accent }}
                        >
                          ▶
                        </span>
                        <span
                          className="truncate"
                          style={{ color: selected ? cmd.accent : "#14100e" }}
                        >
                          {cmd.label}
                        </span>
                      </span>
                      <span className="ml-2 shrink-0 border border-[#745bc7]/30 px-1.5 py-0.5 text-[9px] text-[#5d5370]">
                        {cmd.tag}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 font-mono text-[9px] tracking-[0.14em] text-[#5d5370]/85 uppercase">
                {locale === "id"
                  ? `↑↓ PILIH PERINTAH · ENTER JALANKAN · ${monthSummary.txCount} CATATAN BULAN INI`
                  : `↑↓ MOVE CURSOR · ENTER SELECT · ${monthSummary.txCount} ENTRIES THIS MONTH`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. VISUAL NOVEL DIALOGUE BOX (Silent Typewriter Chronicle)
         ===================================================================== */}
      <VnDialogueBox
        lines={dialogueLines}
        activeIndex={dialogueIdx}
        onAdvance={() => setDialogueIdx((i) => i + 1)}
        mood={mood}
        locale={locale}
      />

      {/* =====================================================================
          3. HIGH-CONTRAST SHIZUKU RPG LOG WINDOW (Readable on Pink Watercolor)
         ===================================================================== */}
      <section className="vn-frame overflow-hidden">
        {/* Vivid Watercolor Band Header Strip */}
        <div className="shikas-band-strip flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-white">
          <span className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
            {locale === "id" ? "RIWAYAT ARUS KAS // 雫" : "CASHFLOW LOG // 雫"}
          </span>
          <span className="font-mono text-[10px] tracking-[0.14em] text-white/95 uppercase drop-shadow-2xs">
            {filteredTransactions.length} {t.cashflow.entriesCount}
          </span>
        </div>

        {/* High-Contrast Paper Filter Bar */}
        <div className="bg-[#fdf9ff]/94 px-4 pt-4 pb-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Authentic tuyu.moe Pipe-Separated Serif Tabs (Solid High-Contrast Ink) */}
            <ul className="flex max-w-full flex-nowrap items-center overflow-x-auto no-scrollbar">
              {(["all", "income", "expense"] as const).map((tab, idx) => {
                const active = typeFilter === tab;
                const label =
                  tab === "all"
                    ? t.cashflow.all
                    : tab === "income"
                      ? t.cashflow.income
                      : t.cashflow.expense;
                return (
                  <li
                    key={tab}
                    className={`shrink-0 border-r border-[#745bc7] ${
                      idx === 0 ? "border-l" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSetTypeFilter(tab)}
                      className={`whitespace-nowrap px-3.5 py-0.5 font-editorial text-xs tracking-[0.2em] uppercase transition sm:px-5 sm:text-[13px] ${
                        active
                          ? "bg-[#745bc7]/12 font-bold text-[#5237a8]"
                          : "font-semibold text-[#4a3e63] hover:text-[#b8339f]"
                      }`}
                    >
                      {active ? `▶ ${label}` : label}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Crisp High-Contrast Search Input */}
            <div className="flex items-center gap-2 border border-[#745bc7]/55 bg-white px-2.5 py-1.5 transition focus-within:border-[#745bc7] sm:w-64">
              <Search className="h-3.5 w-3.5 shrink-0 text-[#5a3fb5]" />
              <input
                type="text"
                placeholder={t.cashflow.searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent font-mono text-[11px] text-[#14100e] outline-none placeholder:text-[#5d5370]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="text-[#4a3e63] hover:text-[#14100e]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Crisp Category Filter Bar */}
          {activeMonthCategoryIds.length > 0 && (
            <div className="mt-3 flex items-center gap-x-3 gap-y-1.5 overflow-x-auto pb-0.5 no-scrollbar sm:flex-wrap sm:overflow-visible">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`shrink-0 border-b-2 pb-0.5 font-mono text-[10px] tracking-[0.14em] uppercase transition ${
                  categoryFilter === "all"
                    ? "border-[#5a3fb5] font-bold text-[#5a3fb5]"
                    : "border-transparent font-medium text-[#4a3e63] hover:text-[#14100e]"
                }`}
              >
                [{t.cashflow.allCategories}]
              </button>
              {activeMonthCategoryIds.map((catId) => {
                const cat = CATEGORY_MAP[catId];
                const active = categoryFilter === catId;
                const baseLabel = getCategoryLabel(catId, locale);
                const chipLabel =
                  typeFilter === "all" && catId === "other_income"
                    ? `${baseLabel} (+)`
                    : typeFilter === "all" && catId === "other_expense"
                      ? `${baseLabel} (-)`
                      : baseLabel;
                return (
                  <button
                    key={catId}
                    type="button"
                    onClick={() => setCategoryFilter(active ? "all" : catId)}
                    className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 pb-0.5 font-mono text-[10px] tracking-[0.1em] uppercase transition ${
                      active
                        ? "border-[#b8339f] font-bold text-[#14100e]"
                        : "border-transparent font-medium text-[#4a3e63] hover:text-[#5a3fb5]"
                    }`}
                  >
                    <span
                      className="h-2 w-2"
                      style={{ backgroundColor: cat?.color ?? "#745bc7" }}
                    />
                    {chipLabel}
                  </button>
                );
              })}
            </div>
          )}

          <div className="tuyu-raindrop-divider mt-3.5" />
        </div>

        {/* High-Contrast Entries Stream */}
        {groupedByDate.length === 0 ? (
          <div className="bg-[#fdf9ff]/94 px-6 py-14 text-center">
            <p className="font-editorial text-lg font-semibold tracking-[0.14em] text-[#5a3fb5] uppercase">
              {t.cashflow.emptyTitle}
            </p>
            <p className="mt-1.5 font-mono text-xs text-[#4a3e63]">
              {t.cashflow.emptyDesc}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("all");
                    setCategoryFilter("all");
                    setQuery("");
                  }}
                  className="vn-btn-action px-4 py-2"
                >
                  ▶ {t.actions.resetFilters}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openNewTxModal("income")}
                    className="vn-btn-action px-4 py-2"
                  >
                    + {t.actions.addIncome}
                  </button>
                  <button
                    type="button"
                    onClick={() => openNewTxModal("expense")}
                    className="vn-btn-band px-4 py-2"
                  >
                    - {t.actions.addExpense}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#fdf9ff]/94">
            {groupedByDate.map(([dateIso, group], groupIdx) => (
              <div
                key={dateIso}
                className={groupIdx > 0 ? "border-t border-[#745bc7]/25" : ""}
              >
                {/* Solid High-Contrast Date Strip */}
                <div className="flex items-baseline justify-between gap-2 bg-[#ede4fc]/85 px-4 py-1.5 sm:px-5">
                  <span className="font-mono text-[11px] font-bold tracking-[0.16em] text-[#4c339c] uppercase">
                    {formatDateHeading(dateIso, locale)}
                  </span>
                  <MoneyDisplay
                    amountIdr={group.dailyNet}
                    showSign
                    className={`text-[11px] font-bold ${
                      group.dailyNet >= 0 ? "text-[#175e8a]" : "text-[#a82387]"
                    }`}
                  />
                </div>

                {/* High-Contrast Transaction Rows */}
                <ul className="divide-y divide-[#745bc7]/16 bg-white/90">
                  {group.items.map((tx) => {
                    const cat = CATEGORY_MAP[tx.categoryId];
                    const isIncome = tx.type === "income";
                    const accent = isIncome ? "#1b6999" : "#b8339f";

                    return (
                      <li
                        key={tx.id}
                        className="group relative flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-[#f4eeff] sm:px-5"
                      >
                        {/* Sharp Left Type Bar */}
                        <span
                          className="absolute top-0 bottom-0 left-0 w-[3px] opacity-80 transition group-hover:opacity-100"
                          style={{ backgroundColor: accent }}
                          aria-hidden="true"
                        />

                        <div className="flex min-w-0 items-center gap-3 pl-1">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center border bg-[#fdf9ff]"
                            style={{
                              borderColor: `${accent}70`,
                              color: accent,
                            }}
                          >
                            <CategoryIcon name={cat?.icon} className="h-3.5 w-3.5" />
                          </span>

                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-[#14100e]">
                              <span
                                className="hidden font-mono text-[10px] opacity-0 transition group-hover:opacity-100 sm:inline"
                                style={{ color: accent }}
                              >
                                ▶
                              </span>
                              <span className="truncate">{tx.note}</span>
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[11px] text-[#4e4361]">
                              {getCategoryLabel(tx.categoryId, locale)}
                              {tx.merchant ? ` · ${tx.merchant}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3.5">
                          <MoneyDisplay
                            amountIdr={isIncome ? tx.amountIdr : -tx.amountIdr}
                            showSign
                            className={`text-sm font-bold ${
                              isIncome ? "text-[#175e8a]" : "text-[#14100e]"
                            }`}
                          />

                          <div className="flex items-center gap-0.5 sm:opacity-60 sm:transition sm:group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => openEditTxModal(tx)}
                              aria-label={t.actions.edit}
                              className="border border-transparent p-1.5 text-[#4e4361] transition hover:border-[#745bc7]/60 hover:bg-white hover:text-[#5a3fb5]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateTransaction(tx)}
                              aria-label={t.actions.duplicate}
                              className="border border-transparent p-1.5 text-[#4e4361] transition hover:border-[#745bc7]/60 hover:bg-white hover:text-[#5a3fb5]"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTransaction(tx.id)}
                              aria-label={t.actions.delete}
                              className="border border-transparent p-1.5 text-[#4e4361] transition hover:border-[#b8339f]/60 hover:bg-white hover:text-[#b8339f]"
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
