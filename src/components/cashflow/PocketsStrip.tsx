import React, { useMemo } from "react";
import { Plus, SlidersHorizontal, Star } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { computeAccountBalances } from "../../utils/calculations";
import { MoneyDisplay } from "../common/MoneyDisplay";

interface PocketsStripProps {
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
}

export const PocketsStrip: React.FC<PocketsStripProps> = ({
  selectedAccountId,
  onSelectAccount,
}) => {
  const { store, t, locale, openPocketsModal } = useCashflow();

  const overview = useMemo(
    () => computeAccountBalances(store.accounts, store.transactions),
    [store.accounts, store.transactions]
  );

  // Quiet 1-row prompt when user hasn't set up any pockets yet
  if (store.accounts.length === 0) {
    return (
      <section className="vn-frame bg-white/90 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="inline-flex w-fit shrink-0 items-center border border-[#745bc7] bg-[#f5effe] px-2 py-0.5 font-mono text-[9.5px] font-bold tracking-[0.14em] text-[#745bc7] uppercase">
              ▶ {locale === "id" ? "KANTONG DANA" : "POCKETS"}
            </span>
            <p className="font-mono text-[11px] leading-relaxed text-[#4e4361]">
              {t.pockets.emptyPrompt}
            </p>
          </div>

          <button
            type="button"
            onClick={openPocketsModal}
            className="vn-btn-action w-full shrink-0 px-3 py-1.5 text-[10px] sm:w-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t.pockets.setupCta}</span>
          </button>
        </div>
      </section>
    );
  }

  const gridColsClass =
    overview.items.length === 1
      ? "grid-cols-1"
      : overview.items.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : overview.items.length >= 4
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-3";

  const hasSavings = overview.items.some((i) => i.account.role === "savings");

  return (
    <section className="vn-frame overflow-hidden">
      {/* Vivid SHIZUKU Watercolor Band Header Strip */}
      <div className="shikas-band-strip flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-white">
        <span className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
          {t.pockets.title}
        </span>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {hasSavings && (
            <span className="hidden font-mono text-[10px] tracking-[0.08em] text-white/95 sm:inline-flex sm:items-center sm:gap-2">
              <span>
                {t.pockets.dailySummary}:{" "}
                <MoneyDisplay
                  amountIdr={overview.dailyTotalIdr}
                  className="font-bold text-white"
                />
              </span>
              <span className="opacity-60">·</span>
              <span>
                {t.pockets.savingsSummary}:{" "}
                <MoneyDisplay
                  amountIdr={overview.savingsTotalIdr}
                  className="font-bold text-white"
                />
              </span>
            </span>
          )}

          <button
            type="button"
            onClick={openPocketsModal}
            className="inline-flex items-center gap-1 border border-white/45 bg-white/15 px-2 py-0.5 font-mono text-[9.5px] font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-white/30"
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>{t.actions.managePockets}</span>
          </button>
        </div>
      </div>

      {/* Pocket Balance Grid */}
      <div className="bg-white/95 p-3 sm:p-4">
        {hasSavings && (
          <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#745bc7]/15 pb-2 font-mono text-[10px] text-[#5d5370] sm:hidden">
            <span>
              {t.pockets.dailySummary}:{" "}
              <MoneyDisplay
                amountIdr={overview.dailyTotalIdr}
                className="font-bold text-[#14100e]"
              />
            </span>
            <span className="text-[#745bc7]/40">·</span>
            <span>
              {t.pockets.savingsSummary}:{" "}
              <MoneyDisplay
                amountIdr={overview.savingsTotalIdr}
                className="font-bold text-[#745bc7]"
              />
            </span>
          </div>
        )}

        <div className={`grid gap-2.5 ${gridColsClass}`}>
          {overview.items.map(({ account, balanceIdr }) => {
            const active = selectedAccountId === account.id;
            const isSavings = account.role === "savings";
            return (
              <button
                key={account.id}
                type="button"
                onClick={() =>
                  onSelectAccount(active ? "all" : account.id)
                }
                title={
                  locale === "id"
                    ? `Klik untuk filter riwayat kantong ${account.name}`
                    : `Click to filter log by ${account.name}`
                }
                className={`group relative flex flex-col justify-between border px-3.5 py-2.5 text-left transition ${
                  active
                    ? "border-[#745bc7] bg-[#f4effe] shadow-[2px_2px_0_0_rgba(116,91,199,0.22)]"
                    : "border-[#745bc7]/28 bg-white hover:border-[#745bc7] hover:bg-[#faf7ff]"
                }`}
              >
                {/* Sharp Left Color Accent */}
                <span
                  className="absolute top-0 bottom-0 left-0 w-[3px]"
                  style={{ backgroundColor: account.color }}
                  aria-hidden="true"
                />

                <div className="flex items-center justify-between gap-2 pl-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {active && (
                      <span className="text-[9px] text-[#745bc7]">▶</span>
                    )}
                    <span className="truncate font-mono text-[11px] font-bold tracking-[0.08em] text-[#14100e] uppercase">
                      {account.name}
                    </span>
                    {account.isDefault && (
                      <Star
                        className="h-3 w-3 shrink-0 fill-[#745bc7] text-[#745bc7]"
                        aria-label="Default pocket"
                      />
                    )}
                  </span>

                  <span
                    className={`shrink-0 border px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-[0.12em] uppercase ${
                      isSavings
                        ? "border-[#745bc7]/55 bg-[#745bc7]/10 text-[#745bc7]"
                        : "border-[#2276a8]/35 bg-[#2276a8]/8 text-[#2276a8]"
                    }`}
                  >
                    {isSavings ? t.pockets.savingsLabel : t.pockets.dailyLabel}
                  </span>
                </div>

                <div className="mt-1.5 pl-1">
                  <MoneyDisplay
                    amountIdr={balanceIdr}
                    className={`text-sm font-bold sm:text-[15px] ${
                      balanceIdr < 0 ? "text-[#c837a5]" : "text-[#14100e]"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {overview.unassignedDeltaIdr !== 0 && (
          <p className="mt-2.5 flex flex-wrap items-center justify-between gap-1 border-t border-[#745bc7]/15 pt-2 font-mono text-[10px] text-[#5d5370]">
            <span>
              {locale === "id"
                ? "Catatan lama tanpa kantong:"
                : "Entries without a pocket:"}
            </span>
            <MoneyDisplay
              amountIdr={overview.unassignedDeltaIdr}
              showSign
              className="font-semibold text-[#5d5370]"
            />
          </p>
        )}
      </div>
    </section>
  );
};
