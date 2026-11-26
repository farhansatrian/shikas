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
  isSystem?: boolean; // Protected fallback/system category (editable, cannot be deleted)
}

export type ReimburseStatus = "pending" | "settled";

export interface ReimbursementEntry {
  id: string;
  date: string; // YYYY-MM-DD when friend/payer paid back
  amountIdr: number; // Always positive integer IDR
  accountId?: string; // Destination pocket receiving reimbursement (e.g. Wondr)
  note?: string;
  createdAt: string;
}

export interface ReimbursementInfo {
  status: ReimburseStatus; // "pending" (waiting / partial) | "settled" (full / lunas)
  expectedIdr?: number; // Optional target amount; omitted = flexible (amount unknown upfront)
  from?: string; // Optional payer/person reminder (e.g. "Budi")
  settledAt?: string; // ISO timestamp when marked settled
  entries: ReimbursementEntry[]; // Partial or full repayments received
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
  reimburse?: ReimbursementInfo; // Expense only: optional contra-expense reimbursement ledger
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
  categories: CategoryDefinition[];
  transactions: Transaction[];
  settings: AppSettings;
}
