import type { PocketAccount, Transaction } from "../types/cashflow";
import {
  getCycleDateRange,
  getCycleKeyForDate,
  isDateInCycle,
  shiftMonthKey,
} from "./format";
import { getNetExpenseIdr, getReimbursedTotalIdr } from "./reimburse";

export type AnalyticsRange = "3m" | "6m" | "12m" | "all";

export interface MonthlySummary {
  month: string;
  incomeIdr: number;
  expenseIdr: number; // Net expenses (gross minus reimbursements) + transfer admin fees
  reimbursedIdr: number; // Total reimbursed back against this cycle's expenses
  transferFeeIdr: number;
  transferVolumeIdr: number;
  netCashflowIdr: number; // Total wealth flow: incomeIdr - expenseIdr
  dailyNetCashflowIdr: number; // Non-savings spendable cashflow: netCashflowIdr - savingsNetFlowIdr
  savingsRate: number;
  savingsInflowIdr: number;
  savingsOutflowIdr: number;
  savingsNetFlowIdr: number; // Exact monthly net delta of SAVINGS pockets
  hasSavingsPockets: boolean;
  txCount: number;
}

export interface AccountBalanceSnapshot {
  account: PocketAccount;
  balanceIdr: number;
}

export interface AccountsOverview {
  items: AccountBalanceSnapshot[];
  dailyTotalIdr: number;
  savingsTotalIdr: number;
  unassignedDeltaIdr: number;
  totalBalanceIdr: number;
}

export interface CategorySpendItem {
  categoryId: string;
  amountIdr: number;
  percentage: number;
  count: number;
}

export interface MonthlySeriesPoint {
  month: string;
  incomeIdr: number;
  expenseIdr: number;
  reimbursedIdr: number;
  netIdr: number;
  dailyNetIdr: number;
  savingsFlowIdr: number;
  cumulativeBalanceIdr: number;
  savingsBalanceIdr: number;
}

export function computeAccountBalances(
  accounts: PocketAccount[],
  transactions: Transaction[],
  upToDateIso?: string
): AccountsOverview {
  const balances = new Map<string, number>();
  for (const acc of accounts) {
    balances.set(acc.id, Math.max(0, Math.round(acc.openingBalanceIdr || 0)));
  }

  let unassignedDeltaIdr = 0;

  for (const tx of transactions) {
    const amt = Math.max(0, Math.round(tx.amountIdr || 0));
    const fee = Math.max(0, Math.round(tx.feeIdr || 0));
    const txIncluded = !upToDateIso || tx.date <= upToDateIso;

    if (txIncluded) {
      if (tx.type === "income") {
        if (tx.accountId && balances.has(tx.accountId)) {
          balances.set(tx.accountId, (balances.get(tx.accountId) ?? 0) + amt);
        } else {
          unassignedDeltaIdr += amt;
        }
      } else if (tx.type === "expense") {
        if (tx.accountId && balances.has(tx.accountId)) {
          balances.set(tx.accountId, (balances.get(tx.accountId) ?? 0) - amt);
        } else {
          unassignedDeltaIdr -= amt;
        }
      } else if (tx.type === "transfer") {
        if (tx.accountId && balances.has(tx.accountId)) {
          balances.set(
            tx.accountId,
            (balances.get(tx.accountId) ?? 0) - (amt + fee)
          );
        } else {
          unassignedDeltaIdr -= amt + fee;
        }

        if (tx.toAccountId && balances.has(tx.toAccountId)) {
          balances.set(tx.toAccountId, (balances.get(tx.toAccountId) ?? 0) + amt);
        } else {
          unassignedDeltaIdr += amt;
        }
      }
    }

    // Credit reimbursement repayments to whichever pocket received them (on their actual repayment date)
    if (tx.type === "expense" && tx.reimburse && tx.reimburse.entries.length > 0) {
      let remainingCap = amt;
      for (const entry of tx.reimburse.entries) {
        const entryAmt = Math.min(
          remainingCap,
          Math.max(0, Math.round(entry.amountIdr || 0))
        );
        if (entryAmt <= 0) continue;
        remainingCap -= entryAmt;
        if (upToDateIso && entry.date > upToDateIso) continue;
        if (entry.accountId && balances.has(entry.accountId)) {
          balances.set(
            entry.accountId,
            (balances.get(entry.accountId) ?? 0) + entryAmt
          );
        } else {
          unassignedDeltaIdr += entryAmt;
        }
      }
    }
  }

  const items: AccountBalanceSnapshot[] = accounts.map((account) => ({
    account,
    balanceIdr: balances.get(account.id) ?? 0,
  }));

  let dailyTotalIdr = 0;
  let savingsTotalIdr = 0;
  for (const item of items) {
    if (item.account.role === "savings") savingsTotalIdr += item.balanceIdr;
    else dailyTotalIdr += item.balanceIdr;
  }

  return {
    items,
    dailyTotalIdr,
    savingsTotalIdr,
    unassignedDeltaIdr,
    totalBalanceIdr: dailyTotalIdr + savingsTotalIdr + unassignedDeltaIdr,
  };
}

