import React from "react";
import { SHIKAS_ASSETS } from "../../config/assets";

export const DashboardView: React.FC = () => {
  return (
    <section className="flex min-h-[calc(100vh-156px)] items-center justify-center py-4 sm:py-6">
      <div className="w-full max-w-[700px] overflow-hidden border border-[#14100e]/16 bg-white/90 shadow-[0_24px_56px_-36px_rgba(20,16,14,0.42)]">
        <img
          src={SHIKAS_ASSETS.heroMain}
          alt="SHIKAS (雫) — Personal Cashflow"
          className="block h-auto w-full object-cover"
        />
      </div>
    </section>
  );
};
