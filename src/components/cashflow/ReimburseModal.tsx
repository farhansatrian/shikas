import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  PiggyBank,
  RotateCcw,
  Star,
  Trash2,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { getCategoryLabel } from "../../data/categories";
import { formatIdr, formatShortDate, todayIsoDate } from "../../utils/format";
import { getReimburseProgress } from "../../utils/reimburse";
import { MoneyDisplay } from "../common/MoneyDisplay";

function formatDigitsWithDots(digits: string): string {
  const clean = digits.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function getOffsetIsoDate(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const ReimburseModal: React.FC = () => {
  const {
    store,
    reimburseTxId,
    closeReimburseModal,
    recordReimbursement,
    deleteReimbursementEntry,
    setReimburseStatus,
    setReimbursePayerStatus,
    t,
    locale,
  } = useCashflow();

  const tx = useMemo(
    () =>
      reimburseTxId
        ? store.transactions.find((item) => item.id === reimburseTxId) ?? null
        : null,
    [reimburseTxId, store.transactions]
  );

  const accounts = store.accounts;
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );
  const defaultAccountId = useMemo(
    () => accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? "",
    [accounts]
  );

  const [rawDigits, setRawDigits] = useState("");
  const [selectedPayerId, setSelectedPayerId] = useState("");
  const [intoAccountId, setIntoAccountId] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => (tx ? getReimburseProgress(tx) : null), [tx]);

  const pendingPayers = useMemo(
    () => (progress ? progress.payers.filter((p) => p.isPending) : []),
    [progress]
  );

  const payerNameById = useMemo(
    () => new Map((progress?.payers ?? []).map((p) => [p.id, p.name])),
    [progress]
  );

  useEffect(() => {
    if (!tx || !progress) return;
    setError(null);
    setIntoAccountId(defaultAccountId);
    setDate(todayIsoDate());
    setNote("");
    if (progress.isSplit) {
      const firstPending = progress.payers.find((p) => p.isPending);
      setSelectedPayerId(firstPending?.id ?? "");
      setRawDigits(
        firstPending && firstPending.remainingExpectedIdr > 0
          ? String(Math.min(progress.maxReceivableIdr, firstPending.remainingExpectedIdr))
          : ""
      );
    } else {
      setSelectedPayerId("");
      setRawDigits(
        progress.remainingExpectedIdr > 0
          ? String(progress.remainingExpectedIdr)
          : ""
      );
    }
  }, [reimburseTxId, defaultAccountId]);

  // Keep selectedPayerId pointed at a valid pending payer if the current one gets settled
  useEffect(() => {
    if (!progress || !progress.isSplit) return;
    if (pendingPayers.length === 0) {
      setSelectedPayerId("");
      return;
    }
    if (!pendingPayers.some((p) => p.id === selectedPayerId)) {
      const next = pendingPayers[0];
      setSelectedPayerId(next.id);
      setRawDigits(
        next.remainingExpectedIdr > 0
          ? String(Math.min(progress.maxReceivableIdr, next.remainingExpectedIdr))
          : ""
      );
    }
  }, [progress, pendingPayers, selectedPayerId]);

  useEffect(() => {
    if (!reimburseTxId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeReimburseModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reimburseTxId, closeReimburseModal]);

  if (!reimburseTxId || !tx || !progress || !tx.reimburse) return null;

  const activePayer = progress.isSplit
    ? progress.payers.find((p) => p.id === selectedPayerId) ?? pendingPayers[0]
    : undefined;

  const parsedAmount = Number(rawDigits) || 0;
  const formattedAmount = formatDigitsWithDots(rawDigits);
  const today = todayIsoDate();
  const yesterday = getOffsetIsoDate(-1);
  const sourcePocket = tx.accountId ? accountMap.get(tx.accountId) : undefined;
  const targetPocket = intoAccountId ? accountMap.get(intoAccountId) : undefined;

  const willExhaustExpense =
    parsedAmount > 0 && parsedAmount >= progress.maxReceivableIdr;

  const handleSelectPayer = (payerId: string) => {
    setSelectedPayerId(payerId);
    setError(null);
    const target = progress.payers.find((p) => p.id === payerId);
    if (target && target.remainingExpectedIdr > 0) {
      setRawDigits(
        String(Math.min(progress.maxReceivableIdr, target.remainingExpectedIdr))
      );
    } else {
      setRawDigits("");
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 12);
    setRawDigits(digitsOnly);
    if (error) setError(null);
  };

  const handleRecord = (markSettled: boolean) => {
    if (parsedAmount <= 0 || parsedAmount > progress.maxReceivableIdr) {
      setError(
        `${t.reimburse.invalidAmount} (maks. ${formatIdr(progress.maxReceivableIdr)})`
      );
      return;
    }

    const payerIdForEntry =
      progress.isSplit && activePayer ? activePayer.id : undefined;

    recordReimbursement(
      tx.id,
      {
        amountIdr: parsedAmount,
        accountId:
          accounts.length > 0 && intoAccountId ? intoAccountId : undefined,
        payerId: payerIdForEntry,
        date,
        note: note.trim() || undefined,
      },
      markSettled
    );

    const willSettleEntireTx = progress.isSplit
      ? parsedAmount >= progress.maxReceivableIdr ||
        ((markSettled ||
          (activePayer?.expectedIdr !== undefined &&
            activePayer.reimbursedIdr + parsedAmount >= activePayer.expectedIdr)) &&
          pendingPayers.length <= 1)
      : markSettled || parsedAmount >= progress.maxReceivableIdr;

    if (willSettleEntireTx) {
      closeReimburseModal();
    } else {
      setRawDigits("");
      setNote("");
      setError(null);
    }
  };

  const quickAmounts: Array<{ label: string; value: number }> = [];
  if (progress.isSplit && activePayer) {
    const payerRem = Math.min(
      progress.maxReceivableIdr,
      activePayer.remainingExpectedIdr
    );
    if (payerRem > 0) {
      quickAmounts.push({
        label:
          locale === "id"
            ? `Sisa ${activePayer.name} (${formatIdr(payerRem)})`
            : `${activePayer.name} left (${formatIdr(payerRem)})`,
        value: payerRem,
      });
    }
  } else if (
    progress.remainingExpectedIdr > 0 &&
    progress.remainingExpectedIdr < progress.maxReceivableIdr
  ) {
    quickAmounts.push({
      label:
        locale === "id"
          ? `Sisa target (${formatIdr(progress.remainingExpectedIdr)})`
          : `Target left (${formatIdr(progress.remainingExpectedIdr)})`,
      value: progress.remainingExpectedIdr,
    });
  }

  const halfCap = Math.round(progress.reimburseCapIdr / 2);
  if (
    !progress.isSplit &&
    progress.reimbursedIdr === 0 &&
    halfCap > 0 &&
    halfCap < progress.maxReceivableIdr &&
    !quickAmounts.some((q) => q.value === halfCap)
  ) {
    quickAmounts.push({
      label: `50% (${formatIdr(halfCap)})`,
      value: halfCap,
    });
  }

  if (
    progress.maxReceivableIdr > 0 &&
    !quickAmounts.some((q) => q.value === progress.maxReceivableIdr)
  ) {
    quickAmounts.push({
      label:
        locale === "id"
          ? `Full sisa (${formatIdr(progress.maxReceivableIdr)})`
          : `Full remaining (${formatIdr(progress.maxReceivableIdr)})`,
      value: progress.maxReceivableIdr,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#14100e]/45 p-4 backdrop-blur-xs"
      onClick={closeReimburseModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="vn-dialogue animate-modal-in my-auto flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Watercolor Header Strip */}
        <div className="shikas-band-strip flex shrink-0 items-center justify-between px-4 py-2.5 text-white">
          <span className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
            {t.reimburse.modalTitle} // IDR
          </span>
          <button
            type="button"
            onClick={closeReimburseModal}
            aria-label={t.actions.close}
            className="inline-flex items-center gap-1 border border-white/45 bg-white/15 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-white uppercase transition hover:bg-white/30"
          >
            <span>ESC</span>
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {/* Original Expense Overview Card */}
          <div className="border border-[#745bc7]/35 bg-[#faf7ff] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.12em] uppercase ${
                    progress.isSettled
                      ? "border-[#1f8f6b]/55 bg-[#1f8f6b]/12 text-[#1f8f6b]"
                      : progress.isPartial
                        ? "border-[#2276a8]/55 bg-[#2276a8]/12 text-[#2276a8]"
                        : "border-[#d97706]/55 bg-[#d97706]/12 text-[#b45309]"
                  }`}
                >
                  {progress.isSettled
                    ? t.reimburse.statusSettled
                    : progress.isPartial
                      ? t.reimburse.statusPartial
                      : t.reimburse.statusPending}
                </span>

                {progress.isSplit ? (
                  <span className="inline-flex items-center gap-1 border border-[#745bc7]/40 bg-white px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-[#5b42a8]">
                    <Users className="h-2.5 w-2.5" />
                    <span>
                      {progress.settledPayersCount}/{progress.payers.length}{" "}
                      {locale === "id" ? "lunas" : "settled"}
                    </span>
                  </span>
                ) : (
                  tx.reimburse.from && (
                    <span className="inline-flex items-center gap-1 border border-[#745bc7]/35 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#5b42a8]">
                      <User className="h-2.5 w-2.5" />
                      <span>{tx.reimburse.from}</span>
                    </span>
                  )
                )}

                {progress.feeIdr > 0 && (
                  <span className="border border-[#745bc7]/30 bg-white px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#5d5370]">
                    +{formatIdr(progress.feeIdr)}{" "}
                    {progress.includeFee
                      ? locale === "id"
                        ? "fee ikut"
                        : "fee incl."
                      : locale === "id"
                        ? "fee terpisah"
                        : "fee excl."}
                  </span>
                )}
              </div>

              <span className="font-mono text-[10px] text-[#5d5370] uppercase">
                {formatShortDate(tx.date, locale)}
              </span>
            </div>

            <p className="mt-2 text-sm font-bold text-[#14100e]">{tx.note}</p>
            <p className="mt-0.5 font-mono text-[10.5px] text-[#5d5370]">
              {getCategoryLabel(tx.categoryId, locale, store.categories)}
              {sourcePocket ? ` · ${sourcePocket.name}` : ""}
              {!progress.isSplit && (
                <>
                  {" · "}
                  {progress.isFlexible
                    ? locale === "id"
                      ? "Target: Fleksibel"
                      : "Target: Flexible"
                    : `Target: ${formatIdr(progress.expectedIdr ?? 0)}`}
                </>
              )}
            </p>

            {/* 3-Cell Accounting Summary */}
            <div className="mt-3 grid grid-cols-3 border border-[#745bc7]/25 bg-white">
              <div className="border-r border-[#745bc7]/20 px-2.5 py-2">
                <p className="font-mono text-[8.5px] tracking-[0.12em] text-[#5d5370] uppercase">
                  {t.reimburse.grossLabel}
                </p>
                <MoneyDisplay
                  amountIdr={progress.grossIdr}
                  className="mt-0.5 text-xs font-bold text-[#14100e]"
                />
              </div>
              <div className="border-r border-[#745bc7]/20 px-2.5 py-2">
                <p className="font-mono text-[8.5px] tracking-[0.12em] text-[#5d5370] uppercase">
                  {t.reimburse.receivedLabel}
                </p>
                <MoneyDisplay
                  amountIdr={progress.reimbursedIdr}
                  className="mt-0.5 text-xs font-bold text-[#1f8f6b]"
                />
              </div>
              <div className="px-2.5 py-2">
                <p className="font-mono text-[8.5px] tracking-[0.12em] text-[#5d5370] uppercase">
                  {t.reimburse.netExpenseLabel}
                </p>
                <MoneyDisplay
                  amountIdr={progress.netExpenseIdr}
                  className="mt-0.5 text-xs font-bold text-[#c837a5]"
                />
              </div>
            </div>

            {/* Per-Person Split Breakdown (Multi-Person Reimburse) */}
            {progress.isSplit && (
              <div className="mt-3 border border-[#745bc7]/25 bg-white">
                <div className="flex items-center justify-between border-b border-[#745bc7]/15 bg-[#f4effd] px-2.5 py-1.5 font-mono text-[9px] font-bold tracking-[0.14em] text-[#745bc7] uppercase">
                  <span>
                    {locale === "id" ? "STATUS PATUNGAN" : "SPLIT STATUS"} (
                    {progress.payers.length})
                  </span>
                  <span>
                    {progress.settledPayersCount}/{progress.payers.length}{" "}
                    {locale === "id" ? "LUNAS" : "SETTLED"}
                  </span>
                </div>
                <ul className="divide-y divide-[#745bc7]/12">
                  {progress.payers.map((p) => {
                    const isSelected = activePayer?.id === p.id && p.isPending;
                    return (
                      <li
                        key={p.id}
                        className={`flex items-center justify-between gap-2 px-2.5 py-2 transition ${
                          isSelected ? "bg-[#f4effe]" : ""
                        }`}
                      >
                        <button
                          type="button"
                          disabled={!p.isPending}
                          onClick={() => handleSelectPayer(p.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
                        >
                          <span
                            className={`inline-flex h-4 w-4 shrink-0 items-center justify-center border font-mono text-[9px] font-bold ${
                              p.isSettled
                                ? "border-[#1f8f6b] bg-[#1f8f6b] text-white"
                                : isSelected
                                  ? "border-[#745bc7] bg-[#745bc7] text-white"
                                  : "border-[#d97706]/55 bg-[#d97706]/10 text-[#b45309]"
                            }`}
                          >
                            {p.isSettled ? (
                              <Check className="h-2.5 w-2.5" />
                            ) : isSelected ? (
                              "▶"
                            ) : (
                              "·"
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-bold text-[#14100e]">
                              <span className="truncate">{p.name}</span>
                              <span
                                className={`border px-1 py-0 text-[8px] font-bold tracking-[0.1em] uppercase ${
                                  p.isSettled
                                    ? "border-[#1f8f6b]/45 bg-[#1f8f6b]/10 text-[#1f8f6b]"
                                    : p.isPartial
                                      ? "border-[#2276a8]/45 bg-[#2276a8]/10 text-[#2276a8]"
                                      : "border-[#d97706]/50 bg-[#d97706]/10 text-[#b45309]"
                                }`}
                              >
                                {p.isSettled
                                  ? t.reimburse.statusSettled
                                  : p.isPartial
                                    ? t.reimburse.statusPartial
                                    : t.reimburse.statusPending}
                              </span>
                            </p>
                            <p className="font-mono text-[10px] text-[#5d5370]">
                              {p.expectedIdr !== undefined ? (
                                <>
                                  <MoneyDisplay
                                    amountIdr={p.reimbursedIdr}
                                    className="font-semibold text-[#1f8f6b]"
                                  />
                                  {" / "}
                                  <MoneyDisplay amountIdr={p.expectedIdr} />
                                  {p.isPending && p.remainingExpectedIdr > 0 && (
                                    <span className="text-[#b45309]">
                                      {" "}
                                      ({locale === "id" ? "sisa" : "left"}{" "}
                                      <MoneyDisplay
                                        amountIdr={p.remainingExpectedIdr}
                                      />
                                      )
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <MoneyDisplay
                                    amountIdr={p.reimbursedIdr}
                                    className="font-semibold text-[#1f8f6b]"
                                  />
                                  {" · "}
                                  {t.reimburse.flexibleTag}
                                </>
                              )}
                            </p>
                          </div>
                        </button>

                        {p.isPending ? (
                          <button
                            type="button"
                            onClick={() =>
                              setReimbursePayerStatus(tx.id, p.id, "settled")
                            }
                            title={
                              locale === "id"
                                ? `Tandai ${p.name} lunas tanpa tambahan bayar`
                                : `Mark ${p.name} settled without extra payment`
                            }
                            className="shrink-0 border border-[#1f8f6b]/45 bg-white px-2 py-1 font-mono text-[8.5px] font-bold tracking-[0.08em] text-[#1f8f6b] uppercase transition hover:bg-[#1f8f6b] hover:text-white"
                          >
                            {locale === "id" ? "✓ Lunas" : "✓ Settle"}
                          </button>
                        ) : (
                          progress.maxReceivableIdr > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setReimbursePayerStatus(tx.id, p.id, "pending")
                              }
                              title={
                                locale === "id"
                                  ? `Buka kembali ${p.name}`
                                  : `Reopen ${p.name}`
                              }
                              className="shrink-0 border border-[#745bc7]/35 bg-white px-2 py-1 font-mono text-[8.5px] font-bold tracking-[0.08em] text-[#745bc7] uppercase transition hover:bg-[#745bc7] hover:text-white"
                            >
                              {locale === "id" ? "Buka" : "Reopen"}
                            </button>
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Record Repayment Form (shown when pending and remaining cap > 0) */}
          {progress.isPending && progress.maxReceivableIdr > 0 && (
            <div className="space-y-3.5">
              {/* Payer Selector (Multi-Person Split Only) */}
              {progress.isSplit && pendingPayers.length > 0 && (
                <div>
                  <span className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                    {locale === "id"
                      ? "PEMBAYARAN DARI SIAPA?"
                      : "WHO IS PAYING?"}
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {pendingPayers.map((p) => {
                      const selected = activePayer?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPayer(p.id)}
                          className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[11px] transition ${
                            selected
                              ? "border-[#745bc7] bg-[#745bc7] font-bold text-white"
                              : "border-[#745bc7]/30 bg-white text-[#14100e] hover:border-[#745bc7]"
                          }`}
                        >
                          <User className="h-3 w-3 shrink-0" />
                          <span>{p.name}</span>
                          {p.remainingExpectedIdr > 0 && (
                            <span
                              className={`text-[9.5px] ${
                                selected ? "text-white/85" : "text-[#b45309]"
                              }`}
                            >
                              ({formatIdr(p.remainingExpectedIdr)})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Amount Chamber */}
              <div className="border border-[#745bc7]/45 bg-white px-4 py-3.5 text-center transition focus-within:border-[#745bc7]">
                <label className="block font-mono text-[10px] font-semibold tracking-[0.18em] text-[#5d5370] uppercase">
                  {progress.isSplit && activePayer
                    ? locale === "id"
                      ? `NOMINAL DITERIMA DARI ${activePayer.name.toUpperCase()} (IDR)`
                      : `AMOUNT RECEIVED FROM ${activePayer.name.toUpperCase()} (IDR)`
                    : t.reimburse.receivedAmountLabel}
                </label>
                <div className="mt-1.5 flex items-baseline justify-center gap-1.5">
                  <span className="font-mono-num text-xl font-bold text-[#1f8f6b]">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    placeholder="0"
                    value={formattedAmount}
                    onChange={handleAmountChange}
                    className="font-mono-num w-full max-w-[200px] bg-transparent text-left text-3xl font-bold tracking-tight text-[#14100e] outline-none placeholder:text-[#5d5370]/35"
                  />
                </div>

                {quickAmounts.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                    {quickAmounts.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          setRawDigits(String(chip.value));
                          setError(null);
                        }}
                        className={`border px-2.5 py-1 font-mono text-[10px] font-semibold transition ${
                          parsedAmount === chip.value
                            ? "border-[#745bc7] bg-[#745bc7] text-white"
                            : "border-[#745bc7]/40 bg-[#f5effe]/75 text-[#14100e] hover:border-[#745bc7] hover:bg-[#745bc7] hover:text-white"
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}

                {parsedAmount > 0 && parsedAmount <= progress.maxReceivableIdr && (
                  <p className="mt-2 font-mono text-[10px] text-[#4e4361]">
                    {targetPocket ? (
                      <>
                        <span className="font-semibold text-[#14100e]">
                          {targetPocket.name}
                        </span>{" "}
                        <span className="font-bold text-[#1f8f6b]">
                          +{formatIdr(parsedAmount)}
                        </span>
                        {" · "}
                      </>
                    ) : null}
                    {locale === "id" ? "Net pengeluaran jadi" : "Net expense becomes"}{" "}
                    <span className="font-bold text-[#c837a5]">
                      {formatIdr(progress.netExpenseIdr - parsedAmount)}
                    </span>
                  </p>
                )}
              </div>

              {/* Destination Pocket Selector */}
              {accounts.length > 0 && (
                <div>
                  <span className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                    {t.reimburse.intoPocketLabel}
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {accounts.map((acc) => {
                      const selected = intoAccountId === acc.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setIntoAccountId(acc.id)}
                          className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[11px] transition ${
                            selected
                              ? "border-[#745bc7] bg-[#e5dcfb]/80 font-bold text-[#14100e]"
                              : "border-[#745bc7]/28 bg-white text-[#5d5370] hover:border-[#745bc7] hover:text-[#14100e]"
                          }`}
                        >
                          {acc.role === "savings" ? (
                            <PiggyBank className="h-3 w-3 shrink-0 text-[#745bc7]" />
                          ) : (
                            <Wallet className="h-3 w-3 shrink-0 text-[#2276a8]" />
                          )}
                          <span>{acc.name}</span>
                          {acc.isDefault && (
                            <Star className="h-2.5 w-2.5 fill-[#745bc7] text-[#745bc7]" />
                          )}
                          {acc.role === "savings" && (
                            <span className="text-[8.5px] font-semibold text-[#745bc7] uppercase">
                              · {t.pockets.savingsLabel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Date + Optional Note */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                    {t.reimburse.receivedDateLabel}
                  </label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDate(today)}
                      className={`border px-2 py-1.5 font-mono text-[9.5px] font-semibold uppercase transition ${
                        date === today
                          ? "border-[#745bc7] bg-[#745bc7] text-white"
                          : "border-[#745bc7]/35 bg-white text-[#5d5370] hover:border-[#745bc7]"
                      }`}
                    >
                      {locale === "id" ? "HARI INI" : "TODAY"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDate(yesterday)}
                      className={`border px-2 py-1.5 font-mono text-[9.5px] font-semibold uppercase transition ${
                        date === yesterday
                          ? "border-[#745bc7] bg-[#745bc7] text-white"
                          : "border-[#745bc7]/35 bg-white text-[#5d5370] hover:border-[#745bc7]"
                      }`}
                    >
                      {locale === "id" ? "KEMARIN" : "YEST"}
                    </button>
                    <div className="flex min-w-[132px] flex-1 items-center gap-1 border border-[#745bc7]/35 bg-white px-2 py-1.5 focus-within:border-[#745bc7]">
                      <Calendar className="h-3 w-3 shrink-0 text-[#745bc7]" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full min-w-0 bg-transparent font-mono text-[10.5px] text-[#14100e] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                    {t.reimburse.paymentNoteLabel}
                  </label>
                  <input
                    type="text"
                    placeholder={t.reimburse.paymentNotePlaceholder}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1.5 w-full border border-[#745bc7]/35 bg-white px-3 py-1.5 text-xs text-[#14100e] outline-none transition placeholder:text-[#5d5370]/65 focus:border-[#745bc7]"
                  />
                </div>
              </div>

              {error && (
                <p className="border border-[#c837a5] bg-[#d749d5]/10 px-3 py-2 font-mono text-[11px] font-semibold text-[#c837a5]">
                  ! {error}
                </p>
              )}

              {/* Dual Settlement Action Buttons: Partial vs Settled */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={willExhaustExpense}
                  onClick={() => handleRecord(false)}
                  className="inline-flex items-center justify-center gap-1.5 border-[1.5px] border-[#2276a8] bg-white px-3.5 py-2.5 font-mono text-[10.5px] font-bold tracking-[0.1em] text-[#2276a8] uppercase shadow-[2px_2px_0_0_rgba(34,118,168,0.2)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#2276a8] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:bg-white disabled:hover:text-[#2276a8]"
                >
                  <span>{t.reimburse.recordPartialBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRecord(true)}
                  className="vn-btn-band px-3.5 py-2.5 text-[10.5px] tracking-[0.1em]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {progress.isSplit && activePayer
                      ? locale === "id"
                        ? `Catat & Lunas (${activePayer.name})`
                        : `Save & Settle ${activePayer.name}`
                      : t.reimburse.recordSettledBtn}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Direct Status Action (Mark All Settled Without Extra Payment / Reopen) */}
          {progress.isPending ? (
            <button
              type="button"
              onClick={() => {
                setReimburseStatus(tx.id, "settled");
                closeReimburseModal();
              }}
              className="flex w-full items-center justify-center gap-1.5 border border-[#1f8f6b]/45 bg-[#1f8f6b]/6 px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#1f8f6b] uppercase transition hover:bg-[#1f8f6b] hover:text-white"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                {progress.isSplit
                  ? locale === "id"
                    ? "Tandai Semua Lunas (Tanpa Tambahan)"
                    : "Mark All Settled Now (No Extra Payment)"
                  : t.reimburse.markSettledOnlyBtn}
              </span>
            </button>
          ) : (
            progress.maxReceivableIdr > 0 && (
              <button
                type="button"
                onClick={() => setReimburseStatus(tx.id, "pending")}
                className="flex w-full items-center justify-center gap-1.5 border border-[#745bc7]/45 bg-[#f5effe] px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#745bc7] uppercase transition hover:bg-[#745bc7] hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t.reimburse.reopenPendingBtn}</span>
              </button>
            )
          )}

          {/* Recorded Repayments History */}
          <div className="border-t border-[#745bc7]/20 pt-3">
            <p className="font-mono text-[9.5px] font-bold tracking-[0.16em] text-[#5d5370] uppercase">
              {t.reimburse.historyTitle} ({tx.reimburse.entries.length})
            </p>

            {tx.reimburse.entries.length === 0 ? (
              <p className="mt-2 font-mono text-[11px] text-[#5d5370]">
                {t.reimburse.noHistory}
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-[#745bc7]/15 border border-[#745bc7]/25 bg-white">
                {tx.reimburse.entries.map((entry) => {
                  const dest = entry.accountId
                    ? accountMap.get(entry.accountId)
                    : undefined;
                  const payerName = entry.payerId
                    ? payerNameById.get(entry.payerId)
                    : undefined;
                  return (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                          {payerName && (
                            <span className="border border-[#745bc7]/35 bg-[#f4effe] px-1.5 py-0 font-mono text-[9.5px] font-bold text-[#5b42a8]">
                              {payerName}
                            </span>
                          )}
                          <span className="font-bold text-[#1f8f6b]">
                            +<MoneyDisplay amountIdr={entry.amountIdr} />
                          </span>
                          {dest && (
                            <span className="inline-flex items-center gap-1 text-[#14100e]">
                              <span className="text-[#745bc7]">→</span>
                              {dest.role === "savings" ? (
                                <PiggyBank className="h-3 w-3 shrink-0 text-[#745bc7]" />
                              ) : (
                                <Wallet className="h-3 w-3 shrink-0 text-[#2276a8]" />
                              )}
                              <span className="font-semibold">{dest.name}</span>
                            </span>
                          )}
                          <span className="text-[10px] text-[#5d5370] uppercase">
                            · {formatShortDate(entry.date, locale)}
                          </span>
                        </p>
                        {entry.note && (
                          <p className="truncate font-mono text-[10px] text-[#5d5370]">
                            {entry.note}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteReimbursementEntry(tx.id, entry.id)}
                        aria-label={t.actions.delete}
                        className="shrink-0 p-1 text-[#5d5370] transition hover:text-[#c837a5]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
