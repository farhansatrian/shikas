import type { CashflowStoreData, Transaction } from "../types/cashflow";
import { getMonthKey, shiftMonthKey } from "../utils/format";

function dateInMonth(monthKey: string, day: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const maxDay = new Date(y, m, 0).getDate();
  const safeDay = Math.min(Math.max(1, day), maxDay);
  return `${monthKey}-${String(safeDay).padStart(2, "0")}`;
}

export function createDemoSeedData(): CashflowStoreData {
  const now = new Date();
  const m0 = getMonthKey(now);
  const m1 = shiftMonthKey(m0, -1);
  const m2 = shiftMonthKey(m0, -2);
  const m3 = shiftMonthKey(m0, -3);
  const m4 = shiftMonthKey(m0, -4);
  const m5 = shiftMonthKey(m0, -5);
  const todayDay = Math.max(1, now.getDate());
  const clampCurrent = (d: number) => Math.min(d, todayDay);

  const mkTx = (
    id: string,
    type: "income" | "expense",
    date: string,
    amountIdr: number,
    categoryId: string,
    note: string,
    merchant?: string
  ): Transaction => ({
    id,
    type,
    date,
    amountIdr,
    categoryId,
    note,
    merchant,
    createdAt: `${date}T09:00:00.000Z`,
  });

  const transactions: Transaction[] = [
    // m5
    mkTx("tx-m5-1", "income", dateInMonth(m5, 1), 11_800_000, "salary", "Monthly salary", "PT BNI (Persero) Tbk"),
    mkTx("tx-m5-2", "expense", dateInMonth(m5, 3), 2_400_000, "housing", "Rent & electricity", "Kost Sudirman"),
    mkTx("tx-m5-3", "expense", dateInMonth(m5, 9), 1_750_000, "food", "Daily meals & coffee", "Kopi Kenangan"),
    mkTx("tx-m5-4", "expense", dateInMonth(m5, 13), 590_000, "transport", "MRT & daily commute", "MRT Jakarta"),
    mkTx("tx-m5-5", "expense", dateInMonth(m5, 19), 1_200_000, "other_expense", "Monthly family support"),

    // m4
    mkTx("tx-m4-1", "income", dateInMonth(m4, 1), 12_200_000, "salary", "Monthly salary", "PT BNI (Persero) Tbk"),
    mkTx("tx-m4-2", "expense", dateInMonth(m4, 3), 2_725_000, "housing", "Rent, power & internet", "Kost Sudirman"),
    mkTx("tx-m4-3", "expense", dateInMonth(m4, 10), 1_890_000, "food", "Lunch, groceries & coffee", "Superindo"),
    mkTx("tx-m4-4", "expense", dateInMonth(m4, 14), 640_000, "transport", "Commuter & ride-hailing", "MRT / Gojek"),
    mkTx("tx-m4-5", "expense", dateInMonth(m4, 20), 1_200_000, "other_expense", "Monthly family support"),

    // m3
    mkTx("tx-m3-1", "income", dateInMonth(m3, 1), 12_500_000, "salary", "Monthly salary", "PT BNI (Persero) Tbk"),
    mkTx("tx-m3-2", "expense", dateInMonth(m3, 3), 2_730_000, "housing", "Rent, utilities & subscriptions", "Kost Sudirman"),
    mkTx("tx-m3-3", "expense", dateInMonth(m3, 6), 1_650_000, "food", "Daily meals, coffee & groceries"),
    mkTx("tx-m3-4", "expense", dateInMonth(m3, 9), 620_000, "transport", "MRT & GoRide", "MRT Jakarta"),
    mkTx("tx-m3-5", "expense", dateInMonth(m3, 16), 950_000, "shopping", "Mechanical keycaps & desk setup", "Tokopedia"),
    mkTx("tx-m3-6", "expense", dateInMonth(m3, 20), 1_200_000, "other_expense", "Monthly family support"),

    // m2
    mkTx("tx-m2-1", "income", dateInMonth(m2, 1), 12_500_000, "salary", "Monthly salary", "PT BNI (Persero) Tbk"),
    mkTx("tx-m2-2", "income", dateInMonth(m2, 10), 2_950_000, "other_income", "Side project & UI review", "Remote Client"),
    mkTx("tx-m2-3", "expense", dateInMonth(m2, 3), 2_730_000, "housing", "Rent, power & internet", "Kost Sudirman"),
    mkTx("tx-m2-4", "expense", dateInMonth(m2, 8), 1_820_000, "food", "Office lunch & weekend coffee", "Fore Coffee"),
    mkTx("tx-m2-5", "expense", dateInMonth(m2, 11), 680_000, "transport", "Commuter & rainy-day rides", "Gojek"),
    mkTx("tx-m2-6", "expense", dateInMonth(m2, 22), 1_740_000, "other_expense", "Family support & gym"),
    mkTx("tx-m2-7", "expense", dateInMonth(m2, 25), 490_000, "entertainment", "Cinema & soundtrack vinyl", "CGV / Gramedia"),

    // m1
    mkTx("tx-m1-1", "income", dateInMonth(m1, 1), 13_200_000, "salary", "Monthly salary & allowance", "PT BNI (Persero) Tbk"),
    mkTx("tx-m1-2", "income", dateInMonth(m1, 15), 425_000, "other_income", "Money market yield & coupon", "Bibit"),
    mkTx("tx-m1-3", "expense", dateInMonth(m1, 2), 2_800_000, "housing", "Rent, water, power & internet", "Kost Sudirman"),
    mkTx("tx-m1-4", "expense", dateInMonth(m1, 9), 1_940_000, "food", "Daily meals, matcha & groceries", "Superindo"),
    mkTx("tx-m1-5", "expense", dateInMonth(m1, 12), 710_000, "transport", "MRT, commuter & rides", "JakLingko / Gojek"),
    mkTx("tx-m1-6", "expense", dateInMonth(m1, 19), 980_000, "shopping", "Books & desk essentials", "Periplus"),
    mkTx("tx-m1-7", "expense", dateInMonth(m1, 21), 1_730_000, "other_expense", "Family support & gym"),

    // m0 (current month)
    mkTx("tx-m0-1", "income", dateInMonth(m0, 1), 13_200_000, "salary", "Monthly salary & allowance", "PT BNI (Persero) Tbk"),
    mkTx("tx-m0-2", "expense", dateInMonth(m0, clampCurrent(2)), 2_450_000, "housing", "Rent & electricity", "Kost Sudirman"),
    mkTx("tx-m0-3", "expense", dateInMonth(m0, clampCurrent(5)), 680_000, "housing", "Fiber internet & cloud bills", "Biznet / GitHub"),
    mkTx("tx-m0-4", "expense", dateInMonth(m0, clampCurrent(6)), 485_000, "food", "Weekly groceries, fruit & coffee", "Grand Lucky"),
    mkTx("tx-m0-5", "expense", dateInMonth(m0, clampCurrent(9)), 245_000, "transport", "MRT pass & office commute", "MRT Jakarta"),
    mkTx("tx-m0-6", "expense", dateInMonth(m0, clampCurrent(13)), 390_000, "food", "Team ramen dinner & matcha", "Marutama Ramen"),
    mkTx("tx-m0-7", "income", dateInMonth(m0, clampCurrent(15)), 2_100_000, "other_income", "Side sprint & freelance", "Remote Sprint"),
    mkTx("tx-m0-8", "expense", dateInMonth(m0, clampCurrent(17)), 1_250_000, "other_expense", "Monthly family support"),
    mkTx("tx-m0-9", "expense", dateInMonth(m0, clampCurrent(19)), 480_000, "shopping", "Essentials & desk accessories", "Tokopedia"),
    mkTx("tx-m0-10", "expense", dateInMonth(m0, clampCurrent(21)), 315_000, "entertainment", "Afternoon coffee, manga & parking", "Gramedia"),
    mkTx("tx-m0-11", "expense", dateInMonth(m0, clampCurrent(22)), 620_000, "food", "Weekday lunches (week 3)", "Canteen & Cafe"),
  ];

  return {
    version: 4,
    transactions,
    settings: {
      locale: "en",
      privacyMode: false,
      rainEnabled: true,
      shizukuWebsiteUrl: "",
    },
  };
}

export function createFreshEmptyData(): CashflowStoreData {
  return {
    version: 4,
    transactions: [],
    settings: {
      locale: "en",
      privacyMode: false,
      rainEnabled: true,
      shizukuWebsiteUrl: "",
    },
  };
}
