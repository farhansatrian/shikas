import React, { useMemo } from "react";
import { SHIKAS_ASSETS } from "../../config/assets";
import { useCashflow } from "../../context/CashflowContext";
import { computeTotalNetBalance, computeWalletBalances } from "../../utils/calculations";
import { formatIdr } from "../../utils/format";
import { MoneyDisplay } from "../common/MoneyDisplay";

export const DashboardView: React.FC = () => {
  const {
    store,
    fx,
    t,
    locale,
    setActiveTab,
    openNewTxModal,
    setFxModalOpen,
    setLocale,
  } = useCashflow();

  const walletBalances = useMemo(
    () => computeWalletBalances(store.wallets, store.transactions),
    [store.wallets, store.transactions]
  );

  const totalNetBalance = useMemo(
    () => computeTotalNetBalance(store.wallets, walletBalances),
    [store.wallets, walletBalances]
  );

  return (
    <section className="flex min-h-[calc(100vh-165px)] flex-col items-center justify-center py-4 sm:py-6">
      {/* Single Centered Gallery Showcase Frame (omocat.com stillness) */}
      <figure className="w-full max-w-[700px]">
        <div className="overflow-hidden border border-[#14100e]/16 bg-white/90 shadow-[0_24px_56px_-36px_rgba(20,16,14,0.42)]">
          <img
            src={SHIKAS_ASSETS.heroMain}
            alt="SHIKAS (雫) — Personal Cashflow"
            className="block h-auto w-full object-cover"
          />
        </div>

        {/* Ultra-quiet single-line cashflow caption directly below artwork */}
        <figcaption className="mt-5 flex flex-col items-center gap-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-xs text-[#14100e]">
            <span className="tracking-[0.16em] text-[#5f5368] uppercase">SHIKAS (雫)</span>
            <span className="text-[#14100e]/25">·</span>
            <MoneyDisplay
              amountIdr={totalNetBalance}
              inline
              forceDual
              primaryClassName="text-xs font-semibold text-[#14100e]"
              secondaryClassName="text-[11px] text-[#5f5368]"
            />
            <span className="text-[#14100e]/25">·</span>
            <button
              type="button"
              onClick={() => setFxModalOpen(true)}
              className="text-[11px] text-[#5f5368] transition hover:text-[#14100e] hover:underline"
            >
              1 USD = {formatIdr(fx.usdToIdr)}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-nav text-[13px] tracking-[0.14em] text-[#14100e]/70 uppercase">
            <button
              type="button"
              onClick={() => openNewTxModal("expense")}
              className="border-b border-[#14100e]/40 pb-0.5 text-[#14100e] transition hover:border-[#14100e]"
            >
              + {t.actions.addTransaction}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ledger")}
              className="transition hover:text-[#14100e]"
            >
              {t.nav.ledger} →
            </button>
            <button
              type="button"
              onClick={() => setLocale(locale === "id" ? "en" : "id")}
              className="transition hover:text-[#14100e]"
            >
              {locale === "id" ? "EN" : "ID"}
            </button>
          </div>
        </figcaption>
      </figure>
    </section>
  );
};
