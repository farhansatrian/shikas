import type {
  CashflowStoreData,
  Locale,
  PocketAccount,
  Transaction,
} from "../types/cashflow";
import { getCategoryLabel, normalizeCategoryId } from "../data/categories";
import { computeAccountBalances } from "../utils/calculations";
import {
  clampCycleStartDay,
  formatCycleLabel,
  formatIdr,
  getCycleKeyForDate,
} from "../utils/format";
import {
  computePendingReimburseOverview,
  getNetExpenseIdr,
  getReimbursedTotalIdr,
  getReimburseProgress,
  sanitizeReimbursement,
} from "../utils/reimburse";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function escapeCsvCell(value: string | number | undefined): string {
  let str = String(value ?? "");
  // Prevent spreadsheet formula injection if note/merchant starts with =, +, -, @
  if (/^[=+\-@]/.test(str) && typeof value === "string") {
    str = `'${str}`;
  }
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerFileDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildTransactionsCsvContent(
  transactions: Transaction[],
  locale: Locale,
  accounts: PocketAccount[] = [],
  cycleStartDay = 1
): string {
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));
  const safeCycleDay = clampCycleStartDay(cycleStartDay);

  const headers = [
    "Date",
    "Cycle",
    "Type",
    "Category",
    "Pocket",
    "To Pocket",
    "Merchant",
    "Note",
    "Gross Amount (IDR)",
    "Admin Fee (IDR)",
    "Reimburse Status",
    "Reimburse From",
    "Reimburse Target (IDR)",
    "Reimbursed (IDR)",
    "Net Income (IDR)",
    "Net Expense (IDR)",
    "Reimburse To Pocket",
    "Reimburse Payments Detail",
  ];

  const sorted = [...transactions].sort((a, b) =>
    a.date < b.date
      ? 1
      : a.date > b.date
        ? -1
        : b.createdAt.localeCompare(a.createdAt)
  );

  const rows = sorted.map((tx) => {
    const cycleKey = getCycleKeyForDate(tx.date, safeCycleDay);
    const cycleLabel = formatCycleLabel(cycleKey, locale, safeCycleDay);
    const prog = getReimburseProgress(tx);
    const reimbursed = getReimbursedTotalIdr(tx);
    const fee = tx.type === "transfer" ? Math.max(0, Math.round(tx.feeIdr || 0)) : 0;

    const netIncome = tx.type === "income" ? tx.amountIdr : 0;
    const netExpense =
      tx.type === "expense"
        ? getNetExpenseIdr(tx)
        : tx.type === "transfer"
          ? fee
          : 0;

    const reimburseStatus = prog.isReimburse ? prog.status.toUpperCase() : "";
    const reimburseTarget = prog.isReimburse
      ? prog.isFlexible
        ? "FLEXIBLE"
        : prog.expectedIdr ?? ""
      : "";

    const entries = tx.type === "expense" ? tx.reimburse?.entries ?? [] : [];
    const reimbursePockets = Array.from(
      new Set(
        entries
          .map((e) => (e.accountId ? accMap.get(e.accountId) ?? e.accountId : ""))
          .filter(Boolean)
      )
    ).join(" / ");

    const reimburseDetail = entries
      .map((e) => {
        const dest = e.accountId ? accMap.get(e.accountId) ?? e.accountId : "Unassigned";
        const noteSuffix = e.note ? ` (${e.note})` : "";
        return `${e.date}: +${formatIdr(e.amountIdr)} -> ${dest}${noteSuffix}`;
      })
      .join(" ; ");

    return [
      tx.date,
      cycleLabel,
      tx.type.toUpperCase(),
      getCategoryLabel(tx.categoryId, locale),
      tx.accountId ? accMap.get(tx.accountId) ?? tx.accountId : "",
      tx.toAccountId ? accMap.get(tx.toAccountId) ?? tx.toAccountId : "",
      tx.merchant ?? "",
      tx.note,
      tx.amountIdr,
      fee,
      reimburseStatus,
      tx.reimburse?.from ?? "",
      reimburseTarget,
      reimbursed,
      netIncome,
      netExpense,
      reimbursePockets,
      reimburseDetail,
    ];
  });

  const csvLines = [headers, ...rows].map((row) =>
    row.map(escapeCsvCell).join(",")
  );
  return `\uFEFF${csvLines.join("\n")}`;
}

export function exportTransactionsToCsv(
  transactions: Transaction[],
  locale: Locale,
  accounts: PocketAccount[] = [],
  cycleStartDay = 1
): void {
  const csv = buildTransactionsCsvContent(
    transactions,
    locale,
    accounts,
    cycleStartDay
  );
  const stamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(
    csv,
    `shikas-cashflow-${stamp}.csv`,
    "text/csv;charset=utf-8;"
  );
}

export interface ShikasBackupEnvelope extends CashflowStoreData {
  exportedAt: string;
  app: "shikas";
  summary: {
    totalBalanceIdr: number;
    dailyTotalIdr: number;
    savingsTotalIdr: number;
    transactionCount: number;
    pendingReimburseCount: number;
    pockets: Array<{
      id: string;
      name: string;
      role: PocketAccount["role"];
      openingBalanceIdr: number;
      liveBalanceIdr: number;
    }>;
  };
}

