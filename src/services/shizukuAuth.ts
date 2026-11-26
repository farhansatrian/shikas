import { SHIZUKU_ECOSYSTEM, isCloudSyncConfigured } from "../config/ecosystem";
import { normalizeCategoryId, sanitizeCategories } from "../data/categories";
import { clampCycleStartDay } from "../utils/format";
import { sanitizeReimbursement } from "../utils/reimburse";
import { sanitizeAccounts } from "./exportService";
import type { CashflowStoreData, ShizukuUser } from "../types/cashflow";

const LOCAL_ACCOUNTS_KEY = "shizuku_local_accounts_v1";
const LOCAL_SESSION_KEY = "shizuku_local_session_v1";
const CLOUD_TOKEN_KEY = "shizuku_cloud_token_v1";
const POST_AUTH_TAB_KEY = "shikas_post_auth_tab_v1";
const USER_LEDGER_PREFIX = "shikas_user_ledger_v1_";

interface LocalAccountRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

function getStoredCloudToken(): string | null {
  try {
    return localStorage.getItem(CLOUD_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredCloudToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(CLOUD_TOKEN_KEY, token);
    else localStorage.removeItem(CLOUD_TOKEN_KEY);
  } catch {
    // Ignore storage issues
  }
}

export function getGoogleOAuthUrl(): string | null {
  if (!isCloudSyncConfigured() || typeof window === "undefined") return null;
  const redirectTarget = `${window.location.origin}/`;
  return `${SHIZUKU_ECOSYSTEM.apiUrl}/api/ecosystem/google?redirect=${encodeURIComponent(
    redirectTarget
  )}`;
}

export interface OAuthCallbackResult {
  tokenCaptured: boolean;
  oauthError: string | null;
}

// Retains the most recent unacknowledged OAuth callback across React StrictMode
// double-mount cycles so URL hash cleanup on mount #1 does not drop post-auth UX.
let pendingOAuthCallback: OAuthCallbackResult | null = null;

export function rememberPostAuthTab(tab: string): void {
  try {
    sessionStorage.setItem(POST_AUTH_TAB_KEY, tab);
  } catch {
    // Ignore sessionStorage errors
  }
}

export function peekPostAuthTab(): string | null {
  try {
    return sessionStorage.getItem(POST_AUTH_TAB_KEY);
  } catch {
    return null;
  }
}

export function acknowledgeOAuthCallback(): void {
  pendingOAuthCallback = null;
  try {
    sessionStorage.removeItem(POST_AUTH_TAB_KEY);
  } catch {
    // Ignore sessionStorage errors
  }
}

/**
 * Inspects `window.location.hash` for `#shizuku_token=<jwt>` returned by
 * SHIZUKU Google OAuth callback, stores the Bearer token, and cleans the URL
 * immediately via `history.replaceState`. Safe across React StrictMode remounts.
 */
export function consumeOAuthCallbackFromUrl(): OAuthCallbackResult {
  if (typeof window === "undefined") {
    return { tokenCaptured: false, oauthError: null };
  }

  let tokenCaptured = false;
  let oauthError: string | null = null;
  let shouldCleanUrl = false;

  const rawHash = window.location.hash;
  if (rawHash && rawHash.length > 1) {
    const hashParams = new URLSearchParams(rawHash.slice(1));
    const token = hashParams.get("shizuku_token")?.trim();
    if (token) {
      setStoredCloudToken(token);
      hashParams.delete("shizuku_token");
      tokenCaptured = true;
      shouldCleanUrl = true;
    }
  }

  const searchParams = new URLSearchParams(window.location.search);
  const errParam = searchParams.get("oauthError")?.trim();
  if (errParam) {
    oauthError = errParam;
    searchParams.delete("oauthError");
    shouldCleanUrl = true;
  }

  if (shouldCleanUrl) {
    const cleanSearch = searchParams.toString();
    const cleanUrl = `${window.location.pathname}${
      cleanSearch ? `?${cleanSearch}` : ""
    }`;
    window.history.replaceState(null, "", cleanUrl);
    pendingOAuthCallback = { tokenCaptured, oauthError };
    return pendingOAuthCallback;
  }

  if (pendingOAuthCallback) {
    return pendingOAuthCallback;
  }

  return { tokenCaptured: false, oauthError: null };
}

function buildCloudHeaders(json = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const token = getStoredCloudToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
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
    // Ignore quota issues
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
        headers: buildCloudHeaders(false),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { user?: Omit<ShizukuUser, "mode"> | null };
      if (!data.user) {
        setStoredCloudToken(null);
        return null;
      }
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
    let res: Response;
    try {
      res = await fetch(`${SHIZUKU_ECOSYSTEM.apiUrl}/api/ecosystem/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error("SERVER_UNREACHABLE");
    }

    const body = (await res.json().catch(() => ({}))) as {
      user?: Omit<ShizukuUser, "mode">;
      token?: string;
      error?: string;
    };
    if (!res.ok || !body.user) {
      throw new Error(body.error || "INVALID_CREDENTIALS");
    }
    if (body.token) setStoredCloudToken(body.token);
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
    let res: Response;
    try {
      res = await fetch(`${SHIZUKU_ECOSYSTEM.apiUrl}/api/ecosystem/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName, password }),
      });
    } catch {
      throw new Error("SERVER_UNREACHABLE");
    }

    const body = (await res.json().catch(() => ({}))) as {
      user?: Omit<ShizukuUser, "mode">;
      token?: string;
      error?: string;
    };
    if (!res.ok || !body.user) {
      throw new Error(body.error || "REGISTER_FAILED");
    }
    if (body.token) setStoredCloudToken(body.token);
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
        headers: buildCloudHeaders(false),
      });
    } catch {
      // Clear local token even if server is offline
    }
    setStoredCloudToken(null);
    return;
  }
  localStorage.removeItem(LOCAL_SESSION_KEY);
}

