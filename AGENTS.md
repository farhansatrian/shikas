# SHIKAS (雫) — Ecosystem & Integration Rules

`shikas` is a lightweight Vite + React SPA (`nginx:1.27-alpine`, ~15 MB RAM) that belongs to the **SHIZUKU (雫) Ecosystem**.

## Storage & Auth Architecture
- **Before Sign-In (`LOCAL MODE`)**: Starts clean (`0` entries) and stores data locally in the browser (`localStorage` key `shikas_local_v5`, survives refresh).
- **After Sign-In (`SHIZUKU ID`)**: Reads and writes strictly per-account data from the central **SHIZUKU** backend (`../portofolio`, Prisma SQLite `data/shizuku.db`) via:
  - Email/Password: `POST /api/ecosystem/register`, `POST /api/ecosystem/login`, `POST /api/ecosystem/logout`, `GET /api/ecosystem/me`
  - **Sign in with Google (OAuth 2.0 + PKCE via SHIZUKU)**: Redirects to `${VITE_SHIZUKU_API_URL}/api/ecosystem/google?redirect=${encodeURIComponent(window.location.origin + "/")}`; on callback, `shikas` reads `#shizuku_token=<jwt>` from `window.location.hash`, stores it as Bearer token, fetches `/api/ecosystem/me` + `/api/shikas/store`, and cleans the hash via `window.history.replaceState`.
  - Cashflow Store: `GET /api/shikas/store`, `PUT /api/shikas/store` (v5 payload includes `accounts[]` with `daily | savings` role & `openingBalanceIdr`, plus `transactions[]` supporting `income | expense | transfer`, `accountId`, `toAccountId`, and optional transfer `feeIdr`).
- **Pockets & Cashflow Accounting Rules**:
  - Each pocket (`Wondr`, `GoPay`, `BCA`, or custom) holds an `openingBalanceIdr` that contributes to live `Total Balance` and `Cumulative Net Balance` without inflating monthly `Income` or `Savings Level`.
  - Pocket-to-pocket `transfer` moves funds between pockets without inflating monthly `Expense` or `Income`; optional transfer `feeIdr` deducts from the source pocket and rolls into monthly `Expense` under `Bank & Admin` (`fees`).
  - `SAVINGS FLOW` tracks exact monthly net change across `savings`-role pockets (transfers/income in minus withdrawals/expenses/fees out).
  - When `savings`-role pockets exist, `NET CASHFLOW · DAILY` shows spendable non-savings cashflow (`Income − Expense − Savings Flow`), so transfers to `savings` reduce daily net cashflow while direct expenses from `savings` reduce `SAVINGS FLOW` and remain fully tracked in `Expense` & `Analytics` without double-reducing daily cashflow; `SAVINGS LEVEL` stays based on pure `Income − Expense`.
  - **Custom Monthly Cycle Start (`settings.cycleStartDay`, `1..28`, default `1`)**: Stored per account (`ShikasSettings.cycleStartDay`); `1` uses standard calendar months while `2..28` (e.g. `25`) groups Cashflow, Savings Level, Log, and Analytics from payday `D` to `D-1` of the next month without mutating transactions.
- **Local Dev Env (`.env`, gitignored)**:
  - `VITE_SHIZUKU_URL=http://localhost:3000`
  - `VITE_SHIZUKU_API_URL=http://localhost:3000`
- **Production Deploy**:
  - Set GitHub Actions Repo Variables `VITE_SHIZUKU_URL` and `VITE_SHIZUKU_API_URL` to the deployed `shizuku` URL; no code changes are needed unless the API contract in `../portofolio/AGENTS.md` changes.
