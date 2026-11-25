export type Locale = "en" | "id";

export type TransactionType = "income" | "expense" | "transfer";

export type AccountRole = "daily" | "savings";

export type NavTab = "home" | "cashflow" | "analytics";

export interface ShizukuUser {
  id: string;
  email: string;
  displayName: string;
  mode: "cloud" | "local";
  createdAt: string;
}

export interface PocketAccount {
  id: string;
  name: string;
  role: AccountRole;
  openingBalanceIdr: number; // Existing balance before tracking — never counted as monthly income
  color: string;
  isDefault?: boolean;
}

export interface CategoryDefinition {
  id: string;
  type: TransactionType;
  nameId: string;
  nameEn: string;
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  amountIdr: number; // Always positive integer IDR (for transfer: amount credited to destination)
  categoryId: string;
  note: string;
  merchant?: string;
  accountId?: string; // Income: target pocket | Expense: source pocket | Transfer: FROM pocket
  toAccountId?: string; // Transfer only: TO pocket
  feeIdr?: number; // Transfer only: optional admin fee deducted from FROM pocket & counted as expense
  createdAt: string;
}

export interface AppSettings {
  locale: Locale;
  privacyMode: boolean;
  rainEnabled: boolean;
  cycleStartDay: number; // 1..28 (1 = calendar month; e.g. 25 = 25th to 24th next month)
  shizukuWebsiteUrl: string;
}

export interface CashflowStoreData {
  version: number;
  accounts: PocketAccount[];
  transactions: Transaction[];
  settings: AppSettings;
}
