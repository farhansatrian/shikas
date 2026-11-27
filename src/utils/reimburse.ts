import type {
  ReimbursementEntry,
  ReimbursementInfo,
  ReimbursementPayer,
  Transaction,
} from "../types/cashflow";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Maximum reimbursable IDR for an expense transaction:
 * - `amountIdr` by default (admin fee absorbed by user in Bank & Admin)
 * - `amountIdr + feeIdr` when `reimburse.includeFee === true`
 */
export function getReimburseCapIdr(
  tx: Pick<Transaction, "type" | "amountIdr" | "feeIdr" | "reimburse">
): number {
  if (tx.type !== "expense") return 0;
  const principal = Math.max(0, Math.round(tx.amountIdr || 0));
  const fee = Math.max(0, Math.round(tx.feeIdr || 0));
  return tx.reimburse?.includeFee ? principal + fee : principal;
}

export function sanitizeReimbursement(
  raw: unknown,
  principalAmountIdr: number,
  feeIdr = 0
): ReimbursementInfo | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Partial<ReimbursementInfo>;
  const principal = Math.max(0, Math.round(Number(principalAmountIdr) || 0));
  const cleanFee = Math.max(0, Math.round(Number(feeIdr) || 0));
  if (principal <= 0) return undefined;

  const includeFee = Boolean(obj.includeFee) && cleanFee > 0;
  const cap = includeFee ? principal + cleanFee : principal;

  // 1. Sanitize optional multi-person payers list
  const rawPayers = Array.isArray(obj.payers) ? obj.payers : [];
  const payers: ReimbursementPayer[] = [];
  const payerIdSet = new Set<string>();
  let fixedPayersSum = 0;

  for (const item of rawPayers.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Partial<ReimbursementPayer>;
    const name = String(rec.name ?? "").trim().slice(0, 48);
    if (!name) continue;
    const id =
      typeof rec.id === "string" && rec.id.trim().length > 0
        ? rec.id.trim().slice(0, 80)
        : `pyr-${Math.random().toString(36).slice(2, 8)}`;
    if (payerIdSet.has(id)) continue;
    payerIdSet.add(id);

    const rawExp = Number(rec.expectedIdr);
    let expectedIdr: number | undefined;
    if (Number.isFinite(rawExp) && rawExp > 0) {
      const remainingForTargets = Math.max(0, cap - fixedPayersSum);
      const clampedExp = Math.min(remainingForTargets, Math.round(rawExp));
      if (clampedExp > 0) {
        expectedIdr = clampedExp;
        fixedPayersSum += clampedExp;
      }
    }

    const status: "pending" | "settled" =
      rec.status === "settled" ? "settled" : "pending";
    const settledAt =
      status === "settled" &&
      typeof rec.settledAt === "string" &&
      rec.settledAt.trim().length > 0
        ? rec.settledAt.trim().slice(0, 64)
        : undefined;

    payers.push({
      id,
      name,
      ...(expectedIdr !== undefined ? { expectedIdr } : {}),
      status,
      ...(settledAt !== undefined ? { settledAt } : {}),
    });
  }

  // 2. Sanitize repayment entries (clamped to cap)
  const rawEntries = Array.isArray(obj.entries) ? obj.entries : [];
  const entries: ReimbursementEntry[] = [];
  let running = 0;
  const receivedByPayer = new Map<string, number>();

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
    if (
      typeof rec.payerId === "string" &&
      rec.payerId.trim().length > 0 &&
      payerIdSet.has(rec.payerId.trim())
    ) {
      const pid = rec.payerId.trim();
      entry.payerId = pid;
      receivedByPayer.set(pid, (receivedByPayer.get(pid) ?? 0) + clampedAmt);
    }
    if (typeof rec.note === "string" && rec.note.trim().length > 0) {
      entry.note = rec.note.trim().slice(0, 120);
    }

    entries.push(entry);
  }

  // 3. Reconcile per-payer settled status & overall status
  const normalizedPayers: ReimbursementPayer[] = payers.map((p) => {
    const paid = receivedByPayer.get(p.id) ?? 0;
    const autoSettled =
      running >= cap ||
      (p.expectedIdr !== undefined && paid >= p.expectedIdr) ||
      obj.status === "settled";
    const nextStatus: "pending" | "settled" =
      autoSettled || p.status === "settled" ? "settled" : "pending";
    return {
      ...p,
      status: nextStatus,
      ...(nextStatus === "settled" && p.settledAt
        ? { settledAt: p.settledAt }
        : {}),
    };
  });

  const hasMultiPayers = normalizedPayers.length > 0;
  const allPayersSettled =
    hasMultiPayers && normalizedPayers.every((p) => p.status === "settled");

  const status: "pending" | "settled" =
    running >= cap || allPayersSettled || obj.status === "settled"
      ? "settled"
      : "pending";

  const settledAt =
    status === "settled" &&
    typeof obj.settledAt === "string" &&
    obj.settledAt.trim().length > 0
      ? obj.settledAt.trim().slice(0, 64)
      : undefined;

  // Derive top-level expectedIdr & from for search, CSV, and backwards compatibility
  let expectedIdr: number | undefined;
  if (hasMultiPayers) {
    const allHaveTarget = normalizedPayers.every(
      (p) => p.expectedIdr !== undefined && p.expectedIdr > 0
    );
    if (allHaveTarget) {
      const sumTargets = normalizedPayers.reduce(
        (acc, p) => acc + (p.expectedIdr ?? 0),
        0
      );
      expectedIdr = sumTargets > 0 ? Math.min(cap, sumTargets) : undefined;
    }
  } else {
    const rawExpected = Number(obj.expectedIdr);
    expectedIdr =
      Number.isFinite(rawExpected) && rawExpected > 0
        ? Math.min(cap, Math.round(rawExpected))
        : undefined;
  }

  const from = hasMultiPayers
    ? normalizedPayers
        .map((p) => p.name)
        .join(", ")
        .slice(0, 80)
    : typeof obj.from === "string" && obj.from.trim().length > 0
      ? obj.from.trim().slice(0, 80)
      : undefined;

  return {
    status,
    ...(includeFee ? { includeFee: true } : {}),
    ...(expectedIdr !== undefined ? { expectedIdr } : {}),
    ...(from !== undefined ? { from } : {}),
    ...(hasMultiPayers ? { payers: normalizedPayers } : {}),
    ...(settledAt !== undefined ? { settledAt } : {}),
    entries,
  };
}

