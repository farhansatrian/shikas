/**
 * SHIZUKU Ecosystem environment configuration.
 *
 * When deployed to your self-hosted VM, set these in `.env.production`:
 * - VITE_SHIZUKU_URL=https://shizuku.yourdomain.dev
 * - VITE_SHIZUKU_API_URL=https://shizuku.yourdomain.dev
 *
 * When left blank (local dev / standalone preview), SHIKAS runs an isolated
 * local SHIZUKU ID preview so you can test the full Guest -> Sign In -> Account flow.
 */
const env = (import.meta.env ?? {}) as Record<string, string | undefined>;

export const SHIZUKU_ECOSYSTEM = {
  hubUrl: (env.VITE_SHIZUKU_URL ?? "").trim().replace(/\/+$/, ""),
  apiUrl: (env.VITE_SHIZUKU_API_URL ?? "").trim().replace(/\/+$/, ""),
  appName: "shikas",
  appKanji: "雫",
} as const;

export function isCloudSyncConfigured(): boolean {
  return SHIZUKU_ECOSYSTEM.apiUrl.length > 0;
}
