import type { CategoryDefinition, TransactionType } from "../types/cashflow";

export const SYSTEM_CATEGORY_IDS = new Set([
  "other_income",
  "other_expense",
  "fees",
  "transfer",
]);

export const CATEGORY_COLORS = [
  { hex: "#2276a8", label: "Blue" },
  { hex: "#c837a5", label: "Magenta" },
  { hex: "#745bc7", label: "Violet" },
  { hex: "#1f8f6b", label: "Green" },
  { hex: "#d749d5", label: "Pink" },
  { hex: "#4e6bc4", label: "Indigo" },
  { hex: "#d97706", label: "Amber" },
  { hex: "#4e5d78", label: "Slate" },
] as const;

export const INCOME_ACCENT_COLOR = "#2276a8";

/**
 * Starter categories in English (single consistent name regardless of UI locale,
 * naturally grouped by Expense color coding: Blue = Essentials, Magenta = Mobility,
 * Violet = Lifestyle, Green = Giving, Slate = System/Other).
 */
export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  // Income (distinct "+" visual identity — not part of Expense color groups)
  {
    id: "salary",
    type: "income",
    nameId: "Salary",
    nameEn: "Salary",
    color: INCOME_ACCENT_COLOR,
    icon: "Briefcase",
  },
  {
    id: "other_income",
    type: "income",
    nameId: "Other",
    nameEn: "Other",
    color: INCOME_ACCENT_COLOR,
    icon: "PlusCircle",
    isSystem: true,
  },

  // Expense — Blue (#2276a8): Essentials
  {
    id: "food",
    type: "expense",
    nameId: "Food & Drinks",
    nameEn: "Food & Drinks",
    color: "#2276a8",
    icon: "Utensils",
  },
  {
    id: "housing",
    type: "expense",
    nameId: "Bills & Housing",
    nameEn: "Bills & Housing",
    color: "#2276a8",
    icon: "Home",
  },

  // Expense — Magenta (#c837a5): Mobility
  {
    id: "transport",
    type: "expense",
    nameId: "Transport",
    nameEn: "Transport",
    color: "#c837a5",
    icon: "Train",
  },

  // Expense — Violet (#745bc7): Lifestyle
  {
    id: "shopping",
    type: "expense",
    nameId: "Shopping",
    nameEn: "Shopping",
    color: "#745bc7",
    icon: "ShoppingBag",
  },
  {
    id: "entertainment",
    type: "expense",
    nameId: "Leisure",
    nameEn: "Leisure",
    color: "#745bc7",
    icon: "Music",
  },

  // Expense — Green (#1f8f6b): Giving
  {
    id: "giving",
    type: "expense",
    nameId: "Giving",
    nameEn: "Giving",
    color: "#1f8f6b",
    icon: "Gift",
  },

  // Expense — Slate (#4e5d78): System & Fallback
  {
    id: "fees",
    type: "expense",
    nameId: "Bank & Admin",
    nameEn: "Bank & Admin",
    color: "#4e5d78",
    icon: "Landmark",
    isSystem: true,
  },
  {
    id: "other_expense",
    type: "expense",
    nameId: "Other",
    nameEn: "Other",
    color: "#4e5d78",
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

const COLOR_ORDER_MAP = new Map<string, number>(
  CATEGORY_COLORS.map((c, idx) => [c.hex.toLowerCase(), idx])
);

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  freelance: "other_income",
  investment_return: "other_income",
  bonus: "other_income",
  subscriptions: "housing",
  health: "other_expense",
  education: "other_expense",
  family: "giving",
};

const FALLBACK_END_IDS = new Set(["other_expense", "other_income", "transfer"]);

export function normalizeHexColor(color?: string): string {
  const raw = (color ?? "#4e5d78").trim().toLowerCase();
  // Map legacy default hexes cleanly into the 8-swatch palette
  if (raw === "#8b5cf6") return "#745bc7";
  if (raw === "#5d5370") return "#4e5d78";
  return raw;
}

