import type { CategoryDefinition } from "../types/cashflow";

export const CATEGORIES: CategoryDefinition[] = [
  // Income
  { id: "salary", type: "income", nameId: "Gaji & Tunjangan", nameEn: "Salary & Allowance", color: "#117a62" },
  { id: "freelance", type: "income", nameId: "Proyek & Freelance", nameEn: "Projects & Freelance", color: "#1e6c99" },
  { id: "investment_return", type: "income", nameId: "Dividen & Bunga", nameEn: "Dividends & Interest", color: "#745bc7" },
  { id: "bonus", type: "income", nameId: "Bonus & THR", nameEn: "Bonus & Incentives", color: "#7650f3" },
  { id: "other_income", type: "income", nameId: "Pemasukan Lain", nameEn: "Other Income", color: "#0e9f8a" },

  // Expense
  { id: "food", type: "expense", nameId: "Makan & Kopi", nameEn: "Food & Coffee", color: "#b42e69" },
  { id: "housing", type: "expense", nameId: "Kost & Utilitas", nameEn: "Housing & Utilities", color: "#745bc7" },
  { id: "transport", type: "expense", nameId: "Transportasi", nameEn: "Transport & Commute", color: "#1e6c99" },
  { id: "subscriptions", type: "expense", nameId: "Langganan & Digital", nameEn: "Subscriptions & Digital", color: "#7650f3" },
  { id: "shopping", type: "expense", nameId: "Belanja & Kebutuhan", nameEn: "Shopping & Essentials", color: "#d749d5" },
  { id: "health", type: "expense", nameId: "Kesehatan & Olahraga", nameEn: "Health & Fitness", color: "#1b9aaa" },
  { id: "entertainment", type: "expense", nameId: "Hiburan & Hobi", nameEn: "Leisure & Hobby", color: "#a855f7" },
  { id: "education", type: "expense", nameId: "Edukasi & Buku", nameEn: "Education & Books", color: "#4f46e5" },
  { id: "family", type: "expense", nameId: "Keluarga & Berbagi", nameEn: "Family & Giving", color: "#db5a9c" },
  { id: "other_expense", type: "expense", nameId: "Pengeluaran Lain", nameEn: "Other Expense", color: "#6b5f82" },
];

export const CATEGORY_MAP: Record<string, CategoryDefinition> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export function getCategoryLabel(categoryId: string, locale: "en" | "id"): string {
  const cat = CATEGORY_MAP[categoryId];
  if (!cat) return categoryId;
  return locale === "id" ? cat.nameId : cat.nameEn;
}
