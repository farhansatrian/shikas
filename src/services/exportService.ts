import type {
  CashflowStoreData,
  CategoryDefinition,
  Locale,
  PocketAccount,
  Transaction,
} from "../types/cashflow";
import {
  buildCategoryMap,
  getCategoryLabel,
  getColorGroupLabel,
  normalizeCategoryId,
  normalizeHexColor,
  sanitizeCategories,
  sanitizeColorLabels,
} from "../data/categories";
import {
  computeAccountBalances,
  computeTimeRangeSeries,
  type MonthlySeriesPoint,
} from "../utils/calculations";
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

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function getIsoWeekdayName(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  return WEEKDAY_NAMES[dt.getUTCDay()] ?? "";
}

export function buildTransactionsCsvContent(
  transactions: Transaction[],
  locale: Locale,
  accounts: PocketAccount[] = [],
  cycleStartDay = 1,
  categories?: CategoryDefinition[],
  colorLabels?: Record<string, string>
): string {
  const accMap = new Map(accounts.map((a) => [a.id, a]));
  const catMap = buildCategoryMap(categories);
  const savingsIds = new Set(
    accounts.filter((a) => a.role === "savings").map((a) => a.id)
  );
  const safeCycleDay = clampCycleStartDay(cycleStartDay);

  const headers = [
    "Transaction ID",
    "Date",
    "Day of Week",
    "Cycle Key",
    "Cycle",
    "Type",
    "Category ID",
    "Category",
    "Color Group",
    "Color Hex",
    "Pocket",
    "Pocket Role",
    "To Pocket",
    "To Pocket Role",
    "Merchant",
    "Note",
    "Gross Amount (IDR)",
    "Admin Fee (IDR)",
    "Net Income (IDR)",
    "Net Expense (IDR)",
    "Savings Flow (IDR)",
    "Reimburse Status",
    "Reimburse Mode",
    "Reimburse From",
    "Reimburse Target (IDR)",
    "Reimbursed (IDR)",
    "Reimburse Remaining (IDR)",
    "Reimburse To Pocket",
    "Reimburse Payments Detail",
    "Created At",
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

    const fromAcc = tx.accountId ? accMap.get(tx.accountId) : undefined;
    const toAcc = tx.toAccountId ? accMap.get(tx.toAccountId) : undefined;
    const fromSavings = Boolean(tx.accountId && savingsIds.has(tx.accountId));
    const toSavings = Boolean(tx.toAccountId && savingsIds.has(tx.toAccountId));

    let savingsFlow = 0;
    if (tx.type === "income") {
      if (fromSavings) savingsFlow += tx.amountIdr;
    } else if (tx.type === "expense") {
      if (fromSavings) savingsFlow -= tx.amountIdr;
      let cap = Math.max(0, Math.round(tx.amountIdr || 0));
      for (const e of tx.reimburse?.entries ?? []) {
        const amt = Math.min(cap, Math.max(0, Math.round(e.amountIdr || 0)));
        if (amt <= 0) continue;
        cap -= amt;
        if (e.accountId && savingsIds.has(e.accountId)) {
          savingsFlow += amt;
        }
      }
    } else if (tx.type === "transfer") {
      if (toSavings && !fromSavings) savingsFlow += tx.amountIdr;
      else if (fromSavings && !toSavings) savingsFlow -= tx.amountIdr + fee;
      else if (fromSavings && toSavings && fee > 0) savingsFlow -= fee;
    }

    const catColorHex =
      tx.type === "expense"
        ? normalizeHexColor(catMap[tx.categoryId]?.color)
        : "";
    const colorGroupName = catColorHex
      ? getColorGroupLabel(catColorHex, colorLabels)
      : "";

    const reimburseStatus = prog.isReimburse ? prog.status.toUpperCase() : "";
    const reimburseMode = prog.isReimburse
      ? prog.isFlexible
        ? "FLEXIBLE"
        : "FIXED"
      : "";
    const reimburseTarget: number | string =
      prog.isReimburse && !prog.isFlexible && prog.expectedIdr
        ? prog.expectedIdr
        : "";
    const reimburseRemaining =
      prog.isReimburse && prog.isPending && !prog.isFlexible
        ? prog.remainingExpectedIdr
        : 0;

    const entries = tx.type === "expense" ? tx.reimburse?.entries ?? [] : [];
    const reimbursePockets = Array.from(
      new Set(
        entries
          .map((e) =>
            e.accountId ? accMap.get(e.accountId)?.name ?? e.accountId : ""
          )
          .filter(Boolean)
      )
    ).join(" / ");

    const reimburseDetail = entries
      .map((e) => {
        const dest = e.accountId
          ? accMap.get(e.accountId)?.name ?? e.accountId
          : "Unassigned";
        const noteSuffix = e.note ? ` (${e.note})` : "";
        return `${e.date}: +${formatIdr(e.amountIdr)} -> ${dest}${noteSuffix}`;
      })
      .join(" ; ");

    return [
      tx.id,
      tx.date,
      getIsoWeekdayName(tx.date),
      cycleKey,
      cycleLabel,
      tx.type.toUpperCase(),
      tx.categoryId,
      getCategoryLabel(tx.categoryId, locale, categories),
      colorGroupName,
      catColorHex,
      fromAcc?.name ?? tx.accountId ?? "",
      fromAcc ? fromAcc.role.toUpperCase() : "",
      toAcc?.name ?? tx.toAccountId ?? "",
      toAcc ? toAcc.role.toUpperCase() : "",
      tx.merchant ?? "",
      tx.note,
      tx.amountIdr,
      fee,
      netIncome,
      netExpense,
      savingsFlow,
      reimburseStatus,
      reimburseMode,
      tx.reimburse?.from ?? "",
      reimburseTarget,
      reimbursed,
      reimburseRemaining,
      reimbursePockets,
      reimburseDetail,
      tx.createdAt,
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
  cycleStartDay = 1,
  categories?: CategoryDefinition[],
  colorLabels?: Record<string, string>
): void {
  const csv = buildTransactionsCsvContent(
    transactions,
    locale,
    accounts,
    cycleStartDay,
    categories,
    colorLabels
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
    categoriesCount: number;
    pendingReimburseCount: number;
    colorGroups: Array<{
      color: string;
      label: string;
      categoryIds: string[];
      categoryNames: string[];
    }>;
    pockets: Array<{
      id: string;
      name: string;
      role: PocketAccount["role"];
      openingBalanceIdr: number;
      liveBalanceIdr: number;
    }>;
    monthlyCycles: MonthlySeriesPoint[];
  };
}

export function buildBackupJsonPayload(
  data: CashflowStoreData
): ShikasBackupEnvelope {
  const balances = computeAccountBalances(data.accounts, data.transactions);
  const pending = computePendingReimburseOverview(data.transactions);
  const cleanCategories = sanitizeCategories(data.categories);
  const cleanColorLabels = sanitizeColorLabels(data.settings.colorLabels);
  const cycleStartDay = clampCycleStartDay(data.settings.cycleStartDay);

  const colorGroupMap = new Map<
    string,
    { categoryIds: string[]; categoryNames: string[] }
  >();
  for (const cat of cleanCategories) {
    if (cat.type !== "expense") continue;
    const hex = normalizeHexColor(cat.color);
    const entry = colorGroupMap.get(hex) ?? {
      categoryIds: [],
      categoryNames: [],
    };
    entry.categoryIds.push(cat.id);
    entry.categoryNames.push(cat.nameEn || cat.nameId);
    colorGroupMap.set(hex, entry);
  }

  const colorGroups = Array.from(colorGroupMap.entries()).map(
    ([color, info]) => ({
      color,
      label: getColorGroupLabel(color, cleanColorLabels),
      categoryIds: info.categoryIds,
      categoryNames: info.categoryNames,
    })
  );

  const anchorMonth =
    data.transactions.length > 0
      ? getCycleKeyForDate(data.transactions[0].date, cycleStartDay)
      : getCycleKeyForDate(new Date().toISOString().slice(0, 10), cycleStartDay);
  const monthlyCycles =
    data.transactions.length > 0
      ? computeTimeRangeSeries(
          data.transactions,
          anchorMonth,
          "all",
          data.accounts,
          cycleStartDay
        )
      : [];

  return {
    app: "shikas",
    exportedAt: new Date().toISOString(),
    version: 5,
    accounts: data.accounts,
    categories: cleanCategories,
    transactions: data.transactions,
    settings: {
      ...data.settings,
      colorLabels: cleanColorLabels,
    },
    summary: {
      totalBalanceIdr: balances.totalBalanceIdr,
      dailyTotalIdr: balances.dailyTotalIdr,
      savingsTotalIdr: balances.savingsTotalIdr,
      transactionCount: data.transactions.length,
      categoriesCount: cleanCategories.filter((c) => c.type !== "transfer").length,
      pendingReimburseCount: pending.pendingCount,
      colorGroups,
      pockets: balances.items.map((item) => ({
        id: item.account.id,
        name: item.account.name,
        role: item.account.role,
        openingBalanceIdr: item.account.openingBalanceIdr,
        liveBalanceIdr: item.balanceIdr,
      })),
      monthlyCycles,
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
  const cleanCategories = sanitizeCategories(parsed.categories);
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
          tx.type,
          cleanCategories
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
    categories: cleanCategories,
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
      colorLabels: sanitizeColorLabels(parsed.settings?.colorLabels),
    },
  };
}