export function computeCumulativeNetBalance(
  transactions: Transaction[],
  accounts: PocketAccount[] = [],
  upToDateIso?: string
): number {
  let total = 0;
  for (const acc of accounts) {
    total += Math.max(0, Math.round(acc.openingBalanceIdr || 0));
  }
  for (const tx of transactions) {
    const txIncluded = !upToDateIso || tx.date <= upToDateIso;
    if (txIncluded) {
      if (tx.type === "income") {
        total += tx.amountIdr;
      } else if (tx.type === "expense") {
        total -= tx.amountIdr;
      } else if (tx.type === "transfer") {
        total -= Math.max(0, Math.round(tx.feeIdr || 0));
      }
    }

    if (tx.type === "expense" && tx.reimburse && tx.reimburse.entries.length > 0) {
      let remainingCap = Math.max(0, Math.round(tx.amountIdr || 0));
      for (const entry of tx.reimburse.entries) {
        const entryAmt = Math.min(
          remainingCap,
          Math.max(0, Math.round(entry.amountIdr || 0))
        );
        if (entryAmt <= 0) continue;
        remainingCap -= entryAmt;
        if (upToDateIso && entry.date > upToDateIso) continue;
        total += entryAmt;
      }
    }
  }
  return total;
}

export function computeMonthlySummary(
  transactions: Transaction[],
  monthKey: string,
  accounts: PocketAccount[] = [],
  cycleStartDay = 1
): MonthlySummary {
  const savingsIds = new Set(
    accounts.filter((a) => a.role === "savings").map((a) => a.id)
  );
  const hasSavingsPockets = savingsIds.size > 0;

  let incomeIdr = 0;
  let expenseIdr = 0;
  let reimbursedIdr = 0;
  let transferFeeIdr = 0;
  let transferVolumeIdr = 0;
  let savingsInflowIdr = 0;
  let savingsOutflowIdr = 0;
  let txCount = 0;

  for (const tx of transactions) {
    if (!isDateInCycle(tx.date, monthKey, cycleStartDay)) continue;
    txCount += 1;
    const fee = Math.max(0, Math.round(tx.feeIdr || 0));

    if (tx.type === "income") {
      incomeIdr += tx.amountIdr;
      if (tx.accountId && savingsIds.has(tx.accountId)) {
        savingsInflowIdr += tx.amountIdr;
      }
    } else if (tx.type === "expense") {
      const txReimbursed = getReimbursedTotalIdr(tx);
      const netExp = getNetExpenseIdr(tx);
      expenseIdr += netExp;
      reimbursedIdr += txReimbursed;

      if (tx.accountId && savingsIds.has(tx.accountId)) {
        savingsOutflowIdr += tx.amountIdr;
      }
      if (tx.reimburse && tx.reimburse.entries.length > 0) {
        let remainingCap = Math.max(0, Math.round(tx.amountIdr || 0));
        for (const entry of tx.reimburse.entries) {
          const entryAmt = Math.min(
            remainingCap,
            Math.max(0, Math.round(entry.amountIdr || 0))
          );
          if (entryAmt <= 0) continue;
          remainingCap -= entryAmt;
          if (entry.accountId && savingsIds.has(entry.accountId)) {
            savingsInflowIdr += entryAmt;
          }
        }
      }
    } else if (tx.type === "transfer") {
      transferVolumeIdr += tx.amountIdr;
      if (fee > 0) {
        transferFeeIdr += fee;
        expenseIdr += fee;
      }

      const fromSavings = Boolean(tx.accountId && savingsIds.has(tx.accountId));
      const toSavings = Boolean(
        tx.toAccountId && savingsIds.has(tx.toAccountId)
      );

      if (toSavings && !fromSavings) {
        savingsInflowIdr += tx.amountIdr;
      } else if (fromSavings && !toSavings) {
        savingsOutflowIdr += tx.amountIdr + fee;
      } else if (fromSavings && toSavings && fee > 0) {
        savingsOutflowIdr += fee;
      }
    }
  }

  const netCashflowIdr = incomeIdr - expenseIdr;
  const savingsRate = incomeIdr > 0 ? (netCashflowIdr / incomeIdr) * 100 : 0;
  const savingsNetFlowIdr = savingsInflowIdr - savingsOutflowIdr;
  const dailyNetCashflowIdr = hasSavingsPockets
    ? netCashflowIdr - savingsNetFlowIdr
    : netCashflowIdr;

  return {
    month: monthKey,
    incomeIdr,
    expenseIdr,
    reimbursedIdr,
    transferFeeIdr,
    transferVolumeIdr,
    netCashflowIdr,
    dailyNetCashflowIdr,
    savingsRate,
    savingsInflowIdr,
    savingsOutflowIdr,
    savingsNetFlowIdr,
    hasSavingsPockets,
    txCount,
  };
}

export function computeCategoryBreakdown(
  transactions: Transaction[],
  monthKey: string,
  type: "expense" | "income" = "expense",
  cycleStartDay = 1
): CategorySpendItem[] {
  return computeCategoryBreakdownForMonths(
    transactions,
    [monthKey],
    type,
    cycleStartDay
  );
}

