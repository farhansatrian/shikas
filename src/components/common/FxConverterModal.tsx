import React, { useState } from "react";
import { ArrowDownUp, RefreshCw, X } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { idrToUsd, usdToIdrAmount } from "../../services/fxService";
import { formatFxTimestamp, formatIdr, formatUsd } from "../../utils/format";

export const FxConverterModal: React.FC = () => {
  const { isFxModalOpen, setFxModalOpen, fx, refreshFx, t, locale } = useCashflow();
  const [direction, setDirection] = useState<"IDR_TO_USD" | "USD_TO_IDR">("IDR_TO_USD");
  const [rawInput, setRawInput] = useState("1000000");
  const [refreshing, setRefreshing] = useState(false);

  if (!isFxModalOpen) return null;

  const numericValue = Math.max(0, Number(rawInput.replace(/[^0-9.]/g, "")) || 0);
  const convertedResult =
    direction === "IDR_TO_USD"
      ? formatUsd(idrToUsd(numericValue, fx.usdToIdr))
      : formatIdr(usdToIdrAmount(numericValue, fx.usdToIdr));

  const handleSwap = () => {
    if (direction === "IDR_TO_USD") {
      const nextUsd = idrToUsd(numericValue, fx.usdToIdr);
      setDirection("USD_TO_IDR");
      setRawInput(nextUsd > 0 ? nextUsd.toFixed(2) : "100");
    } else {
      const nextIdr = usdToIdrAmount(numericValue, fx.usdToIdr);
      setDirection("IDR_TO_USD");
      setRawInput(nextIdr > 0 ? String(nextIdr) : "1000000");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshFx(true);
    setRefreshing(false);
  };

  const presets =
    direction === "IDR_TO_USD"
      ? [
          { label: "Rp 100rb", val: "100000" },
          { label: "Rp 500rb", val: "500000" },
          { label: "Rp 1jt", val: "1000000" },
          { label: "Rp 10jt", val: "10000000" },
        ]
      : [
          { label: "$10", val: "10" },
          { label: "$20", val: "20" },
          { label: "$100", val: "100" },
          { label: "$500", val: "500" },
        ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b1530]/55 p-4 backdrop-blur-xs"
      onClick={() => setFxModalOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#745bc7]/30 bg-[#f8f5ff] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#745bc7] uppercase">
              {fx.status === "live"
                ? t.fx.live
                : fx.status === "cached"
                  ? t.fx.cached
                  : t.fx.fallback}
            </p>
            <h2 className="mt-1 font-editorial text-xl font-semibold tracking-[0.16em] text-[#745bc7] uppercase">
              {t.fx.converterTitle}
            </h2>
            <p className="mt-1 text-xs text-[#5d5370]">{t.fx.converterSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setFxModalOpen(false)}
            aria-label={t.actions.close}
            className="rounded-full p-1.5 text-[#5d5370] transition hover:bg-[#745bc7]/12 hover:text-[#745bc7]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live rate card */}
        <div className="twilight-card mt-5 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] tracking-[0.16em] text-[#e5dcfb]/75 uppercase">
                {t.fx.ratePerUsd}
              </p>
              <p className="font-mono-num mt-0.5 text-xl font-bold text-white">
                {formatIdr(fx.usdToIdr)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {t.actions.refreshRate}
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-2.5 font-mono text-[10px] text-[#e5dcfb]/80">
            <span>
              {t.fx.ratePerIdr} {formatUsd(idrToUsd(100_000, fx.usdToIdr))}
            </span>
            <span>
              {fx.source} · {formatFxTimestamp(fx.updatedAt, locale)}
            </span>
          </div>
        </div>

        {/* Converter input */}
        <div className="mt-5 space-y-3">
          <div>
            <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
              {direction === "IDR_TO_USD" ? "IDR (Rupiah)" : "USD (US Dollar)"}
            </label>
            <div className="mt-1.5 flex items-center rounded-xl border border-[#745bc7]/30 bg-white px-3.5 py-2.5 focus-within:border-[#7650f3]">
              <span className="font-mono-num mr-2 text-sm font-semibold text-[#745bc7]">
                {direction === "IDR_TO_USD" ? "Rp" : "$"}
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                className="font-mono-num w-full bg-transparent text-lg font-semibold text-[#14100e] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleSwap}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#745bc7]/35 bg-white px-3.5 py-1 text-xs font-medium text-[#745bc7] transition hover:border-[#7650f3] hover:bg-[#745bc7]/10"
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              {t.fx.swap}
            </button>
          </div>

          <div className="rounded-xl border border-[#745bc7]/25 bg-white/85 px-4 py-3.5">
            <p className="font-mono text-[10px] tracking-[0.14em] text-[#5d5370] uppercase">
              {direction === "IDR_TO_USD" ? "USD (US Dollar)" : "IDR (Rupiah)"}
            </p>
            <p className="font-mono-num mt-1 text-2xl font-bold text-[#745bc7]">
              {convertedResult}
            </p>
          </div>

          {/* Presets */}
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] text-[#5d5370] uppercase">
              {t.fx.quickPresets}
            </p>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setRawInput(p.val)}
                  className="rounded-lg border border-[#745bc7]/22 bg-white/80 py-1.5 font-mono text-xs font-medium text-[#14100e] transition hover:border-[#745bc7] hover:bg-[#745bc7]/10"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