function normalizeStorePayload(
  parsed: Partial<CashflowStoreData>
): CashflowStoreData | null {
  if (!Array.isArray(parsed.transactions)) return null;
  const cleanCategories = sanitizeCategories(parsed.categories);
  return {
    version: 5,
    accounts: sanitizeAccounts(parsed.accounts),
    categories: cleanCategories,
    transactions: parsed.transactions
      .filter(
        (tx) =>
          tx &&
          (tx.type === "income" ||
            tx.type === "expense" ||
            tx.type === "transfer")
      )
      .map((tx) => ({
        ...tx,
        categoryId: normalizeCategoryId(tx.categoryId, tx.type, cleanCategories),
        accountId: tx.accountId || undefined,
        toAccountId: tx.toAccountId || undefined,
        feeIdr:
          tx.type === "transfer" && tx.feeIdr && tx.feeIdr > 0
            ? Math.round(tx.feeIdr)
            : undefined,
        reimburse:
          tx.type === "expense"
            ? sanitizeReimbursement(tx.reimburse, tx.amountIdr)
            : undefined,
      })),
    settings: {
      locale: parsed.settings?.locale === "id" ? "id" : "en",
      privacyMode: parsed.settings?.privacyMode ?? false,
      rainEnabled: parsed.settings?.rainEnabled ?? true,
      cycleStartDay: clampCycleStartDay(parsed.settings?.cycleStartDay),
      shizukuWebsiteUrl:
        parsed.settings?.shizukuWebsiteUrl || SHIZUKU_ECOSYSTEM.hubUrl,
    },
  };
}

export async function loadUserLedger(
  user: ShizukuUser
): Promise<CashflowStoreData | null> {
  if (user.mode === "cloud" && isCloudSyncConfigured()) {
    try {
      const res = await fetch(`${SHIZUKU_ECOSYSTEM.apiUrl}/api/shikas/store`, {
        method: "GET",
        credentials: "include",
        headers: buildCloudHeaders(false),
      });
      if (!res.ok) return null;
      const parsed = (await res.json()) as Partial<CashflowStoreData>;
      return normalizeStorePayload(parsed);
    } catch {
      return null;
    }
  }

  try {
    const raw = localStorage.getItem(`${USER_LEDGER_PREFIX}${user.id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CashflowStoreData>;
    return normalizeStorePayload(parsed);
  } catch {
    return null;
  }
}

let cloudSaveInFlight: Promise<boolean> | null = null;
let queuedCloudSave: {
  data: CashflowStoreData;
  keepalive?: boolean;
} | null = null;

async function performCloudPut(
  data: CashflowStoreData,
  keepalive = false
): Promise<boolean> {
  try {
    const res = await fetch(`${SHIZUKU_ECOSYSTEM.apiUrl}/api/shikas/store`, {
      method: "PUT",
      credentials: "include",
      keepalive,
      headers: buildCloudHeaders(true),
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveUserLedger(
  user: ShizukuUser,
  data: CashflowStoreData,
  options?: { keepalive?: boolean }
): Promise<boolean> {
  if (user.mode === "cloud" && isCloudSyncConfigured()) {
    const keepalive = Boolean(options?.keepalive);

    // On pagehide/unload, fire immediately with keepalive without waiting in queue
    if (keepalive) {
      queuedCloudSave = null;
      return performCloudPut(data, true);
    }

    // Serialize rapid consecutive writes so SQLite transactions never overlap/race
    if (cloudSaveInFlight) {
      queuedCloudSave = { data, keepalive: false };
      return cloudSaveInFlight;
    }

    const run = async (): Promise<boolean> => {
      let ok = await performCloudPut(data, false);
      while (queuedCloudSave) {
        const next = queuedCloudSave;
        queuedCloudSave = null;
        ok = await performCloudPut(next.data, Boolean(next.keepalive));
      }
      return ok;
    };

    cloudSaveInFlight = run().finally(() => {
      cloudSaveInFlight = null;
    });
    return cloudSaveInFlight;
  }

  try {
    localStorage.setItem(`${USER_LEDGER_PREFIX}${user.id}`, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
