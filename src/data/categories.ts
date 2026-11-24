import type { CategoryDefinition } from "../types/cashflow";

export const CATEGORIES: CategoryDefinition[] = [
  // Income
  {
    id: "salary",
    type: "income",
    nameId: "Gaji & Tunjangan",
    nameEn: "Salary & Allowance",
    color: "#14866d",
    icon: "Briefcase",
  },
  {
    id: "freelance",
    type: "income",
    nameId: "Proyek & Freelance",
    nameEn: "Projects & Freelance",
    color: "#2276a8",
    icon: "Laptop",
  },
  {
    id: "investment_return",
    type: "income",
    nameId: "Dividen & Bunga",
    nameEn: "Dividends & Interest",
    color: "#745bc7",
    icon: "TrendingUp",
  },
  {
    id: "bonus",
    type: "income",
    nameId: "Bonus & THR",
    nameEn: "Bonus & Incentives",
    color: "#7650f3",
    icon: "Sparkles",
  },
  {
    id: "other_income",
    type: "income",
    nameId: "Pemasukan Lain",
    nameEn: "Other Income",
    color: "#0e9f8a",
    icon: "PlusCircle",
  },

  // Expense
  {
    id: "food",
    type: "expense",
    nameId: "Makan & Kopi",
    nameEn: "Food & Coffee",
    color: "#c23b7b",
    icon: "Utensils",
  },
  {
    id: "housing",
    type: "expense",
    nameId: "Kost & Utilitas",
    nameEn: "Housing & Utilities",
    color: "#745bc7",
    icon: "Home",
  },
  {
    id: "transport",
    type: "expense",
    nameId: "Transportasi",
    nameEn: "Transport & Commute",
    color: "#2276a8",
    icon: "Train",
  },
  {
    id: "subscriptions",
    type: "expense",
    nameId: "Langganan & SaaS",
    nameEn: "Subscriptions & SaaS",
    color: "#7650f3",
    icon: "Cloud",
  },
  {
    id: "shopping",
    type: "expense",
    nameId: "Belanja & Gear",
    nameEn: "Shopping & Gear",
    color: "#d749d5",
    icon: "ShoppingBag",
  },
  {
    id: "health",
    type: "expense",
    nameId: "Kesehatan & Olahraga",
    nameEn: "Health & Fitness",
    color: "#1b9aaa",
    icon: "HeartPulse",
  },
  {
    id: "entertainment",
    type: "expense",
    nameId: "Hiburan & Hobi",
    nameEn: "Leisure & Hobby",
    color: "#a855f7",
    icon: "Music",
  },
  {
    id: "education",
    type: "expense",
    nameId: "Edukasi & Buku",
    nameEn: "Education & Books",
    color: "#4f46e5",
    icon: "BookOpen",
  },
  {
    id: "family",
    type: "expense",
    nameId: "Keluarga & Berbagi",
    nameEn: "Family & Giving",
    color: "#db5a9c",
    icon: "Gift",
  },
  {
    id: "other_expense",
    type: "expense",
    nameId: "Pengeluaran Lain",
    nameEn: "Other Expense",
    color: "#6b5f82",
    icon: "Receipt",
  },

  // Transfer
  {
    id: "transfer",
    type: "transfer",
    nameId: "Transfer Dompet",
    nameEn: "Wallet Transfer",
    color: "#2276a8",
    icon: "ArrowLeftRight",
  },
];

export const CATEGORY_MAP: Record<string, CategoryDefinition> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export function getCategoryLabel(categoryId: string, locale: "id" | "en"): string {
  const cat = CATEGORY_MAP[categoryId];
  if (!cat) return categoryId;
  return locale === "id" ? cat.nameId : cat.nameEn;
}
