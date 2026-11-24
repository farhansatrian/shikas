import type { Transaction } from "../types/cashflow";
import { shiftMonthKey } from "./format";

export interface MonthlySummary {
  month: string;
  incomeIdr: number;
  expenseIdr: number;
  netCashflowIdr: number;
  savingsRate: number;
  txCount: number;
}

export interface CategorySpendItem {
  categoryId: string;
  amountIdr: number;
  percentage: number;
  count: number;
}

export function computeCumulativeNetBalance(
  transactions: Transaction[],
  upToDateIso?: string
): number {
  let total = 0;
  for (const tx of transactions) {
    if (upToDateIso && tx.date > upToDateIso) continue;
    if (tx.type === "income") total += tx.amountIdr;
    else total -= tx.amountIdr;
  }
  return total;
}

export function computeMonthlySummary(
  transactions: Transaction[],
  monthKey: string
): MonthlySummary {
  let incomeIdr = 0;
  let expenseIdr = 0;
  let txCount = 0;

  for (const tx of transactions) {
    if (!tx.date.startsWith(monthKey)) continue;
    txCount += 1;
    if (tx.type === "income") incomeIdr += tx.amountIdr;
    else expenseIdr += tx.amountIdr;
  }

  const netCashflowIdr = incomeIdr - expenseIdr;
  const savingsRate = incomeIdr > 0 ? (netCashflowIdr / incomeIdr) * 100 : 0;

  return {
    month: monthKey,
    incomeIdr,
    expenseIdr,
    netCashflowIdr,
    savingsRate,
    txCount,
  };
}

export function computeCategoryBreakdown(
  transactions: Transaction[],
  monthKey: string,
  type: "expense" | "income" = "expense"
): CategorySpendItem[] {
  const bucket = new Map<string, { amountIdr: number; count: number }>();
  let total = 0;

  for (const tx of transactions) {
    if (!tx.date.startsWith(monthKey) || tx.type !== type) continue;
    const prev = bucket.get(tx.categoryId) ?? { amountIdr: 0, count: 0 };
    bucket.set(tx.categoryId, {
      amountIdr: prev.amountIdr + tx.amountIdr,
      count: prev.count + 1,
    });
    total += tx.amountIdr;
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

export function computeMultiMonthSeries(
  transactions: Transaction[],
  anchorMonthKey: string,
  monthsCount = 6
): Array<{
  month: string;
  incomeIdr: number;
  expenseIdr: number;
  netIdr: number;
  cumulativeBalanceIdr: number;
}> {
  const result = [];
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const mKey = shiftMonthKey(anchorMonthKey, -i);
    const summary = computeMonthlySummary(transactions, mKey);
    const [y, m] = mKey.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const endDateIso = `${mKey}-${String(lastDay).padStart(2, "0")}`;
    const cumulativeBalanceIdr = computeCumulativeNetBalance(transactions, endDateIso);

    result.push({
      month: mKey,
      incomeIdr: summary.incomeIdr,
      expenseIdr: summary.expenseIdr,
      netIdr: summary.netCashflowIdr,
      cumulativeBalanceIdr,
    });
  }
  return result;
}

export function computePercentDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
