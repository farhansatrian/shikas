import type { CategoryDefinition } from "../types/cashflow";

export const CATEGORIES: CategoryDefinition[] = [
  // Income
  { id: "salary", type: "income", nameId: "Gaji", nameEn: "Salary", color: "#108469", icon: "Briefcase" },
  { id: "freelance", type: "income", nameId: "Freelance", nameEn: "Freelance", color: "#1e7aa8", icon: "Laptop" },
  { id: "investment_return", type: "income", nameId: "Investasi", nameEn: "Investments", color: "#745bc7", icon: "TrendingUp" },
  { id: "bonus", type: "income", nameId: "Bonus", nameEn: "Bonus", color: "#7f5af0", icon: "Sparkles" },
  { id: "other_income", type: "income", nameId: "Lainnya", nameEn: "Other", color: "#0e9f8a", icon: "PlusCircle" },

  // Expense
  { id: "food", type: "expense", nameId: "Makan & Kopi", nameEn: "Food & Coffee", color: "#c43673", icon: "Utensils" },
  { id: "housing", type: "expense", nameId: "Kost & Utilitas", nameEn: "Housing", color: "#745bc7", icon: "Home" },
  { id: "transport", type: "expense", nameId: "Transportasi", nameEn: "Transport", color: "#2578a8", icon: "Train" },
  { id: "subscriptions", type: "expense", nameId: "Langganan", nameEn: "Subscriptions", color: "#7f5af0", icon: "Cloud" },
  { id: "shopping", type: "expense", nameId: "Belanja", nameEn: "Shopping", color: "#d14fb8", icon: "ShoppingBag" },
  { id: "health", type: "expense", nameId: "Kesehatan", nameEn: "Health", color: "#19969e", icon: "HeartPulse" },
  { id: "entertainment", type: "expense", nameId: "Hiburan", nameEn: "Leisure", color: "#9b5de5", icon: "Music" },
  { id: "education", type: "expense", nameId: "Edukasi", nameEn: "Education", color: "#5252d4", icon: "BookOpen" },
  { id: "family", type: "expense", nameId: "Keluarga", nameEn: "Family", color: "#db5a9c", icon: "Gift" },
  { id: "other_expense", type: "expense", nameId: "Lainnya", nameEn: "Other", color: "#6b5f82", icon: "Receipt" },
];

export const CATEGORY_MAP: Record<string, CategoryDefinition> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export function getCategoryLabel(categoryId: string, locale: "en" | "id"): string {
  const cat = CATEGORY_MAP[categoryId];
  if (!cat) return categoryId;
  return locale === "id" ? cat.nameId : cat.nameEn;
}
