import React from "react";
import { useCashflow } from "../../context/CashflowContext";

const RAIN_DROPS = [
  { left: "6%", delay: "0s", duration: "4.8s" },
  { left: "14%", delay: "1.3s", duration: "5.4s" },
  { left: "23%", delay: "2.1s", duration: "4.6s" },
  { left: "34%", delay: "0.7s", duration: "5.9s" },
  { left: "47%", delay: "2.8s", duration: "5.1s" },
  { left: "58%", delay: "1.6s", duration: "4.7s" },
  { left: "69%", delay: "0.4s", duration: "5.6s" },
  { left: "78%", delay: "2.4s", duration: "4.9s" },
  { left: "88%", delay: "1.1s", duration: "5.3s" },
  { left: "95%", delay: "3.1s", duration: "4.5s" },
];

export const ShizukuRainLayer: React.FC = () => {
  const { store } = useCashflow();
  if (!store.settings.rainEnabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {RAIN_DROPS.map((drop, idx) => (
        <span
          key={idx}
          className="shizuku-rain-drop"
          style={{
            left: drop.left,
            animationDelay: drop.delay,
            animationDuration: drop.duration,
          }}
        />
      ))}
    </div>
  );
};
