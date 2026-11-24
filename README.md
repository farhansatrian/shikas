# SHIKAS (雫) — Personal Cashflow

> **Personal cashflow ledger, multi-wallet liquidity tracker, monthly budgets, and real-time IDR ↔ USD analytics** — crafted as a companion application in the [**SHIZUKU (雫)**](https://github.com/farhansatrian/shizuku) digital workspace ecosystem.

---

## Highlights & Key Modules

- **SHIZUKU Visual Parity:** Soft pastel lavender canvas (`#e5dcfb`), iris purple (`#745bc7`) & vivid violet (`#7650f3`) accents, magenta watercolor footer band (`#d749d5`), `Cormorant Garamond` + `Plus Jakarta Sans` + `JetBrains Mono` (`tabular-nums`), subtle pure-CSS vertical rain streaks, multi-tone raindrop dividers, and `ID | EN` bilingual switcher.
- **Real-Time IDR ↔ USD FX Engine:**
  - Defaults to **IDR (Rp)** with live market USD conversion fetched automatically from `open.er-api.com` (with automatic fallback to `api.frankfurter.dev` and `localStorage` cache).
  - Global currency display modes: **`IDR`**, **`USD`**, or **`IDR + USD` (Dual)** across every KPI, chart, wallet, budget, and ledger entry.
  - Built-in **Instant FX Converter** modal and **multi-currency transaction entry** (record expenses/income directly in `USD` or `IDR`, preserving original currency & historical entry rate).
- **Executive Overview Dashboard:** Twilight net worth hero card, 4 monthly KPI cards with MoM delta & savings rate health badge, **Daily Safe-to-Spend** indicator, 6-month trend preview, budget watch, and recent activity.
- **Transactions Ledger:** Full CRUD for **Income**, **Expense**, and **Inter-Wallet Transfers** (anti double-counting + optional BI-FAST admin fee), SHIZUKU pipe-separated type filters, instant search, daily grouping, and duplicate/edit/delete actions.
- **Wallets & Reconciled Liquidity:** Multi-account management (Bank, E-Wallet/QRIS, Cash, Savings/Investments) with automatic reconciled balances, liquidity distribution bar, and **Privacy Mask Mode** (`Rp •••••••`).
- **Monthly Budgets & Planning:** Category spending ceilings with color-coded progress bars, copy-previous-month shortcut, **Recurring Commitments** (supports IDR & USD bills with 1-click monthly logging), and **Savings Goals** with completion ETA.
- **Interactive Analytics (Recharts):** 6-month Composed Bar + Net Line chart, Expense Composition Donut chart, Net Balance trajectory Area chart, and automated **Smart Financial Insights**.
- **Local-First & Portfolio-Ready:** Auto-saved in `localStorage` with a realistic 6-month demo dataset, **Export CSV** (includes live USD column), **Backup / Restore JSON**, and 1-click Reset Demo / Fresh Start.

---

## Tech Stack

- **Frontend:** React 19, TypeScript 5, Vite 6
- **Styling:** Tailwind CSS v4 + custom SHIZUKU editorial tokens
- **Charts & Icons:** Recharts, Lucide React
- **FX Data:** `open.er-api.com` + `api.frankfurter.dev` fallback (no API key required)

---

## Getting Started

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Type-check & create production bundle
npm run build

# Preview production build
npm run preview
```

---

## Integrating into SHIZUKU `/workspace`

Deploy ShiKas to Vercel, Netlify, or Cloudflare Pages (pure static SPA, build command `npm run build`, output directory `dist`), then register it in your **SHIZUKU Admin Studio** (`/admin`) under Workspace Apps:

- **Name:** `ShiKas`
- **Badge:** `APP`
- **Category:** `Finance`
- **Description (ID):** `Aplikasi arus kas pribadi dengan dompet multi-akun, anggaran, dan konversi kurs real-time IDR ↔ USD.`
- **Description (EN):** `Personal cashflow ledger, multi-wallet tracker, monthly budgets, and live IDR ↔ USD exchange rate analytics.`
