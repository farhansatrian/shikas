import type { CategoryDefinition, TransactionType } from "../types/cashflow";

export const SYSTEM_CATEGORY_IDS = new Set([
  "other_income",
  "other_expense",
  "fees",
  "transfer",
]);

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  // Income (2 concise starter categories)
  {
    id: "salary",
    type: "income",
    nameId: "Gaji",
    nameEn: "Salary",
    color: "#2276a8",
    icon: "Briefcase",
  },
  {
    id: "other_income",
    type: "income",
    nameId: "Lainnya",
    nameEn: "Other",
    color: "#745bc7",
    icon: "PlusCircle",
    isSystem: true,
  },

  // Expense (8 starter categories including Giving & Bank Admin)
  {
    id: "food",
    type: "expense",
    nameId: "Makan & Minum",
    nameEn: "Food & Drinks",
    color: "#c837a5",
    icon: "Utensils",
  },
  {
    id: "housing",
    type: "expense",
    nameId: "Tagihan & Kost",
    nameEn: "Bills & Housing",
    color: "#745bc7",
    icon: "Home",
  },
  {
    id: "transport",
    type: "expense",
    nameId: "Transportasi",
    nameEn: "Transport",
    color: "#4e6bc4",
    icon: "Train",
  },
  {
    id: "shopping",
    type: "expense",
    nameId: "Belanja",
    nameEn: "Shopping",
    color: "#d749d5",
    icon: "ShoppingBag",
  },
  {
    id: "entertainment",
    type: "expense",
    nameId: "Hiburan",
    nameEn: "Leisure",
    color: "#8b5cf6",
    icon: "Music",
  },
  {
    id: "giving",
    type: "expense",
    nameId: "Berbagi",
    nameEn: "Giving",
    color: "#1f8f6b",
    icon: "Gift",
  },
  {
    id: "fees",
    type: "expense",
    nameId: "Admin Bank",
    nameEn: "Bank & Admin",
    color: "#4e5d78",
    icon: "Landmark",
    isSystem: true,
  },
  {
    id: "other_expense",
    type: "expense",
    nameId: "Lainnya",
    nameEn: "Other",
    color: "#5d5370",
    icon: "Receipt",
    isSystem: true,
  },

  // Transfer (pocket-to-pocket internal move)
  {
    id: "transfer",
    type: "transfer",
    nameId: "Transfer",
    nameEn: "Transfer",
    color: "#745bc7",
    icon: "ArrowLeftRight",
    isSystem: true,
  },
];

// Backward-compatible exports
export const CATEGORIES = DEFAULT_CATEGORIES;

export const CATEGORY_MAP: Record<string, CategoryDefinition> =
  Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.id, c]));

export const CATEGORY_COLORS = [
  { hex: "#c837a5", label: "Magenta" },
  { hex: "#745bc7", label: "Iris" },
  { hex: "#2276a8", label: "Cerulean" },
  { hex: "#1f8f6b", label: "Emerald" },
  { hex: "#d749d5", label: "Orchid" },
  { hex: "#4e6bc4", label: "Periwinkle" },
  { hex: "#d97706", label: "Amber" },
  { hex: "#4e5d78", label: "Slate" },
];

export const CATEGORY_ICONS = [
  "Utensils",
  "Coffee",
  "Home",
  "Train",
  "Car",
  "ShoppingBag",
  "Shirt",
  "Music",
  "Gamepad2",
  "Gift",
  "HeartPulse",
  "Dumbbell",
  "BookOpen",
  "Plane",
  "Smartphone",
  "Cloud",
  "Briefcase",
  "Laptop",
  "TrendingUp",
  "Wallet",
  "Sparkles",
  "Landmark",
  "Tag",
  "Receipt",
  "PlusCircle",
] as const;

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  freelance: "other_income",
  investment_return: "other_income",
  bonus: "other_income",
  subscriptions: "housing",
  health: "other_expense",
  education: "other_expense",
  family: "giving",
};

export function cloneDefaultCategories(): CategoryDefinition[] {
  return DEFAULT_CATEGORIES.map((c) => ({ ...c }));
}

export function isSystemCategoryId(id: string): boolean {
  return SYSTEM_CATEGORY_IDS.has(id);
}

export function sanitizeCategories(raw: unknown): CategoryDefinition[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return cloneDefaultCategories();
  }

  const seen = new Set<string>();
  const cleaned: CategoryDefinition[] = [];

  for (const item of raw.slice(0, 60)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Partial<CategoryDefinition>;
    const id = String(rec.id ?? "").trim().slice(0, 60);
    if (!id || seen.has(id)) continue;

    const type: TransactionType =
      rec.type === "income"
        ? "income"
        : rec.type === "transfer"
          ? "transfer"
          : "expense";

    const nameEn = String(rec.nameEn ?? rec.nameId ?? "").trim().slice(0, 48);
    const nameId = String(rec.nameId ?? rec.nameEn ?? "").trim().slice(0, 48);
    if (!nameEn && !nameId) continue;

    const color =
      typeof rec.color === "string" && rec.color.trim().length >= 3
        ? rec.color.trim().slice(0, 32)
        : type === "income"
          ? "#2276a8"
          : "#745bc7";

    const icon =
      typeof rec.icon === "string" && rec.icon.trim().length > 0
        ? rec.icon.trim().slice(0, 32)
        : type === "income"
          ? "PlusCircle"
          : type === "transfer"
            ? "ArrowLeftRight"
            : "Receipt";

    seen.add(id);
    cleaned.push({
      id,
      type,
      nameId: nameId || nameEn,
      nameEn: nameEn || nameId,
      color,
      icon,
      ...(SYSTEM_CATEGORY_IDS.has(id) ? { isSystem: true } : {}),
    });
  }

  if (cleaned.length === 0) {
    return cloneDefaultCategories();
  }

  // Ensure protected system fallback categories always exist
  for (const def of DEFAULT_CATEGORIES) {
    if (SYSTEM_CATEGORY_IDS.has(def.id) && !seen.has(def.id)) {
      cleaned.push({ ...def });
      seen.add(def.id);
    }
  }

  return cleaned;
}

export function buildCategoryMap(
  categories?: CategoryDefinition[]
): Record<string, CategoryDefinition> {
  const list =
    categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const map: Record<string, CategoryDefinition> = {};
  for (const cat of list) {
    map[cat.id] = cat;
  }
  return map;
}

export function getCategoryById(
  categoryId: string,
  categories?: CategoryDefinition[]
): CategoryDefinition | undefined {
  const map = buildCategoryMap(categories);
  return (
    map[categoryId] ??
    map[LEGACY_CATEGORY_MAP[categoryId] ?? ""] ??
    CATEGORY_MAP[categoryId]
  );
}

export function normalizeCategoryId(
  categoryId: string,
  type: TransactionType,
  categories?: CategoryDefinition[]
): string {
  if (type === "transfer") return "transfer";
  const map = buildCategoryMap(categories);
  if (map[categoryId] && map[categoryId].type === type) {
    return categoryId;
  }
  const mapped = LEGACY_CATEGORY_MAP[categoryId];
  if (mapped && map[mapped] && map[mapped].type === type) {
    return mapped;
  }
  return type === "income" ? "other_income" : "other_expense";
}

export function getCategoryLabel(
  categoryId: string,
  locale: "en" | "id",
  categories?: CategoryDefinition[]
): string {
  const cat = getCategoryById(categoryId, categories);
  if (!cat) return categoryId;
  return locale === "id" ? cat.nameId : cat.nameEn;
}
