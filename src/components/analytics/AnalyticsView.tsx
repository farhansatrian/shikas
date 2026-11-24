import React, { useMemo } from "react";
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
  const { store, selectedMonth, t, locale } = useCashflow();

  const sixMonthData = useMemo(
    () =>
      computeMultiMonthSeries(store.wallets, store.transactions, selectedMonth, 6).map((item) => ({
        ...item,
        label: formatMonthLabel(item.month, locale, true),
      })),
    [store.wallets, store.transactions, selectedMonth, locale]
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
          ? `Pengeluaran terbesar bulan ini: "${catName}" (${top.percentage.toFixed(1)}% · ${formatIdr(top.amountIdr)}).`
          : `Largest spending category this month: "${catName}" (${top.percentage.toFixed(1)}% · ${formatIdr(top.amountIdr)}).`
      );
    }

    const expDelta = computePercentDelta(currentSummary.expenseIdr, prevSummary.expenseIdr);
    if (expDelta !== null) {
      const verbId = expDelta <= 0 ? "turun" : "naik";
      const verbEn = expDelta <= 0 ? "decreased" : "increased";
      list.push(
        locale === "id"
          ? `Total pengeluaran ${verbId} ${Math.abs(expDelta).toFixed(1)}% dibanding ${formatMonthLabel(shiftMonthKey(selectedMonth, -1), locale)}.`
          : `Total spending ${verbEn} by ${Math.abs(expDelta).toFixed(1)}% vs ${formatMonthLabel(shiftMonthKey(selectedMonth, -1), locale)}.`
      );
    }

    if (currentSummary.incomeIdr > 0) {
      list.push(
        locale === "id"
          ? `Rasio tabungan bulan ini ${currentSummary.savingsRate.toFixed(1)}% (${currentSummary.savingsRate >= 20 ? "di atas patokan sehat 20%" : "target ideal minimal 20%"}).`
          : `Savings rate sits at ${currentSummary.savingsRate.toFixed(1)}% (${currentSummary.savingsRate >= 20 ? "above the 20% healthy benchmark" : "20%+ is recommended"}).`
      );
    }

    return list;
  }, [expenseBreakdown, currentSummary, prevSummary, selectedMonth, locale]);

  const formatTooltip = (value: number) =>
    store.settings.privacyMode ? "Rp •••••••" : formatIdr(value);

  return (
    <div className="space-y-7">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#5f5368] uppercase">
          CASHFLOW VISUALS · {formatMonthLabel(selectedMonth, locale)}
        </p>
        <h1 className="font-nav mt-1 text-2xl font-medium tracking-[0.16em] text-[#14100e] uppercase sm:text-3xl">
          {t.analytics.title}
        </h1>
      </div>

      {/* 6-Month Composed Chart */}
      <section className="gallery-sheet p-5 sm:p-6">
        <h2 className="font-nav text-base font-medium tracking-[0.15em] text-[#14100e] uppercase">
          {t.analytics.monthlyFlowChart}
        </h2>
        <div className="mt-4 h-[270px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sixMonthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 3" stroke="rgba(20,16,14,0.1)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#5f5368", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                width={68}
                tick={{ fill: "#5f5368", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  store.settings.privacyMode ? "••" : formatCompactIdr(v, locale)
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255,255,255,0.96)",
                  borderColor: "rgba(20,16,14,0.22)",
                  borderRadius: "0px",
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
              <Bar dataKey="incomeIdr" fill="#14100e" maxBarSize={22} animationDuration={420} />
              <Bar dataKey="expenseIdr" fill="#d749d5" fillOpacity={0.78} maxBarSize={22} animationDuration={420} />
              <Line
                type="monotone"
                dataKey="netIdr"
                stroke="#117a62"
                strokeWidth={2}
                animationDuration={420}
                dot={{ r: 3.5, fill: "#117a62", strokeWidth: 1.5, stroke: "#ffffff" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Donut Breakdown + Net Balance Growth */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="gallery-sheet p-5 lg:col-span-6">
          <h2 className="font-nav text-base font-medium tracking-[0.15em] text-[#14100e] uppercase">
            {t.analytics.categoryBreakdown}
          </h2>
          {expenseBreakdown.length === 0 ? (
            <p className="py-16 text-center text-xs text-[#5f5368]">{t.analytics.noExpenseData}</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <div className="h-[205px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="amountIdr"
                      nameKey="categoryId"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={2}
                      animationDuration={420}
                    >
                      {expenseBreakdown.map((entry) => (
                        <Cell
                          key={entry.categoryId}
                          fill={CATEGORY_MAP[entry.categoryId]?.color ?? "#14100e"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255,255,255,0.96)",
                        borderColor: "rgba(20,16,14,0.22)",
                        borderRadius: "0px",
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
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: cat?.color ?? "#14100e" }}
                        />
                        <span className="truncate text-[#14100e]">
                          {getCategoryLabel(item.categoryId, locale)}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <MoneyDisplay
                          amountIdr={item.amountIdr}
                          className="text-xs font-medium text-[#14100e]"
                        />
                        <span className="ml-1.5 font-mono text-[10px] text-[#5f5368]">
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

        <section className="gallery-sheet p-5 lg:col-span-6">
          <h2 className="font-nav text-base font-medium tracking-[0.15em] text-[#14100e] uppercase">
            {t.analytics.balanceGrowth}
          </h2>
          <div className="mt-4 h-[215px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sixMonthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="shikasInkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14100e" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#14100e" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 3" stroke="rgba(20,16,14,0.1)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#5f5368", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  width={68}
                  tick={{ fill: "#5f5368", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    store.settings.privacyMode ? "••" : formatCompactIdr(v, locale)
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.96)",
                    borderColor: "rgba(20,16,14,0.22)",
                    borderRadius: "0px",
                    fontSize: "12px",
                  }}
                  formatter={(val: number) => [formatTooltip(val), t.analytics.balanceLegend]}
                />
                <Area
                  type="monotone"
                  dataKey="endingBalanceIdr"
                  stroke="#14100e"
                  strokeWidth={2}
                  animationDuration={420}
                  fill="url(#shikasInkGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <section className="gallery-dark p-6">
          <h2 className="font-nav text-base font-medium tracking-[0.18em] text-white/85 uppercase">
            {t.analytics.insightsTitle}
          </h2>
          <ul className="mt-4 divide-y divide-white/12">
            {insights.map((line, i) => (
              <li key={i} className="py-2.5 text-sm text-white/85">
                <span className="mr-2.5 font-mono text-xs text-white/40">0{i + 1}</span>
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