export function getReimbursedTotalIdr(tx: Transaction): number {
  if (tx.type !== "expense" || !tx.reimburse) return 0;
  const cap = getReimburseCapIdr(tx);
  let sum = 0;
  for (const entry of tx.reimburse.entries) {
    sum += Math.max(0, Math.round(entry.amountIdr || 0));
  }
  return Math.min(cap, sum);
}

export interface ExpenseAccountingParts {
  principalIdr: number;
  feeIdr: number;
  grossTotalIdr: number;
  reimburseCapIdr: number;
  reimbursedIdr: number;
  netPrincipalIdr: number;
  netFeeIdr: number;
  totalNetExpenseIdr: number;
}

/**
 * Exact accounting split for any expense transaction (with optional admin fee & reimbursement):
 * - Principal goes under tx.categoryId
 * - Fee goes under Bank & Admin ("fees")
 * - Repayment offsets principal first; if `includeFee === true`, overflow offsets fee cleanly
 * - Invariant: `netPrincipalIdr + netFeeIdr === (principalIdr + feeIdr) - reimbursedIdr`
 */
export function getExpenseAccountingParts(tx: Transaction): ExpenseAccountingParts {
  if (tx.type !== "expense") {
    return {
      principalIdr: 0,
      feeIdr: 0,
      grossTotalIdr: 0,
      reimburseCapIdr: 0,
      reimbursedIdr: 0,
      netPrincipalIdr: 0,
      netFeeIdr: 0,
      totalNetExpenseIdr: 0,
    };
  }

  const principalIdr = Math.max(0, Math.round(tx.amountIdr || 0));
  const feeIdr = Math.max(0, Math.round(tx.feeIdr || 0));
  const grossTotalIdr = principalIdr + feeIdr;
  const includeFee = Boolean(tx.reimburse?.includeFee) && feeIdr > 0;
  const reimburseCapIdr = includeFee ? grossTotalIdr : principalIdr;
  const reimbursedIdr = tx.reimburse ? getReimbursedTotalIdr(tx) : 0;

  const principalReimbursed = Math.min(principalIdr, reimbursedIdr);
  const feeReimbursed = includeFee
    ? Math.min(feeIdr, Math.max(0, reimbursedIdr - principalIdr))
    : 0;

  const netPrincipalIdr = Math.max(0, principalIdr - principalReimbursed);
  const netFeeIdr = Math.max(0, feeIdr - feeReimbursed);

  return {
    principalIdr,
    feeIdr,
    grossTotalIdr,
    reimburseCapIdr,
    reimbursedIdr,
    netPrincipalIdr,
    netFeeIdr,
    totalNetExpenseIdr: netPrincipalIdr + netFeeIdr,
  };
}

