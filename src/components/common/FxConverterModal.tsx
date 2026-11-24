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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111015]/55 p-4 backdrop-blur-xs"
      onClick={() => setFxModalOpen(false)}
    >
      <div
        className="w-full max-w-md border border-[#14100e]/25 bg-[#fdfbfd] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#14100e]/12 pb-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-[#5f5368] uppercase">
              {fx.status === "live"
                ? t.fx.live
                : fx.status === "cached"
                  ? t.fx.cached
                  : t.fx.fallback}
            </p>
            <h2 className="font-nav mt-0.5 text-lg font-medium tracking-[0.15em] text-[#14100e] uppercase">
              {t.fx.converterTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setFxModalOpen(false)}
            aria-label={t.actions.close}
            className="p-1 text-[#5f5368] hover:text-[#14100e]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="gallery-dark mt-5 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] tracking-[0.16em] text-white/55 uppercase">
                {t.fx.ratePerUsd}
              </p>
              <p className="font-mono-num mt-0.5 text-xl font-semibold text-white">
                {formatIdr(fx.usdToIdr)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 border border-white/30 px-3 py-1.5 font-nav text-[11px] tracking-[0.12em] text-white uppercase transition hover:bg-white hover:text-[#111015]"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              {t.actions.refreshRate}
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/14 pt-2 font-mono text-[10px] text-white/60">
            <span>
              {t.fx.ratePerIdr} {formatUsd(idrToUsd(100_000, fx.usdToIdr))}
            </span>
            <span>
              {fx.source} · {formatFxTimestamp(fx.updatedAt, locale)}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
              {direction === "IDR_TO_USD" ? "IDR (Rupiah)" : "USD (US Dollar)"}
            </label>
            <div className="mt-1.5 flex items-center border border-[#14100e]/25 bg-white px-3.5 py-2.5 focus-within:border-[#14100e]">
              <span className="font-mono-num mr-2 text-sm font-semibold text-[#5f5368]">
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

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSwap}
              className="gallery-btn px-3.5 py-1 text-xs"
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              {t.fx.swap}
            </button>
          </div>

          <div className="border border-[#14100e]/15 bg-white px-4 py-3.5">
            <p className="font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
              {direction === "IDR_TO_USD" ? "USD (US Dollar)" : "IDR (Rupiah)"}
            </p>
            <p className="font-mono-num mt-1 text-2xl font-semibold text-[#14100e]">
              {convertedResult}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setRawInput(p.val)}
                className="border border-[#14100e]/18 bg-white py-1.5 font-mono text-[11px] text-[#14100e] transition hover:border-[#14100e] hover:bg-[#14100e] hover:text-white"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
