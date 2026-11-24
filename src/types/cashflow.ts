export type Locale = "en" | "id";

export type TransactionType = "income" | "expense" | "transfer";

export type WalletType = "bank" | "ewallet" | "cash" | "savings";

export type NavTab =
  | "home"
  | "ledger"
  | "wallets"
  | "plan"
  | "analytics"
  | "data";

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
  amountIdr: number;
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

export interface AppSettings {
  locale: Locale;
  privacyMode: boolean;
  rainEnabled: boolean;
  shizukuWebsiteUrl: string;
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
