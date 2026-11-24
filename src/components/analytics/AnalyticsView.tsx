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
} from "../../utils/calculations";
import {
  formatCompactIdr,
  formatIdr,
  formatMonthLabel,
  shiftMonthKey,
} from "../../utils/format";
import { MoneyDisplay } from "../common/MoneyDisplay";

const RANGE_OPTIONS: Array<{ id: AnalyticsRange; en: string; idLabel: string }> = [
  { id: "3m", en: "3M", idLabel: "3 BLN" },
  { id: "6m", en: "6M", idLabel: "6 BLN" },
  { id: "12m", en: "12M", idLabel: "12 BLN" },
  { id: "all", en: "ALL TIME", idLabel: "SEMUA" },
];

export const AnalyticsView: React.FC = () => {
  const { store, selectedMonth, setSelectedMonth, t, locale } = useCashflow();
  const [range, setRange] = useState<AnalyticsRange>("6m");

  const seriesData = useMemo(
    () =>
      computeTimeRangeSeries(store.transactions, selectedMonth, range).map((item) => ({
        ...item,
        label: formatMonthLabel(item.month, locale, true),
      })),
    [store.transactions, selectedMonth, range, locale]
  );

  const rangeMonths = useMemo(
    () => (range === "all" ? null : seriesData.map((d) => d.month)),
    [range, seriesData]
  );

  const periodTotals = useMemo(() => {
    let incomeIdr = 0;
    let expenseIdr = 0;
    for (const pt of seriesData) {
      incomeIdr += pt.incomeIdr;
      expenseIdr += pt.expenseIdr;
    }
    const netIdr = incomeIdr - expenseIdr;
    const savingsRate = incomeIdr > 0 ? (netIdr / incomeIdr) * 100 : 0;
    return { incomeIdr, expenseIdr, netIdr, savingsRate };
  }, [seriesData]);

  const expenseBreakdown = useMemo(
    () => computeCategoryBreakdownForMonths(store.transactions, rangeMonths, "expense"),
    [store.transactions, rangeMonths]
  );

  const currentSummary = useMemo(
    () => computeMonthlySummary(store.transactions, selectedMonth),
    [store.transactions, selectedMonth]
  );

  const prevSummary = useMemo(
    () => computeMonthlySummary(store.transactions, shiftMonthKey(selectedMonth, -1)),
    [store.transactions, selectedMonth]
  );

  const rangeTag = useMemo(() => {
    if (range === "3m") return locale === "id" ? "3 BULAN" : "3 MONTHS";
    if (range === "6m") return locale === "id" ? "6 BULAN" : "6 MONTHS";
    if (range === "12m") return locale === "id" ? "12 BULAN" : "12 MONTHS";
    return locale === "id" ? "SEMUA WAKTU" : "ALL TIME";
  }, [range, locale]);

  const chronicles = useMemo(() => {
    const list: string[] = [];
    const mask = (v: number) =>
      store.settings.privacyMode ? "Rp •••••••" : formatIdr(v);

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
      const expDelta = computePercentDelta(currentSummary.expenseIdr, prevSummary.expenseIdr);
      if (expDelta !== null) {
        const verbId = expDelta <= 0 ? "turun" : "naik";
        const verbEn = expDelta <= 0 ? "decreased" : "increased";
        list.push(
          locale === "id"
            ? `Pengeluaran ${formatMonthLabel(selectedMonth, locale)} ${verbId} ${Math.abs(expDelta).toFixed(1)}% dibanding ${formatMonthLabel(shiftMonthKey(selectedMonth, -1), locale)}.`
            : `${formatMonthLabel(selectedMonth, locale)} spending ${verbEn} by ${Math.abs(expDelta).toFixed(1)}% compared to ${formatMonthLabel(shiftMonthKey(selectedMonth, -1), locale)}.`
        );
      }
    } else if (seriesData.length > 0) {
      list.push(
        locale === "id"
          ? `Total ${seriesData.length} bulan tercatat dari ${seriesData[0].label} hingga ${seriesData[seriesData.length - 1].label}.`
          : `Covering ${seriesData.length} recorded months from ${seriesData[0].label} through ${seriesData[seriesData.length - 1].label}.`
      );
    }

    if (periodTotals.incomeIdr > 0) {
      list.push(
        locale === "id"
          ? `Rasio tabungan rata-rata periode ini ${periodTotals.savingsRate.toFixed(1)}% dengan selisih bersih ${mask(periodTotals.netIdr)}.`
          : `Average savings rate across this period is ${periodTotals.savingsRate.toFixed(1)}% with ${mask(periodTotals.netIdr)} net cashflow.`
      );
    }

    return list;
  }, [
    expenseBreakdown,
    currentSummary,
    prevSummary,
    selectedMonth,
    locale,
    range,
    rangeTag,
    seriesData,
    periodTotals,
    store.settings.privacyMode,
  ]);

  const formatTooltip = (value: number) =>
    store.settings.privacyMode ? "Rp •••••••" : formatIdr(value);

  return (
    <div className="space-y-6">
      {/* Primary Analytics Frame (Starts directly below nav — 100% consistent with CASHFLOW) */}
      <section className="vn-frame overflow-hidden">
        {/* Vivid SHIZUKU Watercolor Band Header Strip + Integrated Month Switcher */}
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
              <span className="min-w-[116px] text-center font-mono text-[11px] font-semibold tracking-[0.12em] uppercase drop-shadow-2xs">
                {formatMonthLabel(selectedMonth, locale)}
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

          {/* Inline Period Summary Numbers */}
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
          <div className="h-[265px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={seriesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(116,91,199,0.2)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#5d5370", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                  axisLine={{ stroke: "rgba(116,91,199,0.35)" }}
                  tickLine={false}
                />
                <YAxis
                  width={68}
                  tick={{ fill: "#5d5370", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    store.settings.privacyMode ? "••" : formatCompactIdr(v, locale)
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(116,91,199,0.08)" }}
                  contentStyle={{
                    backgroundColor: "rgba(253,249,255,0.98)",
                    borderColor: "#745bc7",
                    borderWidth: "1.5px",
                    borderRadius: "0px",
                    boxShadow: "4px 4px 0 rgba(116,91,199,0.2)",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "11px",
                  }}
                  formatter={(val: number, name: string) => [
                    formatTooltip(val),
                    name === "incomeIdr"
                      ? t.analytics.incomeLegend
                      : name === "expenseIdr"
                        ? t.analytics.expenseLegend
                        : t.analytics.netLegend,
                  ]}
                />
                <Legend
                  formatter={(val: string) =>
                    val === "incomeIdr"
                      ? t.analytics.incomeLegend
                      : val === "expenseIdr"
                        ? t.analytics.expenseLegend
                        : t.analytics.netLegend
                  }
                  wrapperStyle={{ fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}
                />
                <Bar
                  dataKey="incomeIdr"
                  fill="#2276a8"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={seriesData.length > 8 ? 16 : 24}
                  animationDuration={360}
                />
                <Bar
                  dataKey="expenseIdr"
                  fill="#d749d5"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={seriesData.length > 8 ? 16 : 24}
                  animationDuration={360}
                />
                <Line
                  type="monotone"
                  dataKey="netIdr"
                  stroke="#745bc7"
                  strokeWidth={2.2}
                  animationDuration={360}
                  dot={{ r: 3.5, fill: "#745bc7", strokeWidth: 1.5, stroke: "#ffffff" }}
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
                              {item.percentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 h-1.5 w-full bg-[#745bc7]/12">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, item.percentage)}%`,
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
            <div className="h-[205px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={seriesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="shikasVesselArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#745bc7" stopOpacity={0.4} />
                      <stop offset="65%" stopColor="#d749d5" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#ef85e8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(116,91,199,0.2)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#5d5370", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                    axisLine={{ stroke: "rgba(116,91,199,0.35)" }}
                    tickLine={false}
                  />
                  <YAxis
                    width={68}
                    tick={{ fill: "#5d5370", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
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
                    formatter={(val: number) => [formatTooltip(val), t.analytics.balanceLegend]}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeBalanceIdr"
                    stroke="#745bc7"
                    strokeWidth={2.2}
                    animationDuration={360}
                    fill="url(#shikasVesselArea)"
                  />
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
