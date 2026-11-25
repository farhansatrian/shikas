# SHIKAS (雫) — Ecosystem & Integration Rules

`shikas` is a lightweight Vite + React SPA (`nginx:1.27-alpine`, ~15 MB RAM) that belongs to the **SHIZUKU (雫) Ecosystem**.

## Storage & Auth Architecture
- **Before Sign-In (`LOCAL MODE`)**: Starts clean (`0` entries) and stores data locally in the browser (`localStorage` key `shikas_local_v5`, survives refresh).
- **After Sign-In (`SHIZUKU ID`)**: Reads and writes strictly per-account data from the central **SHIZUKU** backend (`../portofolio`, Prisma SQLite `data/shizuku.db`) via:
  - Email/Password: `POST /api/ecosystem/register`, `POST /api/ecosystem/login`, `POST /api/ecosystem/logout`, `GET /api/ecosystem/me`
  - **Sign in with Google (OAuth 2.0 + PKCE via SHIZUKU)**: Redirects to `${VITE_SHIZUKU_API_URL}/api/ecosystem/google?redirect=${encodeURIComponent(window.location.origin + "/")}`; on callback, `shikas` reads `#shizuku_token=<jwt>` from `window.location.hash`, stores it as Bearer token, fetches `/api/ecosystem/me` + `/api/shikas/store`, and cleans the hash via `window.history.replaceState`.
  - Cashflow Store: `GET /api/shikas/store`, `PUT /api/shikas/store`
- **Local Dev Env (`.env`, gitignored)**:
  - `VITE_SHIZUKU_URL=http://localhost:3000`
  - `VITE_SHIZUKU_API_URL=http://localhost:3000`
- **Production Deploy**:
  - Set GitHub Actions Repo Variables `VITE_SHIZUKU_URL` and `VITE_SHIZUKU_API_URL` to the deployed `shizuku` URL; no code changes are needed unless the API contract in `../portofolio/AGENTS.md` changes.