/**
 * Total net expense for an expense transaction (net principal + net admin fee).
 */
export function getNetExpenseIdr(tx: Transaction): number {
  return getExpenseAccountingParts(tx).totalNetExpenseIdr;
}

export interface PayerProgress {
  id: string;
  name: string;
  expectedIdr?: number;
  reimbursedIdr: number;
  remainingExpectedIdr: number;
  isFlexible: boolean;
  isSettled: boolean;
  isPartial: boolean;
  isPending: boolean;
  status: "pending" | "partial" | "settled";
}

export interface ReimburseProgress {
  isReimburse: boolean;
  isSplit: boolean;
  includeFee: boolean;
  status: "none" | "pending" | "partial" | "settled";
  isPending: boolean;
  isPartial: boolean;
  isSettled: boolean;
  principalIdr: number;
  feeIdr: number;
  grossIdr: number; // Total cash originally paid (principal + fee)
  reimburseCapIdr: number; // Max reimbursable (principal, or principal + fee if includeFee)
  reimbursedIdr: number;
  netExpenseIdr: number; // Total net expense remaining (net principal + net fee)
  expectedIdr?: number;
  remainingExpectedIdr: number;
  maxReceivableIdr: number;
  isFlexible: boolean;
  hasFlexiblePendingPayer: boolean;
  progressPercent: number;
  payers: PayerProgress[];
  pendingPayersCount: number;
  settledPayersCount: number;
}

