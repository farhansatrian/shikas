import type { FxRateState } from "../types/cashflow";

const FX_CACHE_KEY = "shikas_fx_cache_v1";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const DEFAULT_FALLBACK_USD_TO_IDR = 16350;

interface CachedFxPayload {
  usdToIdr: number;
  source: "open.er-api.com" | "frankfurter.dev";
  updatedAt: string;
  fetchedAtMs: number;
}

export function readCachedFx(): CachedFxPayload | null {
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedFxPayload>;
    if (
      typeof parsed.usdToIdr === "number" &&
      Number.isFinite(parsed.usdToIdr) &&
      parsed.usdToIdr > 5000 &&
      parsed.usdToIdr < 50000 &&
      typeof parsed.updatedAt === "string" &&
      typeof parsed.fetchedAtMs === "number"
    ) {
      return {
        usdToIdr: parsed.usdToIdr,
        source: parsed.source === "frankfurter.dev" ? "frankfurter.dev" : "open.er-api.com",
        updatedAt: parsed.updatedAt,
        fetchedAtMs: parsed.fetchedAtMs,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function saveCachedFx(payload: CachedFxPayload): void {
  try {
    localStorage.setItem(FX_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 6500): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchFromOpenErApi(): Promise<CachedFxPayload> {
  const res = await fetchWithTimeout("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error(`open.er-api HTTP ${res.status}`);
  const data = (await res.json()) as {
    result?: string;
    time_last_update_unix?: number;
    rates?: Record<string, number>;
  };
  const rate = data?.rates?.IDR;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Invalid IDR rate from open.er-api");
  }
  const updatedAt =
    typeof data.time_last_update_unix === "number"
      ? new Date(data.time_last_update_unix * 1000).toISOString()
      : new Date().toISOString();
  return {
    usdToIdr: Math.round(rate * 100) / 100,
    source: "open.er-api.com",
    updatedAt,
    fetchedAtMs: Date.now(),
  };
}

async function fetchFromFrankfurter(): Promise<CachedFxPayload> {
  const res = await fetchWithTimeout("https://api.frankfurter.dev/v1/latest?from=USD&to=IDR");
  if (!res.ok) throw new Error(`frankfurter HTTP ${res.status}`);
  const data = (await res.json()) as {
    date?: string;
    rates?: Record<string, number>;
  };
  const rate = data?.rates?.IDR;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Invalid IDR rate from frankfurter");
  }
  return {
    usdToIdr: Math.round(rate * 100) / 100,
    source: "frankfurter.dev",
    updatedAt: data.date ? new Date(`${data.date}T09:00:00Z`).toISOString() : new Date().toISOString(),
    fetchedAtMs: Date.now(),
  };
}

export function getInitialFxState(): FxRateState {
  const cached = readCachedFx();
  if (cached) {
    return {
      usdToIdr: cached.usdToIdr,
      source: cached.source,
      updatedAt: cached.updatedAt,
      status: Date.now() - cached.fetchedAtMs < CACHE_TTL_MS ? "live" : "cached",
    };
  }
  return {
    usdToIdr: DEFAULT_FALLBACK_USD_TO_IDR,
    source: "fallback",
    updatedAt: new Date().toISOString(),
    status: "loading",
  };
}

export async function fetchRealtimeUsdToIdr(forceRefresh = false): Promise<FxRateState> {
  const cached = readCachedFx();
  if (!forceRefresh && cached && Date.now() - cached.fetchedAtMs < CACHE_TTL_MS) {
    return {
      usdToIdr: cached.usdToIdr,
      source: cached.source,
      updatedAt: cached.updatedAt,
      status: "live",
    };
  }

  try {
    const fresh = await fetchFromOpenErApi();
    saveCachedFx(fresh);
    return {
      usdToIdr: fresh.usdToIdr,
      source: fresh.source,
      updatedAt: fresh.updatedAt,
      status: "live",
    };
  } catch (err1) {
    try {
      const fresh = await fetchFromFrankfurter();
      saveCachedFx(fresh);
      return {
        usdToIdr: fresh.usdToIdr,
        source: fresh.source,
        updatedAt: fresh.updatedAt,
        status: "live",
      };
    } catch (err2) {
      const msg =
        err2 instanceof Error
          ? err2.message
          : err1 instanceof Error
            ? err1.message
            : "Network error";
      if (cached) {
        return {
          usdToIdr: cached.usdToIdr,
          source: "cached",
          updatedAt: cached.updatedAt,
          status: "cached",
          error: msg,
        };
      }
      return {
        usdToIdr: DEFAULT_FALLBACK_USD_TO_IDR,
        source: "fallback",
        updatedAt: new Date().toISOString(),
        status: "fallback",
        error: msg,
      };
    }
  }
}

export function idrToUsd(amountIdr: number, usdToIdr: number): number {
  if (!usdToIdr || usdToIdr <= 0) return 0;
  return amountIdr / usdToIdr;
}

export function usdToIdrAmount(amountUsd: number, usdToIdr: number): number {
  return Math.round(amountUsd * usdToIdr);
}
