import type { CashflowStoreData, Locale, Transaction } from "../types/cashflow";
import { getCategoryLabel } from "../data/categories";

function escapeCsvCell(value: string | number | undefined): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerFileDownload(content: string, filename: string, mimeType: string): void {
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
  locale: Locale
): void {
  const headers = ["Date", "Type", "Category", "Merchant", "Note", "Amount (IDR)"];
  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const rows = sorted.map((tx) => [
    tx.date,
    tx.type.toUpperCase(),
    getCategoryLabel(tx.categoryId, locale),
    tx.merchant ?? "",
    tx.note,
    tx.amountIdr,
  ]);

  const csvLines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(","));
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

export function parseBackupJson(rawText: string): CashflowStoreData {
  const parsed = JSON.parse(rawText) as Partial<CashflowStoreData>;
  if (!parsed || !Array.isArray(parsed.transactions)) {
    throw new Error("Invalid ShiKas backup structure.");
  }

  const cleanTx: Transaction[] = parsed.transactions
    .filter((tx) => tx && (tx.type === "income" || tx.type === "expense"))
    .map((tx) => ({
      id: String(tx.id ?? `tx-${Math.random().toString(36).slice(2, 8)}`),
      type: tx.type,
      date: String(tx.date ?? new Date().toISOString().slice(0, 10)),
      amountIdr: Math.max(0, Math.round(Number(tx.amountIdr) || 0)),
      categoryId: String(tx.categoryId ?? (tx.type === "income" ? "other_income" : "other_expense")),
      note: String(tx.note ?? ""),
      merchant: tx.merchant ? String(tx.merchant) : undefined,
      createdAt: String(tx.createdAt ?? new Date().toISOString()),
    }));

  return {
    version: 4,
    transactions: cleanTx,
    settings: {
      locale: parsed.settings?.locale === "id" ? "id" : "en",
      privacyMode: Boolean(parsed.settings?.privacyMode),
      rainEnabled: parsed.settings?.rainEnabled ?? true,
      shizukuWebsiteUrl:
        typeof parsed.settings?.shizukuWebsiteUrl === "string"
          ? parsed.settings.shizukuWebsiteUrl
          : "",
    },
  };
}
