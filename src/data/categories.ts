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
  { hex: "#2276a8", label: "Cerulean", nameId: "Biru", nameEn: "Blue" },
  { hex: "#c837a5", label: "Magenta", nameId: "Magenta", nameEn: "Magenta" },
  { hex: "#745bc7", label: "Iris", nameId: "Ungu", nameEn: "Violet" },
  { hex: "#1f8f6b", label: "Emerald", nameId: "Hijau", nameEn: "Green" },
  { hex: "#d749d5", label: "Orchid", nameId: "Pink", nameEn: "Pink" },
  { hex: "#4e6bc4", label: "Periwinkle", nameId: "Indigo", nameEn: "Indigo" },
  { hex: "#d97706", label: "Amber", nameId: "Oranye", nameEn: "Amber" },
  { hex: "#4e5d78", label: "Slate", nameId: "Abu-abu", nameEn: "Slate" },
];

const COLOR_ORDER_MAP = new Map<string, number>(
  CATEGORY_COLORS.map((c, idx) => [c.hex.toLowerCase(), idx])
);

export function normalizeHexColor(color?: string): string {
  return (color ?? "#745bc7").trim().toLowerCase();
}

export function getColorOrderIndex(color?: string): number {
  const norm = normalizeHexColor(color);
  const direct = COLOR_ORDER_MAP.get(norm);
  if (direct !== undefined) return direct;
  // Treat legacy/default close shades neatly within their family
  if (norm === "#8b5cf6") return COLOR_ORDER_MAP.get("#745bc7") ?? 2;
  if (norm === "#5d5370") return COLOR_ORDER_MAP.get("#4e5d78") ?? 7;
  return CATEGORY_COLORS.length;
}

export function getColorGroupLabel(color: string, locale: "en" | "id"): string {
  const norm = normalizeHexColor(color);
  const match = CATEGORY_COLORS.find((c) => c.hex.toLowerCase() === norm);
  if (match) return locale === "id" ? match.nameId : match.nameEn;
  if (norm === "#8b5cf6") return locale === "id" ? "Ungu" : "Violet";
  if (norm === "#5d5370") return locale === "id" ? "Abu-abu" : "Slate";
  return norm.toUpperCase();
}

const FALLBACK_END_IDS = new Set(["other_expense", "other_income", "transfer"]);

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

      const cDiff =
        getColorOrderIndex(a.cat.color) - getColorOrderIndex(b.cat.color);
      if (cDiff !== 0) return cDiff;

      const hexDiff = normalizeHexColor(a.cat.color).localeCompare(
        normalizeHexColor(b.cat.color)
      );
      if (hexDiff !== 0) return hexDiff;

      return a.idx - b.idx;
    })
    .map((entry) => entry.cat);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generates visually distinct monochrome dark->light shades within the exact same
 * hue family when multiple categories share one color in Analytics breakdown.
 */
export function buildMonochromeShadeMap(
  categoryIds: string[],
  categoryMap: Record<string, CategoryDefinition>
): Record<string, string> {
  const groups = new Map<string, string[]>();
  for (const id of categoryIds) {
    const baseHex = normalizeHexColor(categoryMap[id]?.color ?? "#745bc7");
    const list = groups.get(baseHex) ?? [];
    list.push(id);
    groups.set(baseHex, list);
  }

  const shadeMap: Record<string, string> = {};
  for (const [baseHex, ids] of groups.entries()) {
    if (ids.length === 1) {
      shadeMap[ids[0]] = baseHex;
      continue;
    }

    const hsl = hexToHsl(baseHex);
    if (!hsl) {
      for (const id of ids) shadeMap[id] = baseHex;
      continue;
    }

    let minL = Math.max(24, hsl.l - 12);
    let maxL = Math.min(76, hsl.l + 24);
    if (maxL - minL < 26) {
      const deficit = 26 - (maxL - minL);
      minL = Math.max(20, minL - deficit / 2);
      maxL = Math.min(78, maxL + deficit / 2);
    }

    ids.forEach((id, idx) => {
      const t =
        ids.length === 2
          ? idx === 0
            ? 0.14
            : 0.86
          : idx / (ids.length - 1);
      const nextL = minL + t * (maxL - minL);
      // Keep lighter tints crisp and legible rather than washed-out
      const nextS = hsl.s > 15 ? Math.max(32, hsl.s - t * 6) : hsl.s;
      shadeMap[id] = hslToHex(hsl.h, nextS, nextL);
    });
  }

  return shadeMap;
}

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

export function getCategoryLabel(
  categoryId: string,
  locale: "en" | "id",
  categories?: CategoryDefinition[]
): string {
  const cat = getCategoryById(categoryId, categories);
  if (!cat) return categoryId;
  return locale === "id" ? cat.nameId : cat.nameEn;
}
