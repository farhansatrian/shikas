import type { CategoryDefinition, TransactionType } from "../types/cashflow";

export const CATEGORIES: CategoryDefinition[] = [
  // Income (2 concise categories)
  { id: "salary", type: "income", nameId: "Gaji", nameEn: "Salary", color: "#2276a8", icon: "Briefcase" },
  { id: "other_income", type: "income", nameId: "Lainnya", nameEn: "Other", color: "#745bc7", icon: "PlusCircle" },

  // Expense (7 everyday categories including Bank & Admin fees)
  { id: "food", type: "expense", nameId: "Makan & Minum", nameEn: "Food & Drinks", color: "#c837a5", icon: "Utensils" },
  { id: "housing", type: "expense", nameId: "Tagihan & Kost", nameEn: "Bills & Housing", color: "#745bc7", icon: "Home" },
  { id: "transport", type: "expense", nameId: "Transportasi", nameEn: "Transport", color: "#4e6bc4", icon: "Train" },
  { id: "shopping", type: "expense", nameId: "Belanja", nameEn: "Shopping", color: "#d749d5", icon: "ShoppingBag" },
  { id: "entertainment", type: "expense", nameId: "Hiburan", nameEn: "Leisure", color: "#8b5cf6", icon: "Music" },
  { id: "fees", type: "expense", nameId: "Admin Bank", nameEn: "Bank & Admin", color: "#4e5d78", icon: "Landmark" },
  { id: "other_expense", type: "expense", nameId: "Lainnya", nameEn: "Other", color: "#5d5370", icon: "Receipt" },

  // Transfer (pocket-to-pocket internal move)
  { id: "transfer", type: "transfer", nameId: "Transfer", nameEn: "Transfer", color: "#745bc7", icon: "ArrowLeftRight" },
];

export const CATEGORY_MAP: Record<string, CategoryDefinition> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  freelance: "other_income",
  investment_return: "other_income",
  bonus: "other_income",
  subscriptions: "housing",
  health: "other_expense",
  education: "other_expense",
  family: "other_expense",
};

export function normalizeCategoryId(
  categoryId: string,
  type: TransactionType
): string {
  if (type === "transfer") return "transfer";
  if (CATEGORY_MAP[categoryId] && CATEGORY_MAP[categoryId].type === type) {
    return categoryId;
  }
  const mapped = LEGACY_CATEGORY_MAP[categoryId];
  if (mapped && CATEGORY_MAP[mapped] && CATEGORY_MAP[mapped].type === type) {
    return mapped;
  }
  return type === "income" ? "other_income" : "other_expense";
}

export function getCategoryLabel(categoryId: string, locale: "en" | "id"): string {
  const cat = CATEGORY_MAP[categoryId] ?? CATEGORY_MAP[LEGACY_CATEGORY_MAP[categoryId] ?? ""];
  if (!cat) return categoryId;
  return locale === "id" ? cat.nameId : cat.nameEn;
}