export function computeCategoryBreakdownForMonths(
  transactions: Transaction[],
  monthKeys: string[] | null,
  type: "expense" | "income" = "expense",
  cycleStartDay = 1
): CategorySpendItem[] {
  const allowed = monthKeys ? new Set(monthKeys) : null;
  const bucket = new Map<string, { amountIdr: number; count: number }>();
  let total = 0;

  for (const tx of transactions) {
    const txCycle = getCycleKeyForDate(tx.date, cycleStartDay);
    if (allowed && !allowed.has(txCycle)) continue;

    if (tx.type === type) {
      const effectiveAmt =
        type === "expense" ? getNetExpenseIdr(tx) : tx.amountIdr;
      if (effectiveAmt > 0) {
        const prev = bucket.get(tx.categoryId) ?? { amountIdr: 0, count: 0 };
        bucket.set(tx.categoryId, {
          amountIdr: prev.amountIdr + effectiveAmt,
          count: prev.count + 1,
        });
        total += effectiveAmt;
      }
    } else if (type === "expense" && tx.type === "transfer") {
      const fee = Math.max(0, Math.round(tx.feeIdr || 0));
      if (fee > 0) {
        const prev = bucket.get("fees") ?? { amountIdr: 0, count: 0 };
        bucket.set("fees", {
          amountIdr: prev.amountIdr + fee,
          count: prev.count + 1,
        });
        total += fee;
      }
    }
  }

  return Array.from(bucket.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      amountIdr: data.amountIdr,
      count: data.count,
      percentage: total > 0 ? (data.amountIdr / total) * 100 : 0,
    }))
    .sort((a, b) => b.amountIdr - a.amountIdr);
}

function buildSeriesPoint(
  transactions: Transaction[],
  accounts: PocketAccount[],
  mKey: string,
  cycleStartDay = 1
): MonthlySeriesPoint {
  const summary = computeMonthlySummary(
    transactions,
    mKey,
    accounts,
    cycleStartDay
  );
  const { endDate } = getCycleDateRange(mKey, cycleStartDay);
  const balSnapshot = computeAccountBalances(accounts, transactions, endDate);

  return {
    month: mKey,
    incomeIdr: summary.incomeIdr,
    expenseIdr: summary.expenseIdr,
    reimbursedIdr: summary.reimbursedIdr,
    netIdr: summary.netCashflowIdr,
    dailyNetIdr: summary.dailyNetCashflowIdr,
    savingsFlowIdr: summary.savingsNetFlowIdr,
    cumulativeBalanceIdr: balSnapshot.totalBalanceIdr,
    savingsBalanceIdr: balSnapshot.savingsTotalIdr,
  };
}

export function computeMultiMonthSeries(
  transactions: Transaction[],
  anchorMonthKey: string,
  monthsCount = 6,
  accounts: PocketAccount[] = [],
  cycleStartDay = 1
): MonthlySeriesPoint[] {
  const result: MonthlySeriesPoint[] = [];
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const mKey = shiftMonthKey(anchorMonthKey, -i);
    result.push(buildSeriesPoint(transactions, accounts, mKey, cycleStartDay));
  }
  return result;
}

export function computeTimeRangeSeries(
  transactions: Transaction[],
  anchorMonthKey: string,
  range: AnalyticsRange,
  accounts: PocketAccount[] = [],
  cycleStartDay = 1
): MonthlySeriesPoint[] {
  if (range === "3m") {
    return computeMultiMonthSeries(
      transactions,
      anchorMonthKey,
      3,
      accounts,
      cycleStartDay
    );
  }
  if (range === "6m") {
    return computeMultiMonthSeries(
      transactions,
      anchorMonthKey,
      6,
      accounts,
      cycleStartDay
    );
  }
  if (range === "12m") {
    return computeMultiMonthSeries(
      transactions,
      anchorMonthKey,
      12,
      accounts,
      cycleStartDay
    );
  }

  // All Time: build contiguous cycle span from earliest to latest transaction cycle
  if (transactions.length === 0) {
    return [
      buildSeriesPoint(transactions, accounts, anchorMonthKey, cycleStartDay),
    ];
  }

  let minCycle = getCycleKeyForDate(transactions[0].date, cycleStartDay);
  let maxCycle = minCycle;
  for (const tx of transactions) {
    const ck = getCycleKeyForDate(tx.date, cycleStartDay);
    if (ck < minCycle) minCycle = ck;
    if (ck > maxCycle) maxCycle = ck;
  }

  const result: MonthlySeriesPoint[] = [];
  let cursor = minCycle;
  let guard = 0;
  while (cursor <= maxCycle && guard < 120) {
    result.push(buildSeriesPoint(transactions, accounts, cursor, cycleStartDay));
    cursor = shiftMonthKey(cursor, 1);
    guard += 1;
  }
  return result;
}

export function computePercentDelta(
  current: number,
  previous: number
): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
