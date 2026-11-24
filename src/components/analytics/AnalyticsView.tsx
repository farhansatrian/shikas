import React, { useMemo } from "react";
import { Sparkles } from "lucide-react";
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
  formatCompactCurrency,
  formatIdr,
  formatIdrAsUsd,
  formatMonthLabel,
  formatUsd,
  shiftMonthKey,
} from "../../utils/format";
import { MoneyDisplay } from "../common/MoneyDisplay";

export const AnalyticsView: React.FC = () => {
  const { store, fx, selectedMonth, t, locale } = useCashflow();

  const chartCurrencyMode: "IDR" | "USD" =
    store.settings.displayCurrency === "USD" ? "USD" : "IDR";

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

  const usdExposure = useMemo(() => {
    const usdTxs = store.transactions.filter(
      (tx) => tx.date.startsWith(selectedMonth) && tx.originalCurrency === "USD"
    );
    const expenseUsd = usdTxs
      .filter((tx) => tx.type === "expense")
      .reduce((s, tx) => s + tx.originalAmount, 0);
    const incomeUsd = usdTxs
      .filter((tx) => tx.type === "income")
      .reduce((s, tx) => s + tx.originalAmount, 0);
    return { count: usdTxs.length, expenseUsd, incomeUsd };
  }, [store.transactions, selectedMonth]);

  const insights = useMemo(() => {
    const list: string[] = [];
    const top = expenseBreakdown[0];
    if (top) {
      const catName = getCategoryLabel(top.categoryId, locale);
      list.push(
        locale === "id"
          ? `Pengeluaran terbesar bulan ini ada di "${catName}" (${top.percentage.toFixed(1)}% dari total belanja, ${formatIdr(top.amountIdr)} / ${formatIdrAsUsd(top.amountIdr, fx.usdToIdr)}).`
          : `Your largest spending category this month is "${catName}" (${top.percentage.toFixed(1)}% of expenses, ${formatIdr(top.amountIdr)} / ${formatIdrAsUsd(top.amountIdr, fx.usdToIdr)}).`
      );
    }

    const expDelta = computePercentDelta(currentSummary.expenseIdr, prevSummary.expenseIdr);
    if (expDelta !== null) {
      const verbId = expDelta <= 0 ? "turun" : "naik";
      const verbEn = expDelta <= 0 ? "decreased" : "increased";
      list.push(
        locale === "id"
          ? `Total pengeluaran ${verbId} ${Math.abs(expDelta).toFixed(1)}% dibanding bulan sebelumnya (${formatMonthLabel(shiftMonthKey(selectedMonth, -1), locale)}).`
          : `Total spending ${verbEn} by ${Math.abs(expDelta).toFixed(1)}% compared to ${formatMonthLabel(shiftMonthKey(selectedMonth, -1), locale)}.`
      );
    }

    if (currentSummary.incomeIdr > 0) {
      list.push(
        locale === "id"
          ? `Rasio tabungan bulan ini mencapai ${currentSummary.savingsRate.toFixed(1)}% (${currentSummary.savingsRate >= 20 ? "melampaui target sehat 20%!" : "disarankan menjaga minimal 20%."}).`
          : `This month's savings rate stands at ${currentSummary.savingsRate.toFixed(1)}% (${currentSummary.savingsRate >= 20 ? "above the healthy 20% benchmark!" : "aiming for 20%+ is recommended."}).`
      );
    }

    if (usdExposure.count > 0) {
      list.push(
        locale === "id"
          ? `Tercatat ${usdExposure.count} transaksi berbasis USD bulan ini (masuk ${formatUsd(usdExposure.incomeUsd)}, keluar ${formatUsd(usdExposure.expenseUsd)}) dengan kurs acuan live ${formatIdr(fx.usdToIdr)}/USD.`
          : `Recorded ${usdExposure.count} USD-denominated entries this month (inflow ${formatUsd(usdExposure.incomeUsd)}, outflow ${formatUsd(usdExposure.expenseUsd)}) at live rate ${formatIdr(fx.usdToIdr)}/USD.`
      );
    }

    return list;
  }, [expenseBreakdown, currentSummary, prevSummary, selectedMonth, locale, fx.usdToIdr, usdExposure]);

  const formatTooltipAmount = (value: number) => {
    if (store.settings.privacyMode) return "••••";
    if (chartCurrencyMode === "USD") {
      return `${formatIdrAsUsd(value, fx.usdToIdr)} (${formatIdr(value)})`;
    }
    return `${formatIdr(value)} (≈ ${formatIdrAsUsd(value, fx.usdToIdr)})`;
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] tracking-[0.22em] text-[#745bc7] uppercase">
          CASHFLOW INTELLIGENCE · {formatMonthLabel(selectedMonth, locale)}
        </p>
        <h1 className="font-editorial mt-1.5 text-[30px] font-normal leading-none tracking-[7px] text-[#745bc7] uppercase sm:text-[36px] sm:tracking-[9px]">
          {t.analytics.title}
        </h1>
        <p className="mt-2 text-sm text-[#5d5370]">{t.analytics.subtitle}</p>
      </div>

      {/* 6-Month Composed Bar + Net Line Chart */}
      <section className="tuyu-sheet rounded-2xl p-5 sm:p-6">
        <h2 className="font-editorial text-lg font-semibold tracking-[0.18em] text-[#745bc7] uppercase">
          {t.analytics.monthlyFlowChart}
        </h2>
        <div className="mt-4 h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sixMonthData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(116,91,199,0.16)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#5d5370", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#5d5370", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  store.settings.privacyMode
                    ? "••"
                    : formatCompactCurrency(v, chartCurrencyMode, fx.usdToIdr, locale)
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255,255,255,0.96)",
                  borderColor: "rgba(116,91,199,0.3)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                formatter={(val: number, name: string) => [
                  formatTooltipAmount(val),
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
                wrapperStyle={{ fontSize: "12px" }}
              />
              <Bar dataKey="incomeIdr" fill="#14866d" radius={[6, 6, 0, 0]} maxBarSize={26} />
              <Bar dataKey="expenseIdr" fill="#d749d5" radius={[6, 6, 0, 0]} maxBarSize={26} />
              <Line
                type="monotone"
                dataKey="netIdr"
                stroke="#7650f3"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#7650f3", strokeWidth: 2, stroke: "#ffffff" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Donut Breakdown + Net Balance Area Trajectory */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Category Donut */}
        <section className="tuyu-sheet rounded-2xl p-5 lg:col-span-6">
          <h2 className="font-editorial text-lg font-semibold tracking-[0.18em] text-[#745bc7] uppercase">
            {t.analytics.categoryBreakdown}
          </h2>

          {expenseBreakdown.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#5d5370]">{t.analytics.noExpenseData}</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="amountIdr"
                      nameKey="categoryId"
                      innerRadius={56}
                      outerRadius={86}
                      paddingAngle={3}
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
                        backgroundColor: "rgba(255,255,255,0.96)",
                        borderColor: "rgba(116,91,199,0.28)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      formatter={(val: number, name: string) => [
                        formatTooltipAmount(val),
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
                        <span className="truncate font-medium text-[#14100e]">
                          {getCategoryLabel(item.categoryId, locale)}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <MoneyDisplay
                          amountIdr={item.amountIdr}
                          primaryClassName="text-xs font-semibold text-[#14100e]"
                          secondaryClassName="text-[10px] text-[#5d5370]"
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

        {/* Cumulative Balance Area Chart */}
        <section className="tuyu-sheet rounded-2xl p-5 lg:col-span-6">
          <h2 className="font-editorial text-lg font-semibold tracking-[0.18em] text-[#745bc7] uppercase">
            {t.analytics.balanceGrowth}
          </h2>
          <div className="mt-4 h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sixMonthData} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="shikasBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7650f3" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#d749d5" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(116,91,199,0.14)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#5d5370", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "#5d5370", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    store.settings.privacyMode
                      ? "••"
                      : formatCompactCurrency(v, chartCurrencyMode, fx.usdToIdr, locale)
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.96)",
                    borderColor: "rgba(116,91,199,0.3)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(val: number) => [formatTooltipAmount(val), t.analytics.balanceLegend]}
                />
                <Area
                  type="monotone"
                  dataKey="endingBalanceIdr"
                  stroke="#745bc7"
                  strokeWidth={2.5}
                  fill="url(#shikasBalanceGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Automated Smart Insights */}
      {insights.length > 0 && (
        <section className="twilight-card rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-[#f09cf3]" />
            <h2 className="font-editorial text-lg font-semibold tracking-[0.2em] text-[#e5dcfb] uppercase">
              {t.analytics.insightsTitle}
            </h2>
          </div>
          <ul className="mt-4 space-y-2.5">
            {insights.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-sm text-[#f4f0ff]"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f09cf3]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
