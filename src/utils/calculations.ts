import type { Budget, Transaction, Wallet } from "../types/cashflow";
import { getDaysRemainingInMonth, shiftMonthKey } from "./format";

export interface MonthlySummary {
  month: string;
  incomeIdr: number;
  expenseIdr: number; // Includes transfer admin fees so netFlow reconciles 100% with net worth
  transferFeesIdr: number;
  transferVolumeIdr: number;
  netCashflowIdr: number;
  savingsRate: number; // 0-100 (can be negative if deficit)
  txCount: number;
}

export interface CategorySpendItem {
  categoryId: string;
  amountIdr: number;
  percentage: number;
  count: number;
}

export interface BudgetProgressItem {
  budget: Budget;
  spentIdr: number;
  remainingIdr: number;
  percentage: number;
  status: "safe" | "warning" | "exceeded";
}

export function computeWalletBalances(
  wallets: Wallet[],
  transactions: Transaction[],
  upToDateIso?: string
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const w of wallets) {
    balances[w.id] = w.initialBalanceIdr;
  }

  for (const tx of transactions) {
    if (upToDateIso && tx.date > upToDateIso) continue;
    if (tx.type === "income") {
      if (balances[tx.walletId] !== undefined) {
        balances[tx.walletId] += tx.amountIdr;
      }
    } else if (tx.type === "expense") {
      if (balances[tx.walletId] !== undefined) {
        balances[tx.walletId] -= tx.amountIdr;
      }
    } else if (tx.type === "transfer") {
      const fee = tx.feeIdr ?? 0;
      if (balances[tx.walletId] !== undefined) {
        balances[tx.walletId] -= tx.amountIdr + fee;
      }
      if (tx.toWalletId && balances[tx.toWalletId] !== undefined) {
        balances[tx.toWalletId] += tx.amountIdr;
      }
    }
  }

  return balances;
}

export function computeTotalNetBalance(
  wallets: Wallet[],
  balances: Record<string, number>
): number {
  return wallets
    .filter((w) => !w.isArchived)
    .reduce((acc, w) => acc + (balances[w.id] ?? w.initialBalanceIdr), 0);
}

export function computeMonthlySummary(
  transactions: Transaction[],
  monthKey: string
): MonthlySummary {
  let incomeIdr = 0;
  let expenseIdr = 0;
  let transferFeesIdr = 0;
  let transferVolumeIdr = 0;
  let txCount = 0;

  for (const tx of transactions) {
    if (!tx.date.startsWith(monthKey)) continue;
    txCount += 1;
    if (tx.type === "income") {
      incomeIdr += tx.amountIdr;
    } else if (tx.type === "expense") {
      expenseIdr += tx.amountIdr;
    } else if (tx.type === "transfer") {
      transferVolumeIdr += tx.amountIdr;
      const fee = tx.feeIdr ?? 0;
      transferFeesIdr += fee;
      expenseIdr += fee;
    }
  }

  const netCashflowIdr = incomeIdr - expenseIdr;
  const savingsRate = incomeIdr > 0 ? (netCashflowIdr / incomeIdr) * 100 : 0;

  return {
    month: monthKey,
    incomeIdr,
    expenseIdr,
    transferFeesIdr,
    transferVolumeIdr,
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

export function computeBudgetProgress(
  budgets: Budget[],
  transactions: Transaction[],
  monthKey: string
): BudgetProgressItem[] {
  const monthBudgets = budgets.filter((b) => b.month === monthKey);
  const spendByCat = new Map<string, number>();

  for (const tx of transactions) {
    if (!tx.date.startsWith(monthKey) || tx.type !== "expense") continue;
    spendByCat.set(tx.categoryId, (spendByCat.get(tx.categoryId) ?? 0) + tx.amountIdr);
  }

  return monthBudgets
    .map((budget) => {
      const spentIdr = spendByCat.get(budget.categoryId) ?? 0;
      const remainingIdr = budget.limitIdr - spentIdr;
      const percentage = budget.limitIdr > 0 ? (spentIdr / budget.limitIdr) * 100 : 0;
      const status: BudgetProgressItem["status"] =
        percentage >= 100 ? "exceeded" : percentage >= 75 ? "warning" : "safe";
      return { budget, spentIdr, remainingIdr, percentage, status };
    })
    .sort((a, b) => b.percentage - a.percentage);
}

export function computeSafeToSpendDaily(
  budgets: Budget[],
  transactions: Transaction[],
  monthKey: string
): {
  totalBudgetIdr: number;
  totalSpentBudgetedIdr: number;
  remainingIdr: number;
  daysLeft: number;
  dailySafeIdr: number;
} {
  const items = computeBudgetProgress(budgets, transactions, monthKey);
  const totalBudgetIdr = items.reduce((sum, i) => sum + i.budget.limitIdr, 0);
  const totalSpentBudgetedIdr = items.reduce((sum, i) => sum + i.spentIdr, 0);
  const remainingIdr = totalBudgetIdr - totalSpentBudgetedIdr;
  const daysLeft = getDaysRemainingInMonth(monthKey);
  const dailySafeIdr = daysLeft > 0 ? Math.max(0, Math.floor(remainingIdr / daysLeft)) : 0;
  return { totalBudgetIdr, totalSpentBudgetedIdr, remainingIdr, daysLeft, dailySafeIdr };
}

export function computeMultiMonthSeries(
  wallets: Wallet[],
  transactions: Transaction[],
  anchorMonthKey: string,
  monthsCount = 6
): Array<{
  month: string;
  incomeIdr: number;
  expenseIdr: number;
  netIdr: number;
  endingBalanceIdr: number;
}> {
  const result = [];
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const mKey = shiftMonthKey(anchorMonthKey, -i);
    const summary = computeMonthlySummary(transactions, mKey);
    const [y, m] = mKey.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const endDateIso = `${mKey}-${String(lastDay).padStart(2, "0")}`;
    const balances = computeWalletBalances(wallets, transactions, endDateIso);
    const endingBalanceIdr = computeTotalNetBalance(wallets, balances);

    result.push({
      month: mKey,
      incomeIdr: summary.incomeIdr,
      expenseIdr: summary.expenseIdr,
      netIdr: summary.netCashflowIdr,
      endingBalanceIdr,
    });
  }
  return result;
}

export function computePercentDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function getAvailableMonths(transactions: Transaction[], budgets: Budget[], anchorMonth: string): string[] {
  const set = new Set<string>([anchorMonth]);
  for (let i = 1; i <= 5; i += 1) {
    set.add(shiftMonthKey(anchorMonth, -i));
  }
  for (const tx of transactions) {
    if (tx.date.length >= 7) set.add(tx.date.slice(0, 7));
  }
  for (const b of budgets) {
    if (b.month.length >= 7) set.add(b.month);
  }
  return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
}
