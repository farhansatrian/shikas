import React, { useMemo } from "react";
import { Check, HandCoins, User, Users } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { getCategoryLabel } from "../../data/categories";
import { formatShortDate } from "../../utils/format";
import {
  computePendingReimburseOverview,
  getReimburseProgress,
} from "../../utils/reimburse";
import { MoneyDisplay } from "../common/MoneyDisplay";

export const ReimburseStrip: React.FC = () => {
  const { store, t, locale, openReimburseModal } = useCashflow();

  const overview = useMemo(
    () => computePendingReimburseOverview(store.transactions),
    [store.transactions]
  );

  const accountMap = useMemo(
    () => new Map(store.accounts.map((acc) => [acc.id, acc])),
    [store.accounts]
  );

  if (overview.pendingCount === 0) return null;

  return (
    <section className="vn-frame overflow-hidden">
      {/* Consistent SHIZUKU Watercolor Band Header Strip */}
      <div className="shikas-band-strip flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-white">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
          <HandCoins className="h-3.5 w-3.5" />
          <span>{t.reimburse.stripTitle}</span>
        </span>

        <span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-white/95 uppercase drop-shadow-2xs">
          {overview.pendingCount}{" "}
          {locale === "id" ? "belum lunas" : "pending"}
          {overview.knownRemainingIdr > 0 && (
            <>
              {" · "}
              <MoneyDisplay
                amountIdr={overview.knownRemainingIdr}
                className="font-bold text-white"
              />
              {overview.flexibleCount > 0 ? "+" : ""}
            </>
          )}
          {overview.knownRemainingIdr === 0 && overview.flexibleCount > 0 && (
            <> · {t.reimburse.flexibleTag}</>
          )}
        </span>
      </div>

      {/* Active Pending Reimburse Cards */}
      <div className="bg-white/95 p-3 sm:p-4">
        <div
          className={`grid gap-2.5 ${
            overview.pendingItems.length === 1
              ? "grid-cols-1"
              : "grid-cols-1 md:grid-cols-2"
          }`}
        >
          {overview.pendingItems.map((tx) => {
            const prog = getReimburseProgress(tx);
            const fromAcc = tx.accountId
              ? accountMap.get(tx.accountId)
              : undefined;
            const payer = tx.reimburse?.from;

            return (
              <div
                key={tx.id}
                className="relative flex flex-col justify-between gap-2.5 border border-[#745bc7]/30 bg-[#fdfbff] p-3.5 transition hover:border-[#745bc7]"
              >
                {/* Sharp Left Accent */}
                <span
                  className="absolute top-0 bottom-0 left-0 w-[3px]"
                  style={{
                    backgroundColor: prog.isPartial ? "#2276a8" : "#d97706",
                  }}
                  aria-hidden="true"
                />

                <div className="flex items-start justify-between gap-3 pl-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`border px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-[0.12em] uppercase ${
                          prog.isPartial
                            ? "border-[#2276a8]/55 bg-[#2276a8]/10 text-[#2276a8]"
                            : "border-[#d97706]/55 bg-[#d97706]/10 text-[#b45309]"
                        }`}
                      >
                        {prog.isPartial
                          ? t.reimburse.statusPartial
                          : t.reimburse.statusPending}
                      </span>

                      {prog.isSplit ? (
                        <span className="inline-flex items-center gap-1 border border-[#745bc7]/35 bg-[#f4effe] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-[#5b42a8]">
                          <Users className="h-2.5 w-2.5 shrink-0" />
                          <span>
                            {prog.settledPayersCount}/{prog.payers.length}{" "}
                            {locale === "id" ? "lunas" : "settled"}
                          </span>
                        </span>
                      ) : (
                        payer && (
                          <span className="inline-flex items-center gap-1 border border-[#745bc7]/35 bg-[#f4effe] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-[#5b42a8]">
                            <User className="h-2.5 w-2.5 shrink-0" />
                            <span className="max-w-[140px] truncate">{payer}</span>
                          </span>
                        )
                      )}

                      <span className="font-mono text-[10px] text-[#5d5370] uppercase">
                        {formatShortDate(tx.date, locale)}
                      </span>
                    </div>

                    <p className="mt-1.5 truncate text-[13px] font-semibold text-[#14100e]">
                      {tx.note}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[10.5px] text-[#5d5370]">
                      {getCategoryLabel(tx.categoryId, locale, store.categories)}
                      {fromAcc ? ` · ${fromAcc.name}` : ""}
                      {" · "}
                      {locale === "id" ? "Bayar" : "Paid"}{" "}
                      <MoneyDisplay
                        amountIdr={prog.grossIdr}
                        className="font-semibold text-[#14100e]"
                      />
                      {prog.feeIdr > 0 && (
                        <span>
                          {" "}
                          (+
                          <MoneyDisplay amountIdr={prog.feeIdr} />{" "}
                          {locale === "id" ? "admin" : "fee"})
                        </span>
                      )}
                    </p>

                    {/* Per-person split status chips */}
                    {prog.isSplit && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {prog.payers.map((p) => (
                          <span
                            key={p.id}
                            className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[9px] font-semibold ${
                              p.isSettled
                                ? "border-[#1f8f6b]/45 bg-[#1f8f6b]/10 text-[#1f8f6b]"
                                : p.isPartial
                                  ? "border-[#2276a8]/45 bg-[#2276a8]/10 text-[#2276a8]"
                                  : "border-[#d97706]/45 bg-[#d97706]/10 text-[#b45309]"
                            }`}
                          >
                            {p.isSettled && (
                              <Check className="h-2.5 w-2.5 shrink-0" />
                            )}
                            <span>{p.name}</span>
                            {p.isPending && p.remainingExpectedIdr > 0 && (
                              <span>
                                ·{" "}
                                <MoneyDisplay
                                  amountIdr={p.remainingExpectedIdr}
                                />
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openReimburseModal(tx.id)}
                    className="vn-btn-band shrink-0 px-3 py-1.5 text-[10px] tracking-[0.1em]"
                  >
                    <span>▶</span>
                    <span>{t.reimburse.receiveBtn}</span>
                  </button>
                </div>

                {/* Progress / Flexible Summary Footer */}
                <div className="space-y-1.5 border-t border-[#745bc7]/15 pt-2 pl-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10.5px]">
                    {prog.isFlexible && prog.remainingExpectedIdr === 0 ? (
                      <>
                        <span className="text-[#5d5370]">
                          {prog.reimbursedIdr > 0 ? (
                            <>
                              {locale === "id" ? "Diterima" : "Received"}{" "}
                              <MoneyDisplay
                                amountIdr={prog.reimbursedIdr}
                                className="font-bold text-[#1f8f6b]"
                              />
                              {" · "}
                              <span className="text-[#745bc7]">
                                {t.reimburse.flexibleTag}
                              </span>
                            </>
                          ) : (
                            <span className="text-[#745bc7]">
                              {locale === "id"
                                ? "Nominal fleksibel (bebas lunas berapa saja)"
                                : "Flexible amount (settle at any amount)"}
                            </span>
                          )}
                        </span>
                        <span className="text-[#5d5370]">
                          {locale === "id" ? "Net saat ini" : "Current net"}{" "}
                          <MoneyDisplay
                            amountIdr={prog.netExpenseIdr}
                            className="font-bold text-[#14100e]"
                          />
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[#5d5370]">
                          {locale === "id" ? "Diterima" : "Received"}{" "}
                          <MoneyDisplay
                            amountIdr={prog.reimbursedIdr}
                            className="font-bold text-[#1f8f6b]"
                          />
                          {prog.expectedIdr !== undefined && (
                            <>
                              {" / "}
                              <MoneyDisplay
                                amountIdr={prog.expectedIdr}
                                className="font-semibold text-[#14100e]"
                              />
                            </>
                          )}
                        </span>
                        <span className="font-semibold text-[#b45309]">
                          {locale === "id" ? "Sisa" : "Left"}{" "}
                          <MoneyDisplay
                            amountIdr={prog.remainingExpectedIdr}
                            className="font-bold"
                          />
                          {prog.hasFlexiblePendingPayer ? "+" : ""}
                        </span>
                      </>
                    )}
                  </div>

                  {(!prog.isFlexible || prog.reimbursedIdr > 0) && (
                    <div className="h-1.5 w-full bg-[#745bc7]/12">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(prog.reimbursedIdr > 0 ? 4 : 0, prog.progressPercent))}%`,
                          backgroundColor: prog.isPartial ? "#2276a8" : "#745bc7",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
