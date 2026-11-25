import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SHIKAS_ASSETS } from "../../config/assets";
import { useCashflow } from "../../context/CashflowContext";
import { CATEGORY_MAP, getCategoryLabel } from "../../data/categories";
import {
  computeCategoryBreakdownForMonths,
  computeMonthlySummary,
  computePercentDelta,
  computeTimeRangeSeries,
  type AnalyticsRange,
  type MonthlySeriesPoint,
} from "../../utils/calculations";
import {
  formatCompactIdr,
  formatCycleLabel,
  formatIdr,
  shiftMonthKey,
} from "../../utils/format";
import { computePendingReimburseOverview } from "../../utils/reimburse";
import { MoneyDisplay } from "../common/MoneyDisplay";
import { SandboxBanner } from "../common/SandboxBanner";

const RANGE_OPTIONS: Array<{ id: AnalyticsRange; en: string; idLabel: string }> = [
  { id: "3m", en: "3M", idLabel: "3 BLN" },
  { id: "6m", en: "6M", idLabel: "6 BLN" },
  { id: "12m", en: "12M", idLabel: "12 BLN" },
  { id: "all", en: "ALL TIME", idLabel: "SEMUA" },
];

interface ChartPoint extends MonthlySeriesPoint {
  label: string;
  fullLabel: string;
}

