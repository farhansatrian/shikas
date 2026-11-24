export type Locale = "id" | "en";

export type DisplayCurrencyMode = "IDR" | "USD" | "DUAL";

export type EntryCurrency = "IDR" | "USD";

export type TransactionType = "income" | "expense" | "transfer";

export type WalletType = "bank" | "ewallet" | "cash" | "savings";

export type NavTab =
  | "dashboard"
  | "ledger"
  | "wallets"
  | "budgets"
  | "analytics"
  | "planning"
  | "settings";

export interface CategoryDefinition {
  id: string;
  type: "income" | "expense" | "transfer";
  nameId: string;
  nameEn: string;
  color: string;
  icon: string;
}

export interface Wallet {
  id: string;
  name: string;
  institution?: string;
  type: WalletType;
  initialBalanceIdr: number;
  color: string;
  isArchived?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  amountIdr: number; // Always positive integer IDR
  categoryId: string;
  walletId: string;
  toWalletId?: string; // Only for transfer
  feeIdr?: number; // Optional transfer admin fee (e.g., BI-FAST Rp 2.500)
  note: string;
  merchant?: string;
  originalCurrency: EntryCurrency;
  originalAmount: number;
  fxRateAtEntry?: number; // USD -> IDR rate when originalCurrency === "USD"
  recurringId?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  month: string; // YYYY-MM
  categoryId: string;
  limitIdr: number;
}

export interface RecurringItem {
  id: string;
  title: string;
  type: "income" | "expense";
  categoryId: string;
  walletId: string;
  dayOfMonth: number; // 1 - 28
  currency: EntryCurrency;
  amount: number; // Nominal in `currency` (IDR or USD)
  note?: string;
  active: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetIdr: number;
  savedIdr: number;
  deadline?: string; // YYYY-MM-DD
  color: string;
  note?: string;
}

export interface FxRateState {
  usdToIdr: number;
  source: "open.er-api.com" | "frankfurter.dev" | "cached" | "fallback";
  updatedAt: string; // ISO timestamp
  status: "loading" | "live" | "cached" | "fallback";
  error?: string;
}

export interface AppSettings {
  locale: Locale;
  displayCurrency: DisplayCurrencyMode;
  privacyMode: boolean;
  rainEnabled: boolean;
  shizukuPortfolioUrl: string;
}

export interface CashflowStoreData {
  version: number;
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringItem[];
  goals: SavingsGoal[];
  settings: AppSettings;
}
