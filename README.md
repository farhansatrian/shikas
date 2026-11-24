# SHIKAS (雫) — Personal Cashflow

> **Minimalist gallery-inspired personal cashflow ledger, multi-wallet tracker, budgeting, and IDR analytics** — built as a companion web app in the **SHIZUKU (雫)** ecosystem.

---

## Navigation & Modules

1. **`HOME`** — Minimalist centered gallery showcase frame floating over the high-resolution SHIZUKU pink watercolor backdrop.
2. **`LEDGER`** — Full CRUD IDR transactions ledger (Income, Expense, Inter-Wallet Transfer + optional BI-FAST admin fee), underline filters (`ALL · INCOME · EXPENSE · TRANSFER`), search, and daily grouping with Shizuku raindrop dividers.
3. **`WALLETS`** — Reconciled multi-account balances (Bank, E-Wallet/QRIS, Cash, Savings) with liquidity distribution bar and quick transfer.
4. **`PLAN`** — Unified financial planning with sub-tabs: **`BUDGETS`** (monthly spending ceilings + copy last month), **`RECURRING`** (1-click monthly logging), and **`GOALS`** (savings milestones + ETA).
5. **`ANALYTICS`** — Recharts cashflow visuals (6-month Composed Bar+Line, Category Donut, Net Balance Growth Area) + automated insights.
6. **`DATA`** — Bilingual `EN | ID` preferences (English default), Privacy Mask, Shizuku rain toggle, editable SHIZUKU website URL, **Export CSV**, **Backup/Restore JSON**, Demo Reset, and Assets Path registry.

---

## Custom Assets Directory (`public/assets/`)

Place images in `public/assets/` and configure paths in [`src/config/assets.ts`](./src/config/assets.ts):

- `public/assets/bg-watercolor-pc.jpg` — High-res desktop pink watercolor background (sourced from `SHIZUKU`)
- `public/assets/bg-watercolor-sp.jpg` — High-res mobile pink watercolor background (sourced from `SHIZUKU`)
- `public/assets/raindrop-line.png` — Shizuku horizontal raindrop divider
- `public/assets/tumblr_ohhlp7vvyH1qegob8o3_1280.jpg` — Active centered `HOME` artwork

---

## Tech Stack & Commands

- **Stack:** React 19, TypeScript 5, Vite 6, Tailwind CSS v4, Recharts, Lucide React
- **Currency:** IDR (`Rp`) · **Languages:** English (`EN`, default) & Indonesian (`ID`)

```bash
npm install
npm run dev
npm run build
```
