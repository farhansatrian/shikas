import type {
  ReimbursementEntry,
  ReimbursementInfo,
  Transaction,
} from "../types/cashflow";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeReimbursement(
  raw: unknown,
  maxAmountIdr: number
): ReimbursementInfo | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Partial<ReimbursementInfo>;
  const cap = Math.max(0, Math.round(Number(maxAmountIdr) || 0));
  if (cap <= 0) return undefined;

  const rawEntries = Array.isArray(obj.entries) ? obj.entries : [];
  const entries: ReimbursementEntry[] = [];
  let running = 0;

  for (const item of rawEntries.slice(0, 50)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Partial<ReimbursementEntry>;
    const amt = Math.max(0, Math.round(Number(rec.amountIdr) || 0));
    if (amt <= 0) continue;
    const remainingCap = cap - running;
    if (remainingCap <= 0) break;
    const clampedAmt = Math.min(amt, remainingCap);
    running += clampedAmt;

    const dateStr =
      typeof rec.date === "string" && ISO_DATE_RE.test(rec.date)
        ? rec.date
        : new Date().toISOString().slice(0, 10);

    const entry: ReimbursementEntry = {
      id:
        typeof rec.id === "string" && rec.id.trim().length > 0
          ? rec.id.trim().slice(0, 80)
          : `rmb-${Math.random().toString(36).slice(2, 8)}`,
      date: dateStr,
      amountIdr: clampedAmt,
      createdAt:
        typeof rec.createdAt === "string" && rec.createdAt.trim().length > 0
          ? rec.createdAt.trim().slice(0, 64)
          : new Date().toISOString(),
    };

    if (typeof rec.accountId === "string" && rec.accountId.trim().length > 0) {
      entry.accountId = rec.accountId.trim().slice(0, 80);
    }
    if (typeof rec.note === "string" && rec.note.trim().length > 0) {
      entry.note = rec.note.trim().slice(0, 120);
    }

    entries.push(entry);
  }

  const rawExpected = Number(obj.expectedIdr);
  const expectedIdr =
    Number.isFinite(rawExpected) && rawExpected > 0
      ? Math.min(cap, Math.round(rawExpected))
      : undefined;

  const from =
    typeof obj.from === "string" && obj.from.trim().length > 0
      ? obj.from.trim().slice(0, 80)
      : undefined;

  // Automatically settled if 100% of original transaction has been reimbursed
  const status: "pending" | "settled" =
    running >= cap || obj.status === "settled" ? "settled" : "pending";

  const settledAt =
    status === "settled" &&
    typeof obj.settledAt === "string" &&
    obj.settledAt.trim().length > 0
      ? obj.settledAt.trim().slice(0, 64)
      : undefined;

  return {
    status,
    ...(expectedIdr !== undefined ? { expectedIdr } : {}),
    ...(from !== undefined ? { from } : {}),
    ...(settledAt !== undefined ? { settledAt } : {}),
    entries,
  };
}

export function getReimbursedTotalIdr(tx: Transaction): number {
  if (tx.type !== "expense" || !tx.reimburse) return 0;
  const gross = Math.max(0, Math.round(tx.amountIdr || 0));
  let sum = 0;
  for (const entry of tx.reimburse.entries) {
    sum += Math.max(0, Math.round(entry.amountIdr || 0));
  }
  return Math.min(gross, sum);
}

export function getNetExpenseIdr(tx: Transaction): number {
  if (tx.type !== "expense") return 0;
  const gross = Math.max(0, Math.round(tx.amountIdr || 0));
  return Math.max(0, gross - getReimbursedTotalIdr(tx));
}

export interface ReimburseProgress {
  isReimburse: boolean;
  status: "none" | "pending" | "partial" | "settled";
  isPending: boolean;
  isPartial: boolean;
  isSettled: boolean;
  grossIdr: number;
  reimbursedIdr: number;
  netExpenseIdr: number;
  expectedIdr?: number;
  remainingExpectedIdr: number;
  maxReceivableIdr: number;
  isFlexible: boolean;
  progressPercent: number;
}

export function getReimburseProgress(tx: Transaction): ReimburseProgress {
  const grossIdr = Math.max(0, Math.round(tx.amountIdr || 0));
  if (tx.type !== "expense" || !tx.reimburse) {
    return {
      isReimburse: false,
      status: "none",
      isPending: false,
      isPartial: false,
      isSettled: false,
      grossIdr,
      reimbursedIdr: 0,
      netExpenseIdr: grossIdr,
      remainingExpectedIdr: 0,
      maxReceivableIdr: 0,
      isFlexible: false,
      progressPercent: 0,
    };
  }

  const reimbursedIdr = getReimbursedTotalIdr(tx);
  const netExpenseIdr = Math.max(0, grossIdr - reimbursedIdr);
  const maxReceivableIdr = netExpenseIdr;
  const expectedIdr =
    tx.reimburse.expectedIdr && tx.reimburse.expectedIdr > 0
      ? Math.min(grossIdr, Math.round(tx.reimburse.expectedIdr))
      : undefined;
  const isFlexible = expectedIdr === undefined;
  const isSettled = tx.reimburse.status === "settled" || maxReceivableIdr === 0;
  const isPartial = !isSettled && reimbursedIdr > 0;
  const isPending = !isSettled;
  const remainingExpectedIdr =
    !isSettled && expectedIdr !== undefined
      ? Math.max(0, expectedIdr - reimbursedIdr)
      : 0;

  const progressPercent = isSettled
    ? 100
    : expectedIdr && expectedIdr > 0
      ? Math.min(100, (reimbursedIdr / expectedIdr) * 100)
      : grossIdr > 0
        ? Math.min(100, (reimbursedIdr / grossIdr) * 100)
        : 0;

  return {
    isReimburse: true,
    status: isSettled ? "settled" : isPartial ? "partial" : "pending",
    isPending,
    isPartial,
    isSettled,
    grossIdr,
    reimbursedIdr,
    netExpenseIdr,
    expectedIdr,
    remainingExpectedIdr,
    maxReceivableIdr,
    isFlexible,
    progressPercent,
  };
}

export interface PendingReimburseOverview {
  pendingItems: Transaction[];
  pendingCount: number;
  knownRemainingIdr: number;
  flexibleCount: number;
  flexibleMaxIdr: number;
  hasAnyReimburse: boolean;
}

export function computePendingReimburseOverview(
  transactions: Transaction[]
): PendingReimburseOverview {
  const pendingItems: Transaction[] = [];
  let knownRemainingIdr = 0;
  let flexibleCount = 0;
  let flexibleMaxIdr = 0;
  let hasAnyReimburse = false;

  for (const tx of transactions) {
    if (tx.type !== "expense" || !tx.reimburse) continue;
    hasAnyReimburse = true;
    const prog = getReimburseProgress(tx);
    if (!prog.isPending) continue;

    pendingItems.push(tx);
    if (prog.isFlexible) {
      flexibleCount += 1;
      flexibleMaxIdr += prog.maxReceivableIdr;
    } else {
      knownRemainingIdr += prog.remainingExpectedIdr;
    }
  }

  pendingItems.sort((a, b) =>
    a.date < b.date
      ? 1
      : a.date > b.date
        ? -1
        : b.createdAt.localeCompare(a.createdAt)
  );

  return {
    pendingItems,
    pendingCount: pendingItems.length,
    knownRemainingIdr,
    flexibleCount,
    flexibleMaxIdr,
    hasAnyReimburse,
  };
}