export function buildBackupJsonPayload(
  data: CashflowStoreData
): ShikasBackupEnvelope {
  const balances = computeAccountBalances(data.accounts, data.transactions);
  const pending = computePendingReimburseOverview(data.transactions);

  return {
    app: "shikas",
    exportedAt: new Date().toISOString(),
    version: 5,
    accounts: data.accounts,
    transactions: data.transactions,
    settings: data.settings,
    summary: {
      totalBalanceIdr: balances.totalBalanceIdr,
      dailyTotalIdr: balances.dailyTotalIdr,
      savingsTotalIdr: balances.savingsTotalIdr,
      transactionCount: data.transactions.length,
      pendingReimburseCount: pending.pendingCount,
      pockets: balances.items.map((item) => ({
        id: item.account.id,
        name: item.account.name,
        role: item.account.role,
        openingBalanceIdr: item.account.openingBalanceIdr,
        liveBalanceIdr: item.balanceIdr,
      })),
    },
  };
}

export function exportBackupJson(data: CashflowStoreData): void {
  const stamp = new Date().toISOString().slice(0, 10);
  const payload = buildBackupJsonPayload(data);
  triggerFileDownload(
    JSON.stringify(payload, null, 2),
    `shikas-backup-${stamp}.json`,
    "application/json;charset=utf-8;"
  );
}

export function sanitizeAccounts(raw: unknown): PocketAccount[] {
  if (!Array.isArray(raw)) return [];
  const cleaned: PocketAccount[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Partial<PocketAccount>;
    const name = String(rec.name ?? "").trim();
    if (!name) continue;
    cleaned.push({
      id: String(rec.id ?? `acc-${Math.random().toString(36).slice(2, 8)}`),
      name: name.slice(0, 60),
      role: rec.role === "savings" ? "savings" : "daily",
      openingBalanceIdr: Math.max(
        0,
        Math.round(Number(rec.openingBalanceIdr) || 0)
      ),
      color:
        typeof rec.color === "string" && rec.color.trim().length >= 3
          ? rec.color.trim()
          : rec.role === "savings"
            ? "#745bc7"
            : "#2276a8",
      isDefault: Boolean(rec.isDefault),
    });
  }
  if (cleaned.length > 0 && !cleaned.some((a) => a.isDefault)) {
    cleaned[0] = { ...cleaned[0], isDefault: true };
  }
  return cleaned;
}

export function parseBackupJson(rawText: string): CashflowStoreData {
  const parsed = JSON.parse(rawText) as Partial<CashflowStoreData>;
  if (!parsed || !Array.isArray(parsed.transactions)) {
    throw new Error("Invalid ShiKas backup structure.");
  }

  const todayFallback = new Date().toISOString().slice(0, 10);
  const cleanAccounts = sanitizeAccounts(parsed.accounts);
  const cleanTx: Transaction[] = parsed.transactions
    .filter(
      (tx) =>
        tx &&
        (tx.type === "income" ||
          tx.type === "expense" ||
          tx.type === "transfer")
    )
    .map((tx) => {
      const cleanAmount = Math.max(0, Math.round(Number(tx.amountIdr) || 0));
      const cleanDate =
        typeof tx.date === "string" && ISO_DATE_RE.test(tx.date)
          ? tx.date
          : todayFallback;
      return {
        id: String(tx.id ?? `tx-${Math.random().toString(36).slice(2, 8)}`),
        type: tx.type,
        date: cleanDate,
        amountIdr: cleanAmount,
        categoryId: normalizeCategoryId(
          String(
            tx.categoryId ??
              (tx.type === "income"
                ? "other_income"
                : tx.type === "transfer"
                  ? "transfer"
                  : "other_expense")
          ),
          tx.type
        ),
        note: String(tx.note ?? ""),
        merchant: tx.merchant ? String(tx.merchant) : undefined,
        accountId: tx.accountId ? String(tx.accountId) : undefined,
        toAccountId: tx.toAccountId ? String(tx.toAccountId) : undefined,
        feeIdr:
          tx.type === "transfer" && Number(tx.feeIdr) > 0
            ? Math.round(Number(tx.feeIdr))
            : undefined,
        reimburse:
          tx.type === "expense"
            ? sanitizeReimbursement(tx.reimburse, cleanAmount)
            : undefined,
        createdAt: String(tx.createdAt ?? new Date().toISOString()),
      };
    });

  return {
    version: 5,
    accounts: cleanAccounts,
    transactions: cleanTx,
    settings: {
      locale: parsed.settings?.locale === "id" ? "id" : "en",
      privacyMode: Boolean(parsed.settings?.privacyMode),
      rainEnabled: parsed.settings?.rainEnabled ?? true,
      cycleStartDay: clampCycleStartDay(parsed.settings?.cycleStartDay),
      shizukuWebsiteUrl:
        typeof parsed.settings?.shizukuWebsiteUrl === "string"
          ? parsed.settings.shizukuWebsiteUrl
          : "",
    },
  };
}
