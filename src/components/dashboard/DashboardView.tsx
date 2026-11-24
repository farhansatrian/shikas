import React from "react";
import { SHIKAS_ASSETS } from "../../config/assets";

export const DashboardView: React.FC = () => {
  return (
    <section className="flex flex-1 items-center justify-center py-2 sm:py-3">
      <div className="w-fit max-w-[680px] overflow-hidden border border-[#14100e]/16 bg-white/90 shadow-[0_24px_56px_-36px_rgba(20,16,14,0.42)]">
        <img
          src={SHIKAS_ASSETS.heroMain}
          alt="SHIKAS (雫) — Personal Cashflow"
          className="block max-h-[calc(100svh-175px)] w-auto max-w-full object-contain"
        />
      </div>
    </section>
  );
};
