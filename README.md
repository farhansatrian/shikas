# SHIKAS (雫) — Personal Cashflow

> **Minimalist gallery-inspired personal cashflow ledger, multi-wallet tracker, budgeting, and real-time IDR ↔ USD analytics** — built as a companion web app in the [**SHIZUKU (雫)**](https://github.com/farhansatrian/shizuku) ecosystem.

---

## Navigation & Modules (6 Clean Sections)

1. **`HOME`** — Gallery Light/Dark Diptych (custom artwork slot on left + stark monochrome Total Net Balance & Monthly Cashflow vitals on right), quiet Safe-to-Spend & Wallet summary strip, and recent activity index.
2. **`LEDGER`** — Full CRUD transactions ledger (Income, Expense, Inter-Wallet Transfer + optional BI-FAST admin fee), minimalist underline type filters (`ALL · INCOME · EXPENSE · TRANSFER`), instant search, daily grouping with Shizuku raindrop dividers, and multi-currency USD→IDR entry tags.
3. **`WALLETS`** — Reconciled multi-account balances (Bank, E-Wallet/QRIS, Cash, Savings/Investments) with monochrome liquidity distribution bar and quick transfer.
4. **`PLAN`** — Unified financial planning with quiet underline sub-tabs: **`BUDGETS`** (monthly spending ceilings + copy last month), **`RECURRING`** (IDR & USD commitments with 1-click monthly logging), and **`GOALS`** (savings milestones + ETA).
5. **`ANALYTICS`** — Calm Recharts cashflow intelligence (6-month Composed Bar+Line, Category Donut, Net Balance Growth Area) + automated monochrome insights.
6. **`DATA`** — Real-time IDR ↔ USD FX diagnostics & converter (`open.er-api.com` + `frankfurter.dev` fallback), display preferences (`IDR | USD | IDR+USD`, `ID | EN`, Privacy Mask, Rain layer), **Export CSV**, **Backup/Restore JSON**, 6-month Demo Reset, and Assets Path registry.

---

## Custom Assets Directory (`public/assets/`)

Drop your custom images into `public/assets/` and configure paths in [`src/config/assets.ts`](./src/config/assets.ts) (detailed guide in [`public/assets/README.md`](./public/assets/README.md)):

- `public/assets/bg-watercolor-pc.jpg` — High-res desktop pink watercolor background (sourced from `SHIZUKU`)
- `public/assets/bg-watercolor-sp.jpg` — High-res mobile pink watercolor background (sourced from `SHIZUKU`)
- `public/assets/raindrop-line.png` — Shizuku horizontal raindrop divider
- `public/assets/hero-left.svg` — Default ink-line droplet artwork (swap to `hero-left.jpg` / `.png` / `.webp`)
- `public/assets/hero-right.jpg` — Optional subtle artwork behind the dark summary panel

---

## Tech Stack & Commands

- **Stack:** React 19, TypeScript 5, Vite 6, Tailwind CSS v4, Recharts, Lucide React
- **Fonts:** Barlow Condensed, Plus Jakarta Sans, Noto Sans JP, Cormorant Garamond, JetBrains Mono

```bash
npm install
npm run dev
npm run build
```
