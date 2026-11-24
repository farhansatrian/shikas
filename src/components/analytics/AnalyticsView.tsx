import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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

  const insights = useMemo(() => {
    const list: string[] = [];
    const top = expenseBreakdown[0];
    if (top) {
      const catName = getCategoryLabel(top.categoryId, locale);
      list.push(
        locale === "id"
          ? `Pengeluaran terbesar bulan ini ada di "${catName}" (${top.percentage.toFixed(1)}% · ${formatIdr(top.amountIdr)}).`
          : `Largest spending category this month is "${catName}" (${top.percentage.toFixed(1)}% · ${formatIdr(top.amountIdr)}).`
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
  }, [expenseBreakdown, currentSummary, prevSummary, selectedMonth, locale]);

  const formatTooltip = (value: number) =>
    store.settings.privacyMode ? "Rp •••••••" : formatIdr(value);

  return (
    <div className="space-y-6">
      {/* Integrated Title + Month Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-nav text-2xl font-medium tracking-[0.14em] text-[#1a1423] uppercase sm:text-[28px]">
            {t.analytics.title}
          </h1>

          <div className="inline-flex items-center gap-1 rounded-full border border-[#745bc7]/20 bg-white/80 px-1.5 py-1 shadow-2xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))}
              aria-label="Previous month"
              className="flex h-6.5 w-6.5 items-center justify-center rounded-full text-[#655978] transition hover:bg-[#745bc7]/10 hover:text-[#745bc7]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[116px] text-center text-xs font-semibold text-[#1a1423]">
              {formatMonthLabel(selectedMonth, locale)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, 1))}
              aria-label="Next month"
              className="flex h-6.5 w-6.5 items-center justify-center rounded-full text-[#655978] transition hover:bg-[#745bc7]/10 hover:text-[#745bc7]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6-Month Composed Chart */}
      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-xs font-bold tracking-[0.12em] text-[#655978] uppercase">
          {t.analytics.monthlyFlowChart}
        </h2>
        <div className="mt-4 h-[270px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sixMonthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(116,91,199,0.12)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#655978", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                width={68}
                tick={{ fill: "#655978", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  store.settings.privacyMode ? "••" : formatCompactIdr(v, locale)
                }
              />
              <Tooltip
                cursor={{ fill: "rgba(116,91,199,0.06)" }}
                contentStyle={{
                  backgroundColor: "rgba(255,255,255,0.97)",
                  borderColor: "rgba(116,91,199,0.22)",
                  borderRadius: "14px",
                  boxShadow: "0 12px 30px -14px rgba(84,54,152,0.25)",
                  fontSize: "12px",
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
                wrapperStyle={{ fontSize: "11px" }}
              />
              <Bar dataKey="incomeIdr" fill="#745bc7" radius={[8, 8, 0, 0]} maxBarSize={24} animationDuration={420} />
              <Bar dataKey="expenseIdr" fill="#e26cc6" radius={[8, 8, 0, 0]} maxBarSize={24} animationDuration={420} />
              <Line
                type="monotone"
                dataKey="netIdr"
                stroke="#108469"
                strokeWidth={2.5}
                animationDuration={420}
                dot={{ r: 4, fill: "#108469", strokeWidth: 2, stroke: "#ffffff" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Donut Breakdown + Cumulative Balance Area */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="glass-card rounded-2xl p-5 sm:p-6 lg:col-span-6">
          <h2 className="text-xs font-bold tracking-[0.12em] text-[#655978] uppercase">
            {t.analytics.categoryBreakdown}
          </h2>
          {expenseBreakdown.length === 0 ? (
            <p className="py-16 text-center text-xs text-[#655978]">{t.analytics.noExpenseData}</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-[152px_1fr]">
              <div className="mx-auto h-[168px] w-[152px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="amountIdr"
                      nameKey="categoryId"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={3}
                      animationDuration={420}
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
                        backgroundColor: "rgba(255,255,255,0.97)",
                        borderColor: "rgba(116,91,199,0.22)",
                        borderRadius: "14px",
                        fontSize: "12px",
                      }}
                      formatter={(val: number, name: string) => [
                        formatTooltip(val),
                        getCategoryLabel(name, locale),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5">
                {expenseBreakdown.slice(0, 6).map((item) => {
                  const cat = CATEGORY_MAP[item.categoryId];
                  return (
                    <div
                      key={item.categoryId}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: cat?.color ?? "#745bc7" }}
                        />
                        <span className="truncate font-medium text-[#1a1423]">
                          {getCategoryLabel(item.categoryId, locale)}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <MoneyDisplay
                          amountIdr={item.amountIdr}
                          className="text-xs font-semibold text-[#1a1423]"
                        />
                        <span className="ml-1.5 font-mono text-[10px] text-[#745bc7]">
                          {item.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="glass-card rounded-2xl p-5 sm:p-6 lg:col-span-6">
          <h2 className="text-xs font-bold tracking-[0.12em] text-[#655978] uppercase">
            {t.analytics.balanceGrowth}
          </h2>
          <div className="mt-4 h-[215px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sixMonthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="shikasIrisGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#745bc7" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#d958b8" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(116,91,199,0.12)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#655978", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  width={68}
                  tick={{ fill: "#655978", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    store.settings.privacyMode ? "••" : formatCompactIdr(v, locale)
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.97)",
                    borderColor: "rgba(116,91,199,0.22)",
                    borderRadius: "14px",
                    fontSize: "12px",
                  }}
                  formatter={(val: number) => [formatTooltip(val), t.analytics.balanceLegend]}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeBalanceIdr"
                  stroke="#745bc7"
                  strokeWidth={2.5}
                  animationDuration={420}
                  fill="url(#shikasIrisGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Twilight Insights Card */}
      {insights.length > 0 && (
        <section className="glass-twilight rounded-2xl p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#f0a3e8]" />
            <h2 className="text-xs font-bold tracking-[0.14em] text-white/85 uppercase">
              {t.analytics.insightsTitle}
            </h2>
          </div>
          <ul className="mt-4 space-y-2.5">
            {insights.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl bg-white/[0.06] px-4 py-3 text-sm text-white/90"
              >
                <span className="mt-0.5 font-mono text-xs text-[#e2a5f5]">0{i + 1}</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
