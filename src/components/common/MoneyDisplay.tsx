import React from "react";
import { useCashflow } from "../../context/CashflowContext";
import { formatIdr } from "../../utils/format";

interface MoneyDisplayProps {
  amountIdr: number;
  showSign?: boolean;
  className?: string;
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amountIdr,
  showSign = false,
  className = "text-sm font-semibold",
}) => {
  const { store } = useCashflow();

  if (store.settings.privacyMode) {
    return (
      <span className={`font-mono-num tracking-wider ${className}`}>
        Rp •••••••
      </span>
    );
  }

  return (
    <span className={`font-mono-num ${className}`}>
      {formatIdr(amountIdr, showSign)}
    </span>
  );
};
