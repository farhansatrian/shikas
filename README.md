# shikas (雫) — Personal Cashflow

> **Minimalist gallery-inspired personal cashflow tracker & IDR analytics** — companion web app in the **SHIZUKU (雫)** ecosystem.

---

## Navigation & Modules (4 Clean Sections)

1. **`HOME`** — Clean centered gallery showcase floating over the high-resolution SHIZUKU pink watercolor backdrop.
2. **`CASHFLOW`** — Simple, fast **Income & Expense** tracking in IDR with 1-click `+ Add Income` / `+ Add Expense`, underline filters (`ALL · INCOME · EXPENSE`), search, category filter, monthly totals, cumulative balance, and daily grouping with Shizuku raindrop dividers.
3. **`ANALYTICS`** — Recharts cashflow visuals (6-month Composed Bar+Line, Expense Breakdown Donut, Cumulative Net Balance Area) + automated insights.
4. **`DATA`** — Bilingual `EN | ID` preferences (English default), Privacy Mask, Shizuku rain toggle, editable SHIZUKU website URL, **Export CSV**, **Backup/Restore JSON**, Demo Reset, and Assets Path registry.

---

## Custom Assets Directory (`public/assets/`)

Place images in `public/assets/` and configure paths in [`src/config/assets.ts`](./src/config/assets.ts):

- `public/assets/bg-watercolor-pc.jpg` — High-res desktop pink watercolor background
- `public/assets/bg-watercolor-sp.jpg` — High-res mobile pink watercolor background
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
