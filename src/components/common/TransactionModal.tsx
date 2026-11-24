import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { CATEGORIES } from "../../data/categories";
import { idrToUsd, usdToIdrAmount } from "../../services/fxService";
import type { EntryCurrency, TransactionType } from "../../types/cashflow";
import { formatIdr, formatUsd, todayIsoDate } from "../../utils/format";

export const TransactionModal: React.FC = () => {
  const {
    isTxModalOpen,
    editingTx,
    defaultTxType,
    closeTxModal,
    saveTransaction,
    store,
    fx,
    t,
    locale,
  } = useCashflow();

  const activeWallets = useMemo(
    () => store.wallets.filter((w) => !w.isArchived),
    [store.wallets]
  );

  const [type, setType] = useState<TransactionType>("expense");
  const [entryCurrency, setEntryCurrency] = useState<EntryCurrency>("IDR");
  const [amountInput, setAmountInput] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [categoryId, setCategoryId] = useState("food");
  const [walletId, setWalletId] = useState(activeWallets[0]?.id ?? "");
  const [toWalletId, setToWalletId] = useState(activeWallets[1]?.id ?? activeWallets[0]?.id ?? "");
  const [feeInput, setFeeInput] = useState("0");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTxModalOpen) return;
    setError(null);
    if (editingTx) {
      setType(editingTx.type);
      setEntryCurrency(editingTx.originalCurrency);
      setAmountInput(String(editingTx.originalAmount));
      setDate(editingTx.date);
      setCategoryId(editingTx.categoryId);
      setWalletId(editingTx.walletId);
      setToWalletId(editingTx.toWalletId ?? activeWallets[1]?.id ?? activeWallets[0]?.id ?? "");
      setFeeInput(String(editingTx.feeIdr ?? 0));
      setMerchant(editingTx.merchant ?? "");
      setNote(editingTx.note);
    } else {
      setType(defaultTxType);
      setEntryCurrency("IDR");
      setAmountInput("");
      setDate(todayIsoDate());
      setCategoryId(
        defaultTxType === "income"
          ? "salary"
          : defaultTxType === "transfer"
            ? "transfer"
            : "food"
      );
      setWalletId(activeWallets[0]?.id ?? "");
      setToWalletId(activeWallets[1]?.id ?? activeWallets[0]?.id ?? "");
      setFeeInput("0");
      setMerchant("");
      setNote("");
    }
  }, [isTxModalOpen, editingTx, defaultTxType, activeWallets]);

  const filteredCategories = useMemo(() => {
    if (type === "transfer") return CATEGORIES.filter((c) => c.type === "transfer");
    return CATEGORIES.filter((c) => c.type === type);
  }, [type]);

  // Keep categoryId valid when switching type
  useEffect(() => {
    if (!filteredCategories.some((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0]?.id ?? "other_expense");
    }
  }, [filteredCategories, categoryId]);

  if (!isTxModalOpen) return null;

  const parsedAmount = Number(amountInput) || 0;
  const computedIdr =
    entryCurrency === "USD" ? usdToIdrAmount(parsedAmount, fx.usdToIdr) : Math.round(parsedAmount);
  const computedUsd =
    entryCurrency === "USD" ? parsedAmount : idrToUsd(parsedAmount, fx.usdToIdr);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0 || computedIdr <= 0) {
      setError(t.txModal.invalidAmountError);
      return;
    }
    if (type === "transfer" && walletId === toWalletId) {
      setError(t.txModal.sameWalletError);
      return;
    }

    const cleanFee = type === "transfer" ? Math.max(0, Math.round(Number(feeInput) || 0)) : undefined;

    saveTransaction(
      {
        type,
        date,
        amountIdr: computedIdr,
        categoryId: type === "transfer" ? "transfer" : categoryId,
        walletId,
        toWalletId: type === "transfer" ? toWalletId : undefined,
        feeIdr: cleanFee,
        merchant: merchant.trim() || undefined,
        note:
          note.trim() ||
          (type === "transfer"
            ? locale === "id"
              ? "Transfer antar dompet"
              : "Inter-wallet transfer"
            : filteredCategories.find((c) => c.id === categoryId)?.[
                locale === "id" ? "nameId" : "nameEn"
              ] ?? "Transaksi"),
        originalCurrency: entryCurrency,
        originalAmount: parsedAmount,
        fxRateAtEntry: entryCurrency === "USD" ? fx.usdToIdr : undefined,
      },
      editingTx?.id
    );
    closeTxModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#1b1530]/55 p-4 backdrop-blur-xs"
      onClick={closeTxModal}
    >
      <div
        className="my-auto w-full max-w-lg rounded-2xl border border-[#745bc7]/30 bg-[#f8f5ff] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#745bc7] uppercase">
              SHIKAS LEDGER ENTRY
            </p>
            <h2 className="mt-0.5 font-editorial text-xl font-semibold tracking-[0.16em] text-[#745bc7] uppercase">
              {editingTx ? t.txModal.editTitle : t.txModal.newTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeTxModal}
            aria-label={t.actions.close}
            className="rounded-full p-1.5 text-[#5d5370] transition hover:bg-[#745bc7]/12 hover:text-[#745bc7]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Type segmented tabs */}
          <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-[#745bc7]/22 bg-white/75 p-1">
            {(["expense", "income", "transfer"] as const).map((item) => {
              const active = type === item;
              const activeCls =
                item === "income"
                  ? "bg-[#14866d] text-white"
                  : item === "expense"
                    ? "bg-[#c23b7b] text-white"
                    : "bg-[#2276a8] text-white";
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setType(item)}
                  className={`rounded-lg py-2 text-xs font-semibold tracking-wider uppercase transition ${
                    active ? activeCls : "text-[#5d5370] hover:bg-[#745bc7]/8"
                  }`}
                >
                  {t.ledger[item]}
                </button>
              );
            })}
          </div>

          {/* Entry currency + amount */}
          <div>
            <div className="flex items-center justify-between">
              <label className="font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                {t.txModal.amount}
              </label>
              <div className="flex items-center gap-1 rounded-full border border-[#745bc7]/25 bg-white p-0.5">
                {(["IDR", "USD"] as const).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setEntryCurrency(cur)}
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold transition ${
                      entryCurrency === cur
                        ? "bg-[#745bc7] text-white"
                        : "text-[#5d5370] hover:text-[#745bc7]"
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-1.5 flex items-center rounded-xl border border-[#745bc7]/30 bg-white px-3.5 py-2.5 focus-within:border-[#7650f3]">
              <span className="font-mono-num mr-2 text-sm font-bold text-[#745bc7]">
                {entryCurrency === "IDR" ? "Rp" : "$"}
              </span>
              <input
                type="number"
                inputMode="decimal"
                step={entryCurrency === "USD" ? "0.01" : "100"}
                min="0"
                required
                placeholder={entryCurrency === "IDR" ? "150000" : "20.00"}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="font-mono-num w-full bg-transparent text-lg font-bold text-[#14100e] outline-none"
              />
            </div>

            {parsedAmount > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 rounded-lg bg-[#745bc7]/8 px-3 py-1.5 text-[11px] text-[#5d5370]">
                <span>{t.txModal.liveConversionPreview}:</span>
                <span className="font-mono-num font-semibold text-[#745bc7]">
                  {entryCurrency === "USD"
                    ? `${formatUsd(parsedAmount)} → ${formatIdr(computedIdr)}`
                    : `${formatIdr(computedIdr)} ≈ ${formatUsd(computedUsd)}`}
                </span>
              </div>
            )}
          </div>

          {/* Date + Category */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                {t.txModal.date}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#7650f3]"
              />
            </div>

            {type !== "transfer" ? (
              <div>
                <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                  {t.txModal.category}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#7650f3]"
                >
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {locale === "id" ? c.nameId : c.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                  {t.txModal.fee}
                </label>
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={feeInput}
                    onChange={(e) => setFeeInput(e.target.value)}
                    className="font-mono-num w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#7650f3]"
                  />
                  <button
                    type="button"
                    onClick={() => setFeeInput("2500")}
                    className="shrink-0 rounded-lg border border-[#745bc7]/30 bg-white px-2 py-2 font-mono text-[10px] font-semibold text-[#745bc7] hover:bg-[#745bc7]/10"
                    title="BI-FAST Rp 2.500"
                  >
                    2.5k
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Wallets */}
          {type === "transfer" ? (
            <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_auto_1fr]">
              <div>
                <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                  {t.txModal.wallet}
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#7650f3]"
                >
                  {activeWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="hidden pb-2.5 text-[#745bc7] sm:block">
                <ArrowRight className="h-4 w-4" />
              </div>
              <div>
                <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                  {t.txModal.toWallet}
                </label>
                <select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#7650f3]"
                >
                  {activeWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                  {t.txModal.wallet}
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#7650f3]"
                >
                  {activeWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                  {t.txModal.merchant}
                </label>
                <input
                  type="text"
                  placeholder={t.txModal.merchantPlaceholder}
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#7650f3]"
                />
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
              {t.txModal.note}
            </label>
            <input
              type="text"
              placeholder={t.txModal.notePlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#7650f3]"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-[#c23b7b]/12 px-3 py-2 text-xs font-medium text-[#c23b7b]">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeTxModal}
              className="rounded-full border border-[#745bc7]/30 px-4 py-2 text-xs font-semibold text-[#5d5370] transition hover:bg-white"
            >
              {t.actions.cancel}
            </button>
            <button type="submit" className="tuyu-primary-btn px-5 py-2 text-xs">
              {t.actions.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