export function getReimburseProgress(tx: Transaction): ReimburseProgress {
  const parts = getExpenseAccountingParts(tx);
  if (tx.type !== "expense" || !tx.reimburse) {
    return {
      isReimburse: false,
      isSplit: false,
      includeFee: false,
      status: "none",
      isPending: false,
      isPartial: false,
      isSettled: false,
      principalIdr: parts.principalIdr,
      feeIdr: parts.feeIdr,
      grossIdr: parts.grossTotalIdr,
      reimburseCapIdr: 0,
      reimbursedIdr: 0,
      netExpenseIdr: parts.totalNetExpenseIdr,
      remainingExpectedIdr: 0,
      maxReceivableIdr: 0,
      isFlexible: false,
      hasFlexiblePendingPayer: false,
      progressPercent: 0,
      payers: [],
      pendingPayersCount: 0,
      settledPayersCount: 0,
    };
  }

  const includeFee = Boolean(tx.reimburse.includeFee) && parts.feeIdr > 0;
  const maxReceivableIdr = Math.max(0, parts.reimburseCapIdr - parts.reimbursedIdr);

  const rawPayers = tx.reimburse.payers ?? [];
  const isSplit = rawPayers.length > 0;

  const receivedByPayer = new Map<string, number>();
  for (const entry of tx.reimburse.entries) {
    if (entry.payerId) {
      receivedByPayer.set(
        entry.payerId,
        (receivedByPayer.get(entry.payerId) ?? 0) +
          Math.max(0, Math.round(entry.amountIdr || 0))
      );
    }
  }

  const payers: PayerProgress[] = rawPayers.map((p) => {
    const pReimbursed = receivedByPayer.get(p.id) ?? 0;
    const pExpected =
      p.expectedIdr && p.expectedIdr > 0
        ? Math.min(parts.reimburseCapIdr, Math.round(p.expectedIdr))
        : undefined;
    const pFlexible = pExpected === undefined;
    const pSettled =
      tx.reimburse?.status === "settled" ||
      maxReceivableIdr === 0 ||
      p.status === "settled" ||
      (pExpected !== undefined && pReimbursed >= pExpected);
    const pPartial = !pSettled && pReimbursed > 0;
    const pPending = !pSettled;
    const pRemaining =
      !pSettled && pExpected !== undefined
        ? Math.max(0, pExpected - pReimbursed)
        : 0;

    return {
      id: p.id,
      name: p.name,
      expectedIdr: pExpected,
      reimbursedIdr: pReimbursed,
      remainingExpectedIdr: pRemaining,
      isFlexible: pFlexible,
      isSettled: pSettled,
      isPartial: pPartial,
      isPending: pPending,
      status: pSettled ? "settled" : pPartial ? "partial" : "pending",
    };
  });

  const pendingPayersCount = payers.filter((p) => p.isPending).length;
  const settledPayersCount = payers.filter((p) => p.isSettled).length;
  const allPayersSettled = isSplit && pendingPayersCount === 0;

  const isSettled =
    tx.reimburse.status === "settled" ||
    maxReceivableIdr === 0 ||
    allPayersSettled;
  const isPartial =
    !isSettled && (parts.reimbursedIdr > 0 || settledPayersCount > 0);
  const isPending = !isSettled;

  let expectedIdr: number | undefined;
  let remainingExpectedIdr = 0;
  let hasFlexiblePendingPayer = false;

  if (isSplit) {
    const knownSum = payers.reduce((sum, p) => sum + (p.expectedIdr ?? 0), 0);
    const anyFlex = payers.some((p) => p.isFlexible);
    expectedIdr = !anyFlex && knownSum > 0 ? Math.min(parts.reimburseCapIdr, knownSum) : undefined;
    if (!isSettled) {
      for (const p of payers) {
        if (!p.isPending) continue;
        if (p.isFlexible) {
          hasFlexiblePendingPayer = true;
        } else {
          remainingExpectedIdr += p.remainingExpectedIdr;
        }
      }
      remainingExpectedIdr = Math.min(maxReceivableIdr, remainingExpectedIdr);
    }
  } else {
    expectedIdr =
      tx.reimburse.expectedIdr && tx.reimburse.expectedIdr > 0
        ? Math.min(parts.reimburseCapIdr, Math.round(tx.reimburse.expectedIdr))
        : undefined;
    remainingExpectedIdr =
      !isSettled && expectedIdr !== undefined
        ? Math.max(0, expectedIdr - parts.reimbursedIdr)
        : 0;
    hasFlexiblePendingPayer = !isSettled && expectedIdr === undefined;
  }

  const isFlexible = isSplit
    ? payers.some((p) => p.isFlexible)
    : expectedIdr === undefined;

  const progressPercent = isSettled
    ? 100
    : expectedIdr && expectedIdr > 0
      ? Math.min(100, (parts.reimbursedIdr / expectedIdr) * 100)
      : isSplit && payers.length > 0 && parts.reimbursedIdr === 0
        ? (settledPayersCount / payers.length) * 100
        : parts.reimburseCapIdr > 0
          ? Math.min(100, (parts.reimbursedIdr / parts.reimburseCapIdr) * 100)
          : 0;

  return {
    isReimburse: true,
    isSplit,
    includeFee,
    status: isSettled ? "settled" : isPartial ? "partial" : "pending",
    isPending,
    isPartial,
    isSettled,
    principalIdr: parts.principalIdr,
    feeIdr: parts.feeIdr,
    grossIdr: parts.grossTotalIdr,
    reimburseCapIdr: parts.reimburseCapIdr,
    reimbursedIdr: parts.reimbursedIdr,
    netExpenseIdr: parts.totalNetExpenseIdr,
    expectedIdr,
    remainingExpectedIdr,
    maxReceivableIdr,
    isFlexible,
    hasFlexiblePendingPayer,
    progressPercent,
    payers,
    pendingPayersCount,
    settledPayersCount,
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
    knownRemainingIdr += prog.remainingExpectedIdr;
    if (prog.hasFlexiblePendingPayer) {
      flexibleCount += 1;
      flexibleMaxIdr += Math.max(0, prog.maxReceivableIdr - prog.remainingExpectedIdr);
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
