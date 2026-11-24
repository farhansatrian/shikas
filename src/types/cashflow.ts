export type Locale = "en" | "id";

export type TransactionType = "income" | "expense";

export type NavTab = "home" | "cashflow" | "analytics" | "data";

export interface CategoryDefinition {
  id: string;
  type: TransactionType;
  nameId: string;
  nameEn: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  amountIdr: number; // Always positive integer IDR
  categoryId: string;
  note: string;
  merchant?: string;
  createdAt: string;
}

export interface AppSettings {
  locale: Locale;
  privacyMode: boolean;
  rainEnabled: boolean;
  shizukuWebsiteUrl: string;
}

export interface CashflowStoreData {
  version: number;
  transactions: Transaction[];
  settings: AppSettings;
}
