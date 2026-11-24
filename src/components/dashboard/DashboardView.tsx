import React from "react";
import { SHIKAS_ASSETS } from "../../config/assets";
import { useCashflow } from "../../context/CashflowContext";

export const DashboardView: React.FC = () => {
  const { t } = useCashflow();

  return (
    <section className="flex flex-1 flex-col items-center justify-center py-2 text-center sm:py-4">
      <div className="overflow-hidden border border-[#14100e]/16 bg-white/85 shadow-[0_18px_44px_-30px_rgba(20,16,14,0.45)]">
        <img
          src={SHIKAS_ASSETS.heroMain}
          alt="SHIKAS (雫) — Personal Cashflow"
          className="block h-[220px] max-h-[36svh] w-auto object-contain sm:h-[268px]"
        />
      </div>

      <div className="font-nav mt-6 max-w-[500px] space-y-4 px-2 text-[16px] leading-[1.62] tracking-[0.03em] text-[#14100e] sm:mt-7 sm:text-[17.5px]">
        <p className="font-medium">{t.home.lead}</p>
        <p className="font-normal text-[#14100e]/88">{t.home.body}</p>
      </div>
    </section>
  );
};
