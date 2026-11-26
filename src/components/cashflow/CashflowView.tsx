import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  HandCoins,
  Pencil,
  PiggyBank,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import {
  buildCategoryMap,
  getCategoryLabel,
  getColorGroupLabel,
  getColorOrderIndex,
  normalizeHexColor,
} from "../../data/categories";
import type { TransactionType } from "../../types/cashflow";
import {
  computeCategoryBreakdown,
  computeCumulativeNetBalance,
  computeMonthlySummary,
  computePercentDelta,
} from "../../utils/calculations";
import {
  formatCycleLabel,
  formatIdr,
  formatShortDate,
  isDateInCycle,
  shiftMonthKey,
} from "../../utils/format";
import {
  computePendingReimburseOverview,
  getReimburseProgress,
} from "../../utils/reimburse";
import { MoneyDisplay } from "../common/MoneyDisplay";
import { SandboxBanner } from "../common/SandboxBanner";
import { PocketsStrip } from "./PocketsStrip";
import { RaindropVessel, type VesselMood } from "./RaindropVessel";
import { ReimburseStrip } from "./ReimburseStrip";
import { VnDialogueBox } from "./VnDialogueBox";

type FilterType = "all" | TransactionType | "reimburse";

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
    openReimburseModal,
    duplicateTransaction,
    deleteTransaction,
    lastTxEvent,
  } = useCashflow();

  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState("all");
  const [isCatMenuOpen, setCatMenuOpen] = useState(false);
  const [isPocketMenuOpen, setPocketMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const catMenuRef = useRef<HTMLDivElement | null>(null);
  const pocketMenuRef = useRef<HTMLDivElement | null>(null);

  const accountMap = useMemo(
    () => new Map(store.accounts.map((acc) => [acc.id, acc])),
    [store.accounts]
  );

  const categoryMap = useMemo(
    () => buildCategoryMap(store.categories),
    [store.categories]
  );

  // Clear stale account or category filter if the selected item was deleted
  useEffect(() => {
    if (accountFilter !== "all" && !accountMap.has(accountFilter)) {
      setAccountFilter("all");
    }
  }, [accountFilter, accountMap]);

  useEffect(() => {
    if (categoryFilter !== "all" && !categoryMap[categoryFilter]) {
      setCategoryFilter("all");
    }
  }, [categoryFilter, categoryMap]);

  useEffect(() => {
    if (!isCatMenuOpen && !isPocketMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (catMenuRef.current && !catMenuRef.current.contains(e.target as Node)) {
        setCatMenuOpen(false);
      }
      if (
        pocketMenuRef.current &&
        !pocketMenuRef.current.contains(e.target as Node)
      ) {
        setPocketMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCatMenuOpen(false);
        setPocketMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isCatMenuOpen, isPocketMenuOpen]);

  const cycleStartDay = store.settings.cycleStartDay;

  const monthTransactions = useMemo(
    () =>
      store.transactions.filter((tx) =>
        isDateInCycle(tx.date, selectedMonth, cycleStartDay)
      ),
    [store.transactions, selectedMonth, cycleStartDay]
  );

  const monthSummary = useMemo(
    () =>
      computeMonthlySummary(
        store.transactions,
        selectedMonth,
        store.accounts,
        cycleStartDay
      ),
    [store.transactions, selectedMonth, store.accounts, cycleStartDay]
  );

  const prevSummary = useMemo(
    () =>
      computeMonthlySummary(
        store.transactions,
        shiftMonthKey(selectedMonth, -1),
        store.accounts,
        cycleStartDay
      ),
    [store.transactions, selectedMonth, store.accounts, cycleStartDay]
  );

  const topExpenseCat = useMemo(
    () =>
      computeCategoryBreakdown(
        store.transactions,
        selectedMonth,
        "expense",
        cycleStartDay
      )[0],
    [store.transactions, selectedMonth, cycleStartDay]
  );

  const totalLiveBalance = useMemo(
    () => computeCumulativeNetBalance(store.transactions, store.accounts),
    [store.transactions, store.accounts]
  );

  const pendingReimburse = useMemo(
    () => computePendingReimburseOverview(store.transactions),
    [store.transactions]
  );

  const matchesTypeFilter = (tx: (typeof monthTransactions)[number]) => {
    if (typeFilter === "all") return true;
    if (typeFilter === "reimburse") {
      return tx.type === "expense" && Boolean(tx.reimburse);
    }
    return tx.type === typeFilter;
  };

  const matchesAccountFilter = (tx: (typeof monthTransactions)[number]) => {
    if (accountFilter === "all") return true;
    // Transfers appear strictly under their origin pocket (e.g. Wondr -> BCA only shows under Wondr)
    if (tx.type === "transfer") {
      return tx.accountId === accountFilter;
    }
    if (tx.accountId === accountFilter) {
      return true;
    }
    return Boolean(
      tx.reimburse?.entries.some((entry) => entry.accountId === accountFilter)
    );
  };

  const matchesColorFilter = (tx: (typeof monthTransactions)[number]) => {
    if (colorFilter === "all") return true;
    // Color group filters apply exclusively to Expense categories (never Income or Transfer)
    if (tx.type !== "expense") return false;
    const txColor = normalizeHexColor(categoryMap[tx.categoryId]?.color);
    return txColor === colorFilter;
  };

  // Active Expense color groups present in the selected month (excludes Income & Transfer)
  const activeMonthColors = useMemo(() => {
    const groups = new Map<
      string,
      { color: string; count: number; catNames: Set<string> }
    >();
    for (const tx of monthTransactions) {
      if (tx.type !== "expense") continue;
      if (!matchesTypeFilter(tx)) continue;
      if (!matchesAccountFilter(tx)) continue;
      const color = normalizeHexColor(categoryMap[tx.categoryId]?.color);
      const entry = groups.get(color) ?? {
        color,
        count: 0,
        catNames: new Set<string>(),
      };
      entry.count += 1;
      entry.catNames.add(getCategoryLabel(tx.categoryId, locale, store.categories));
      groups.set(color, entry);
    }
    return Array.from(groups.values())
      .map((item) => ({
        color: item.color,
        count: item.count,
        categoriesLabel: Array.from(item.catNames).join(", "),
      }))
      .sort((a, b) => {
        const diff = getColorOrderIndex(a.color) - getColorOrderIndex(b.color);
        return diff !== 0 ? diff : a.color.localeCompare(b.color);
      });
  }, [
    monthTransactions,
    typeFilter,
    accountFilter,
    categoryMap,
    locale,
    store.categories,
  ]);

  // Clear stale color filter if selected color no longer has entries in this month/filter
  useEffect(() => {
    if (
      colorFilter !== "all" &&
      !activeMonthColors.some((c) => c.color === colorFilter)
    ) {
      setColorFilter("all");
    }
  }, [colorFilter, activeMonthColors]);

  const pocketCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let total = 0;
    for (const tx of monthTransactions) {
      if (!matchesTypeFilter(tx)) continue;
      if (!matchesColorFilter(tx)) continue;
      if (categoryFilter !== "all" && tx.categoryId !== categoryFilter) continue;
      total += 1;
      const touched = new Set<string>();
      if (tx.accountId) touched.add(tx.accountId);
      // Transfers count strictly under origin pocket (matching matchesAccountFilter)
      if (tx.type !== "transfer") {
        for (const e of tx.reimburse?.entries ?? []) {
          if (e.accountId) touched.add(e.accountId);
        }
      }
      for (const accId of touched) {
        counts.set(accId, (counts.get(accId) ?? 0) + 1);
      }
    }
    return { counts, total };
  }, [
    monthTransactions,
    typeFilter,
    colorFilter,
    categoryFilter,
    categoryMap,
  ]);

  const activeMonthCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of monthTransactions) {
      if (!matchesTypeFilter(tx)) continue;
      if (!matchesAccountFilter(tx)) continue;
      if (!matchesColorFilter(tx)) continue;
      counts.set(tx.categoryId, (counts.get(tx.categoryId) ?? 0) + 1);
    }
    const orderIdx = new Map(store.categories.map((c, idx) => [c.id, idx]));
    const getGroupRank = (catId: string) => {
      if (catId === "transfer") return 2;
      return categoryMap[catId]?.type === "income" ? 0 : 1;
    };
    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => {
        const gDiff = getGroupRank(a.id) - getGroupRank(b.id);
        if (gDiff !== 0) return gDiff;

        if (getGroupRank(a.id) === 1) {
          const cDiff =
            getColorOrderIndex(categoryMap[a.id]?.color) -
            getColorOrderIndex(categoryMap[b.id]?.color);
          if (cDiff !== 0) return cDiff;
        }

        return (orderIdx.get(a.id) ?? 999) - (orderIdx.get(b.id) ?? 999);
      });
  }, [
    monthTransactions,
    typeFilter,
    accountFilter,
    colorFilter,
    categoryMap,
    store.categories,
  ]);

  const groupedCategorySections = useMemo(() => {
    const incomeItems: typeof activeMonthCategories = [];
    const expenseItems: typeof activeMonthCategories = [];
    const transferItems: typeof activeMonthCategories = [];

    for (const item of activeMonthCategories) {
      if (item.id === "transfer") {
        transferItems.push(item);
      } else if (categoryMap[item.id]?.type === "income") {
        incomeItems.push(item);
      } else {
        expenseItems.push(item);
      }
    }

    const sections: Array<{
      key: "income" | "expense" | "transfer";
      label: string;
      items: typeof activeMonthCategories;
    }> = [];

    if (incomeItems.length > 0) {
      sections.push({
        key: "income",
        label: t.cashflow.income,
        items: incomeItems,
      });
    }
    if (expenseItems.length > 0) {
      sections.push({
        key: "expense",
        label: t.cashflow.expense,
        items: expenseItems,
      });
    }
    if (transferItems.length > 0) {
      sections.push({
        key: "transfer",
        label: t.cashflow.transfer,
        items: transferItems,
      });
    }
    return sections;
  }, [activeMonthCategories, categoryMap, t.cashflow]);

  const totalTypeFilteredCount = useMemo(
    () =>
      monthTransactions.filter(
        (tx) =>
          matchesTypeFilter(tx) &&
          matchesAccountFilter(tx) &&
          matchesColorFilter(tx)
      ).length,
    [monthTransactions, typeFilter, accountFilter, colorFilter, categoryMap]
  );

  const getFilterCategoryLabel = (catId: string) => {
    if (catId === "all") return t.cashflow.allCategories;
    const baseLabel = getCategoryLabel(catId, locale, store.categories);
    if (typeFilter === "all" && catId === "other_income") return `${baseLabel} (+)`;
    if (typeFilter === "all" && catId === "other_expense") return `${baseLabel} (-)`;
    return baseLabel;
  };

  const filteredTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monthTransactions
      .filter((tx) => {
        if (!matchesTypeFilter(tx)) return false;
        if (!matchesColorFilter(tx)) return false;
        if (categoryFilter !== "all" && tx.categoryId !== categoryFilter) {
          return false;
        }
        if (!matchesAccountFilter(tx)) return false;
        if (!q) return true;
        const catLabel = getCategoryLabel(
          tx.categoryId,
          locale,
          store.categories
        ).toLowerCase();
        const fromName = tx.accountId
          ? (accountMap.get(tx.accountId)?.name ?? "").toLowerCase()
          : "";
        const toName = tx.toAccountId
          ? (accountMap.get(tx.toAccountId)?.name ?? "").toLowerCase()
          : "";
        const reimbursePayer = (tx.reimburse?.from ?? "").toLowerCase();
        const reimbursePockets = (tx.reimburse?.entries ?? [])
          .map((e) => (e.accountId ? accountMap.get(e.accountId)?.name ?? "" : ""))
          .join(" ")
          .toLowerCase();
        return (
          tx.note.toLowerCase().includes(q) ||
          (tx.merchant ?? "").toLowerCase().includes(q) ||
          catLabel.includes(q) ||
          fromName.includes(q) ||
          toName.includes(q) ||
          reimbursePayer.includes(q) ||
          reimbursePockets.includes(q)
        );
      })
      .sort((a, b) =>
        a.date < b.date
          ? 1
          : a.date > b.date
            ? -1
            : b.createdAt.localeCompare(a.createdAt)
      );
  }, [
    monthTransactions,
    typeFilter,
    colorFilter,
    categoryFilter,
    accountFilter,
    query,
    locale,
    store.categories,
    categoryMap,
    accountMap,
  ]);

  // Liquid daily health ratio: reflects spendable non-savings cashflow (income - expense - savingsFlow)
  const liquidDailyIdr = monthSummary.dailyNetCashflowIdr;
  const isDailyDeficit = liquidDailyIdr < 0;
  const hasFlowData =
    monthSummary.incomeIdr > 0 ||
    monthSummary.expenseIdr > 0 ||
    monthSummary.savingsNetFlowIdr !== 0;

  const liquidRatio =
    monthSummary.incomeIdr > 0
      ? Math.max(0, Math.min(100, (liquidDailyIdr / monthSummary.incomeIdr) * 100))
      : liquidDailyIdr > 0
        ? 100
        : 0;

  const allocatedRatio =
    monthSummary.incomeIdr > 0
      ? Math.max(0, Math.min(100, 100 - liquidRatio))
      : isDailyDeficit
        ? 100
        : 0;

  const mood: VesselMood = !hasFlowData
    ? "quiet"
    : isDailyDeficit || liquidRatio < 15
      ? "drained"
      : liquidRatio >= 40
        ? "calm"
        : "balanced";

  const mask = (amount: number) =>
    store.settings.privacyMode ? "Rp •••••••" : formatIdr(amount);

  const savingsPocketNames = useMemo(() => {
    const names = store.accounts
      .filter((a) => a.role === "savings")
      .map((a) => a.name);
    return names.join(", ");
  }, [store.accounts]);

  // Dynamic Visual Novel chronicle lines (reacts to transactions, transfers & savings flow)
  const dialogueLines = useMemo(() => {
    const monthLabel = formatCycleLabel(selectedMonth, locale, cycleStartDay);
    const lines: string[] = [];

    if (lastTxEvent) {
      if (lastTxEvent.action === "reimbursed") {
        const dest = lastTxEvent.accountId
          ? accountMap.get(lastTxEvent.accountId)?.name
          : undefined;
        const statusTag = lastTxEvent.reimburseSettled
          ? locale === "id"
            ? "LUNAS"
            : "SETTLED"
          : locale === "id"
            ? "SEBAGIAN"
            : "PARTIAL";
        lines.push(
          locale === "id"
            ? `Reimburse diterima: +${mask(lastTxEvent.amountIdr)}${dest ? ` ke ${dest}` : ""} untuk "${lastTxEvent.note}" (${statusTag}). Pengeluaran berkurang otomatis; pemasukan tetap murni.`
            : `Reimbursement received: +${mask(lastTxEvent.amountIdr)}${dest ? ` into ${dest}` : ""} for "${lastTxEvent.note}" (${statusTag}). Expense reduced automatically; income stays pure.`
        );
      } else if (lastTxEvent.type === "income") {
        const target = lastTxEvent.accountId
          ? accountMap.get(lastTxEvent.accountId)?.name
          : undefined;
        lines.push(
          locale === "id"
            ? `Pemasukan baru dicatat: +${mask(lastTxEvent.amountIdr)}${target ? ` ke ${target}` : ""} (${lastTxEvent.note}).`
            : `Income recorded: +${mask(lastTxEvent.amountIdr)}${target ? ` into ${target}` : ""} (${lastTxEvent.note}).`
        );
      } else if (lastTxEvent.type === "transfer") {
        const fromAcc = lastTxEvent.accountId
          ? accountMap.get(lastTxEvent.accountId)
          : undefined;
        const toAcc = lastTxEvent.toAccountId
          ? accountMap.get(lastTxEvent.toAccountId)
          : undefined;
        const feeNote =
          lastTxEvent.feeIdr && lastTxEvent.feeIdr > 0
            ? locale === "id"
              ? ` (admin ${mask(lastTxEvent.feeIdr)} masuk pengeluaran)`
              : ` (${mask(lastTxEvent.feeIdr)} fee counted in expense)`
            : "";

        if (toAcc?.role === "savings" && fromAcc?.role !== "savings") {
          lines.push(
            locale === "id"
              ? `Transfer ${mask(lastTxEvent.amountIdr)} dari ${fromAcc?.name ?? "asal"} ke tabungan ${toAcc.name}${feeNote}. Arus kas harian diperbarui; pengeluaran murni tetap utuh.`
              : `Moved ${mask(lastTxEvent.amountIdr)} from ${fromAcc?.name ?? "source"} into ${toAcc.name} savings${feeNote}. Daily net cashflow updated; pure expense stays intact.`
          );
        } else if (fromAcc?.role === "savings" && toAcc?.role !== "savings") {
          lines.push(
            locale === "id"
              ? `Penarikan ${mask(lastTxEvent.amountIdr)} dari tabungan ${fromAcc.name} ke ${toAcc?.name ?? "tujuan"}${feeNote}.`
              : `Withdrew ${mask(lastTxEvent.amountIdr)} from ${fromAcc.name} savings to ${toAcc?.name ?? "target"}${feeNote}.`
          );
        } else {
          lines.push(
            locale === "id"
              ? `Transfer ${mask(lastTxEvent.amountIdr)} dari ${fromAcc?.name ?? "asal"} ke ${toAcc?.name ?? "tujuan"}${feeNote}.`
              : `Transferred ${mask(lastTxEvent.amountIdr)} from ${fromAcc?.name ?? "source"} to ${toAcc?.name ?? "target"}${feeNote}.`
          );
        }
      } else {
        const src = lastTxEvent.accountId
          ? accountMap.get(lastTxEvent.accountId)
          : undefined;
        lines.push(
          locale === "id"
            ? `Pengeluaran dicatat: -${mask(lastTxEvent.amountIdr)}${src ? ` dari ${src.name}` : ""} untuk "${lastTxEvent.note}".`
            : `Expense recorded: -${mask(lastTxEvent.amountIdr)}${src ? ` from ${src.name}` : ""} for "${lastTxEvent.note}".`
        );
      }
    }

    if (!hasFlowData) {
      lines.push(
        locale === "id"
          ? `Belum ada pemasukan/pengeluaran di ${monthLabel}. Klik "+ Pemasukan", "- Pengeluaran", atau "⇄ Transfer" untuk mulai.`
          : `No income or expense in ${monthLabel} yet. Click "+ Add Income", "- Add Expense", or "⇄ Transfer" to start.`
      );
    } else if (isDailyDeficit) {
      lines.push(
        locale === "id"
          ? `Dana harian ${monthLabel} sedang defisit ${mask(Math.abs(liquidDailyIdr))}.`
          : `${monthLabel} liquid daily cashflow is short by ${mask(Math.abs(liquidDailyIdr))}.`
      );
    } else if (monthSummary.hasSavingsPockets && monthSummary.savingsNetFlowIdr !== 0) {
      lines.push(
        locale === "id"
          ? `${cycleStartDay === 1 ? "Bulan" : "Periode"} ${monthLabel}: ${liquidRatio.toFixed(0)}% dana cair harian tersisa (${mask(liquidDailyIdr)}) & ${monthSummary.savingsNetFlowIdr > 0 ? "+" : ""}${mask(monthSummary.savingsNetFlowIdr)} arus tabungan.`
          : `${monthLabel}: ${liquidRatio.toFixed(0)}% liquid daily cashflow remaining (${mask(liquidDailyIdr)}) & ${monthSummary.savingsNetFlowIdr > 0 ? "+" : ""}${mask(monthSummary.savingsNetFlowIdr)} savings flow.`
      );
    } else {
      lines.push(
        locale === "id"
          ? `${cycleStartDay === 1 ? "Bulan" : "Periode"} ${monthLabel}: ${liquidRatio.toFixed(0)}% dari pemasukan masih tersedia (${mask(liquidDailyIdr)}).`
          : `${monthLabel}: ${liquidRatio.toFixed(0)}% of your income remains liquid (${mask(liquidDailyIdr)} left).`
      );
    }

    if (
      monthSummary.hasSavingsPockets &&
      (monthSummary.savingsInflowIdr > 0 || monthSummary.savingsOutflowIdr > 0)
    ) {
      const tag = savingsPocketNames || (locale === "id" ? "Tabungan" : "Savings");
      if (monthSummary.savingsNetFlowIdr > 0 && monthSummary.savingsOutflowIdr === 0) {
        lines.push(
          locale === "id"
            ? `Tabungan (${tag}) bertambah bersih +${mask(monthSummary.savingsNetFlowIdr)} bulan ini tanpa tersentuh.`
            : `Secured +${mask(monthSummary.savingsNetFlowIdr)} into Savings (${tag}) this month — untouched.`
        );
      } else if (monthSummary.savingsNetFlowIdr > 0) {
        lines.push(
          locale === "id"
            ? `Arus bersih tabungan (${tag}) bulan ini +${mask(monthSummary.savingsNetFlowIdr)} (dengan penarikan/keluar ${mask(monthSummary.savingsOutflowIdr)}).`
            : `Net +${mask(monthSummary.savingsNetFlowIdr)} added to Savings (${tag}) this month (${mask(monthSummary.savingsOutflowIdr)} drawn).`
        );
      } else if (monthSummary.savingsNetFlowIdr < 0) {
        lines.push(
          locale === "id"
            ? `Bulan ini ada penarikan bersih ${mask(Math.abs(monthSummary.savingsNetFlowIdr))} dari kantong tabungan (${tag}).`
            : `Net ${mask(Math.abs(monthSummary.savingsNetFlowIdr))} was drawn from Savings (${tag}) this month.`
        );
      }
    }

    if (pendingReimburse.pendingCount > 0) {
      const payers = Array.from(
        new Set(
          pendingReimburse.pendingItems
            .map((item) => item.reimburse?.from)
            .filter(Boolean)
        )
      ).slice(0, 3);
      const payerSuffix = payers.length > 0 ? ` (${payers.join(", ")})` : "";
      lines.push(
        locale === "id"
          ? `Pengingat: masih ada ${pendingReimburse.pendingCount} catatan reimburse belum lunas${payerSuffix}.`
          : `Reminder: ${pendingReimburse.pendingCount} pending reimbursement${pendingReimburse.pendingCount > 1 ? "s" : ""} waiting to be settled${payerSuffix}.`
      );
    }

    if (topExpenseCat) {
      const catName = getCategoryLabel(
        topExpenseCat.categoryId,
        locale,
        store.categories
      );
      lines.push(
        locale === "id"
          ? `Pengeluaran terbesar bulan ini ada di kategori ${catName} (${topExpenseCat.percentage.toFixed(0)}% · ${mask(topExpenseCat.amountIdr)}).`
          : `Top spending category this month is ${catName} (${topExpenseCat.percentage.toFixed(0)}% · ${mask(topExpenseCat.amountIdr)}).`
      );
    }

    const expDelta = computePercentDelta(
      monthSummary.expenseIdr,
      prevSummary.expenseIdr
    );
    if (expDelta !== null) {
      const prevLabel = formatCycleLabel(
        shiftMonthKey(selectedMonth, -1),
        locale,
        cycleStartDay
      );
      lines.push(
        locale === "id"
          ? `Dibanding ${prevLabel}, total pengeluaran ${expDelta <= 0 ? "turun" : "naik"} ${Math.abs(expDelta).toFixed(1)}%.`
          : `Compared to ${prevLabel}, total spending ${expDelta <= 0 ? "dropped" : "rose"} by ${Math.abs(expDelta).toFixed(1)}%.`
      );
    }

    return lines;
  }, [
    selectedMonth,
    cycleStartDay,
    locale,
    lastTxEvent,
    hasFlowData,
    isDailyDeficit,
    liquidDailyIdr,
    monthSummary,
    prevSummary,
    liquidRatio,
    topExpenseCat,
    savingsPocketNames,
    pendingReimburse,
    accountMap,
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
    if (next === "transfer" || next === "income") setColorFilter("all");
  };

  const selectedAccountObj =
    accountFilter !== "all" ? accountMap.get(accountFilter) : undefined;

  const hasActiveFilter =
    typeFilter !== "all" ||
    categoryFilter !== "all" ||
    accountFilter !== "all" ||
    colorFilter !== "all" ||
    query.trim() !== "";

  return (
    <div className="space-y-6">
      <SandboxBanner />

      {/* =====================================================================
          1. INTERACTIVE STAGE: SHIZUKU Raindrop Vessel + Anime RPG Status Menu
         ===================================================================== */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Live Interactive Daily Liquid Health Water Tank */}
        <div className="lg:col-span-5">
          <RaindropVessel
            liquidRatio={liquidRatio}
            incomeIdr={monthSummary.incomeIdr}
            dailyNetCashflowIdr={liquidDailyIdr}
            hasSavingsPockets={monthSummary.hasSavingsPockets}
            privacyMode={store.settings.privacyMode}
            hasData={hasFlowData}
            isDeficit={isDailyDeficit}
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
              <span className="min-w-[116px] text-center font-mono text-[10.5px] font-semibold tracking-[0.1em] uppercase drop-shadow-2xs sm:text-[11px] sm:tracking-[0.12em]">
                {formatCycleLabel(selectedMonth, locale, cycleStartDay)}
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
            {/* Net Cashflow (Daily non-savings flow when savings pockets exist) + Live Total Balance */}
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#745bc7]/20 pb-3.5">
              <div>
                <p className="font-mono text-[10px] tracking-[0.18em] text-[#5d5370] uppercase">
                  {t.cashflow.netCashflow}
                  {monthSummary.hasSavingsPockets
                    ? locale === "id"
                      ? " · HARIAN"
                      : " · DAILY"
                    : ""}
                </p>
                <div className="mt-1">
                  <MoneyDisplay
                    amountIdr={monthSummary.dailyNetCashflowIdr}
                    showSign
                    className={`text-2xl font-bold tracking-tight sm:text-[30px] ${
                      monthSummary.dailyNetCashflowIdr < 0
                        ? "text-[#c837a5]"
                        : "text-[#14100e]"
                    }`}
                  />
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="font-mono text-[10px] tracking-[0.16em] text-[#5d5370] uppercase">
                  {t.cashflow.totalSaved}
                </p>
                <MoneyDisplay
                  amountIdr={totalLiveBalance}
                  className="mt-0.5 text-sm font-bold text-[#745bc7]"
                />
              </div>
            </div>

            {/* Notched 20-Segment Gauges Synced with Liquid Daily Water Tank */}
            <div className="space-y-2.5">
              <div>
                <div className="mb-1 flex items-center justify-between font-mono text-[10px] tracking-[0.14em] uppercase">
                  <span className="font-semibold text-[#2276a8]">
                    {monthSummary.hasSavingsPockets
                      ? locale === "id"
                        ? "DANA HARIAN CAIR"
                        : "DAILY LIQUID"
                      : locale === "id"
                        ? "TERSISA"
                        : "LIQUID LEFT"}
                  </span>
                  <span className="font-semibold text-[#14100e]">
                    {liquidRatio.toFixed(0)}%
                  </span>
                </div>
                <SegmentedRpgBar percent={liquidRatio} variant="reserve" />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between font-mono text-[10px] tracking-[0.14em] uppercase">
                  <span className="font-semibold text-[#c837a5]">
                    {monthSummary.hasSavingsPockets && monthSummary.savingsNetFlowIdr > 0
                      ? locale === "id"
                        ? "TERPAKAI & TABUNGAN"
                        : "SPENT & SAVED"
                      : locale === "id"
                        ? "TERPAKAI"
                        : "SPENT"}
                  </span>
                  <span className="font-semibold text-[#14100e]">
                    {allocatedRatio.toFixed(0)}%
                  </span>
                </div>
                <SegmentedRpgBar percent={allocatedRatio} variant="spent" />
              </div>
            </div>

            {/* Inline Interactive Stat Strip: INCOME | EXPENSE (+ SAVINGS FLOW & REIMBURSE) */}
            <div
              className={`grid border border-[#745bc7]/30 bg-white/60 ${
                monthSummary.hasSavingsPockets
                  ? "grid-cols-2"
                  : "grid-cols-2 sm:grid-cols-3"
              }`}
            >
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
                <span className="flex items-center justify-between font-mono text-[9px] tracking-[0.14em] text-[#5d5370] uppercase">
                  <span>{t.cashflow.income}</span>
                  {typeFilter === "income" && (
                    <span className="text-[#2276a8]">▶</span>
                  )}
                </span>
                <MoneyDisplay
                  amountIdr={monthSummary.incomeIdr}
                  className="mt-0.5 text-sm font-bold text-[#2276a8] sm:text-[15px]"
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSetTypeFilter(
                    typeFilter === "expense" ? "all" : "expense"
                  )
                }
                className={`px-3 py-2 text-left transition ${
                  !monthSummary.hasSavingsPockets
                    ? "sm:border-r sm:border-[#745bc7]/30"
                    : ""
                } ${
                  typeFilter === "expense"
                    ? "bg-[#d749d5]/12"
                    : "hover:bg-[#e5dcfb]/45"
                }`}
              >
                <span className="flex items-center justify-between font-mono text-[9px] tracking-[0.14em] text-[#5d5370] uppercase">
                  <span>{t.cashflow.expense}</span>
                  {typeFilter === "expense" && (
                    <span className="text-[#c837a5]">▶</span>
                  )}
                </span>
                <MoneyDisplay
                  amountIdr={monthSummary.expenseIdr}
                  className="mt-0.5 text-sm font-bold text-[#c837a5] sm:text-[15px]"
                />
              </button>

              {monthSummary.hasSavingsPockets && (
                <button
                  type="button"
                  onClick={() =>
                    handleSetTypeFilter(
                      typeFilter === "transfer" ? "all" : "transfer"
                    )
                  }
                  title={
                    locale === "id"
                      ? `Arus bersih ke/dari kantong tabungan (${savingsPocketNames})`
                      : `Net monthly flow into/out of savings pockets (${savingsPocketNames})`
                  }
                  className={`border-t border-r border-[#745bc7]/30 px-3 py-2 text-left transition ${
                    typeFilter === "transfer"
                      ? "bg-[#745bc7]/12"
                      : "hover:bg-[#e5dcfb]/45"
                  }`}
                >
                  <span className="flex items-center justify-between font-mono text-[9px] tracking-[0.14em] text-[#5d5370] uppercase">
                    <span className="truncate">{t.cashflow.savingsFlow}</span>
                    {typeFilter === "transfer" && (
                      <span className="text-[#745bc7]">▶</span>
                    )}
                  </span>
                  <MoneyDisplay
                    amountIdr={monthSummary.savingsNetFlowIdr}
                    showSign
                    className={`mt-0.5 text-sm font-bold sm:text-[15px] ${
                      monthSummary.savingsNetFlowIdr < 0
                        ? "text-[#c837a5]"
                        : "text-[#745bc7]"
                    }`}
                  />
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  handleSetTypeFilter(
                    typeFilter === "reimburse" ? "all" : "reimburse"
                  )
                }
                title={
                  locale === "id"
                    ? "Klik untuk filter catatan reimburse"
                    : "Click to filter reimburse entries"
                }
                className={`border-t border-[#745bc7]/30 px-3 py-2 text-left transition ${
                  monthSummary.hasSavingsPockets
                    ? ""
                    : "col-span-2 sm:col-span-1 sm:border-t-0"
                } ${
                  typeFilter === "reimburse"
                    ? "bg-[#1f8f6b]/12"
                    : "hover:bg-[#e5dcfb]/45"
                }`}
              >
                <span className="flex items-center justify-between gap-1 font-mono text-[9px] tracking-[0.14em] text-[#5d5370] uppercase">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{t.cashflow.reimburse}</span>
                    {pendingReimburse.pendingCount > 0 && (
                      <span className="shrink-0 border border-[#d97706]/55 bg-[#d97706]/12 px-1 py-0 text-[8px] font-bold text-[#b45309]">
                        {pendingReimburse.pendingCount}
                      </span>
                    )}
                  </span>
                  {typeFilter === "reimburse" && (
                    <span className="text-[#1f8f6b]">▶</span>
                  )}
                </span>

                {pendingReimburse.pendingCount > 0 ? (
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                    {pendingReimburse.knownRemainingIdr > 0 ? (
                      <span className="inline-flex items-baseline text-sm font-bold text-[#b45309] sm:text-[15px]">
                        <MoneyDisplay
                          amountIdr={pendingReimburse.knownRemainingIdr}
                        />
                        {pendingReimburse.flexibleCount > 0 && <span>+</span>}
                      </span>
                    ) : (
                      <span className="font-mono text-sm font-bold text-[#b45309] sm:text-[15px]">
                        {pendingReimburse.pendingCount} pending
                      </span>
                    )}
                    <span className="font-mono text-[9px] font-semibold text-[#5d5370] uppercase">
                      {pendingReimburse.knownRemainingIdr > 0
                        ? locale === "id"
                          ? "belum lunas"
                          : "pending"
                        : t.reimburse.flexibleTag}
                    </span>
                  </div>
                ) : (
                  <MoneyDisplay
                    amountIdr={0}
                    className="mt-0.5 text-sm font-bold text-[#5d5370] sm:text-[15px]"
                  />
                )}
              </button>
            </div>

            {/* 3 Clear Primary Action Buttons (INCOME · EXPENSE · TRANSFER) */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => openNewTxModal("income")}
                className="inline-flex items-center justify-center gap-1 border-[1.5px] border-[#2276a8] bg-white px-3 py-2.5 font-mono text-[10.5px] font-bold tracking-[0.1em] text-[#2276a8] uppercase shadow-[2px_2px_0_0_rgba(34,118,168,0.22)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#2276a8] hover:text-white"
              >
                <span>+</span>
                <span className="truncate">{t.actions.addIncome}</span>
              </button>
              <button
                type="button"
                onClick={() => openNewTxModal("expense")}
                className="vn-btn-band px-3 py-2.5 text-[10.5px] tracking-[0.1em]"
              >
                <span>-</span>
                <span className="truncate">{t.actions.addExpense}</span>
              </button>
              <button
                type="button"
                onClick={() => openNewTxModal("transfer")}
                className="col-span-2 inline-flex items-center justify-center gap-1.5 border-[1.5px] border-[#745bc7] bg-white px-3 py-2.5 font-mono text-[10.5px] font-bold tracking-[0.1em] text-[#745bc7] uppercase shadow-[2px_2px_0_0_rgba(116,91,199,0.2)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#745bc7] hover:text-white sm:col-span-1"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t.actions.transfer}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. REALTIME POCKETS STRIP (Wondr / GoPay / BCA / Custom Pockets)
         ===================================================================== */}
      <PocketsStrip
        selectedAccountId={accountFilter}
        onSelectAccount={setAccountFilter}
      />

      {/* =====================================================================
          2B. ACTIVE PENDING REIMBURSE REMINDER STRIP (Auto-hides when all settled)
         ===================================================================== */}
      <ReimburseStrip />

      {/* =====================================================================
          3. VISUAL NOVEL DIALOGUE BOX (Silent Typewriter Chronicle)
         ===================================================================== */}
      <VnDialogueBox
        lines={dialogueLines}
        activeIndex={dialogueIdx}
        onAdvance={() => setDialogueIdx((i) => i + 1)}
        mood={mood}
        locale={locale}
      />

      {/* =====================================================================
          4. CLEAN COMPACT SHIZUKU LEDGER
         ===================================================================== */}
      <section className="vn-frame">
        {/* Consistent SHIZUKU Watercolor Band Header Strip */}
        <div className="shikas-band-strip flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-white">
          <span className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
            {locale === "id" ? "RIWAYAT ARUS KAS // 雫" : "CASHFLOW LOG // 雫"}
          </span>
          <span className="font-mono text-[10px] tracking-[0.14em] text-white/95 uppercase drop-shadow-2xs">
            {filteredTransactions.length} {t.cashflow.entriesCount}
          </span>
        </div>

        {/* Unified Toolbar: Row 1 (Type Tabs + Pocket + Category + Search) & Row 2 (1-Tap Color Group Filter) */}
        <div className="space-y-2.5 border-b border-[#745bc7]/20 bg-[#fdf9ff] px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {/* Compact Sharp Type Tabs (All 5 immediately visible on mobile, joined RPG bar on sm+) */}
              <div className="flex flex-wrap gap-1.5 sm:inline-flex sm:w-fit sm:flex-nowrap sm:gap-0 sm:border sm:border-[#745bc7]/55 sm:bg-white">
                {(["all", "income", "expense", "transfer", "reimburse"] as const).map(
                  (tab, idx) => {
                    const active = typeFilter === tab;
                    const label =
                      tab === "all"
                        ? t.cashflow.all
                        : tab === "income"
                          ? t.cashflow.income
                          : tab === "expense"
                            ? t.cashflow.expense
                            : tab === "transfer"
                              ? t.cashflow.transfer
                              : t.cashflow.reimburse;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          handleSetTypeFilter(tab);
                          setCatMenuOpen(false);
                          setPocketMenuOpen(false);
                        }}
                        className={`inline-flex shrink-0 items-center gap-1 border border-[#745bc7]/50 px-2.5 py-1.5 font-mono text-[9.5px] font-semibold tracking-[0.1em] uppercase transition sm:border-0 sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.12em] ${
                          idx > 0 ? "sm:border-l sm:border-[#745bc7]/40" : ""
                        } ${
                          active
                            ? "border-[#745bc7] bg-[#745bc7] text-white"
                            : "bg-white text-[#5d5370] hover:bg-[#f4effd] hover:text-[#14100e]"
                        }`}
                      >
                        <span>{label}</span>
                        {tab === "reimburse" && pendingReimburse.pendingCount > 0 && (
                          <span
                            className={`px-1 font-mono text-[8.5px] font-bold ${
                              active
                                ? "bg-white/25 text-white"
                                : "bg-[#d97706]/15 text-[#b45309]"
                            }`}
                          >
                            {pendingReimburse.pendingCount}
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Pocket Dropdown + Color-Sorted Category Dropdown + Search */}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {/* Pocket Filter Dropdown (2-way synced with PocketsStrip) */}
              {store.accounts.length > 0 && (
                <div ref={pocketMenuRef} className="relative">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isPocketMenuOpen}
                    aria-label={t.txModal.pocket}
                    onClick={() => {
                      setPocketMenuOpen((o) => !o);
                      setCatMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 border bg-white px-3 py-1.5 font-mono text-[11px] transition sm:min-w-[144px] ${
                      isPocketMenuOpen || accountFilter !== "all"
                        ? "border-[#745bc7] text-[#14100e]"
                        : "border-[#745bc7]/40 text-[#14100e] hover:border-[#745bc7]"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {selectedAccountObj ? (
                        selectedAccountObj.role === "savings" ? (
                          <PiggyBank className="h-3.5 w-3.5 shrink-0 text-[#745bc7]" />
                        ) : (
                          <Wallet className="h-3.5 w-3.5 shrink-0 text-[#2276a8]" />
                        )
                      ) : null}
                      <span className="truncate font-medium">
                        {selectedAccountObj
                          ? selectedAccountObj.name
                          : locale === "id"
                            ? "Semua Kantong"
                            : "All Pockets"}
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-[#745bc7] transition-transform duration-150 ${
                        isPocketMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isPocketMenuOpen && (
                    <div
                      role="listbox"
                      aria-label={t.txModal.pocket}
                      className="animate-modal-in absolute right-0 left-0 z-30 mt-1.5 border-[1.5px] border-[#745bc7] bg-[#fdf9ff] shadow-[4px_4px_0_0_rgba(116,91,199,0.22)] sm:left-auto sm:w-[216px]"
                    >
                      <div className="border-b border-[#745bc7]/20 bg-[#f3ecfd] px-3 py-1.5 font-mono text-[9px] font-semibold tracking-[0.18em] text-[#745bc7] uppercase">
                        {locale === "id"
                          ? "PILIH KANTONG // 雫"
                          : "POCKET // 雫"}
                      </div>

                      <ul className="max-h-[240px] divide-y divide-[#745bc7]/10 overflow-y-auto py-0.5">
                        <li>
                          <button
                            type="button"
                            role="option"
                            aria-selected={accountFilter === "all"}
                            onClick={() => {
                              setAccountFilter("all");
                              setPocketMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-mono text-[11px] transition ${
                              accountFilter === "all"
                                ? "bg-[#e5dcfb]/75 font-bold text-[#14100e]"
                                : "text-[#4e4361] hover:bg-[#f5effe] hover:text-[#14100e]"
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className={`w-2.5 shrink-0 text-[9px] text-[#745bc7] ${
                                  accountFilter === "all"
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              >
                                ▶
                              </span>
                              <span className="truncate">
                                {locale === "id"
                                  ? "Semua Kantong"
                                  : "All Pockets"}
                              </span>
                            </span>
                            <span className="shrink-0 text-[10px] text-[#5d5370]">
                              {pocketCounts.total}
                            </span>
                          </button>
                        </li>

                        {store.accounts.map((acc) => {
                          const selected = accountFilter === acc.id;
                          const cnt = pocketCounts.counts.get(acc.id) ?? 0;
                          return (
                            <li key={acc.id}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setAccountFilter(acc.id);
                                  setPocketMenuOpen(false);
                                }}
                                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-mono text-[11px] transition ${
                                  selected
                                    ? "bg-[#e5dcfb]/75 font-bold text-[#14100e]"
                                    : "text-[#4e4361] hover:bg-[#f5effe] hover:text-[#14100e]"
                                }`}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <span
                                    className={`w-2.5 shrink-0 text-[9px] text-[#745bc7] ${
                                      selected ? "opacity-100" : "opacity-0"
                                    }`}
                                  >
                                    ▶
                                  </span>
                                  {acc.role === "savings" ? (
                                    <PiggyBank className="h-3.5 w-3.5 shrink-0 text-[#745bc7]" />
                                  ) : (
                                    <Wallet className="h-3.5 w-3.5 shrink-0 text-[#2276a8]" />
                                  )}
                                  <span className="truncate">{acc.name}</span>
                                </span>
                                <span className="shrink-0 text-[10px] text-[#5d5370]">
                                  {cnt}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeMonthCategories.length > 0 && typeFilter !== "transfer" && (
                <div ref={catMenuRef} className="relative">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isCatMenuOpen}
                    aria-label={t.txModal.category}
                    onClick={() => {
                      setCatMenuOpen((o) => !o);
                      setPocketMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2.5 border bg-white px-3 py-1.5 font-mono text-[11px] transition sm:min-w-[156px] ${
                      isCatMenuOpen || categoryFilter !== "all"
                        ? "border-[#745bc7] text-[#14100e]"
                        : "border-[#745bc7]/40 text-[#14100e] hover:border-[#745bc7]"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {categoryFilter === "all" ? null : categoryFilter === "transfer" ? (
                        <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-[#745bc7]/55 bg-[#f5effe] font-mono text-[8.5px] font-bold text-[#745bc7]">
                          ⇄
                        </span>
                      ) : categoryMap[categoryFilter]?.type === "income" ? (
                        <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-[#2276a8]/55 bg-[#2276a8]/8 font-mono text-[9.5px] font-bold text-[#2276a8]">
                          +
                        </span>
                      ) : (
                        <span
                          className="h-2 w-2 shrink-0"
                          style={{
                            backgroundColor:
                              categoryMap[categoryFilter]?.color ?? "#4e5d78",
                          }}
                        />
                      )}
                      <span className="truncate font-medium">
                        {getFilterCategoryLabel(categoryFilter)}
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-[#745bc7] transition-transform duration-150 ${
                        isCatMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isCatMenuOpen && (
                    <div
                      role="listbox"
                      aria-label={t.txModal.category}
                      className="animate-modal-in absolute right-0 left-0 z-30 mt-1.5 border-[1.5px] border-[#745bc7] bg-[#fdf9ff] shadow-[4px_4px_0_0_rgba(116,91,199,0.22)] sm:left-auto sm:w-[236px]"
                    >
                      <div className="border-b border-[#745bc7]/20 bg-[#f3ecfd] px-3 py-1.5 font-mono text-[9px] font-semibold tracking-[0.18em] text-[#745bc7] uppercase">
                        {locale === "id"
                          ? "PILIH KATEGORI // 雫"
                          : "CATEGORY // 雫"}
                      </div>

                      <div className="max-h-[280px] overflow-y-auto py-0.5">
                        <button
                          type="button"
                          role="option"
                          aria-selected={categoryFilter === "all"}
                          onClick={() => {
                            setCategoryFilter("all");
                            setCatMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-mono text-[11px] transition ${
                            categoryFilter === "all"
                              ? "bg-[#e5dcfb]/75 font-bold text-[#14100e]"
                              : "text-[#4e4361] hover:bg-[#f5effe] hover:text-[#14100e]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className={`w-2.5 shrink-0 text-[9px] text-[#745bc7] ${
                                categoryFilter === "all"
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            >
                              ▶
                            </span>
                            <span className="truncate">
                              {t.cashflow.allCategories}
                            </span>
                          </span>
                          <span className="shrink-0 text-[10px] text-[#5d5370]">
                            {totalTypeFilteredCount}
                          </span>
                        </button>

                        {groupedCategorySections.map((section) => (
                          <div
                            key={section.key}
                            className="border-t border-[#745bc7]/22"
                          >
                            <div className="bg-[#f6f1fe] px-3 py-1 font-mono text-[8.5px] font-bold tracking-[0.16em] text-[#745bc7]/85 uppercase">
                              {section.label}
                            </div>
                            <ul className="divide-y divide-[#745bc7]/10">
                              {section.items.map(({ id: catId, count }) => {
                                const cat = categoryMap[catId];
                                const selected = categoryFilter === catId;
                                const isTransferItem = section.key === "transfer";
                                const isIncomeItem = section.key === "income";
                                return (
                                  <li key={catId}>
                                    <button
                                      type="button"
                                      role="option"
                                      aria-selected={selected}
                                      onClick={() => {
                                        setCategoryFilter(catId);
                                        setCatMenuOpen(false);
                                      }}
                                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-mono text-[11px] transition ${
                                        selected
                                          ? "bg-[#e5dcfb]/75 font-bold text-[#14100e]"
                                          : "text-[#4e4361] hover:bg-[#f5effe] hover:text-[#14100e]"
                                      }`}
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        <span
                                          className={`w-2.5 shrink-0 text-[9px] text-[#745bc7] ${
                                            selected ? "opacity-100" : "opacity-0"
                                          }`}
                                        >
                                          ▶
                                        </span>
                                        {isTransferItem ? (
                                          <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-[#745bc7]/55 bg-white font-mono text-[9px] font-bold text-[#745bc7]">
                                            ⇄
                                          </span>
                                        ) : isIncomeItem ? (
                                          <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-[#2276a8]/55 bg-[#2276a8]/8 font-mono text-[9.5px] font-bold text-[#2276a8]">
                                            +
                                          </span>
                                        ) : (
                                          <span
                                            className="h-2 w-2 shrink-0"
                                            style={{
                                              backgroundColor:
                                                cat?.color ?? "#4e5d78",
                                            }}
                                          />
                                        )}
                                        <span className="truncate">
                                          {getCategoryLabel(
                                            catId,
                                            locale,
                                            store.categories
                                          )}
                                        </span>
                                      </span>
                                      <span className="shrink-0 text-[10px] text-[#5d5370]">
                                        {count}
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 border border-[#745bc7]/40 bg-white px-2.5 py-1.5 transition focus-within:border-[#745bc7] sm:w-44">
                <Search className="h-3.5 w-3.5 shrink-0 text-[#745bc7]" />
                <input
                  type="text"
                  placeholder={t.cashflow.searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent font-mono text-[11px] text-[#14100e] outline-none placeholder:text-[#5d5370]/75"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="text-[#5d5370] hover:text-[#14100e]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 1-Tap Expense Color Group Filter Strip (Excludes Income & Transfer) */}
          {activeMonthColors.length > 0 &&
            typeFilter !== "transfer" &&
            typeFilter !== "income" && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-[#745bc7]/12 pt-2">
              <span className="mr-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-[#5d5370] uppercase">
                {locale === "id" ? "WARNA:" : "COLOR:"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setColorFilter("all");
                  setCategoryFilter("all");
                }}
                className={`border px-2 py-0.5 font-mono text-[9.5px] font-semibold tracking-[0.08em] uppercase transition ${
                  colorFilter === "all"
                    ? "border-[#745bc7] bg-[#745bc7] text-white"
                    : "border-[#745bc7]/35 bg-white text-[#5d5370] hover:border-[#745bc7] hover:text-[#14100e]"
                }`}
              >
                {locale === "id" ? "SEMUA" : "ALL"}
              </button>
              {activeMonthColors.map((group) => {
                const active = colorFilter === group.color;
                const label = getColorGroupLabel(
                  group.color,
                  store.settings.colorLabels
                );
                return (
                  <button
                    key={group.color}
                    type="button"
                    title={`${label}: ${group.categoriesLabel}`}
                    onClick={() => {
                      const next = active ? "all" : group.color;
                      setColorFilter(next);
                      setCategoryFilter("all");
                    }}
                    className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[9.5px] font-semibold transition ${
                      active
                        ? "border-[#14100e] bg-[#f4effe] text-[#14100e] shadow-[2px_2px_0_0_rgba(116,91,199,0.22)]"
                        : "border-[#745bc7]/30 bg-white text-[#5d5370] hover:border-[#745bc7] hover:text-[#14100e]"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 border border-black/10"
                      style={{ backgroundColor: group.color }}
                    />
                    <span>{label}</span>
                    <span className="text-[9px] opacity-70">{group.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Clean Single-Row Compact Ledger Table */}
        {filteredTransactions.length === 0 ? (
          <div className="bg-white/95 px-6 py-14 text-center">
            <p className="font-editorial text-lg font-semibold tracking-[0.14em] text-[#745bc7] uppercase">
              {t.cashflow.emptyTitle}
            </p>
            <p className="mt-1.5 font-mono text-xs text-[#5d5370]">
              {t.cashflow.emptyDesc}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("all");
                    setCategoryFilter("all");
                    setAccountFilter("all");
                    setColorFilter("all");
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
          <div className="bg-white/95">
            {/* Subtle Single Column Header */}
            <div className="hidden items-center gap-4 border-b border-[#745bc7]/15 bg-[#f8f4fe] px-5 py-1.5 font-mono text-[9px] font-semibold tracking-[0.18em] text-[#5d5370] uppercase sm:flex">
              <span className="w-[62px] shrink-0">
                {locale === "id" ? "TGL" : "DATE"}
              </span>
              <span className="flex-1">
                {locale === "id" ? "CATATAN" : "ENTRY"}
              </span>
              <span className="text-right">
                {locale === "id" ? "NOMINAL" : "AMOUNT"}
              </span>
              <span className="w-[82px] shrink-0" aria-hidden="true" />
            </div>

            <ul className="divide-y divide-[#745bc7]/12">
              {filteredTransactions.map((tx) => {
                const cat = categoryMap[tx.categoryId];
                const isIncome = tx.type === "income";
                const isTransfer = tx.type === "transfer";
                const hoverBar = isIncome
                  ? "#2276a8"
                  : isTransfer
                    ? "#745bc7"
                    : "#c837a5";
                const fromAcc = tx.accountId
                  ? accountMap.get(tx.accountId)
                  : undefined;
                const toAcc = tx.toAccountId
                  ? accountMap.get(tx.toAccountId)
                  : undefined;
                const reimburseProg = getReimburseProgress(tx);
                const reimburseDestNames = reimburseProg.isReimburse
                  ? Array.from(
                      new Set(
                        (tx.reimburse?.entries ?? [])
                          .map((e) =>
                            e.accountId
                              ? accountMap.get(e.accountId)?.name ?? ""
                              : ""
                          )
                          .filter(Boolean)
                      )
                    )
                  : [];

                return (
                  <li
                    key={tx.id}
                    className="group relative flex flex-col gap-2 px-4 py-3 transition hover:bg-[#f7f3fe] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                  >
                    {/* Crisp Left Hover Accent */}
                    <span
                      className="absolute top-0 bottom-0 left-0 w-[3px] opacity-0 transition group-hover:opacity-100"
                      style={{
                        backgroundColor: reimburseProg.isReimburse
                          ? reimburseProg.isSettled
                            ? "#1f8f6b"
                            : "#d97706"
                          : hoverBar,
                      }}
                      aria-hidden="true"
                    />

                    {/* Fixed Left Date Column (Desktop) */}
                    <span className="hidden w-[62px] shrink-0 font-mono text-[11px] text-[#5d5370] uppercase sm:inline-block">
                      {formatShortDate(tx.date, locale)}
                    </span>

                    {/* Entry Info (Full width on mobile with inline right amount; flush-left on desktop) */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2.5 sm:block">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <p className="truncate text-[13.5px] font-semibold text-[#14100e]">
                            {tx.note}
                          </p>
                          {reimburseProg.isReimburse && (
                            <button
                              type="button"
                              onClick={() => openReimburseModal(tx.id)}
                              className={`shrink-0 border px-1.5 py-0.2 font-mono text-[8.5px] font-bold tracking-[0.12em] uppercase transition ${
                                reimburseProg.isSettled
                                  ? "border-[#1f8f6b]/50 bg-[#1f8f6b]/10 text-[#1f8f6b] hover:bg-[#1f8f6b] hover:text-white"
                                  : reimburseProg.isPartial
                                    ? "border-[#2276a8]/50 bg-[#2276a8]/10 text-[#2276a8] hover:bg-[#2276a8] hover:text-white"
                                    : "border-[#d97706]/55 bg-[#d97706]/10 text-[#b45309] hover:bg-[#d97706] hover:text-white"
                              }`}
                            >
                              {reimburseProg.isSettled
                                ? t.reimburse.statusSettled
                                : reimburseProg.isPartial
                                  ? t.reimburse.statusPartial
                                  : t.reimburse.statusPending}
                            </button>
                          )}
                        </div>

                        {/* Mobile-Only Right Amount on Row 1 for Generous Note Breathing Room */}
                        <div className="shrink-0 sm:hidden">
                          {isTransfer ? (
                            <span className="inline-flex items-center gap-1 text-[13.5px] font-bold text-[#745bc7]">
                              <span className="font-mono text-[11px] opacity-80">
                                ⇄
                              </span>
                              <MoneyDisplay amountIdr={tx.amountIdr} />
                            </span>
                          ) : isIncome ? (
                            <MoneyDisplay
                              amountIdr={tx.amountIdr}
                              showSign
                              className="text-[13.5px] font-bold text-[#2276a8]"
                            />
                          ) : (
                            <div className="text-right">
                              <MoneyDisplay
                                amountIdr={
                                  reimburseProg.netExpenseIdr > 0
                                    ? -reimburseProg.netExpenseIdr
                                    : 0
                                }
                                showSign={reimburseProg.netExpenseIdr > 0}
                                className={`block text-[13.5px] font-bold ${
                                  reimburseProg.isReimburse &&
                                  reimburseProg.netExpenseIdr === 0
                                    ? "text-[#1f8f6b]"
                                    : "text-[#14100e]"
                                }`}
                              />
                              {reimburseProg.reimbursedIdr > 0 && (
                                <span className="block font-mono text-[9.5px] text-[#5d5370] line-through">
                                  {mask(reimburseProg.grossIdr)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2 sm:mt-0.5">
                        <div className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-[#5d5370]">
                          {isTransfer ? (
                            <span
                              className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-[#745bc7]/55 bg-[#f5effe] font-mono text-[8.5px] font-bold text-[#745bc7]"
                              aria-hidden="true"
                            >
                              ⇄
                            </span>
                          ) : isIncome ? (
                            <span
                              className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-[#2276a8]/55 bg-[#2276a8]/8 font-mono text-[9.5px] font-bold text-[#2276a8]"
                              aria-hidden="true"
                            >
                              +
                            </span>
                          ) : (
                            <span
                              className="h-2 w-2 shrink-0"
                              style={{ backgroundColor: cat?.color ?? "#4e5d78" }}
                            />
                          )}
                          <span className="truncate">
                            <span className="sm:hidden">
                              {formatShortDate(tx.date, locale)} ·{" "}
                            </span>
                            {isTransfer ? (
                              <>
                                {fromAcc?.name ?? "—"} → {toAcc?.name ?? "—"}
                                {tx.feeIdr && tx.feeIdr > 0
                                  ? ` · +${mask(tx.feeIdr)} ${locale === "id" ? "admin" : "fee"}`
                                  : ""}
                              </>
                            ) : (
                              <>
                                {getCategoryLabel(
                                  tx.categoryId,
                                  locale,
                                  store.categories
                                )}
                                {fromAcc ? ` · ${fromAcc.name}` : ""}
                                {tx.merchant ? ` · ${tx.merchant}` : ""}
                                {reimburseProg.isReimburse && tx.reimburse?.from
                                  ? ` · ${locale === "id" ? "Dari" : "From"} ${tx.reimburse.from}`
                                  : ""}
                                {reimburseProg.reimbursedIdr > 0
                                  ? ` · ${locale === "id" ? "Diganti" : "Reimb."} ${mask(reimburseProg.reimbursedIdr)}${reimburseDestNames.length > 0 ? ` → ${reimburseDestNames.join(", ")}` : ""}`
                                  : ""}
                              </>
                            )}
                          </span>
                        </div>

                        {/* Mobile-Only Row 2 Compact Thumb Actions */}
                        <div className="flex shrink-0 items-center gap-0.5 sm:hidden">
                          {reimburseProg.isReimburse && (
                            <button
                              type="button"
                              onClick={() => openReimburseModal(tx.id)}
                              aria-label={
                                reimburseProg.isPending
                                  ? t.reimburse.receiveBtn
                                  : t.reimburse.manageBtn
                              }
                              className={`p-1.5 transition hover:bg-white ${
                                reimburseProg.isPending
                                  ? "text-[#b45309]"
                                  : "text-[#1f8f6b]"
                              }`}
                            >
                              <HandCoins className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditTxModal(tx)}
                            aria-label={t.actions.edit}
                            className="p-1.5 text-[#5d5370] transition hover:bg-white hover:text-[#745bc7]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateTransaction(tx)}
                            aria-label={t.actions.duplicate}
                            className="p-1.5 text-[#5d5370] transition hover:bg-white hover:text-[#745bc7]"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTransaction(tx.id)}
                            aria-label={t.actions.delete}
                            className="p-1.5 text-[#5d5370] transition hover:bg-white hover:text-[#c837a5]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Right Amount + Quiet Actions */}
                    <div className="hidden shrink-0 items-center gap-4 sm:flex">
                      {isTransfer ? (
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-[#745bc7]">
                          <span className="font-mono text-[11px] opacity-80">
                            ⇄
                          </span>
                          <MoneyDisplay amountIdr={tx.amountIdr} />
                        </span>
                      ) : isIncome ? (
                        <MoneyDisplay
                          amountIdr={tx.amountIdr}
                          showSign
                          className="text-sm font-bold text-[#2276a8]"
                        />
                      ) : (
                        <div className="text-right">
                          <MoneyDisplay
                            amountIdr={
                              reimburseProg.netExpenseIdr > 0
                                ? -reimburseProg.netExpenseIdr
                                : 0
                            }
                            showSign={reimburseProg.netExpenseIdr > 0}
                            className={`block text-sm font-bold ${
                              reimburseProg.isReimburse &&
                              reimburseProg.netExpenseIdr === 0
                                ? "text-[#1f8f6b]"
                                : "text-[#14100e]"
                            }`}
                          />
                          {reimburseProg.reimbursedIdr > 0 && (
                            <span className="block font-mono text-[9.5px] text-[#5d5370] line-through">
                              {mask(reimburseProg.grossIdr)}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex min-w-[82px] items-center justify-end gap-0.5 opacity-45 transition group-hover:opacity-100">
                        {reimburseProg.isReimburse && (
                          <button
                            type="button"
                            onClick={() => openReimburseModal(tx.id)}
                            aria-label={
                              reimburseProg.isPending
                                ? t.reimburse.receiveBtn
                                : t.reimburse.manageBtn
                            }
                            title={
                              reimburseProg.isPending
                                ? t.reimburse.receiveBtn
                                : t.reimburse.manageBtn
                            }
                            className={`p-1.5 transition hover:bg-white ${
                              reimburseProg.isPending
                                ? "text-[#b45309] hover:text-[#1f8f6b]"
                                : "text-[#1f8f6b] hover:text-[#745bc7]"
                            }`}
                          >
                            <HandCoins className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditTxModal(tx)}
                          aria-label={t.actions.edit}
                          className="p-1.5 text-[#5d5370] transition hover:bg-white hover:text-[#745bc7]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateTransaction(tx)}
                          aria-label={t.actions.duplicate}
                          className="p-1.5 text-[#5d5370] transition hover:bg-white hover:text-[#745bc7]"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTransaction(tx.id)}
                          aria-label={t.actions.delete}
                          className="p-1.5 text-[#5d5370] transition hover:bg-white hover:text-[#c837a5]"
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
        )}
      </section>
    </div>
  );
};
