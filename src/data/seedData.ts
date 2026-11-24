import type {
  Budget,
  CashflowStoreData,
  RecurringItem,
  SavingsGoal,
  Transaction,
  Wallet,
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

  const wallets: Wallet[] = [
    {
      id: "w-bni",
      name: "BNI Taplus",
      institution: "Bank BNI",
      type: "bank",
      initialBalanceIdr: 12_500_000,
      color: "#745bc7",
    },
    {
      id: "w-bca",
      name: "BCA Everyday",
      institution: "Bank BCA",
      type: "bank",
      initialBalanceIdr: 6_800_000,
      color: "#1e6c99",
    },
    {
      id: "w-gopay",
      name: "GoPay / QRIS",
      institution: "GoTo Financial",
      type: "ewallet",
      initialBalanceIdr: 1_850_000,
      color: "#117a62",
    },
    {
      id: "w-savings",
      name: "Bibit & Emergency Fund",
      institution: "Money Market Fund",
      type: "savings",
      initialBalanceIdr: 18_000_000,
      color: "#7650f3",
    },
    {
      id: "w-cash",
      name: "Cash Wallet",
      institution: "Cash",
      type: "cash",
      initialBalanceIdr: 950_000,
      color: "#d749d5",
    },
  ];

  const mkTx = (
    id: string,
    type: "income" | "expense",
    date: string,
    amountIdr: number,
    categoryId: string,
    walletId: string,
    note: string,
    merchant?: string,
    recurringId?: string
  ): Transaction => ({
    id,
    type,
    date,
    amountIdr,
    categoryId,
    walletId,
    note,
    merchant,
    recurringId,
    createdAt: `${date}T09:00:00.000Z`,
  });

  const mkTransfer = (
    id: string,
    date: string,
    amountIdr: number,
    walletId: string,
    toWalletId: string,
    note: string,
    feeIdr = 0
  ): Transaction => ({
    id,
    type: "transfer",
    date,
    amountIdr,
    categoryId: "transfer",
    walletId,
    toWalletId,
    feeIdr,
    note,
    createdAt: `${date}T11:30:00.000Z`,
  });

  const transactions: Transaction[] = [
    // m5
    mkTx("tx-m5-1", "income", dateInMonth(m5, 1), 11_800_000, "salary", "w-bni", "Monthly salary", "PT BNI (Persero) Tbk", "rec-salary"),
    mkTransfer("tx-m5-topup", dateInMonth(m5, 2), 2_500_000, "w-bni", "w-gopay", "Monthly GoPay top-up", 2500),
    mkTx("tx-m5-2", "expense", dateInMonth(m5, 3), 2_400_000, "housing", "w-bni", "Rent & electricity", "Kost Sudirman", "rec-kost"),
    mkTx("tx-m5-3", "expense", dateInMonth(m5, 9), 1_750_000, "food", "w-gopay", "Daily meals & coffee", "QRIS / Kopi Kenangan"),
    mkTx("tx-m5-4", "expense", dateInMonth(m5, 13), 590_000, "transport", "w-gopay", "MRT & daily commute", "MRT Jakarta"),
    mkTx("tx-m5-5", "expense", dateInMonth(m5, 19), 1_200_000, "family", "w-bni", "Monthly family support", "Family Transfer"),
    mkTransfer("tx-m5-6", dateInMonth(m5, 25), 2_500_000, "w-bni", "w-savings", "Monthly savings allocation", 0),

    // m4
    mkTx("tx-m4-1", "income", dateInMonth(m4, 1), 12_200_000, "salary", "w-bni", "Monthly salary", "PT BNI (Persero) Tbk", "rec-salary"),
    mkTransfer("tx-m4-topup", dateInMonth(m4, 2), 2_600_000, "w-bni", "w-gopay", "Monthly GoPay top-up", 2500),
    mkTx("tx-m4-2", "expense", dateInMonth(m4, 3), 2_400_000, "housing", "w-bni", "Rent & electricity", "Kost Sudirman", "rec-kost"),
    mkTx("tx-m4-3", "expense", dateInMonth(m4, 10), 1_890_000, "food", "w-gopay", "Lunch, groceries & coffee", "QRIS / Superindo"),
    mkTx("tx-m4-4", "expense", dateInMonth(m4, 14), 640_000, "transport", "w-gopay", "Commuter & ride-hailing", "JakLingko / Gojek"),
    mkTx("tx-m4-5", "expense", dateInMonth(m4, 15), 325_000, "subscriptions", "w-bca", "AI Dev Copilot subscription", "GitHub / OpenAI", "rec-ai"),
    mkTx("tx-m4-6", "expense", dateInMonth(m4, 20), 1_200_000, "family", "w-bni", "Monthly family support", "Family Transfer"),
    mkTransfer("tx-m4-7", dateInMonth(m4, 25), 2_800_000, "w-bni", "w-savings", "Emergency fund top-up", 0),

    // m3
    mkTx("tx-m3-1", "income", dateInMonth(m3, 1), 12_500_000, "salary", "w-bni", "Monthly salary", "PT BNI (Persero) Tbk", "rec-salary"),
    mkTransfer("tx-m3-topup", dateInMonth(m3, 2), 2_500_000, "w-bni", "w-gopay", "GoPay top-up for food & transit", 2500),
    mkTx("tx-m3-2", "expense", dateInMonth(m3, 3), 2_400_000, "housing", "w-bni", "Rent & electricity", "Kost Sudirman", "rec-kost"),
    mkTx("tx-m3-3", "expense", dateInMonth(m3, 6), 1_650_000, "food", "w-gopay", "Daily meals, coffee & groceries", "QRIS / Kopi Kenangan"),
    mkTx("tx-m3-4", "expense", dateInMonth(m3, 9), 620_000, "transport", "w-gopay", "MRT, TransJakarta & GoRide", "MRT Jakarta / Gojek"),
    mkTx("tx-m3-5", "expense", dateInMonth(m3, 12), 330_000, "subscriptions", "w-bca", "AI Dev Copilot subscription", "GitHub / OpenAI", "rec-ai"),
    mkTx("tx-m3-6", "expense", dateInMonth(m3, 16), 950_000, "shopping", "w-bca", "Mechanical keycaps & desk accessories", "Tokopedia"),
    mkTx("tx-m3-7", "expense", dateInMonth(m3, 20), 1_200_000, "family", "w-bni", "Monthly family support", "Family Transfer"),
    mkTransfer("tx-m3-8", dateInMonth(m3, 24), 3_000_000, "w-bni", "w-savings", "Monthly money market fund", 0),

    // m2
    mkTx("tx-m2-1", "income", dateInMonth(m2, 1), 12_500_000, "salary", "w-bni", "Monthly salary", "PT BNI (Persero) Tbk", "rec-salary"),
    mkTransfer("tx-m2-topup", dateInMonth(m2, 2), 3_000_000, "w-bni", "w-gopay", "Monthly GoPay top-up", 2500),
    mkTx("tx-m2-2", "income", dateInMonth(m2, 10), 2_950_000, "freelance", "w-bca", "UI audit & React component review", "Remote Client"),
    mkTx("tx-m2-3", "expense", dateInMonth(m2, 3), 2_400_000, "housing", "w-bni", "Rent & electricity", "Kost Sudirman", "rec-kost"),
    mkTx("tx-m2-4", "expense", dateInMonth(m2, 8), 1_820_000, "food", "w-gopay", "Office lunch & weekend coffee", "QRIS / Fore Coffee"),
    mkTx("tx-m2-5", "expense", dateInMonth(m2, 11), 680_000, "transport", "w-gopay", "Commuter & rainy-day rides", "MRT / Gojek"),
    mkTx("tx-m2-6", "expense", dateInMonth(m2, 14), 330_000, "subscriptions", "w-bca", "AI Dev Copilot subscription", "GitHub / OpenAI", "rec-ai"),
    mkTx("tx-m2-7", "expense", dateInMonth(m2, 18), 540_000, "health", "w-bca", "Gym membership & vitamins", "Fitness / Guardian"),
    mkTx("tx-m2-8", "expense", dateInMonth(m2, 22), 1_200_000, "family", "w-bni", "Monthly family support", "Family Transfer"),
    mkTx("tx-m2-9", "expense", dateInMonth(m2, 25), 490_000, "entertainment", "w-gopay", "Cinema & soundtrack vinyl", "CGV / Gramedia"),
    mkTransfer("tx-m2-10", dateInMonth(m2, 27), 4_000_000, "w-bni", "w-savings", "Emergency fund allocation", 2500),

    // m1
    mkTx("tx-m1-1", "income", dateInMonth(m1, 1), 13_200_000, "salary", "w-bni", "Monthly salary & allowance", "PT BNI (Persero) Tbk", "rec-salary"),
    mkTransfer("tx-m1-11", dateInMonth(m1, 2), 2_700_000, "w-bni", "w-gopay", "GoPay top-up for daily spending", 2500),
    mkTx("tx-m1-2", "income", dateInMonth(m1, 15), 425_000, "investment_return", "w-savings", "Money market yield & coupon", "Bibit"),
    mkTx("tx-m1-3", "expense", dateInMonth(m1, 2), 2_450_000, "housing", "w-bni", "Rent, water & power token", "Kost Sudirman", "rec-kost"),
    mkTx("tx-m1-4", "expense", dateInMonth(m1, 5), 350_000, "subscriptions", "w-bca", "Fiber internet & Spotify Duo", "Biznet / Spotify", "rec-net"),
    mkTx("tx-m1-5", "expense", dateInMonth(m1, 9), 1_940_000, "food", "w-gopay", "Daily meals, matcha & groceries", "QRIS / Superindo"),
    mkTx("tx-m1-6", "expense", dateInMonth(m1, 12), 710_000, "transport", "w-gopay", "MRT, commuter & rides", "JakLingko / Gojek"),
    mkTx("tx-m1-7", "expense", dateInMonth(m1, 14), 330_000, "subscriptions", "w-bca", "AI Dev Copilot subscription", "GitHub / OpenAI", "rec-ai"),
    mkTx("tx-m1-8", "expense", dateInMonth(m1, 19), 650_000, "education", "w-bca", "System design books & cloud course", "Periplus / Udemy"),
    mkTx("tx-m1-9", "expense", dateInMonth(m1, 21), 1_250_000, "family", "w-bni", "Monthly family support", "Family Transfer"),
    mkTx("tx-m1-10", "expense", dateInMonth(m1, 24), 480_000, "health", "w-bca", "Monthly gym membership", "Fitness Center"),
    mkTransfer("tx-m1-12", dateInMonth(m1, 27), 3_500_000, "w-bni", "w-savings", "Monthly savings allocation", 0),

    // m0 (current month)
    mkTx("tx-m0-1", "income", dateInMonth(m0, 1), 13_200_000, "salary", "w-bni", "Monthly salary & allowance", "PT BNI (Persero) Tbk", "rec-salary"),
    mkTx("tx-m0-2", "expense", dateInMonth(m0, clampCurrent(2)), 2_450_000, "housing", "w-bni", "Rent & electricity", "Kost Sudirman", "rec-kost"),
    mkTransfer("tx-m0-3", dateInMonth(m0, clampCurrent(3)), 2_000_000, "w-bni", "w-gopay", "Daily QRIS budget top-up", 2500),
    mkTx("tx-m0-4", "expense", dateInMonth(m0, clampCurrent(5)), 350_000, "subscriptions", "w-bca", "Fiber internet & Spotify Duo", "Biznet / Spotify", "rec-net"),
    mkTx("tx-m0-5", "expense", dateInMonth(m0, clampCurrent(6)), 485_000, "food", "w-gopay", "Weekly groceries, fruit & coffee", "Grand Lucky / QRIS"),
    mkTx("tx-m0-6", "expense", dateInMonth(m0, clampCurrent(9)), 245_000, "transport", "w-gopay", "MRT pass & office commute", "MRT Jakarta"),
    mkTx("tx-m0-7", "expense", dateInMonth(m0, clampCurrent(11)), 330_000, "subscriptions", "w-bca", "AI Dev Copilot subscription", "GitHub / OpenAI", "rec-ai"),
    mkTx("tx-m0-8", "expense", dateInMonth(m0, clampCurrent(13)), 390_000, "food", "w-gopay", "Team ramen dinner & matcha", "Marutama Ramen"),
    mkTx("tx-m0-9", "income", dateInMonth(m0, clampCurrent(15)), 2_100_000, "freelance", "w-bca", "Frontend sprint & API integration", "Remote Sprint"),
    mkTx("tx-m0-10", "expense", dateInMonth(m0, clampCurrent(17)), 1_250_000, "family", "w-bni", "Monthly family support", "Family Transfer"),
    mkTx("tx-m0-11", "expense", dateInMonth(m0, clampCurrent(19)), 480_000, "health", "w-bca", "Monthly gym membership", "Fitness Center"),
    mkTx("tx-m0-12", "expense", dateInMonth(m0, clampCurrent(21)), 315_000, "entertainment", "w-cash", "Afternoon coffee, manga & parking", "Gramedia / Cafe"),
    mkTx("tx-m0-13", "expense", dateInMonth(m0, clampCurrent(22)), 620_000, "food", "w-gopay", "Weekday lunches (week 3)", "QRIS Canteen & Cafe"),
    mkTransfer("tx-m0-14", dateInMonth(m0, clampCurrent(23)), 3_500_000, "w-bni", "w-savings", "Monthly Emergency & Japan trip fund", 0),
  ];

  const budgets: Budget[] = [
    { id: "b-m0-food", month: m0, categoryId: "food", limitIdr: 2_200_000 },
    { id: "b-m0-housing", month: m0, categoryId: "housing", limitIdr: 2_600_000 },
    { id: "b-m0-transport", month: m0, categoryId: "transport", limitIdr: 800_000 },
    { id: "b-m0-subs", month: m0, categoryId: "subscriptions", limitIdr: 850_000 },
    { id: "b-m0-health", month: m0, categoryId: "health", limitIdr: 600_000 },
    { id: "b-m0-ent", month: m0, categoryId: "entertainment", limitIdr: 700_000 },
    { id: "b-m0-fam", month: m0, categoryId: "family", limitIdr: 1_500_000 },
    { id: "b-m1-food", month: m1, categoryId: "food", limitIdr: 2_200_000 },
    { id: "b-m1-housing", month: m1, categoryId: "housing", limitIdr: 2_600_000 },
  ];

  const recurring: RecurringItem[] = [
    {
      id: "rec-salary",
      title: "Monthly Salary & Allowance",
      type: "income",
      categoryId: "salary",
      walletId: "w-bni",
      dayOfMonth: 1,
      amountIdr: 13_200_000,
      note: "PT BNI (Persero) Tbk",
      active: true,
    },
    {
      id: "rec-kost",
      title: "Rent & Electricity",
      type: "expense",
      categoryId: "housing",
      walletId: "w-bni",
      dayOfMonth: 2,
      amountIdr: 2_450_000,
      note: "Kost Sudirman",
      active: true,
    },
    {
      id: "rec-net",
      title: "Fiber Internet & Spotify Duo",
      type: "expense",
      categoryId: "subscriptions",
      walletId: "w-bca",
      dayOfMonth: 5,
      amountIdr: 350_000,
      note: "Biznet / Spotify",
      active: true,
    },
    {
      id: "rec-ai",
      title: "AI Dev Copilot Pro",
      type: "expense",
      categoryId: "subscriptions",
      walletId: "w-bca",
      dayOfMonth: 11,
      amountIdr: 330_000,
      note: "Monthly developer tools",
      active: true,
    },
    {
      id: "rec-cloud",
      title: "Domain & Cloud Hosting",
      type: "expense",
      categoryId: "subscriptions",
      walletId: "w-bca",
      dayOfMonth: 26,
      amountIdr: 200_000,
      note: "SHIZUKU ecosystem hosting",
      active: true,
    },
  ];

  const goals: SavingsGoal[] = [
    {
      id: "g-emergency",
      name: "6-Month Emergency Fund",
      targetIdr: 45_000_000,
      savedIdr: 32_500_000,
      deadline: `${now.getFullYear() + 1}-06-30`,
      color: "#745bc7",
      note: "Target 6x monthly baseline expenses",
    },
    {
      id: "g-japan",
      name: "Autumn Trip — Tokyo & Kyoto",
      targetIdr: 28_000_000,
      savedIdr: 12_400_000,
      deadline: `${now.getFullYear() + 1}-11-15`,
      color: "#b42e69",
      note: "Flights, JR Pass, lodging & food",
    },
    {
      id: "g-gear",
      name: "4K Monitor & Desk Setup",
      targetIdr: 12_000_000,
      savedIdr: 7_800_000,
      deadline: `${now.getFullYear() + 1}-03-31`,
      color: "#1e6c99",
      note: "Daily workstation upgrade",
    },
  ];

  return {
    version: 3,
    wallets,
    transactions,
    budgets,
    recurring,
    goals,
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
    version: 3,
    wallets: [
      {
        id: "w-main",
        name: "Primary Bank",
        institution: "Bank",
        type: "bank",
        initialBalanceIdr: 0,
        color: "#745bc7",
      },
      {
        id: "w-ewallet",
        name: "E-Wallet / QRIS",
        institution: "Digital Wallet",
        type: "ewallet",
        initialBalanceIdr: 0,
        color: "#117a62",
      },
      {
        id: "w-cash",
        name: "Cash",
        institution: "Cash",
        type: "cash",
        initialBalanceIdr: 0,
        color: "#d749d5",
      },
    ],
    transactions: [],
    budgets: [],
    recurring: [],
    goals: [],
    settings: {
      locale: "en",
      privacyMode: false,
      rainEnabled: true,
      shizukuWebsiteUrl: "",
    },
  };
}
