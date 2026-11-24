import React, { useMemo } from "react";
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
  computeCategoryBreakdown,
  computeMonthlySummary,
  computeMultiMonthSeries,
  computePercentDelta,
} from "../../utils/calculations";
import {
  formatCompactIdr,
  formatIdr,
  formatMonthLabel,
  shiftMonthKey,
} from "../../utils/format";
import { MoneyDisplay } from "../common/MoneyDisplay";

export const AnalyticsView: React.FC = () => {
  const { store, selectedMonth, setSelectedMonth, t, locale } = useCashflow();

  const sixMonthData = useMemo(
    () =>
      computeMultiMonthSeries(store.transactions, selectedMonth, 6).map((item) => ({
        ...item,
        label: formatMonthLabel(item.month, locale, true),
      })),
    [store.transactions, selectedMonth, locale]
  );

  const expenseBreakdown = useMemo(
    () => computeCategoryBreakdown(store.transactions, selectedMonth, "expense"),
    [store.transactions, selectedMonth]
  );

  const currentSummary = useMemo(
    () => computeMonthlySummary(store.transactions, selectedMonth),
    [store.transactions, selectedMonth]
  );

  const prevSummary = useMemo(
    () => computeMonthlySummary(store.transactions, shiftMonthKey(selectedMonth, -1)),
    [store.transactions, selectedMonth]
  );

  const chronicles = useMemo(() => {
    const list: string[] = [];
    const top = expenseBreakdown[0];
    if (top) {
      const catName = getCategoryLabel(top.categoryId, locale);
      list.push(
        locale === "id"
          ? `Pengeluaran terbesar bulan ini ada di "${catName}" (${top.percentage.toFixed(1)}% · ${store.settings.privacyMode ? "Rp •••••••" : formatIdr(top.amountIdr)}).`
          : `Largest spending ripple this month is "${catName}" (${top.percentage.toFixed(1)}% · ${store.settings.privacyMode ? "Rp •••••••" : formatIdr(top.amountIdr)}).`
      );
    }

    const expDelta = computePercentDelta(currentSummary.expenseIdr, prevSummary.expenseIdr);
    if (expDelta !== null) {
      const verbId = expDelta <= 0 ? "turun" : "naik";
      const verbEn = expDelta <= 0 ? "decreased" : "increased";
      list.push(
        locale === "id"
          ? `Total pengeluaran ${verbId} ${Math.abs(expDelta).toFixed(1)}% dibanding ${formatMonthLabel(shiftMonthKey(selectedMonth, -1), locale)}.`
          : `Total spending ${verbEn} by ${Math.abs(expDelta).toFixed(1)}% compared to ${formatMonthLabel(shiftMonthKey(selectedMonth, -1), locale)}.`
      );
    }

    if (currentSummary.incomeIdr > 0) {
      list.push(
        locale === "id"
          ? `Rasio tabungan bulan ini ${currentSummary.savingsRate.toFixed(1)}% (${currentSummary.savingsRate >= 20 ? "di atas target sehat 20%" : "disarankan menjaga minimal 20%"}).`
          : `Savings rate sits at ${currentSummary.savingsRate.toFixed(1)}% (${currentSummary.savingsRate >= 20 ? "above the 20% healthy benchmark" : "aiming for 20%+ is recommended"}).`
      );
    }

    return list;
  }, [expenseBreakdown, currentSummary, prevSummary, selectedMonth, locale, store.settings.privacyMode]);

  const formatTooltip = (value: number) =>
    store.settings.privacyMode ? "Rp •••••••" : formatIdr(value);

  return (
    <div className="space-y-6">
      {/* Editorial Title + Sharp Month Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-[#745bc7] uppercase">
            STATISTICS // 雫
          </p>
          <h1 className="mt-0.5 font-editorial text-2xl font-normal tracking-[0.26em] text-[#745bc7] uppercase sm:text-3xl">
            {t.analytics.title}
          </h1>
        </div>

        <div className="vn-frame-subtle inline-flex items-center gap-1 px-1.5 py-1">
          <button
            type="button"
            onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))}
            aria-label="Previous month"
            className="flex h-6 w-6 items-center justify-center text-[#745bc7] transition hover:bg-[#e5dcfb]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[122px] text-center font-mono text-[11px] font-semibold tracking-[0.12em] text-[#14100e] uppercase">
            {formatMonthLabel(selectedMonth, locale)}
          </span>
          <button
            type="button"
            onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, 1))}
            aria-label="Next month"
            className="flex h-6 w-6 items-center justify-center text-[#745bc7] transition hover:bg-[#e5dcfb]"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 6-Month Flow Chart inside SHIZUKU RPG Frame */}
      <section className="vn-frame overflow-hidden">
        <div className="shikas-band-strip flex items-center justify-between px-4 py-2 text-white">
          <h2 className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase drop-shadow-2xs">
            {t.analytics.monthlyFlowChart}
          </h2>
          <span className="font-mono text-[10px] tracking-[0.14em] text-white/90">
            6M // IDR
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="h-[265px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sixMonthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(116,91,199,0.22)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#5d5370", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
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
                <Bar dataKey="incomeIdr" fill="#2276a8" radius={[0, 0, 0, 0]} maxBarSize={22} animationDuration={380} />
                <Bar dataKey="expenseIdr" fill="#d749d5" radius={[0, 0, 0, 0]} maxBarSize={22} animationDuration={380} />
                <Line
                  type="monotone"
                  dataKey="netIdr"
                  stroke="#745bc7"
                  strokeWidth={2.2}
                  animationDuration={380}
                  dot={{ r: 3.5, fill: "#745bc7", strokeWidth: 1.5, stroke: "#ffffff" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* RPG Category Stat Bars + Cumulative Balance Trajectory */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="vn-frame overflow-hidden lg:col-span-6">
          <div className="border-b border-[#745bc7]/30 bg-[#e5dcfb]/55 px-4 py-2">
            <h2 className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#745bc7] uppercase">
              {t.analytics.categoryBreakdown}
            </h2>
          </div>

          <div className="p-4 sm:p-5">
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
                        animationDuration={380}
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

                {/* Ranked RPG Category Stat Bars */}
                <div className="space-y-2.5">
                  {expenseBreakdown.slice(0, 6).map((item) => {
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
          <div className="border-b border-[#745bc7]/30 bg-[#e5dcfb]/55 px-4 py-2">
            <h2 className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#745bc7] uppercase">
              {t.analytics.balanceGrowth}
            </h2>
          </div>

          <div className="p-4 sm:p-5">
            <div className="h-[205px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sixMonthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="shikasVesselArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#745bc7" stopOpacity={0.42} />
                      <stop offset="65%" stopColor="#d749d5" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#ef85e8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(116,91,199,0.2)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#5d5370", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
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
                    animationDuration={380}
                    fill="url(#shikasVesselArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>

      {/* SHIZUKU Visual Novel Chronicle Notes (Replaces generic AI Sparkles Card) */}
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
                  {formatMonthLabel(selectedMonth, locale).toUpperCase()}
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
