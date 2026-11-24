import type { CashflowStoreData, Locale, Transaction, Wallet } from "../types/cashflow";
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
  wallets: Wallet[],
  locale: Locale
): void {
  const walletMap = Object.fromEntries(wallets.map((w) => [w.id, w.name]));
  const headers = [
    "Date",
    "Type",
    "Category",
    "Wallet",
    "To Wallet",
    "Merchant",
    "Note",
    "Amount (IDR)",
    "Fee (IDR)",
  ];

  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const rows = sorted.map((tx) => [
    tx.date,
    tx.type.toUpperCase(),
    getCategoryLabel(tx.categoryId, locale),
    walletMap[tx.walletId] ?? tx.walletId,
    tx.toWalletId ? walletMap[tx.toWalletId] ?? tx.toWalletId : "",
    tx.merchant ?? "",
    tx.note,
    tx.amountIdr,
    tx.feeIdr ?? 0,
  ]);

  const csvLines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  const stamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(
    `\uFEFF${csvLines.join("\n")}`,
    `shikas-ledger-${stamp}.csv`,
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
  if (
    !parsed ||
    !Array.isArray(parsed.wallets) ||
    !Array.isArray(parsed.transactions) ||
    !Array.isArray(parsed.budgets)
  ) {
    throw new Error("Invalid ShiKas backup structure.");
  }

  const normalizedRecurring = Array.isArray(parsed.recurring)
    ? parsed.recurring.map((r) => {
        const legacy = r as unknown as { amountIdr?: number; amount?: number };
        return {
          ...r,
          amountIdr: typeof legacy.amountIdr === "number" ? legacy.amountIdr : Number(legacy.amount ?? 0),
        };
      })
    : [];

  return {
    version: 3,
    wallets: parsed.wallets,
    transactions: parsed.transactions,
    budgets: parsed.budgets,
    recurring: normalizedRecurring,
    goals: Array.isArray(parsed.goals) ? parsed.goals : [],
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
