import { SHIZUKU_ECOSYSTEM, isCloudSyncConfigured } from "../config/ecosystem";
import { normalizeCategoryId } from "../data/categories";
import type { CashflowStoreData, ShizukuUser } from "../types/cashflow";

const LOCAL_ACCOUNTS_KEY = "shizuku_local_accounts_v1";
const LOCAL_SESSION_KEY = "shizuku_local_session_v1";
const USER_LEDGER_PREFIX = "shikas_user_ledger_v1_";

interface LocalAccountRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

async function hashSecret(raw: string): Promise<string> {
  const salted = `shizuku-id::${raw}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(salted);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Lightweight deterministic fallback for non-secure dev contexts
  let hash = 5381;
  for (let i = 0; i < salted.length; i += 1) {
    hash = (hash * 33) ^ salted.charCodeAt(i);
  }
  return `fb_${(hash >>> 0).toString(16)}`;
}

function readLocalAccounts(): LocalAccountRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalAccountRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocalAccounts(accounts: LocalAccountRecord[]): void {
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore storage quota errors
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getCurrentSession(): Promise<ShizukuUser | null> {
  if (isCloudSyncConfigured()) {
    try {
      const res = await fetch(`${SHIZUKU_ECOSYSTEM.apiUrl}/api/ecosystem/me`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { user?: ShizukuUser | null };
      if (!data.user) return null;
      return { ...data.user, mode: "cloud" };
    } catch {
      return null;
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as ShizukuUser;
    if (!session?.id || !session?.email) return null;
    return { ...session, mode: "local" };
  } catch {
    return null;
  }
}

export async function signInWithShizukuId(
  emailInput: string,
  password: string
): Promise<ShizukuUser> {
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes("@")) {
    throw new Error("INVALID_EMAIL");
  }
  if (password.length < 6) {
    throw new Error("SHORT_PASSWORD");
  }

  if (isCloudSyncConfigured()) {
    const res = await fetch(`${SHIZUKU_ECOSYSTEM.apiUrl}/api/ecosystem/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      user?: ShizukuUser;
      error?: string;
    };
    if (!res.ok || !body.user) {
      throw new Error(body.error || "INVALID_CREDENTIALS");
    }
    return { ...body.user, mode: "cloud" };
  }

  const accounts = readLocalAccounts();
  const match = accounts.find((a) => a.email === email);
  if (!match) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }
  const hashed = await hashSecret(password);
  if (match.passwordHash !== hashed) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const user: ShizukuUser = {
    id: match.id,
    email: match.email,
    displayName: match.displayName,
    mode: "local",
    createdAt: match.createdAt,
  };
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function registerShizukuId(
  emailInput: string,
  displayNameInput: string,
  password: string
): Promise<ShizukuUser> {
  const email = normalizeEmail(emailInput);
  const displayName =
    displayNameInput.trim() || email.split("@")[0] || "Shizuku User";

  if (!email || !email.includes("@")) {
    throw new Error("INVALID_EMAIL");
  }
  if (password.length < 6) {
    throw new Error("SHORT_PASSWORD");
  }

  if (isCloudSyncConfigured()) {
    const res = await fetch(`${SHIZUKU_ECOSYSTEM.apiUrl}/api/ecosystem/register`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, displayName, password }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      user?: ShizukuUser;
      error?: string;
    };
    if (!res.ok || !body.user) {
      throw new Error(body.error || "REGISTER_FAILED");
    }
    return { ...body.user, mode: "cloud" };
  }

  const accounts = readLocalAccounts();
  if (accounts.some((a) => a.email === email)) {
    throw new Error("EMAIL_EXISTS");
  }

  const passwordHash = await hashSecret(password);
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `shzk-${crypto.randomUUID().slice(0, 8)}`
      : `shzk-${Date.now().toString(36)}`;

  const created: LocalAccountRecord = {
    id,
    email,
    displayName,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  writeLocalAccounts([created, ...accounts]);

  const user: ShizukuUser = {
    id: created.id,
    email: created.email,
    displayName: created.displayName,
    mode: "local",
    createdAt: created.createdAt,
  };
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function signOutShizukuId(): Promise<void> {
  if (isCloudSyncConfigured()) {
    try {
      await fetch(`${SHIZUKU_ECOSYSTEM.apiUrl}/api/ecosystem/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Proceed clearing local state gracefully
    }
    return;
  }
  localStorage.removeItem(LOCAL_SESSION_KEY);
}

export async function loadUserLedger(
  user: ShizukuUser
): Promise<CashflowStoreData | null> {
  if (user.mode === "cloud" && isCloudSyncConfigured()) {
    try {
      const res = await fetch(`${SHIZUKU_ECOSYSTEM.apiUrl}/api/shikas/store`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) return null;
      const parsed = (await res.json()) as Partial<CashflowStoreData>;
      if (!Array.isArray(parsed.transactions)) return null;
      return {
        version: 4,
        transactions: parsed.transactions.map((tx) => ({
          ...tx,
          categoryId: normalizeCategoryId(tx.categoryId, tx.type),
        })),
        settings: {
          locale: parsed.settings?.locale ?? "en",
          privacyMode: parsed.settings?.privacyMode ?? false,
          rainEnabled: parsed.settings?.rainEnabled ?? true,
          shizukuWebsiteUrl:
            parsed.settings?.shizukuWebsiteUrl ?? SHIZUKU_ECOSYSTEM.hubUrl,
        },
      };
    } catch {
      return null;
    }
  }

  try {
    const raw = localStorage.getItem(`${USER_LEDGER_PREFIX}${user.id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CashflowStoreData>;
    if (!Array.isArray(parsed.transactions)) return null;
    return {
      version: 4,
      transactions: parsed.transactions.map((tx) => ({
        ...tx,
        categoryId: normalizeCategoryId(tx.categoryId, tx.type),
      })),
      settings: {
        locale: parsed.settings?.locale ?? "en",
        privacyMode: parsed.settings?.privacyMode ?? false,
        rainEnabled: parsed.settings?.rainEnabled ?? true,
        shizukuWebsiteUrl:
          parsed.settings?.shizukuWebsiteUrl ?? SHIZUKU_ECOSYSTEM.hubUrl,
      },
    };
  } catch {
    return null;
  }
}

export async function saveUserLedger(
  user: ShizukuUser,
  data: CashflowStoreData
): Promise<void> {
  if (user.mode === "cloud" && isCloudSyncConfigured()) {
    try {
      await fetch(`${SHIZUKU_ECOSYSTEM.apiUrl}/api/shikas/store`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {
      // Keep local mirror below as safety fallback
    }
  }

  try {
    localStorage.setItem(`${USER_LEDGER_PREFIX}${user.id}`, JSON.stringify(data));
  } catch {
    // Ignore quota issues
  }
}
