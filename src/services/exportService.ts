import type {
  CashflowStoreData,
  Locale,
  PocketAccount,
  Transaction,
} from "../types/cashflow";
import { getCategoryLabel, normalizeCategoryId } from "../data/categories";
import { clampCycleStartDay } from "../utils/format";

function escapeCsvCell(value: string | number | undefined): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
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
  URL.revokeObjectURL(url);
}

export function exportTransactionsToCsv(
  transactions: Transaction[],
  locale: Locale,
  accounts: PocketAccount[] = []
): void {
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));
  const headers = [
    "Date",
    "Type",
    "Category",
    "Pocket",
    "To Pocket",
    "Merchant",
    "Note",
    "Amount (IDR)",
    "Admin Fee (IDR)",
  ];
  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const rows = sorted.map((tx) => [
    tx.date,
    tx.type.toUpperCase(),
    getCategoryLabel(tx.categoryId, locale),
    tx.accountId ? accMap.get(tx.accountId) ?? tx.accountId : "",
    tx.toAccountId ? accMap.get(tx.toAccountId) ?? tx.toAccountId : "",
    tx.merchant ?? "",
    tx.note,
    tx.amountIdr,
    tx.feeIdr ?? 0,
  ]);

  const csvLines = [headers, ...rows].map((row) =>
    row.map(escapeCsvCell).join(",")
  );
  const stamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(
    `\uFEFF${csvLines.join("\n")}`,
    `shikas-cashflow-${stamp}.csv`,
    "text/csv;charset=utf-8;"
  );
}

export function exportBackupJson(data: CashflowStoreData): void {
  const stamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(
    JSON.stringify(data, null, 2),
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
  return cleaned;
}

export function parseBackupJson(rawText: string): CashflowStoreData {
  const parsed = JSON.parse(rawText) as Partial<CashflowStoreData>;
  if (!parsed || !Array.isArray(parsed.transactions)) {
    throw new Error("Invalid ShiKas backup structure.");
  }

  const cleanAccounts = sanitizeAccounts(parsed.accounts);
  const cleanTx: Transaction[] = parsed.transactions
    .filter(
      (tx) =>
        tx &&
        (tx.type === "income" ||
          tx.type === "expense" ||
          tx.type === "transfer")
    )
    .map((tx) => ({
      id: String(tx.id ?? `tx-${Math.random().toString(36).slice(2, 8)}`),
      type: tx.type,
      date: String(tx.date ?? new Date().toISOString().slice(0, 10)),
      amountIdr: Math.max(0, Math.round(Number(tx.amountIdr) || 0)),
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
      createdAt: String(tx.createdAt ?? new Date().toISOString()),
    }));

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
