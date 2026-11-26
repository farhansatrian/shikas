import type { CashflowStoreData, Locale } from "../types/cashflow";
import {
  buildCategoryMap,
  getCategoryLabel,
  getColorGroupLabel,
  normalizeHexColor,
} from "../data/categories";
import {
  computeAccountBalances,
  computeCategoryBreakdownForMonths,
  computeMonthlySummary,
  computePercentDelta,
  computeTimeRangeSeries,
  type AnalyticsRange,
} from "../utils/calculations";
import {
  clampCycleStartDay,
  formatCompactIdr,
  formatCycleLabel,
  formatIdr,
  shiftMonthKey,
} from "../utils/format";
import { computePendingReimburseOverview } from "../utils/reimburse";

export interface VisualReportOptions {
  store: CashflowStoreData;
  selectedMonth: string;
  range: AnalyticsRange;
  breakdownMode: "category" | "group";
  locale: Locale;
  ownerLabel?: string;
}

interface ReportSlice {
  label: string;
  subLabel?: string;
  color: string;
  amountIdr: number;
  percentage: number;
}

const W = 1600;
const H = 900;
const FONT_MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
const FONT_SANS =
  "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FONT_SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";

function escXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function clipText(str: string, maxChars: number): string {
  if (str.length <= maxChars) return str;
  return `${str.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

function niceAxisMax(rawMax: number): number {
  if (rawMax <= 0) return 1_000_000;
  const exp = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const frac = rawMax / exp;
  const niceFrac =
    frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return niceFrac * exp;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildDonutArcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle;
  // Full circle fallback (avoid degenerate 360-degree SVG arc)
  if (sweep >= 359.8) {
    return [
      `M ${cx} ${cy - outerR}`,
      `A ${outerR} ${outerR} 0 1 1 ${cx} ${cy + outerR}`,
      `A ${outerR} ${outerR} 0 1 1 ${cx} ${cy - outerR}`,
      `M ${cx} ${cy - innerR}`,
      `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy + innerR}`,
      `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR}`,
      "Z",
    ].join(" ");
  }

  const p1 = polarToCartesian(cx, cy, outerR, startAngle);
  const p2 = polarToCartesian(cx, cy, outerR, endAngle);
  const p3 = polarToCartesian(cx, cy, innerR, endAngle);
  const p4 = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = sweep > 180 ? 1 : 0;

  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/**
 * Generates a pure-vector 16:9 (1600x900) SHIZUKU editorial presentation slide SVG.
 * Zero external fonts/images required, so Canvas 2x Retina PNG rasterization is
 * deterministic, taint-free, and crisp on all desktop & mobile browsers.
 */
export function buildVisualReportSvg(options: VisualReportOptions): string {
  const { store, selectedMonth, range, breakdownMode, locale, ownerLabel } =
    options;
  const cycleStartDay = clampCycleStartDay(store.settings.cycleStartDay);
  const privacy = store.settings.privacyMode;
  const mask = (v: number, showSign = false) =>
    privacy ? "Rp •••••••" : formatIdr(v, showSign);
  const maskCompact = (v: number) =>
    privacy ? "•••" : formatCompactIdr(v, locale);

  const categoryMap = buildCategoryMap(store.categories);
  const hasSavings = store.accounts.some((a) => a.role === "savings");
  const balances = computeAccountBalances(store.accounts, store.transactions);
  const pendingReimburse = computePendingReimburseOverview(store.transactions);

  const series = computeTimeRangeSeries(
    store.transactions,
    selectedMonth,
    range,
    store.accounts,
    cycleStartDay
  ).map((pt) => ({
    ...pt,
    shortLabel: formatCycleLabel(pt.month, locale, cycleStartDay, true),
    fullLabel: formatCycleLabel(pt.month, locale, cycleStartDay, false),
  }));

  const rangeMonths = range === "all" ? null : series.map((s) => s.month);
  const rawExpenseBreakdown = computeCategoryBreakdownForMonths(
    store.transactions,
    rangeMonths,
    "expense",
    cycleStartDay
  );
  const totalExpenseBreakdown = rawExpenseBreakdown.reduce(
    (sum, item) => sum + item.amountIdr,
    0
  );

  // Build breakdown slices (Category or Color Group)
  let allSlices: ReportSlice[] = [];
  if (breakdownMode === "group") {
    const groups = new Map<
      string,
      { amountIdr: number; catNames: string[] }
    >();
    for (const item of rawExpenseBreakdown) {
      const hex = normalizeHexColor(categoryMap[item.categoryId]?.color);
      const prev = groups.get(hex) ?? { amountIdr: 0, catNames: [] };
      prev.amountIdr += item.amountIdr;
      prev.catNames.push(
        getCategoryLabel(item.categoryId, locale, store.categories)
      );
      groups.set(hex, prev);
    }
    allSlices = Array.from(groups.entries())
      .map(([color, data]) => ({
        label: getColorGroupLabel(color, store.settings.colorLabels),
        subLabel: data.catNames.join(", "),
        color,
        amountIdr: data.amountIdr,
        percentage:
          totalExpenseBreakdown > 0
            ? (data.amountIdr / totalExpenseBreakdown) * 100
            : 0,
      }))
      .sort((a, b) => b.amountIdr - a.amountIdr);
  } else {
    allSlices = rawExpenseBreakdown.map((item) => {
      const cat = categoryMap[item.categoryId];
      return {
        label: getCategoryLabel(item.categoryId, locale, store.categories),
        color: cat?.color ?? "#745bc7",
        amountIdr: item.amountIdr,
        percentage: item.percentage,
      };
    });
  }

  // Cap visible rows to 6 (aggregate tail into "Other (+N)" so nothing ever clips)
  const visibleSlices: ReportSlice[] =
    allSlices.length <= 6
      ? allSlices
      : [
          ...allSlices.slice(0, 5),
          {
            label:
              locale === "id"
                ? `Lainnya (+${allSlices.length - 5})`
                : `Other (+${allSlices.length - 5})`,
            color: "#4e5d78",
            amountIdr: allSlices
              .slice(5)
              .reduce((sum, s) => sum + s.amountIdr, 0),
            percentage: allSlices
              .slice(5)
              .reduce((sum, s) => sum + s.percentage, 0),
          },
        ];

  let totalIncome = 0;
  let totalExpense = 0;
  let totalSavingsFlow = 0;
  for (const pt of series) {
    totalIncome += pt.incomeIdr;
    totalExpense += pt.expenseIdr;
    totalSavingsFlow += pt.savingsFlowIdr;
  }
  const totalNet = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (totalNet / totalIncome) * 100 : 0;
  const spentRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

  const rangeTag =
    range === "1m"
      ? locale === "id"
        ? "1 BULAN"
        : "1 MONTH"
      : range === "3m"
        ? locale === "id"
          ? "3 BULAN"
          : "3 MONTHS"
        : range === "6m"
          ? locale === "id"
            ? "6 BULAN"
            : "6 MONTHS"
          : range === "12m"
            ? locale === "id"
              ? "12 BULAN"
              : "12 MONTHS"
            : locale === "id"
              ? "SEMUA WAKTU"
              : "ALL TIME";

  const periodRangeLabel =
    range === "all" && series.length > 1
      ? `${series[0].shortLabel} — ${series[series.length - 1].shortLabel}`
      : range === "1m"
        ? formatCycleLabel(selectedMonth, locale, cycleStartDay)
        : `${series[0]?.shortLabel ?? ""} — ${series[series.length - 1]?.shortLabel ?? ""}`;

  const modeBadgeLabel =
    breakdownMode === "group"
      ? locale === "id"
        ? "GRUP WARNA"
        : "BY GROUP"
      : locale === "id"
        ? "PER KATEGORI"
        : "BY CATEGORY";

  const generatedDate = new Date().toISOString().slice(0, 10);

  // Build concise Chronicle insights (max 3 crisp lines for the footer)
  const currentSummary = computeMonthlySummary(
    store.transactions,
    selectedMonth,
    store.accounts,
    cycleStartDay
  );
  const prevSummary = computeMonthlySummary(
    store.transactions,
    shiftMonthKey(selectedMonth, -1),
    store.accounts,
    cycleStartDay
  );
  const insights: string[] = [];

  if (allSlices[0]) {
    const top = allSlices[0];
    const kindWord =
      breakdownMode === "group"
        ? locale === "id"
          ? "Grup pengeluaran terbesar"
          : "Largest spending group"
        : locale === "id"
          ? "Kategori pengeluaran terbesar"
          : "Largest spending category";
    insights.push(
      `${kindWord}: "${top.label}" (${top.percentage.toFixed(1)}% · ${mask(top.amountIdr)}).`
    );
  }

  if (range !== "1m") {
    const activeCycles = series.filter(
      (pt) => pt.incomeIdr > 0 || pt.expenseIdr > 0
    );
    if (activeCycles.length >= 2 && totalExpense > 0) {
      const avgExp = Math.round(totalExpense / activeCycles.length);
      insights.push(
        locale === "id"
          ? `Rata-rata pengeluaran ${mask(avgExp)}/periode dari ${activeCycles.length} periode aktif.`
          : `Average spending is ${mask(avgExp)}/cycle across ${activeCycles.length} active periods.`
      );
    }
  }

  if (hasSavings && totalSavingsFlow !== 0) {
    const pctInc =
      totalIncome > 0
        ? ` (${((Math.abs(totalSavingsFlow) / totalIncome) * 100).toFixed(1)}%)`
        : "";
    insights.push(
      locale === "id"
        ? `Arus bersih tabungan ${mask(totalSavingsFlow, true)}${pctInc} · saldo tabungan ${mask(balances.savingsTotalIdr)}.`
        : `Net savings flow ${mask(totalSavingsFlow, true)}${pctInc} · savings balance ${mask(balances.savingsTotalIdr)}.`
    );
  } else if (range !== "all") {
    const expDelta = computePercentDelta(
      currentSummary.expenseIdr,
      prevSummary.expenseIdr
    );
    if (expDelta !== null) {
      insights.push(
        locale === "id"
          ? `Pengeluaran siklus ini ${expDelta <= 0 ? "turun" : "naik"} ${Math.abs(expDelta).toFixed(1)}% dibanding periode sebelumnya.`
          : `Current cycle spending ${expDelta <= 0 ? "decreased" : "increased"} by ${Math.abs(expDelta).toFixed(1)}% vs prior period.`
      );
    }
  }

  if (insights.length < 3 && pendingReimburse.pendingCount > 0) {
    insights.push(
      locale === "id"
        ? `${pendingReimburse.pendingCount} catatan reimburse menunggu pelunasan${pendingReimburse.knownRemainingIdr > 0 ? ` (${mask(pendingReimburse.knownRemainingIdr)})` : ""}.`
        : `${pendingReimburse.pendingCount} reimbursement item${pendingReimburse.pendingCount > 1 ? "s" : ""} pending settlement${pendingReimburse.knownRemainingIdr > 0 ? ` (${mask(pendingReimburse.knownRemainingIdr)})` : ""}.`
    );
  }

  if (insights.length < 3 && totalIncome > 0) {
    insights.push(
      locale === "id"
        ? `Rasio simpanan bersih ${savingsRate.toFixed(1)}% dengan selisih bersih ${mask(totalNet, true)}.`
        : `Net savings ratio is ${savingsRate.toFixed(1)}% with ${mask(totalNet, true)} total net cashflow.`
    );
  }

  if (insights.length === 0) {
    insights.push(
      locale === "id"
        ? "Belum ada transaksi pada periode yang dipilih."
        : "No recorded transactions in the selected period yet."
    );
  }

  // =========================================================================
  // 1. KPI Cards (4 crisp editorial stat cards)
  // =========================================================================
  const kpiCards = [
    {
      label: locale === "id" ? "TOTAL PEMASUKAN" : "TOTAL INCOME",
      value: mask(totalIncome),
      sub:
        series.length === 1
          ? periodRangeLabel
          : `${series.length} ${locale === "id" ? "periode" : "periods"}`,
      accent: "#2276a8",
      valueColor: "#2276a8",
    },
    {
      label: locale === "id" ? "PENGELUARAN BERSIH" : "NET EXPENSE",
      value: mask(totalExpense),
      sub:
        totalIncome > 0
          ? `${spentRatio.toFixed(1)}% ${locale === "id" ? "dari pemasukan" : "of income"}`
          : `${rawExpenseBreakdown.length} ${locale === "id" ? "kategori aktif" : "active categories"}`,
      accent: "#c837a5",
      valueColor: "#c837a5",
    },
    hasSavings
      ? {
          label: locale === "id" ? "ARUS TABUNGAN" : "SAVINGS FLOW",
          value: mask(totalSavingsFlow, true),
          sub: `${locale === "id" ? "Saldo tabungan" : "Savings bal."}: ${maskCompact(balances.savingsTotalIdr)}`,
          accent: "#745bc7",
          valueColor: totalSavingsFlow < 0 ? "#c837a5" : "#745bc7",
        }
      : {
          label: locale === "id" ? "RASIO TABUNGAN" : "SAVINGS RATE",
          value: `${savingsRate.toFixed(1)}%`,
          sub:
            totalNet >= 0
              ? locale === "id"
                ? "Surplus sehat"
                : "Positive cashflow"
              : locale === "id"
                ? "Defisit periode"
                : "Period deficit",
          accent: "#745bc7",
          valueColor: savingsRate < 0 ? "#c837a5" : "#745bc7",
        },
    {
      label: locale === "id" ? "SELISIH BERSIH" : "TOTAL NET",
      value: mask(totalNet, true),
      sub: `${locale === "id" ? "Total saldo" : "Live balance"}: ${maskCompact(balances.totalBalanceIdr)}`,
      accent: "#14100e",
      valueColor: totalNet < 0 ? "#c837a5" : "#14100e",
    },
  ];

  const kpiSvg = kpiCards
    .map((card, i) => {
      const x = 56 + i * 377;
      const w = 357;
      return `
      <g transform="translate(${x}, 116)">
        <rect x="0" y="0" width="${w}" height="106" fill="#ffffff" stroke="#745bc7" stroke-opacity="0.38" stroke-width="1.25"/>
        <rect x="0" y="0" width="${w}" height="4" fill="${card.accent}"/>
        <text x="18" y="29" font-family="${FONT_MONO}" font-size="11" font-weight="700" letter-spacing="1.6" fill="#5d5370">${escXml(card.label)}</text>
        <text x="18" y="65" font-family="${FONT_MONO}" font-size="25" font-weight="700" fill="${card.valueColor}">${escXml(card.value)}</text>
        <text x="18" y="90" font-family="${FONT_MONO}" font-size="11.5" fill="#5d5370">${escXml(clipText(card.sub, 34))}</text>
      </g>`;
    })
    .join("");

  // =========================================================================
  // 2. Left Chart: Cashflow Trend (Vector Bar + Net Line Chart)
  // =========================================================================
  const chartX = 56;
  const chartY = 242;
  const chartCardW = 796;
  const chartCardH = 474;

  // Plot area inside Left Card
  const plotLeft = chartX + 86;
  const plotRight = chartX + chartCardW - 28;
  const plotTop = chartY + 66;
  const plotBottom = chartY + chartCardH - 72;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  let maxVal = 0;
  let minVal = 0;
  for (const pt of series) {
    maxVal = Math.max(
      maxVal,
      pt.incomeIdr,
      pt.expenseIdr,
      hasSavings ? pt.savingsFlowIdr : 0,
      pt.netIdr
    );
    minVal = Math.min(minVal, hasSavings ? pt.savingsFlowIdr : 0, pt.netIdr);
  }
  const yMax = niceAxisMax(maxVal);
  const yMin = minVal < 0 ? -niceAxisMax(Math.abs(minVal)) : 0;
  const ySpan = Math.max(1, yMax - yMin);
  const yOf = (val: number) => plotTop + ((yMax - val) / ySpan) * plotH;
  const zeroY = yOf(0);

  // 5 clean Y gridlines
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => yMin + t * ySpan);
  const gridSvg = yTicks
    .map((tick) => {
      const y = yOf(tick);
      const isZero = Math.abs(tick) < 1;
      return `
      <line x1="${plotLeft}" y1="${y.toFixed(1)}" x2="${plotRight}" y2="${y.toFixed(1)}" stroke="${isZero ? "#745bc7" : "#745bc7"}" stroke-opacity="${isZero ? "0.45" : "0.18"}" ${isZero ? "" : 'stroke-dasharray="3 4"'} stroke-width="${isZero ? "1.25" : "1"}"/>
      <text x="${plotLeft - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-family="${FONT_MONO}" font-size="11" fill="#5d5370">${escXml(maskCompact(Math.round(tick)))}</text>`;
    })
    .join("");

  const slotW = plotW / Math.max(1, series.length);
  const barSeriesCount = hasSavings ? 3 : 2;
  const maxBarW = series.length === 1 ? 56 : series.length <= 6 ? 22 : 13;
  const barGap = series.length === 1 ? 18 : 4;
  const barW = Math.min(
    maxBarW,
    Math.max(5, (slotW * 0.68 - barGap * (barSeriesCount - 1)) / barSeriesCount)
  );
  const groupW = barW * barSeriesCount + barGap * (barSeriesCount - 1);

  const labelStep =
    series.length <= 8 ? 1 : series.length <= 16 ? 2 : Math.ceil(series.length / 8);

  const barsSvgParts: string[] = [];
  const netPoints: Array<{ x: number; y: number }> = [];

  series.forEach((pt, idx) => {
    const cx = plotLeft + slotW * (idx + 0.5);
    const startX = cx - groupW / 2;

    const barValues: Array<{ val: number; color: string }> = [
      { val: pt.incomeIdr, color: "#2276a8" },
      { val: pt.expenseIdr, color: "#d749d5" },
    ];
    if (hasSavings) {
      barValues.push({ val: pt.savingsFlowIdr, color: "#745bc7" });
    }

    barValues.forEach((b, bIdx) => {
      const bx = startX + bIdx * (barW + barGap);
      const by = b.val >= 0 ? yOf(b.val) : zeroY;
      const bh = Math.max(b.val !== 0 ? 2 : 0, Math.abs(yOf(b.val) - zeroY));
      if (bh > 0) {
        barsSvgParts.push(
          `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${b.color}"/>`
        );
      }
      // On single-cycle 1M slide, place crisp data label right above each wide bar
      if (series.length === 1 && b.val !== 0) {
        const ly = b.val >= 0 ? Math.max(plotTop + 12, by - 8) : by + bh + 15;
        barsSvgParts.push(
          `<text x="${(bx + barW / 2).toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-family="${FONT_MONO}" font-size="11.5" font-weight="700" fill="${b.color}">${escXml(maskCompact(b.val))}</text>`
        );
      }
    });

    netPoints.push({ x: cx, y: yOf(pt.netIdr) });

    if (idx % labelStep === 0 || idx === series.length - 1) {
      barsSvgParts.push(
        `<text x="${cx.toFixed(1)}" y="${(plotBottom + 22).toFixed(1)}" text-anchor="middle" font-family="${FONT_MONO}" font-size="11" fill="#5d5370">${escXml(clipText(pt.shortLabel, 10))}</text>`
      );
    }
  });

  const netLineSvg =
    netPoints.length > 1
      ? `<polyline fill="none" stroke="${hasSavings ? "#14100e" : "#745bc7"}" stroke-width="2.4" points="${netPoints
          .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(" ")}"/>`
      : "";
  const netDotsSvg = netPoints
    .map(
      (p) =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="${hasSavings ? "#14100e" : "#745bc7"}" stroke="#ffffff" stroke-width="2"/>`
    )
    .join("");

  const legendItems = [
    { label: locale === "id" ? "Pemasukan" : "Income", color: "#2276a8", isLine: false },
    { label: locale === "id" ? "Pengeluaran" : "Expense", color: "#d749d5", isLine: false },
    ...(hasSavings
      ? [{ label: locale === "id" ? "Arus Tabungan" : "Savings Flow", color: "#745bc7", isLine: false }]
      : []),
    {
      label: locale === "id" ? "Total Net" : "Total Net",
      color: hasSavings ? "#14100e" : "#745bc7",
      isLine: true,
    },
  ];

  const legendStep = 128;
  const totalLegendW = (legendItems.length - 1) * legendStep + 86;
  const legendStartX = Math.round(plotLeft + (plotW - totalLegendW) / 2);
  const legendY = chartY + chartCardH - 22;
  const legendSvg = legendItems
    .map((item, idx) => {
      const lx = legendStartX + idx * legendStep;
      const swatch = item.isLine
        ? `<line x1="${lx}" y1="${legendY - 4}" x2="${lx + 14}" y2="${legendY - 4}" stroke="${item.color}" stroke-width="2.5"/><circle cx="${lx + 7}" cy="${legendY - 4}" r="3" fill="${item.color}"/>`
        : `<rect x="${lx}" y="${legendY - 10}" width="11" height="11" fill="${item.color}"/>`;
      return `${swatch}<text x="${lx + 18}" y="${legendY}" font-family="${FONT_MONO}" font-size="11.5" fill="#4e4361">${escXml(item.label)}</text>`;
    })
    .join("");

  // =========================================================================
  // 3. Right Chart: Expense Breakdown (True-Color Vector Donut + Ranked Bars)
  // =========================================================================
  const bdX = 872;
  const bdY = 242;
  const bdW = 672;
  const bdH = 474;

  const donutCx = bdX + 132;
  const donutCy = bdY + 258;
  const outerR = 96;
  const innerR = 60;

  let curAngle = 0;
  const donutSvg =
    visibleSlices.length === 0
      ? `<circle cx="${donutCx}" cy="${donutCy}" r="${(outerR + innerR) / 2}" fill="none" stroke="#745bc7" stroke-opacity="0.16" stroke-width="${outerR - innerR}"/>`
      : visibleSlices
          .map((slice) => {
            const sweep = Math.max(
              1.5,
              totalExpenseBreakdown > 0
                ? (slice.amountIdr / totalExpenseBreakdown) * 360
                : 0
            );
            const nextAngle = Math.min(360, curAngle + sweep);
            const d = buildDonutArcPath(
              donutCx,
              donutCy,
              outerR,
              innerR,
              curAngle,
              nextAngle
            );
            curAngle = nextAngle;
            return `<path d="${d}" fill="${slice.color}" stroke="#ffffff" stroke-width="2.5"/>`;
          })
          .join("");

  const breakdownRowsSvg =
    visibleSlices.length === 0
      ? `<text x="${bdX + bdW / 2}" y="${bdY + 260}" text-anchor="middle" font-family="${FONT_MONO}" font-size="13" fill="#5d5370">${escXml(
          locale === "id"
            ? "Belum ada data pengeluaran pada periode ini."
            : "No expense data in this period."
        )}</text>`
      : visibleSlices
          .map((slice, idx) => {
            const rowCount = visibleSlices.length;
            const rowSpacing = rowCount <= 5 ? 68 : 60;
            const totalListH = rowCount * rowSpacing;
            const startY = bdY + 56 + Math.max(16, (bdH - 68 - totalListH) / 2);
            const ry = startY + idx * rowSpacing;
            const rx = bdX + 262;
            const rw = bdW - 288;
            const pctStr =
              slice.percentage > 0 && slice.percentage < 0.5
                ? "<1%"
                : `${slice.percentage.toFixed(0)}%`;
            const barFillW = Math.max(
              slice.percentage > 0 ? 5 : 0,
              (Math.min(100, slice.percentage) / 100) * rw
            );
            const subLine = slice.subLabel
              ? `<text x="${rx + 20}" y="${ry + 28}" font-family="${FONT_MONO}" font-size="10.5" fill="#5d5370">${escXml(clipText(slice.subLabel, 38))}</text>`
              : "";
            const trackY = slice.subLabel ? ry + 36 : ry + 22;

            return `
            <g>
              <rect x="${rx}" y="${ry}" width="13" height="13" fill="${slice.color}"/>
              <text x="${rx + 20}" y="${ry + 11}" font-family="${FONT_MONO}" font-size="13" font-weight="700" fill="#14100e">${escXml(clipText(slice.label, 20))}</text>
              <text x="${rx + rw - 42}" y="${ry + 11}" text-anchor="end" font-family="${FONT_MONO}" font-size="12.5" font-weight="700" fill="#14100e">${escXml(mask(slice.amountIdr))}</text>
              <text x="${rx + rw}" y="${ry + 11}" text-anchor="end" font-family="${FONT_MONO}" font-size="12" font-weight="700" fill="#745bc7">${escXml(pctStr)}</text>
              ${subLine}
              <rect x="${rx}" y="${trackY}" width="${rw}" height="7" fill="#745bc7" fill-opacity="0.12"/>
              <rect x="${rx}" y="${trackY}" width="${barFillW.toFixed(1)}" height="7" fill="${slice.color}"/>
            </g>`;
          })
          .join("");

  // =========================================================================
  // 4. Bottom Strip: Pockets Snapshot (Left) + Shizuku Chronicle (Right)
  // =========================================================================
  const footerY = 736;
  const footerH = 114;
  const hasPockets = balances.items.length > 0;
  const pocketsCardW = hasPockets ? 580 : 0;
  const chronicleX = hasPockets ? 56 + pocketsCardW + 20 : 56;
  const chronicleW = hasPockets ? 1544 - chronicleX : 1488;

  const shownPockets = balances.items.slice(0, 3);
  const pocketsSvg = hasPockets
    ? `
    <g transform="translate(56, ${footerY})">
      <rect x="0" y="0" width="${pocketsCardW}" height="${footerH}" fill="#ffffff" stroke="#745bc7" stroke-opacity="0.4" stroke-width="1.25"/>
      <rect x="0" y="0" width="${pocketsCardW}" height="30" fill="#f4effd"/>
      <line x1="0" y1="30" x2="${pocketsCardW}" y2="30" stroke="#745bc7" stroke-opacity="0.25"/>
      <text x="16" y="19" font-family="${FONT_MONO}" font-size="10.5" font-weight="700" letter-spacing="1.6" fill="#745bc7">${escXml(
        locale === "id" ? "KANTONG DANA // 雫" : "POCKETS SNAPSHOT // 雫"
      )}</text>
      <text x="${pocketsCardW - 16}" y="19" text-anchor="end" font-family="${FONT_MONO}" font-size="10.5" font-weight="600" fill="#5d5370">${escXml(
        `${locale === "id" ? "Total" : "Total"}: ${mask(balances.totalBalanceIdr)}`
      )}</text>
      ${shownPockets
        .map((item, idx) => {
          const cols = shownPockets.length;
          const gap = 10;
          const cellW = (pocketsCardW - 32 - gap * (cols - 1)) / cols;
          const cx = 16 + idx * (cellW + gap);
          const isSav = item.account.role === "savings";
          const accent = isSav ? "#745bc7" : "#2276a8";
          const roleText = isSav
            ? locale === "id"
              ? "TABUNGAN"
              : "SAVINGS"
            : locale === "id"
              ? "HARIAN"
              : "DAILY";
          return `
          <g transform="translate(${cx.toFixed(1)}, 42)">
            <rect x="0" y="0" width="${cellW.toFixed(1)}" height="58" fill="#fdfbff" stroke="#745bc7" stroke-opacity="0.28"/>
            <rect x="0" y="0" width="3.5" height="58" fill="${accent}"/>
            <text x="12" y="21" font-family="${FONT_MONO}" font-size="11.5" font-weight="700" fill="#14100e">${escXml(clipText(item.account.name.toUpperCase(), 12))}</text>
            <text x="${(cellW - 10).toFixed(1)}" y="20" text-anchor="end" font-family="${FONT_MONO}" font-size="8.5" font-weight="700" fill="${accent}">${escXml(roleText)}</text>
            <text x="12" y="45" font-family="${FONT_MONO}" font-size="13.5" font-weight="700" fill="${item.balanceIdr < 0 ? "#c837a5" : "#14100e"}">${escXml(mask(item.balanceIdr))}</text>
          </g>`;
        })
        .join("")}
    </g>`
    : "";

  const maxInsightChars = hasPockets ? 88 : 135;
  const chronicleSvg = `
    <g transform="translate(${chronicleX}, ${footerY})">
      <rect x="0" y="0" width="${chronicleW}" height="${footerH}" fill="#ffffff" stroke="#745bc7" stroke-opacity="0.4" stroke-width="1.25"/>
      <rect x="0" y="0" width="${chronicleW}" height="30" fill="#f4effd"/>
      <line x1="0" y1="30" x2="${chronicleW}" y2="30" stroke="#745bc7" stroke-opacity="0.25"/>
      <text x="16" y="19" font-family="${FONT_MONO}" font-size="10.5" font-weight="700" letter-spacing="1.6" fill="#745bc7">${escXml(
        locale === "id" ? "CATATAN SHIZUKU (雫)" : "SHIZUKU CHRONICLE (雫)"
      )}</text>
      <text x="${chronicleW - 16}" y="19" text-anchor="end" font-family="${FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.2" fill="#d749d5">${escXml(rangeTag)}</text>
      ${insights
        .slice(0, 3)
        .map((line, idx) => {
          const ly = 52 + idx * 23;
          return `
          <text x="16" y="${ly}" font-family="${FONT_MONO}" font-size="11.5" font-weight="700" fill="#d749d5">0${idx + 1} ▶</text>
          <text x="58" y="${ly}" font-family="${FONT_MONO}" font-size="11.5" fill="#14100e">${escXml(clipText(line, maxInsightChars))}</text>`;
        })
        .join("")}
    </g>`;

  const subtitleRight = [
    ownerLabel ? ownerLabel.toUpperCase() : null,
    `${store.transactions.length} ${locale === "id" ? "CATATAN" : "ENTRIES"}`,
    generatedDate,
  ]
    .filter(Boolean)
    .join(" · ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgWash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7f1ff"/>
      <stop offset="52%" stop-color="#fdf4fb"/>
      <stop offset="100%" stop-color="#eef5ff"/>
    </linearGradient>
    <radialGradient id="mistPink" cx="14%" cy="14%" r="44%">
      <stop offset="0%" stop-color="#ef85e8" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#ef85e8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mistViolet" cx="88%" cy="86%" r="46%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bandGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8a5df6"/>
      <stop offset="48%" stop-color="#d749d5"/>
      <stop offset="100%" stop-color="#745bc7"/>
    </linearGradient>
  </defs>

  <!-- Watercolor Editorial Canvas -->
  <rect width="${W}" height="${H}" fill="url(#bgWash)"/>
  <rect width="${W}" height="${H}" fill="url(#mistPink)"/>
  <rect width="${W}" height="${H}" fill="url(#mistViolet)"/>

  <!-- Sharp SHIZUKU Outer Editorial Frame + Drop Shadow -->
  <rect x="34" y="34" width="1540" height="838" fill="#745bc7" fill-opacity="0.16"/>
  <rect x="28" y="28" width="1544" height="844" fill="#fdfaff" stroke="#745bc7" stroke-width="2"/>

  <!-- Vivid SHIZUKU Top Band Header -->
  <rect x="28" y="28" width="1544" height="68" fill="url(#bandGrad)"/>

  <!-- Minimal Vector Umbrella Mark -->
  <g transform="translate(56, 46)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 4 C7 4 2 10 2 17 L30 17 C30 10 25 4 16 4 Z" fill="#ffffff" fill-opacity="0.2"/>
    <line x1="16" y1="2" x2="16" y2="27"/>
    <path d="M16 27 C16 30 12 30 12 27"/>
  </g>
  <text x="102" y="61" font-family="${FONT_SERIF}" font-size="25" font-weight="700" letter-spacing="4" fill="#ffffff">SHIKAS (雫)</text>
  <text x="102" y="81" font-family="${FONT_MONO}" font-size="11" font-weight="600" letter-spacing="2.2" fill="#ffffff" fill-opacity="0.92">${escXml(
    locale === "id"
      ? "LAPORAN ARUS KAS PRIBADI // IDR"
      : "PERSONAL CASHFLOW PRESENTATION REPORT // IDR"
  )}</text>

  <!-- Period & Mode Pills -->
  <rect x="1152" y="45" width="268" height="34" fill="#ffffff" fill-opacity="0.18" stroke="#ffffff" stroke-opacity="0.5"/>
  <text x="1286" y="66" text-anchor="middle" font-family="${FONT_MONO}" font-size="12" font-weight="700" letter-spacing="1.2" fill="#ffffff">${escXml(
    clipText(periodRangeLabel.toUpperCase(), 26)
  )}</text>
  <rect x="1432" y="45" width="112" height="34" fill="#ffffff" fill-opacity="0.24" stroke="#ffffff" stroke-opacity="0.55"/>
  <text x="1488" y="66" text-anchor="middle" font-family="${FONT_MONO}" font-size="11.5" font-weight="700" letter-spacing="1.4" fill="#ffffff">${escXml(rangeTag)}</text>

  <!-- Row 1: 4 KPI Cards -->
  ${kpiSvg}

  <!-- Row 2 Left: Cashflow Trend Card -->
  <g>
    <rect x="${chartX}" y="${chartY}" width="${chartCardW}" height="${chartCardH}" fill="#ffffff" stroke="#745bc7" stroke-opacity="0.4" stroke-width="1.25"/>
    <rect x="${chartX}" y="${chartY}" width="${chartCardW}" height="34" fill="#f4effd"/>
    <line x1="${chartX}" y1="${chartY + 34}" x2="${chartX + chartCardW}" y2="${chartY + 34}" stroke="#745bc7" stroke-opacity="0.25"/>
    <text x="${chartX + 18}" y="${chartY + 21}" font-family="${FONT_MONO}" font-size="11" font-weight="700" letter-spacing="1.8" fill="#745bc7">${escXml(
      locale === "id"
        ? `ARUS KAS (${rangeTag}) // 雫`
        : `CASHFLOW TREND (${rangeTag}) // 雫`
    )}</text>
    <text x="${chartX + chartCardW - 18}" y="${chartY + 21}" text-anchor="end" font-family="${FONT_MONO}" font-size="10.5" font-weight="600" fill="#5d5370">${escXml(
      periodRangeLabel
    )}</text>
    ${gridSvg}
    ${barsSvgParts.join("\n")}
    ${netLineSvg}
    ${netDotsSvg}
    ${legendSvg}
  </g>

  <!-- Row 2 Right: Expense Breakdown Card -->
  <g>
    <rect x="${bdX}" y="${bdY}" width="${bdW}" height="${bdH}" fill="#ffffff" stroke="#745bc7" stroke-opacity="0.4" stroke-width="1.25"/>
    <rect x="${bdX}" y="${bdY}" width="${bdW}" height="34" fill="#f4effd"/>
    <line x1="${bdX}" y1="${bdY + 34}" x2="${bdX + bdW}" y2="${bdY + 34}" stroke="#745bc7" stroke-opacity="0.25"/>
    <text x="${bdX + 18}" y="${bdY + 21}" font-family="${FONT_MONO}" font-size="11" font-weight="700" letter-spacing="1.8" fill="#745bc7">${escXml(
      locale === "id" ? "KOMPOSISI PENGELUARAN" : "EXPENSE BREAKDOWN"
    )}</text>
    <rect x="${bdX + bdW - 118}" y="${bdY + 7}" width="102" height="20" fill="#745bc7"/>
    <text x="${bdX + bdW - 67}" y="${bdY + 21}" text-anchor="middle" font-family="${FONT_MONO}" font-size="9.5" font-weight="700" letter-spacing="1.2" fill="#ffffff">${escXml(modeBadgeLabel)}</text>

    ${donutSvg}
    <!-- Clean Center Donut Readout -->
    <text x="${donutCx}" y="${donutCy - 14}" text-anchor="middle" font-family="${FONT_MONO}" font-size="10.5" font-weight="700" letter-spacing="1.8" fill="#5d5370">TOTAL</text>
    <text x="${donutCx}" y="${donutCy + 10}" text-anchor="middle" font-family="${FONT_MONO}" font-size="20" font-weight="700" fill="#14100e">${escXml(maskCompact(totalExpenseBreakdown))}</text>
    <text x="${donutCx}" y="${donutCy + 28}" text-anchor="middle" font-family="${FONT_MONO}" font-size="10" font-weight="600" fill="#745bc7">${escXml(
      breakdownMode === "group"
        ? `${allSlices.length} ${locale === "id" ? "GRUP" : allSlices.length === 1 ? "GROUP" : "GROUPS"}`
        : `${allSlices.length} ${locale === "id" ? "KATEGORI" : allSlices.length === 1 ? "CAT" : "CATS"}`
    )}</text>

    ${breakdownRowsSvg}
  </g>

  <!-- Row 3: Pockets Snapshot & Shizuku Chronicle -->
  ${pocketsSvg}
  ${chronicleSvg}

  <!-- Clean Editorial Footer Metadata -->
  <text x="56" y="863" font-family="${FONT_SANS}" font-size="10.5" font-weight="600" fill="#5d5370">SHIKAS · SHIZUKU (雫) Ecosystem</text>
  <text x="1544" y="863" text-anchor="end" font-family="${FONT_MONO}" font-size="10.5" fill="#5d5370">${escXml(subtitleRight)}</text>
</svg>`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Renders the 16:9 vector presentation slide to a crisp 2x Retina PNG (3200x1800)
 * and downloads it locally. Falls back cleanly to crisp .svg if Canvas rasterization fails.
 */
export async function exportVisualReportPng(
  options: VisualReportOptions
): Promise<"png" | "svg"> {
  const svg = buildVisualReportSvg(options);
  const stamp = new Date().toISOString().slice(0, 10);
  const baseName = `shikas-report-${options.range}-${options.breakdownMode}-${stamp}`;

  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("SVG image load failed"));
      el.src = dataUrl;
    });

    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, W, H);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/png", 1)
    );
    if (!pngBlob) throw new Error("PNG export returned null blob");

    downloadBlob(pngBlob, `${baseName}.png`);
    return "png";
  } catch {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(svgBlob, `${baseName}.svg`);
    return "svg";
  }
}
