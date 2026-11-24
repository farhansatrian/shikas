import type { CategoryDefinition } from "../types/cashflow";

export const CATEGORIES: CategoryDefinition[] = [
  // Income (Rain-Blue & Iris tones)
  { id: "salary", type: "income", nameId: "Gaji", nameEn: "Salary", color: "#2276a8", icon: "Briefcase" },
  { id: "freelance", type: "income", nameId: "Freelance", nameEn: "Freelance", color: "#2d89b8", icon: "Laptop" },
  { id: "investment_return", type: "income", nameId: "Investasi", nameEn: "Investments", color: "#745bc7", icon: "TrendingUp" },
  { id: "bonus", type: "income", nameId: "Bonus", nameEn: "Bonus", color: "#7650f3", icon: "Sparkles" },
  { id: "other_income", type: "income", nameId: "Lainnya", nameEn: "Other", color: "#3b8ca8", icon: "PlusCircle" },

  // Expense (SHIZUKU Magenta, Violet & Iris tones)
  { id: "food", type: "expense", nameId: "Makan & Kopi", nameEn: "Food & Coffee", color: "#c837a5", icon: "Utensils" },
  { id: "housing", type: "expense", nameId: "Kost & Utilitas", nameEn: "Housing", color: "#745bc7", icon: "Home" },
  { id: "transport", type: "expense", nameId: "Transportasi", nameEn: "Transport", color: "#4e6bc4", icon: "Train" },
  { id: "subscriptions", type: "expense", nameId: "Langganan", nameEn: "Subscriptions", color: "#8b5cf6", icon: "Cloud" },
  { id: "shopping", type: "expense", nameId: "Belanja", nameEn: "Shopping", color: "#d749d5", icon: "ShoppingBag" },
  { id: "health", type: "expense", nameId: "Kesehatan", nameEn: "Health", color: "#2276a8", icon: "HeartPulse" },
  { id: "entertainment", type: "expense", nameId: "Hiburan", nameEn: "Leisure", color: "#a855d7", icon: "Music" },
  { id: "education", type: "expense", nameId: "Edukasi", nameEn: "Education", color: "#5e57c7", icon: "BookOpen" },
  { id: "family", type: "expense", nameId: "Keluarga", nameEn: "Family", color: "#e062c8", icon: "Gift" },
  { id: "other_expense", type: "expense", nameId: "Lainnya", nameEn: "Other", color: "#6a5c85", icon: "Receipt" },
];

export const CATEGORY_MAP: Record<string, CategoryDefinition> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export function getCategoryLabel(categoryId: string, locale: "en" | "id"): string {
  const cat = CATEGORY_MAP[categoryId];
  if (!cat) return categoryId;
  return locale === "id" ? cat.nameId : cat.nameEn;
}