export function getColorOrderIndex(color?: string): number {
  const norm = normalizeHexColor(color);
  const direct = COLOR_ORDER_MAP.get(norm);
  if (direct !== undefined) return direct;
  return CATEGORY_COLORS.length;
}

export function getDefaultColorName(color: string): string {
  const norm = normalizeHexColor(color);
  const match = CATEGORY_COLORS.find((c) => c.hex.toLowerCase() === norm);
  return match ? match.label : norm.toUpperCase();
}

export function getColorGroupLabel(
  color: string,
  colorLabels?: Record<string, string>
): string {
  const norm = normalizeHexColor(color);
  const custom = colorLabels?.[norm]?.trim();
  if (custom) return custom;
  return getDefaultColorName(norm);
}

export function sanitizeColorLabels(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const clean: Record<string, string> = {};
  let count = 0;
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= 20) break;
    const normKey = normalizeHexColor(key);
    if (!/^#[0-9a-f]{3,8}$/.test(normKey)) continue;
    const label = String(val ?? "").trim().slice(0, 32);
    if (!label) continue;
    // Omit if identical to default color name to keep storage minimal
    if (label.toLowerCase() === getDefaultColorName(normKey).toLowerCase()) {
      continue;
    }
    clean[normKey] = label;
    count += 1;
  }
  return clean;
}

/**
 * Sorts categories cleanly by color palette order within each transaction type,
 * keeping fallback `Other` neatly at the bottom while preserving relative order
 * among categories sharing the exact same color.
 */
export function sortCategoriesByColor(
  categories: CategoryDefinition[]
): CategoryDefinition[] {
  const typeOrder: Record<TransactionType, number> = {
    income: 0,
    expense: 1,
    transfer: 2,
  };
  return categories
    .map((cat, idx) => ({ cat, idx }))
    .sort((a, b) => {
      const tDiff = typeOrder[a.cat.type] - typeOrder[b.cat.type];
      if (tDiff !== 0) return tDiff;

      const aIsEnd = FALLBACK_END_IDS.has(a.cat.id) ? 1 : 0;
      const bIsEnd = FALLBACK_END_IDS.has(b.cat.id) ? 1 : 0;
      if (aIsEnd !== bIsEnd) return aIsEnd - bIsEnd;

      // Only expense categories sort by color group; income preserves clean user order
      if (a.cat.type === "expense") {
        const cDiff =
          getColorOrderIndex(a.cat.color) - getColorOrderIndex(b.cat.color);
        if (cDiff !== 0) return cDiff;

        const hexDiff = normalizeHexColor(a.cat.color).localeCompare(
          normalizeHexColor(b.cat.color)
        );
        if (hexDiff !== 0) return hexDiff;
      }

      return a.idx - b.idx;
    })
    .map((entry) => entry.cat);
}

export function cloneDefaultCategories(): CategoryDefinition[] {
  return sortCategoriesByColor(DEFAULT_CATEGORIES.map((c) => ({ ...c })));
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

    const displayName = String(rec.nameEn ?? rec.nameId ?? "")
      .trim()
      .slice(0, 48);
    if (!displayName) continue;

    const rawColor =
      typeof rec.color === "string" && rec.color.trim().length >= 3
        ? rec.color.trim().slice(0, 32)
        : type === "income"
          ? INCOME_ACCENT_COLOR
          : "#4e5d78";

    const color =
      type === "income" ? INCOME_ACCENT_COLOR : normalizeHexColor(rawColor);

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
      nameId: displayName,
      nameEn: displayName,
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

  return sortCategoriesByColor(cleaned);
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

/**
 * Single consistent category name (English default or user's exact custom name,
 * never altered by EN/ID toggle).
 */
export function getCategoryLabel(
  categoryId: string,
  _locale?: "en" | "id",
  categories?: CategoryDefinition[]
): string {
  const cat = getCategoryById(categoryId, categories);
  if (!cat) return categoryId;
  return cat.nameEn || cat.nameId;
}
