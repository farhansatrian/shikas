import type { Transaction } from "../types/cashflow";
import { shiftMonthKey } from "./format";

export type AnalyticsRange = "3m" | "6m" | "12m" | "all";

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

export interface MonthlySeriesPoint {
  month: string;
  incomeIdr: number;
  expenseIdr: number;
  netIdr: number;
  cumulativeBalanceIdr: number;
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
  return computeCategoryBreakdownForMonths(transactions, [monthKey], type);
}

export function computeCategoryBreakdownForMonths(
  transactions: Transaction[],
  monthKeys: string[] | null,
  type: "expense" | "income" = "expense"
): CategorySpendItem[] {
  const allowed = monthKeys ? new Set(monthKeys) : null;
  const bucket = new Map<string, { amountIdr: number; count: number }>();
  let total = 0;

  for (const tx of transactions) {
    if (tx.type !== type) continue;
    const txMonth = tx.date.slice(0, 7);
    if (allowed && !allowed.has(txMonth)) continue;
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

function buildSeriesPoint(
  transactions: Transaction[],
  mKey: string
): MonthlySeriesPoint {
  const summary = computeMonthlySummary(transactions, mKey);
  const [y, m] = mKey.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const endDateIso = `${mKey}-${String(lastDay).padStart(2, "0")}`;
  const cumulativeBalanceIdr = computeCumulativeNetBalance(transactions, endDateIso);

  return {
    month: mKey,
    incomeIdr: summary.incomeIdr,
    expenseIdr: summary.expenseIdr,
    netIdr: summary.netCashflowIdr,
    cumulativeBalanceIdr,
  };
}

export function computeMultiMonthSeries(
  transactions: Transaction[],
  anchorMonthKey: string,
  monthsCount = 6
): MonthlySeriesPoint[] {
  const result: MonthlySeriesPoint[] = [];
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const mKey = shiftMonthKey(anchorMonthKey, -i);
    result.push(buildSeriesPoint(transactions, mKey));
  }
  return result;
}

export function computeTimeRangeSeries(
  transactions: Transaction[],
  anchorMonthKey: string,
  range: AnalyticsRange
): MonthlySeriesPoint[] {
  if (range === "3m") return computeMultiMonthSeries(transactions, anchorMonthKey, 3);
  if (range === "6m") return computeMultiMonthSeries(transactions, anchorMonthKey, 6);
  if (range === "12m") return computeMultiMonthSeries(transactions, anchorMonthKey, 12);

  // All Time: build contiguous month span from earliest to latest transaction month
  if (transactions.length === 0) {
    return [buildSeriesPoint(transactions, anchorMonthKey)];
  }

  let minMonth = transactions[0].date.slice(0, 7);
  let maxMonth = minMonth;
  for (const tx of transactions) {
    const mk = tx.date.slice(0, 7);
    if (mk < minMonth) minMonth = mk;
    if (mk > maxMonth) maxMonth = mk;
  }

  const result: MonthlySeriesPoint[] = [];
  let cursor = minMonth;
  let guard = 0;
  while (cursor <= maxMonth && guard < 120) {
    result.push(buildSeriesPoint(transactions, cursor));
    cursor = shiftMonthKey(cursor, 1);
    guard += 1;
  }
  return result;
}

export function computePercentDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
