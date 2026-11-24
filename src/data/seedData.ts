import type {
  Budget,
  CashflowStoreData,
  RecurringItem,
  SavingsGoal,
  Transaction,
  Wallet,
} from "../types/cashflow";
import { DEFAULT_FALLBACK_USD_TO_IDR } from "../services/fxService";
import { getMonthKey, shiftMonthKey } from "../utils/format";

function dateInMonth(monthKey: string, day: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const maxDay = new Date(y, m, 0).getDate();
  const safeDay = Math.min(Math.max(1, day), maxDay);
  return `${monthKey}-${String(safeDay).padStart(2, "0")}`;
}

export function createDemoSeedData(): CashflowStoreData {
  const now = new Date();
  const m0 = getMonthKey(now); // Current month
  const m1 = shiftMonthKey(m0, -1);
  const m2 = shiftMonthKey(m0, -2);
  const m3 = shiftMonthKey(m0, -3);
  const todayDay = Math.max(1, now.getDate());
  const clampCurrent = (d: number) => Math.min(d, todayDay);

  const wallets: Wallet[] = [
    {
      id: "w-bni",
      name: "BNI Taplus",
      institution: "Bank BNI",
      type: "bank",
      initialBalanceIdr: 14_500_000,
      color: "#745bc7",
    },
    {
      id: "w-bca",
      name: "BCA Everyday",
      institution: "Bank BCA",
      type: "bank",
      initialBalanceIdr: 6_250_000,
      color: "#2276a8",
    },
    {
      id: "w-gopay",
      name: "GoPay / QRIS",
      institution: "GoTo Financial",
      type: "ewallet",
      initialBalanceIdr: 1_150_000,
      color: "#14866d",
    },
    {
      id: "w-savings",
      name: "Bibit & Dana Darurat",
      institution: "Reksadana Pasar Uang",
      type: "savings",
      initialBalanceIdr: 22_000_000,
      color: "#7650f3",
    },
    {
      id: "w-cash",
      name: "Dompet Tunai",
      institution: "Cash",
      type: "cash",
      initialBalanceIdr: 650_000,
      color: "#d749d5",
    },
  ];

  const fx = DEFAULT_FALLBACK_USD_TO_IDR;

  const mkIdrTx = (
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
    originalCurrency: "IDR",
    originalAmount: amountIdr,
    recurringId,
    createdAt: `${date}T09:00:00.000Z`,
  });

  const mkUsdTx = (
    id: string,
    type: "income" | "expense",
    date: string,
    amountUsd: number,
    rate: number,
    categoryId: string,
    walletId: string,
    note: string,
    merchant?: string,
    recurringId?: string
  ): Transaction => ({
    id,
    type,
    date,
    amountIdr: Math.round(amountUsd * rate),
    categoryId,
    walletId,
    note,
    merchant,
    originalCurrency: "USD",
    originalAmount: amountUsd,
    fxRateAtEntry: rate,
    recurringId,
    createdAt: `${date}T10:15:00.000Z`,
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
    originalCurrency: "IDR",
    originalAmount: amountIdr,
    createdAt: `${date}T11:30:00.000Z`,
  });

  const transactions: Transaction[] = [
    // --- 3 months ago (m3) ---
    mkIdrTx("tx-m3-1", "income", dateInMonth(m3, 1), 12_500_000, "salary", "w-bni", "Gaji bulanan", "PT BNI (Persero) Tbk", "rec-salary"),
    mkIdrTx("tx-m3-2", "expense", dateInMonth(m3, 3), 2_400_000, "housing", "w-bni", "Sewa kost & listrik bulanan", "Kost Sudirman", "rec-kost"),
    mkIdrTx("tx-m3-3", "expense", dateInMonth(m3, 6), 1_650_000, "food", "w-gopay", "Makan harian, kopi & groceries", "QRIS / Kopi Kenangan"),
    mkIdrTx("tx-m3-4", "expense", dateInMonth(m3, 9), 620_000, "transport", "w-gopay", "MRT, TransJakarta & ojek online", "MRT Jakarta / Gojek"),
    mkUsdTx("tx-m3-5", "expense", dateInMonth(m3, 12), 20, fx - 120, "subscriptions", "w-bca", "Langganan AI Dev Copilot", "OpenAI / GitHub", "rec-ai"),
    mkIdrTx("tx-m3-6", "expense", dateInMonth(m3, 16), 950_000, "shopping", "w-bca", "Keycap mechanical & aksesoris desk", "Tokopedia"),
    mkIdrTx("tx-m3-7", "expense", dateInMonth(m3, 20), 1_200_000, "family", "w-bni", "Kirim bulanan orang tua", "Transfer Keluarga"),
    mkTransfer("tx-m3-8", dateInMonth(m3, 24), 3_000_000, "w-bni", "w-savings", "Alokasi rutin Reksadana Pasar Uang", 0),

    // --- 2 months ago (m2) ---
    mkIdrTx("tx-m2-1", "income", dateInMonth(m2, 1), 12_500_000, "salary", "w-bni", "Gaji bulanan", "PT BNI (Persero) Tbk", "rec-salary"),
    mkUsdTx("tx-m2-2", "income", dateInMonth(m2, 10), 180, fx - 60, "freelance", "w-bca", "Mini UI audit & React component review", "Client Remote"),
    mkIdrTx("tx-m2-3", "expense", dateInMonth(m2, 3), 2_400_000, "housing", "w-bni", "Sewa kost & listrik bulanan", "Kost Sudirman", "rec-kost"),
    mkIdrTx("tx-m2-4", "expense", dateInMonth(m2, 8), 1_820_000, "food", "w-gopay", "Makan siang kantor & ngopi weekend", "QRIS / Fore Coffee"),
    mkIdrTx("tx-m2-5", "expense", dateInMonth(m2, 11), 680_000, "transport", "w-gopay", "Commuter + GoCar hujan", "MRT / Gojek"),
    mkUsdTx("tx-m2-6", "expense", dateInMonth(m2, 14), 20, fx - 40, "subscriptions", "w-bca", "Langganan AI Dev Copilot", "OpenAI / GitHub", "rec-ai"),
    mkIdrTx("tx-m2-7", "expense", dateInMonth(m2, 18), 540_000, "health", "w-bca", "Membership gym & vitamin", "Fitness / Guardian"),
    mkIdrTx("tx-m2-8", "expense", dateInMonth(m2, 22), 1_200_000, "family", "w-bni", "Kirim bulanan orang tua", "Transfer Keluarga"),
    mkIdrTx("tx-m2-9", "expense", dateInMonth(m2, 25), 490_000, "entertainment", "w-gopay", "Nonton bioskop & vinyl OST anime", "CGV / Gramedia"),
    mkTransfer("tx-m2-10", dateInMonth(m2, 27), 4_000_000, "w-bni", "w-savings", "Top-up tabungan Dana Darurat", 2500),

    // --- Last month (m1) ---
    mkIdrTx("tx-m1-1", "income", dateInMonth(m1, 1), 13_200_000, "salary", "w-bni", "Gaji bulanan + tunjangan", "PT BNI (Persero) Tbk", "rec-salary"),
    mkIdrTx("tx-m1-2", "income", dateInMonth(m1, 15), 425_000, "investment_return", "w-savings", "Imbal hasil kupon & RDPU", "Bibit"),
    mkIdrTx("tx-m1-3", "expense", dateInMonth(m1, 2), 2_450_000, "housing", "w-bni", "Sewa kost, air & token listrik", "Kost Sudirman", "rec-kost"),
    mkIdrTx("tx-m1-4", "expense", dateInMonth(m1, 5), 350_000, "subscriptions", "w-bca", "Internet fiber & Spotify Duo", "Biznet / Spotify", "rec-net"),
    mkIdrTx("tx-m1-5", "expense", dateInMonth(m1, 9), 1_940_000, "food", "w-gopay", "Makan harian, matcha & groceries", "QRIS / Superindo"),
    mkIdrTx("tx-m1-6", "expense", dateInMonth(m1, 12), 710_000, "transport", "w-gopay", "MRT, KRL & ojek harian", "JakLingko / Gojek"),
    mkUsdTx("tx-m1-7", "expense", dateInMonth(m1, 14), 20, fx + 30, "subscriptions", "w-bca", "Langganan AI Dev Copilot", "OpenAI / GitHub", "rec-ai"),
    mkIdrTx("tx-m1-8", "expense", dateInMonth(m1, 19), 650_000, "education", "w-bca", "Buku arsitektur sistem & kursus cloud", "Periplus / Udemy"),
    mkIdrTx("tx-m1-9", "expense", dateInMonth(m1, 21), 1_250_000, "family", "w-bni", "Kirim bulanan orang tua", "Transfer Keluarga"),
    mkIdrTx("tx-m1-10", "expense", dateInMonth(m1, 24), 480_000, "health", "w-bca", "Gym bulanan", "Fitness Center"),
    mkTransfer("tx-m1-11", dateInMonth(m1, 26), 1_800_000, "w-bni", "w-gopay", "Top-up GoPay untuk makan & transport", 2500),
    mkTransfer("tx-m1-12", dateInMonth(m1, 27), 3_500_000, "w-bni", "w-savings", "Alokasi rutin tabungan & investasi", 0),

    // --- Current month (m0) ---
    mkIdrTx("tx-m0-1", "income", dateInMonth(m0, 1), 13_200_000, "salary", "w-bni", "Gaji bulanan + tunjangan", "PT BNI (Persero) Tbk", "rec-salary"),
    mkIdrTx("tx-m0-2", "expense", dateInMonth(m0, clampCurrent(2)), 2_450_000, "housing", "w-bni", "Sewa kost & listrik bulanan", "Kost Sudirman", "rec-kost"),
    mkTransfer("tx-m0-3", dateInMonth(m0, clampCurrent(3)), 2_000_000, "w-bni", "w-gopay", "Top-up budget harian QRIS", 2500),
    mkIdrTx("tx-m0-4", "expense", dateInMonth(m0, clampCurrent(5)), 350_000, "subscriptions", "w-bca", "Internet fiber & Spotify Duo", "Biznet / Spotify", "rec-net"),
    mkIdrTx("tx-m0-5", "expense", dateInMonth(m0, clampCurrent(6)), 485_000, "food", "w-gopay", "Belanja mingguan buah, kopi & meal prep", "Grand Lucky / QRIS"),
    mkIdrTx("tx-m0-6", "expense", dateInMonth(m0, clampCurrent(9)), 245_000, "transport", "w-gopay", "Kartu MRT & GoRide kantor", "MRT Jakarta"),
    mkUsdTx("tx-m0-7", "expense", dateInMonth(m0, clampCurrent(11)), 20, fx, "subscriptions", "w-bca", "Langganan AI Dev Copilot", "OpenAI / GitHub", "rec-ai"),
    mkIdrTx("tx-m0-8", "expense", dateInMonth(m0, clampCurrent(13)), 390_000, "food", "w-gopay", "Makan malam ramen & matcha bersama tim", "Marutama Ramen"),
    mkUsdTx("tx-m0-9", "income", dateInMonth(m0, clampCurrent(15)), 125, fx, "freelance", "w-bca", "Konsultasi frontend & integrasi API", "Remote Sprint"),
    mkIdrTx("tx-m0-10", "expense", dateInMonth(m0, clampCurrent(17)), 1_250_000, "family", "w-bni", "Kirim bulanan orang tua", "Transfer Keluarga"),
    mkIdrTx("tx-m0-11", "expense", dateInMonth(m0, clampCurrent(19)), 480_000, "health", "w-bca", "Membership gym bulanan", "Fitness Center"),
    mkIdrTx("tx-m0-12", "expense", dateInMonth(m0, clampCurrent(21)), 315_000, "entertainment", "w-cash", "Ngopi sore, komik & parkir", "Gramedia / Kopi"),
    mkIdrTx("tx-m0-13", "expense", dateInMonth(m0, clampCurrent(22)), 620_000, "food", "w-gopay", "Makan siang harian minggu ke-3", "QRIS Kantin & Cafe"),
    mkTransfer("tx-m0-14", dateInMonth(m0, clampCurrent(23)), 3_500_000, "w-bni", "w-savings", "Setoran rutin Dana Darurat & Jepang", 0),
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
      title: "Gaji Bulanan & Tunjangan",
      type: "income",
      categoryId: "salary",
      walletId: "w-bni",
      dayOfMonth: 1,
      currency: "IDR",
      amount: 13_200_000,
      note: "PT BNI (Persero) Tbk",
      active: true,
    },
    {
      id: "rec-kost",
      title: "Sewa Kost & Listrik",
      type: "expense",
      categoryId: "housing",
      walletId: "w-bni",
      dayOfMonth: 2,
      currency: "IDR",
      amount: 2_450_000,
      note: "Kost Sudirman",
      active: true,
    },
    {
      id: "rec-net",
      title: "Internet Fiber & Spotify",
      type: "expense",
      categoryId: "subscriptions",
      walletId: "w-bca",
      dayOfMonth: 5,
      currency: "IDR",
      amount: 350_000,
      note: "Biznet / Spotify Duo",
      active: true,
    },
    {
      id: "rec-ai",
      title: "AI Dev Copilot Pro",
      type: "expense",
      categoryId: "subscriptions",
      walletId: "w-bca",
      dayOfMonth: 11,
      currency: "USD",
      amount: 20,
      note: "Ditagih dalam USD — auto-konversi kurs real-time",
      active: true,
    },
    {
      id: "rec-cloud",
      title: "Domain & Cloud Hosting",
      type: "expense",
      categoryId: "subscriptions",
      walletId: "w-bca",
      dayOfMonth: 26,
      currency: "USD",
      amount: 12,
      note: "VPS / Vercel / Domain ekosistem Shizuku",
      active: true,
    },
  ];

  const goals: SavingsGoal[] = [
    {
      id: "g-emergency",
      name: "Dana Darurat 6 Bulan",
      targetIdr: 45_000_000,
      savedIdr: 32_500_000,
      deadline: `${now.getFullYear() + 1}-06-30`,
      color: "#745bc7",
      note: "Target aman 6x pengeluaran rutin bulanan",
    },
    {
      id: "g-japan",
      name: "Autumn Trip — Tokyo & Kyoto",
      targetIdr: 28_000_000,
      savedIdr: 12_400_000,
      deadline: `${now.getFullYear() + 1}-11-15`,
      color: "#d749d5",
      note: "Tiket PP, JR Pass, penginapan & kuliner",
    },
    {
      id: "g-gear",
      name: "Workstation & Monitor 4K",
      targetIdr: 12_000_000,
      savedIdr: 7_800_000,
      deadline: `${now.getFullYear() + 1}-03-31`,
      color: "#2276a8",
      note: "Upgrade setup desk coding harian",
    },
  ];

  return {
    version: 1,
    wallets,
    transactions,
    budgets,
    recurring,
    goals,
    settings: {
      locale: "id",
      displayCurrency: "DUAL",
      privacyMode: false,
      rainEnabled: true,
      shizukuPortfolioUrl: "https://github.com/farhansatrian/shizuku",
    },
  };
}

export function createFreshEmptyData(): CashflowStoreData {
  return {
    version: 1,
    wallets: [
      {
        id: "w-main",
        name: "Rekening Utama",
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
        color: "#14866d",
      },
      {
        id: "w-cash",
        name: "Tunai",
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
      locale: "id",
      displayCurrency: "DUAL",
      privacyMode: false,
      rainEnabled: true,
      shizukuPortfolioUrl: "https://github.com/farhansatrian/shizuku",
    },
  };
}
