import type {
  CashflowStoreData,
  PocketAccount,
  Transaction,
} from "../types/cashflow";
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

  const accounts: PocketAccount[] = [
    {
      id: "acc-wondr",
      name: "Wondr",
      role: "daily",
      openingBalanceIdr: 2_500_000,
      color: "#2276a8",
      isDefault: true,
    },
    {
      id: "acc-gopay",
      name: "GoPay",
      role: "daily",
      openingBalanceIdr: 350_000,
      color: "#1f8f6b",
    },
    {
      id: "acc-bca",
      name: "BCA",
      role: "savings",
      openingBalanceIdr: 15_000_000,
      color: "#745bc7",
    },
  ];

  const mkTx = (
    id: string,
    type: "income" | "expense",
    date: string,
    amountIdr: number,
    categoryId: string,
    note: string,
    merchant?: string,
    accountId = "acc-wondr"
  ): Transaction => ({
    id,
    type,
    date,
    amountIdr,
    categoryId,
    note,
    merchant,
    accountId,
    createdAt: `${date}T09:00:00.000Z`,
  });

  const mkTransfer = (
    id: string,
    date: string,
    amountIdr: number,
    accountId: string,
    toAccountId: string,
    note: string,
    feeIdr = 0
  ): Transaction => ({
    id,
    type: "transfer",
    date,
    amountIdr,
    categoryId: "transfer",
    note,
    accountId,
    toAccountId,
    feeIdr: feeIdr > 0 ? feeIdr : undefined,
    createdAt: `${date}T09:30:00.000Z`,
  });

  const transactions: Transaction[] = [
    // m5
    mkTx("tx-m5-1", "income", dateInMonth(m5, 1), 11_800_000, "salary", "Monthly salary", "PT BNI (Persero) Tbk", "acc-wondr"),
    mkTransfer("tx-m5-t1", dateInMonth(m5, 2), 4_000_000, "acc-wondr", "acc-bca", "Monthly savings allocation", 2_500),
    mkTransfer("tx-m5-t2", dateInMonth(m5, 2), 700_000, "acc-wondr", "acc-gopay", "Top up GoPay", 1_000),
    mkTx("tx-m5-2", "expense", dateInMonth(m5, 3), 2_400_000, "housing", "Rent & electricity", "Kost Sudirman", "acc-wondr"),
    mkTx("tx-m5-3", "expense", dateInMonth(m5, 9), 1_750_000, "food", "Daily meals & coffee", "Kopi Kenangan", "acc-wondr"),
    mkTx("tx-m5-4", "expense", dateInMonth(m5, 13), 590_000, "transport", "MRT & daily commute", "Gojek / MRT", "acc-gopay"),
    mkTx("tx-m5-5", "expense", dateInMonth(m5, 19), 1_200_000, "giving", "Monthly family support", undefined, "acc-wondr"),
    mkTx("tx-m5-6", "expense", dateInMonth(m5, 28), 15_000, "fees", "Monthly BCA admin fee", "BCA", "acc-bca"),

    // m4
    mkTx("tx-m4-1", "income", dateInMonth(m4, 1), 12_200_000, "salary", "Monthly salary", "PT BNI (Persero) Tbk", "acc-wondr"),
    mkTransfer("tx-m4-t1", dateInMonth(m4, 2), 4_500_000, "acc-wondr", "acc-bca", "Monthly savings allocation", 2_500),
    mkTransfer("tx-m4-t2", dateInMonth(m4, 3), 700_000, "acc-wondr", "acc-gopay", "Top up GoPay", 1_000),
    mkTx("tx-m4-2", "expense", dateInMonth(m4, 3), 2_725_000, "housing", "Rent, power & internet", "Kost Sudirman", "acc-wondr"),
    mkTx("tx-m4-3", "expense", dateInMonth(m4, 10), 1_890_000, "food", "Lunch, groceries & coffee", "Superindo", "acc-wondr"),
    mkTx("tx-m4-4", "expense", dateInMonth(m4, 14), 640_000, "transport", "Commuter & ride-hailing", "MRT / Gojek", "acc-gopay"),
    mkTx("tx-m4-5", "expense", dateInMonth(m4, 20), 1_200_000, "giving", "Monthly family support", undefined, "acc-wondr"),
    mkTx("tx-m4-6", "expense", dateInMonth(m4, 28), 15_000, "fees", "Monthly BCA admin fee", "BCA", "acc-bca"),

    // m3
    mkTx("tx-m3-1", "income", dateInMonth(m3, 1), 12_500_000, "salary", "Monthly salary", "PT BNI (Persero) Tbk", "acc-wondr"),
    mkTransfer("tx-m3-t1", dateInMonth(m3, 2), 4_500_000, "acc-wondr", "acc-bca", "Monthly savings allocation", 2_500),
    mkTransfer("tx-m3-t2", dateInMonth(m3, 3), 650_000, "acc-wondr", "acc-gopay", "Top up GoPay", 1_000),
    mkTx("tx-m3-2", "expense", dateInMonth(m3, 3), 2_730_000, "housing", "Rent, utilities & subscriptions", "Kost Sudirman", "acc-wondr"),
    mkTx("tx-m3-3", "expense", dateInMonth(m3, 6), 1_650_000, "food", "Daily meals, coffee & groceries", undefined, "acc-wondr"),
    mkTx("tx-m3-4", "expense", dateInMonth(m3, 9), 620_000, "transport", "MRT & GoRide", "Gojek / MRT", "acc-gopay"),
    mkTx("tx-m3-5", "expense", dateInMonth(m3, 16), 950_000, "shopping", "Mechanical keycaps & desk setup", "Tokopedia", "acc-wondr"),
    mkTx("tx-m3-6", "expense", dateInMonth(m3, 20), 1_200_000, "giving", "Monthly family support", undefined, "acc-wondr"),
    mkTx("tx-m3-7", "expense", dateInMonth(m3, 28), 15_000, "fees", "Monthly BCA admin fee", "BCA", "acc-bca"),

    // m2
    mkTx("tx-m2-1", "income", dateInMonth(m2, 1), 12_500_000, "salary", "Monthly salary", "PT BNI (Persero) Tbk", "acc-wondr"),
    mkTransfer("tx-m2-t1", dateInMonth(m2, 2), 5_000_000, "acc-wondr", "acc-bca", "Monthly savings allocation", 2_500),
    mkTransfer("tx-m2-t2", dateInMonth(m2, 3), 750_000, "acc-wondr", "acc-gopay", "Top up GoPay", 1_000),
    mkTx("tx-m2-2", "income", dateInMonth(m2, 10), 2_950_000, "other_income", "Side project & UI review", "Remote Client", "acc-wondr"),
    mkTx("tx-m2-3", "expense", dateInMonth(m2, 3), 2_730_000, "housing", "Rent, power & internet", "Kost Sudirman", "acc-wondr"),
    mkTx("tx-m2-4", "expense", dateInMonth(m2, 8), 1_820_000, "food", "Office lunch & weekend coffee", "Fore Coffee", "acc-wondr"),
    mkTx("tx-m2-5", "expense", dateInMonth(m2, 11), 680_000, "transport", "Commuter & rainy-day rides", "Gojek", "acc-gopay"),
    mkTx("tx-m2-6", "expense", dateInMonth(m2, 22), 1_740_000, "other_expense", "Family support & gym", undefined, "acc-wondr"),
    mkTx("tx-m2-7", "expense", dateInMonth(m2, 25), 490_000, "entertainment", "Cinema & soundtrack vinyl", "CGV / Gramedia", "acc-wondr"),
    mkTx("tx-m2-8", "expense", dateInMonth(m2, 28), 15_000, "fees", "Monthly BCA admin fee", "BCA", "acc-bca"),

    // m1
    mkTx("tx-m1-1", "income", dateInMonth(m1, 1), 13_200_000, "salary", "Monthly salary & allowance", "PT BNI (Persero) Tbk", "acc-wondr"),
    mkTransfer("tx-m1-t1", dateInMonth(m1, 2), 5_000_000, "acc-wondr", "acc-bca", "Monthly savings allocation", 2_500),
    mkTransfer("tx-m1-t2", dateInMonth(m1, 3), 750_000, "acc-wondr", "acc-gopay", "Top up GoPay", 1_000),
    mkTx("tx-m1-2", "income", dateInMonth(m1, 15), 425_000, "other_income", "Money market yield & coupon", "Bibit", "acc-bca"),
    mkTx("tx-m1-3", "expense", dateInMonth(m1, 2), 2_800_000, "housing", "Rent, water, power & internet", "Kost Sudirman", "acc-wondr"),
    mkTx("tx-m1-4", "expense", dateInMonth(m1, 9), 1_940_000, "food", "Daily meals, matcha & groceries", "Superindo", "acc-wondr"),
    mkTx("tx-m1-5", "expense", dateInMonth(m1, 12), 710_000, "transport", "MRT, commuter & rides", "JakLingko / Gojek", "acc-gopay"),
    mkTx("tx-m1-6", "expense", dateInMonth(m1, 19), 980_000, "shopping", "Books & desk essentials", "Periplus", "acc-wondr"),
    mkTx("tx-m1-7", "expense", dateInMonth(m1, 21), 1_730_000, "other_expense", "Family support & gym", undefined, "acc-wondr"),
    mkTx("tx-m1-8", "expense", dateInMonth(m1, 28), 15_000, "fees", "Monthly BCA admin fee", "BCA", "acc-bca"),

    // m0 (current month)
    mkTx("tx-m0-1", "income", dateInMonth(m0, 1), 13_200_000, "salary", "Monthly salary & allowance", "PT BNI (Persero) Tbk", "acc-wondr"),
    mkTransfer("tx-m0-t1", dateInMonth(m0, clampCurrent(2)), 5_000_000, "acc-wondr", "acc-bca", "Monthly savings to BCA", 2_500),
    mkTransfer("tx-m0-t2", dateInMonth(m0, clampCurrent(3)), 500_000, "acc-wondr", "acc-gopay", "Top up GoPay", 1_000),
    mkTx("tx-m0-2", "expense", dateInMonth(m0, clampCurrent(2)), 2_450_000, "housing", "Rent & electricity", "Kost Sudirman", "acc-wondr"),
    mkTx("tx-m0-3", "expense", dateInMonth(m0, clampCurrent(5)), 680_000, "housing", "Fiber internet & cloud bills", "Biznet / GitHub", "acc-wondr"),
    mkTx("tx-m0-4", "expense", dateInMonth(m0, clampCurrent(6)), 485_000, "food", "Weekly groceries, fruit & coffee", "Grand Lucky", "acc-wondr"),
    mkTx("tx-m0-5", "expense", dateInMonth(m0, clampCurrent(9)), 245_000, "transport", "MRT pass & GoRide", "Gojek / MRT", "acc-gopay"),
    mkTx("tx-m0-6", "expense", dateInMonth(m0, clampCurrent(13)), 390_000, "food", "Team ramen dinner & matcha", "Marutama Ramen", "acc-wondr"),
    mkTx("tx-m0-7", "income", dateInMonth(m0, clampCurrent(15)), 2_100_000, "other_income", "Side sprint & freelance", "Remote Sprint", "acc-wondr"),
    mkTx("tx-m0-8", "expense", dateInMonth(m0, clampCurrent(17)), 1_250_000, "giving", "Monthly family support", undefined, "acc-wondr"),
    mkTx("tx-m0-9", "expense", dateInMonth(m0, clampCurrent(19)), 480_000, "shopping", "Essentials & desk accessories", "Tokopedia", "acc-wondr"),
    mkTx("tx-m0-10", "expense", dateInMonth(m0, clampCurrent(21)), 315_000, "entertainment", "Afternoon coffee, manga & parking", "Gramedia", "acc-wondr"),
    mkTx("tx-m0-11", "expense", dateInMonth(m0, clampCurrent(22)), 620_000, "food", "Weekday lunches (week 3)", "Canteen & Cafe", "acc-wondr"),
  ];

  return {
    version: 5,
    accounts,
    transactions,
    settings: {
      locale: "en",
      privacyMode: false,
      rainEnabled: true,
      cycleStartDay: 1,
      shizukuWebsiteUrl: "",
    },
  };
}

export function createFreshEmptyData(): CashflowStoreData {
  return {
    version: 5,
    accounts: [],
    transactions: [],
    settings: {
      locale: "en",
      privacyMode: false,
      rainEnabled: true,
      cycleStartDay: 1,
      shizukuWebsiteUrl: "",
    },
  };
}