export const AnalyticsView: React.FC = () => {
  const { store, selectedMonth, setSelectedMonth, t, locale } = useCashflow();
  const [range, setRange] = useState<AnalyticsRange>("6m");

  const cycleStartDay = store.settings.cycleStartDay;

  const seriesData = useMemo<ChartPoint[]>(
    () =>
      computeTimeRangeSeries(
        store.transactions,
        selectedMonth,
        range,
        store.accounts,
        cycleStartDay
      ).map((item) => ({
        ...item,
        label: formatCycleLabel(item.month, locale, cycleStartDay, true),
        fullLabel: formatCycleLabel(item.month, locale, cycleStartDay, false),
      })),
    [
      store.transactions,
      store.accounts,
      selectedMonth,
      range,
      locale,
      cycleStartDay,
    ]
  );

  const rangeMonths = useMemo(
    () => (range === "all" ? null : seriesData.map((d) => d.month)),
    [range, seriesData]
  );

  const hasSavingsPockets = useMemo(
    () => store.accounts.some((a) => a.role === "savings"),
    [store.accounts]
  );

  const hasNegativeFlow = useMemo(
    () =>
      seriesData.some(
        (pt) => pt.netIdr < 0 || (hasSavingsPockets && pt.savingsFlowIdr < 0)
      ),
    [seriesData, hasSavingsPockets]
  );

  const pendingReimburse = useMemo(
    () => computePendingReimburseOverview(store.transactions),
    [store.transactions]
  );

  const periodTotals = useMemo(() => {
    let incomeIdr = 0;
    let expenseIdr = 0;
    let reimbursedIdr = 0;
    let savingsFlowIdr = 0;
    for (const pt of seriesData) {
      incomeIdr += pt.incomeIdr;
      expenseIdr += pt.expenseIdr;
      reimbursedIdr += pt.reimbursedIdr;
      savingsFlowIdr += pt.savingsFlowIdr;
    }
    const netIdr = incomeIdr - expenseIdr;
    const savingsRate = incomeIdr > 0 ? (netIdr / incomeIdr) * 100 : 0;
    return {
      incomeIdr,
      expenseIdr,
      reimbursedIdr,
      netIdr,
      savingsFlowIdr,
      savingsRate,
    };
  }, [seriesData]);

  const expenseBreakdown = useMemo(
    () =>
      computeCategoryBreakdownForMonths(
        store.transactions,
        rangeMonths,
        "expense",
        cycleStartDay
      ),
    [store.transactions, rangeMonths, cycleStartDay]
  );

  const currentSummary = useMemo(
    () =>
      computeMonthlySummary(
        store.transactions,
        selectedMonth,
        store.accounts,
        cycleStartDay
      ),
    [store.transactions, store.accounts, selectedMonth, cycleStartDay]
  );

  const prevSummary = useMemo(
    () =>
      computeMonthlySummary(
        store.transactions,
        shiftMonthKey(selectedMonth, -1),
        store.accounts,
        cycleStartDay
      ),
    [store.transactions, store.accounts, selectedMonth, cycleStartDay]
  );

  const rangeTag = useMemo(() => {
    if (range === "3m") return locale === "id" ? "3 BULAN" : "3 MONTHS";
    if (range === "6m") return locale === "id" ? "6 BULAN" : "6 MONTHS";
    if (range === "12m") return locale === "id" ? "12 BULAN" : "12 MONTHS";
    return locale === "id" ? "SEMUA WAKTU" : "ALL TIME";
  }, [range, locale]);

  const chronicles = useMemo(() => {
    const list: string[] = [];
    const mask = (v: number, showSign = false) =>
      store.settings.privacyMode ? "Rp •••••••" : formatIdr(v, showSign);

    const top = expenseBreakdown[0];
    if (top) {
      const catName = getCategoryLabel(top.categoryId, locale);
      list.push(
        locale === "id"
          ? `Pengeluaran terbesar pada periode ${rangeTag.toLowerCase()} adalah "${catName}" (${top.percentage.toFixed(1)}% · ${mask(top.amountIdr)}).`
          : `Largest spending category over ${rangeTag.toLowerCase()} is "${catName}" (${top.percentage.toFixed(1)}% · ${mask(top.amountIdr)}).`
      );
    }

    if (range !== "all") {
      const expDelta = computePercentDelta(
        currentSummary.expenseIdr,
        prevSummary.expenseIdr
      );
      if (expDelta !== null) {
        const verbId = expDelta <= 0 ? "turun" : "naik";
        const verbEn = expDelta <= 0 ? "decreased" : "increased";
        list.push(
          locale === "id"
            ? `Pengeluaran ${formatCycleLabel(selectedMonth, locale, cycleStartDay)} ${verbId} ${Math.abs(expDelta).toFixed(1)}% dibanding ${formatCycleLabel(shiftMonthKey(selectedMonth, -1), locale, cycleStartDay)}.`
            : `${formatCycleLabel(selectedMonth, locale, cycleStartDay)} spending ${verbEn} by ${Math.abs(expDelta).toFixed(1)}% compared to ${formatCycleLabel(shiftMonthKey(selectedMonth, -1), locale, cycleStartDay)}.`
        );
      }
    } else if (seriesData.length > 0) {
      list.push(
        locale === "id"
          ? `Total ${seriesData.length} periode tercatat dari ${seriesData[0].label} hingga ${seriesData[seriesData.length - 1].label}.`
          : `Covering ${seriesData.length} recorded periods from ${seriesData[0].label} through ${seriesData[seriesData.length - 1].label}.`
      );
    }

    if (hasSavingsPockets && periodTotals.savingsFlowIdr !== 0) {
      const pctOfIncome =
        periodTotals.incomeIdr > 0
          ? ` (${((Math.abs(periodTotals.savingsFlowIdr) / periodTotals.incomeIdr) * 100).toFixed(1)}% ${locale === "id" ? "dari pemasukan" : "of income"})`
          : "";
      if (periodTotals.savingsFlowIdr > 0) {
        list.push(
          locale === "id"
            ? `Total ${mask(periodTotals.savingsFlowIdr, true)} masuk bersih ke kantong Tabungan selama ${rangeTag.toLowerCase()}${pctOfIncome}.`
            : `Net ${mask(periodTotals.savingsFlowIdr, true)} secured into Savings pockets over ${rangeTag.toLowerCase()}${pctOfIncome}.`
        );
      } else {
        list.push(
          locale === "id"
            ? `Total penarikan bersih ${mask(Math.abs(periodTotals.savingsFlowIdr))} dari kantong Tabungan selama ${rangeTag.toLowerCase()}.`
            : `Net ${mask(Math.abs(periodTotals.savingsFlowIdr))} drawn from Savings pockets over ${rangeTag.toLowerCase()}.`
        );
      }
    }

    if (periodTotals.reimbursedIdr > 0 || pendingReimburse.pendingCount > 0) {
      if (periodTotals.reimbursedIdr > 0 && pendingReimburse.pendingCount > 0) {
        list.push(
          locale === "id"
            ? `Total ${mask(periodTotals.reimbursedIdr)} pengeluaran sudah direimburse dalam ${rangeTag.toLowerCase()} (masih ada ${pendingReimburse.pendingCount} tagihan belum lunas).`
            : `${mask(periodTotals.reimbursedIdr)} in expenses reimbursed over ${rangeTag.toLowerCase()} (${pendingReimburse.pendingCount} pending item${pendingReimburse.pendingCount > 1 ? "s" : ""} remaining).`
        );
      } else if (periodTotals.reimbursedIdr > 0) {
        list.push(
          locale === "id"
            ? `Total ${mask(periodTotals.reimbursedIdr)} pengeluaran sudah direimburse dalam ${rangeTag.toLowerCase()} — pengeluaran tercatat adalah porsi bersihmu.`
            : `${mask(periodTotals.reimbursedIdr)} in expenses reimbursed over ${rangeTag.toLowerCase()} — chart spending reflects your net share.`
        );
      } else {
        list.push(
          locale === "id"
            ? `Masih ada ${pendingReimburse.pendingCount} catatan reimburse yang belum lunas.`
            : `${pendingReimburse.pendingCount} pending reimbursement${pendingReimburse.pendingCount > 1 ? "s" : ""} still awaiting settlement.`
        );
      }
    }

    if (periodTotals.incomeIdr > 0) {
      list.push(
        locale === "id"
          ? `Rasio tabungan rata-rata periode ini ${periodTotals.savingsRate.toFixed(1)}% dengan selisih bersih ${mask(periodTotals.netIdr, true)}.`
          : `Average savings rate across this period is ${periodTotals.savingsRate.toFixed(1)}% with ${mask(periodTotals.netIdr, true)} total net cashflow.`
      );
    }

    return list;
  }, [
    expenseBreakdown,
    currentSummary,
    prevSummary,
    selectedMonth,
    cycleStartDay,
    locale,
    range,
    rangeTag,
    seriesData,
    periodTotals,
    pendingReimburse,
    hasSavingsPockets,
    store.settings.privacyMode,
  ]);

  const formatTooltip = (value: number, showSign = false) =>
    store.settings.privacyMode ? "Rp •••••••" : formatIdr(value, showSign);

  const renderMainTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: ChartPoint }>;
  }) => {
    const pt = payload?.[0]?.payload;
    if (!active || !pt) return null;

    return (
      <div className="border-[1.5px] border-[#745bc7] bg-[#fdf9ff]/98 px-3 py-2.5 font-mono text-[11px] shadow-[4px_4px_0_0_rgba(116,91,199,0.2)]">
        <p className="border-b border-[#745bc7]/20 pb-1 font-bold text-[#14100e]">
          {pt.fullLabel}
        </p>
        <div className="mt-1.5 space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#2276a8]">{t.analytics.incomeLegend}</span>
            <span className="font-mono-num font-bold text-[#2276a8]">
              {formatTooltip(pt.incomeIdr)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#c837a5]">{t.analytics.expenseLegend}</span>
            <span className="font-mono-num font-bold text-[#c837a5]">
              {formatTooltip(pt.expenseIdr)}
            </span>
          </div>
          {pt.reimbursedIdr > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#1f8f6b]">
                {locale === "id" ? "Direimburse" : "Reimbursed"}
              </span>
              <span className="font-mono-num font-bold text-[#1f8f6b]">
                {formatTooltip(pt.reimbursedIdr)}
              </span>
            </div>
          )}
          {hasSavingsPockets && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#745bc7]">{t.analytics.savingsLegend}</span>
              <span
                className={`font-mono-num font-bold ${
                  pt.savingsFlowIdr < 0 ? "text-[#c837a5]" : "text-[#745bc7]"
                }`}
              >
                {formatTooltip(pt.savingsFlowIdr, true)}
              </span>
            </div>
          )}
          <div className="mt-1.5 space-y-1 border-t border-[#745bc7]/20 pt-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#14100e]">{t.analytics.netLegend}</span>
              <span
                className={`font-mono-num font-bold ${
                  pt.netIdr < 0 ? "text-[#c837a5]" : "text-[#14100e]"
                }`}
              >
                {formatTooltip(pt.netIdr, true)}
              </span>
            </div>
            {hasSavingsPockets && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#5d5370]">
                  {t.analytics.dailyNetLegend}
                </span>
                <span
                  className={`font-mono-num font-semibold ${
                    pt.dailyNetIdr < 0 ? "text-[#c837a5]" : "text-[#5d5370]"
                  }`}
                >
                  {formatTooltip(pt.dailyNetIdr, true)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <SandboxBanner />

      {/* Primary Analytics Frame (Starts directly below nav — 100% consistent with CASHFLOW) */}
      <section className="vn-frame overflow-hidden">
        {/* Vivid SHIZUKU Watercolor Band Header Strip + Integrated Period Switcher */}
        <div className="shikas-band-strip flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-white">
          <span className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
            {locale === "id"
              ? `ARUS KAS (${rangeTag}) // 雫`
              : `CASHFLOW (${rangeTag}) // 雫`}
          </span>

          {range === "all" ? (
            <span className="border border-white/40 bg-white/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase">
              {seriesData.length > 1
                ? `${seriesData[0].label} — ${seriesData[seriesData.length - 1].label}`
                : rangeTag}
            </span>
          ) : (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))}
                aria-label="Previous month"
                className="flex h-6 w-6 items-center justify-center border border-white/40 bg-white/15 text-white transition hover:bg-white/30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[116px] text-center font-mono text-[10.5px] font-semibold tracking-[0.1em] uppercase drop-shadow-2xs sm:text-[11px] sm:tracking-[0.12em]">
                {formatCycleLabel(selectedMonth, locale, cycleStartDay)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, 1))}
                aria-label="Next month"
                className="flex h-6 w-6 items-center justify-center border border-white/40 bg-white/15 text-white transition hover:bg-white/30"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Unified Single-Row Toolbar: 3M | 6M | 12M | ALL + Period Totals */}
        <div className="flex flex-col gap-3 border-b border-[#745bc7]/20 bg-[#fdf9ff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          {/* Sharp RPG Range Switcher */}
          <div className="inline-flex w-fit border border-[#745bc7]/55 bg-white">
            {RANGE_OPTIONS.map((opt, idx) => {
              const active = range === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRange(opt.id)}
                  className={`px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase transition ${
                    idx > 0 ? "border-l border-[#745bc7]/40" : ""
                  } ${
                    active
                      ? "bg-[#745bc7] text-white"
                      : "text-[#5d5370] hover:bg-[#f4effd] hover:text-[#14100e]"
                  }`}
                >
                  {locale === "id" ? opt.idLabel : opt.en}
                </button>
              );
            })}
          </div>

          {/* Inline Period Summary Numbers (1:1 color-coded with chart series) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
            <span className="text-[#5d5370]">
              {locale === "id" ? "MASUK" : "IN"}{" "}
              <MoneyDisplay
                amountIdr={periodTotals.incomeIdr}
                className="font-bold text-[#2276a8]"
              />
            </span>
            <span className="text-[#5d5370]">
              {locale === "id" ? "KELUAR" : "OUT"}{" "}
              <MoneyDisplay
                amountIdr={periodTotals.expenseIdr}
                className="font-bold text-[#c837a5]"
              />
            </span>
            {hasSavingsPockets && (
              <span className="text-[#5d5370]">
                {locale === "id" ? "TABUNGAN" : "SAVINGS"}{" "}
                <MoneyDisplay
                  amountIdr={periodTotals.savingsFlowIdr}
                  showSign
                  className={`font-bold ${
                    periodTotals.savingsFlowIdr < 0
                      ? "text-[#c837a5]"
                      : "text-[#745bc7]"
                  }`}
                />
              </span>
            )}
            <span className="text-[#5d5370]">
              NET{" "}
              <MoneyDisplay
                amountIdr={periodTotals.netIdr}
                showSign
                className={`font-bold ${
                  periodTotals.netIdr >= 0 ? "text-[#14100e]" : "text-[#c837a5]"
                }`}
              />
            </span>
          </div>
        </div>

        {/* Main Composed Chart */}
        <div className="bg-white/95 p-4 sm:p-5">
          <div className="h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={seriesData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="rgba(116,91,199,0.2)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  interval="preserveStartEnd"
                  minTickGap={22}
                  tick={{
                    fill: "#5d5370",
                    fontSize: 10,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                  axisLine={{ stroke: "rgba(116,91,199,0.35)" }}
                  tickLine={false}
                />
                <YAxis
                  width={76}
                  tick={{
                    fill: "#5d5370",
                    fontSize: 10,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    store.settings.privacyMode ? "••" : formatCompactIdr(v, locale)
                  }
                />
                {hasNegativeFlow && (
                  <ReferenceLine y={0} stroke="rgba(116,91,199,0.45)" />
                )}
                <Tooltip
                  cursor={{ fill: "rgba(116,91,199,0.08)" }}
                  content={renderMainTooltip}
                />
                <Legend
                  formatter={(val: string) =>
                    val === "incomeIdr"
                      ? t.analytics.incomeLegend
                      : val === "expenseIdr"
                        ? t.analytics.expenseLegend
                        : val === "savingsFlowIdr"
                          ? t.analytics.savingsLegend
                          : t.analytics.netLegend
                  }
                  wrapperStyle={{
                    fontSize: "11px",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                />
                <Bar
                  dataKey="incomeIdr"
                  fill="#2276a8"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={seriesData.length > 8 ? 14 : hasSavingsPockets ? 18 : 24}
                  animationDuration={360}
                />
                <Bar
                  dataKey="expenseIdr"
                  fill="#d749d5"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={seriesData.length > 8 ? 14 : hasSavingsPockets ? 18 : 24}
                  animationDuration={360}
                />
                {hasSavingsPockets && (
                  <Bar
                    dataKey="savingsFlowIdr"
                    fill="#745bc7"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={seriesData.length > 8 ? 14 : 18}
                    animationDuration={360}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="netIdr"
                  stroke={hasSavingsPockets ? "#14100e" : "#745bc7"}
                  strokeWidth={2.2}
                  animationDuration={360}
                  dot={{
                    r: 3.5,
                    fill: hasSavingsPockets ? "#14100e" : "#745bc7",
                    strokeWidth: 1.5,
                    stroke: "#ffffff",
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Expense Breakdown + Cumulative Balance Trajectory (Synced with Range) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="vn-frame overflow-hidden lg:col-span-6">
          <div className="flex items-center justify-between border-b border-[#745bc7]/25 bg-[#f4effd] px-4 py-2">
            <h2 className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#745bc7] uppercase">
              {locale === "id" ? "KOMPOSISI PENGELUARAN" : "EXPENSE BREAKDOWN"}
            </h2>
            <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#5d5370] uppercase">
              {rangeTag}
            </span>
          </div>

          <div className="bg-white/95 p-4 sm:p-5">
            {expenseBreakdown.length === 0 ? (
              <p className="py-16 text-center font-mono text-xs text-[#5d5370]">
                {t.analytics.noExpenseData}
              </p>
            ) : (
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[144px_1fr]">
                <div className="mx-auto h-[156px] w-[144px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        dataKey="amountIdr"
                        nameKey="categoryId"
                        innerRadius={40}
                        outerRadius={64}
                        paddingAngle={2}
                        animationDuration={360}
                      >
                        {expenseBreakdown.map((entry) => (
                          <Cell
                            key={entry.categoryId}
                            fill={CATEGORY_MAP[entry.categoryId]?.color ?? "#745bc7"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(253,249,255,0.98)",
                          borderColor: "#745bc7",
                          borderRadius: "0px",
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: "11px",
                        }}
                        formatter={(val: number, name: string) => [
                          formatTooltip(val),
                          getCategoryLabel(name, locale),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Ranked Category Stat Bars */}
                <div className="space-y-2.5">
                  {expenseBreakdown.map((item) => {
                    const cat = CATEGORY_MAP[item.categoryId];
                    const barColor = cat?.color ?? "#745bc7";
                    const pctLabel =
                      item.percentage > 0 && item.percentage < 0.5
                        ? "<1%"
                        : `${item.percentage.toFixed(0)}%`;
                    return (
                      <div key={item.categoryId}>
                        <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                          <span className="truncate font-semibold text-[#14100e]">
                            {getCategoryLabel(item.categoryId, locale)}
                          </span>
                          <div className="shrink-0 text-right">
                            <MoneyDisplay
                              amountIdr={item.amountIdr}
                              className="text-[11px] font-bold text-[#14100e]"
                            />
                            <span className="ml-1.5 text-[10px] text-[#745bc7]">
                              {pctLabel}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 h-1.5 w-full bg-[#745bc7]/12">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(item.percentage > 0 ? 1.5 : 0, item.percentage))}%`,
                              backgroundColor: barColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="vn-frame overflow-hidden lg:col-span-6">
          <div className="flex items-center justify-between border-b border-[#745bc7]/25 bg-[#f4effd] px-4 py-2">
            <h2 className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#745bc7] uppercase">
              {t.analytics.balanceGrowth}
            </h2>
            <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#5d5370] uppercase">
              {rangeTag}
            </span>
          </div>

          <div className="bg-white/95 p-4 sm:p-5">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={seriesData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="shikasVesselArea"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#745bc7" stopOpacity={0.38} />
                      <stop offset="65%" stopColor="#d749d5" stopOpacity={0.14} />
                      <stop offset="100%" stopColor="#ef85e8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="rgba(116,91,199,0.2)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    interval="preserveStartEnd"
                    minTickGap={22}
                    tick={{
                      fill: "#5d5370",
                      fontSize: 10,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                    axisLine={{ stroke: "rgba(116,91,199,0.35)" }}
                    tickLine={false}
                  />
                  <YAxis
                    width={76}
                    tick={{
                      fill: "#5d5370",
                      fontSize: 10,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      store.settings.privacyMode ? "••" : formatCompactIdr(v, locale)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(253,249,255,0.98)",
                      borderColor: "#745bc7",
                      borderRadius: "0px",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "11px",
                    }}
                    labelFormatter={(label, payload) =>
                      String(
                        (
                          payload?.[0]?.payload as
                            | { fullLabel?: string }
                            | undefined
                        )?.fullLabel ?? label
                      )
                    }
                    formatter={(val: number, name: string) => [
                      formatTooltip(val),
                      name === "savingsBalanceIdr"
                        ? t.analytics.savingsBalanceLegend
                        : t.analytics.balanceLegend,
                    ]}
                  />
                  {hasSavingsPockets && (
                    <Legend
                      formatter={(val: string) =>
                        val === "savingsBalanceIdr"
                          ? t.analytics.savingsBalanceLegend
                          : t.analytics.balanceLegend
                      }
                      wrapperStyle={{
                        fontSize: "10.5px",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="cumulativeBalanceIdr"
                    stroke="#745bc7"
                    strokeWidth={2.2}
                    animationDuration={360}
                    fill="url(#shikasVesselArea)"
                  />
                  {hasSavingsPockets && (
                    <Area
                      type="monotone"
                      dataKey="savingsBalanceIdr"
                      stroke="#2276a8"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      animationDuration={360}
                      fill="none"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>

      {/* SHIZUKU Visual Novel Chronicle Notes */}
      {chronicles.length > 0 && (
        <section className="vn-dialogue p-4 sm:p-5">
          <div className="flex items-start gap-4">
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center border border-[#745bc7] bg-gradient-to-b from-[#efe9fd] to-[#fde8f6] p-2 sm:flex">
              <img
                src={SHIKAS_ASSETS.umbrella}
                alt="SHIZUKU"
                className="h-9 w-auto object-contain"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between border-b border-[#745bc7]/25 pb-1.5">
                <h2 className="font-editorial text-sm font-bold tracking-[0.2em] text-[#745bc7] uppercase">
                  {locale === "id" ? "CATATAN SHIZUKU (雫)" : "SHIZUKU CHRONICLE (雫)"}
                </h2>
                <span className="font-mono text-[10px] tracking-[0.14em] text-[#d749d5]">
                  {rangeTag}
                </span>
              </div>

              <ul className="mt-3 space-y-2">
                {chronicles.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 font-mono text-xs leading-relaxed text-[#14100e]"
                  >
                    <span className="shrink-0 font-bold text-[#d749d5]">
                      0{i + 1} ▶
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
