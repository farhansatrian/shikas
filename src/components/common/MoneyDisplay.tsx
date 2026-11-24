import React from "react";
import { useCashflow } from "../../context/CashflowContext";
import { formatIdr, formatIdrAsUsd } from "../../utils/format";

interface MoneyDisplayProps {
  amountIdr: number;
  showSign?: boolean;
  primaryClassName?: string;
  secondaryClassName?: string;
  inline?: boolean;
  forceDual?: boolean;
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amountIdr,
  showSign = false,
  primaryClassName = "text-base font-semibold",
  secondaryClassName = "text-xs opacity-70",
  inline = false,
  forceDual = false,
}) => {
  const { store, fx } = useCashflow();
  const { displayCurrency, privacyMode } = store.settings;

  if (privacyMode) {
    return (
      <span className={`font-mono-num tracking-wider ${primaryClassName}`}>
        {displayCurrency === "USD" ? "$ •••••" : "Rp •••••••"}
      </span>
    );
  }

  const mode = forceDual && displayCurrency === "IDR" ? "DUAL" : displayCurrency;

  if (mode === "USD") {
    return (
      <span className={`font-mono-num ${primaryClassName}`}>
        {formatIdrAsUsd(amountIdr, fx.usdToIdr, showSign)}
      </span>
    );
  }

  if (mode === "IDR") {
    return (
      <span className={`font-mono-num ${primaryClassName}`}>
        {formatIdr(amountIdr, showSign)}
      </span>
    );
  }

  // DUAL mode: IDR primary + real-time USD equivalent
  return (
    <span
      className={
        inline
          ? "inline-flex flex-wrap items-baseline gap-x-2"
          : "inline-flex flex-col"
      }
    >
      <span className={`font-mono-num ${primaryClassName}`}>
        {formatIdr(amountIdr, showSign)}
      </span>
      <span className={`font-mono-num ${secondaryClassName}`}>
        ≈ {formatIdrAsUsd(amountIdr, fx.usdToIdr, showSign)}
      </span>
    </span>
  );
};
