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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#111015]/55 p-4 backdrop-blur-xs"
      onClick={closeTxModal}
    >
      <div
        className="my-auto w-full max-w-lg border border-[#14100e]/25 bg-[#fdfbfd] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#14100e]/12 pb-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-[#5f5368] uppercase">
              SHIKAS LEDGER ENTRY
            </p>
            <h2 className="font-nav mt-0.5 text-lg font-medium tracking-[0.15em] text-[#14100e] uppercase">
              {editingTx ? t.txModal.editTitle : t.txModal.newTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeTxModal}
            aria-label={t.actions.close}
            className="p-1 text-[#5f5368] hover:text-[#14100e]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(["expense", "income", "transfer"] as const).map((item) => {
              const active = type === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setType(item)}
                  className={`border py-2 font-nav text-xs tracking-[0.14em] uppercase transition ${
                    active
                      ? "border-[#14100e] bg-[#14100e] text-white"
                      : "border-[#14100e]/20 bg-white text-[#5f5368] hover:text-[#14100e]"
                  }`}
                >
                  {t.ledger[item]}
                </button>
              );
            })}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                {t.txModal.amount}
              </label>
              <div className="flex items-center gap-1">
                {(["IDR", "USD"] as const).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setEntryCurrency(cur)}
                    className={`border px-2.5 py-0.5 font-mono text-[10px] transition ${
                      entryCurrency === cur
                        ? "border-[#14100e] bg-[#14100e] text-white"
                        : "border-[#14100e]/20 bg-white text-[#5f5368]"
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-1.5 flex items-center border border-[#14100e]/25 bg-white px-3.5 py-2.5 focus-within:border-[#14100e]">
              <span className="font-mono-num mr-2 text-sm font-semibold text-[#5f5368]">
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
                className="font-mono-num w-full bg-transparent text-lg font-semibold text-[#14100e] outline-none"
              />
            </div>

            {parsedAmount > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 border border-[#14100e]/10 bg-white/80 px-3 py-1.5 font-mono text-[11px] text-[#5f5368]">
                <span>{t.txModal.liveConversionPreview}</span>
                <span className="font-semibold text-[#14100e]">
                  {entryCurrency === "USD"
                    ? `${formatUsd(parsedAmount)} → ${formatIdr(computedIdr)}`
                    : `${formatIdr(computedIdr)} ≈ ${formatUsd(computedUsd)}`}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                {t.txModal.date}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#14100e]"
              />
            </div>

            {type !== "transfer" ? (
              <div>
                <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                  {t.txModal.category}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#14100e]"
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
                <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                  {t.txModal.fee}
                </label>
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={feeInput}
                    onChange={(e) => setFeeInput(e.target.value)}
                    className="font-mono-num w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#14100e]"
                  />
                  <button
                    type="button"
                    onClick={() => setFeeInput("2500")}
                    className="gallery-btn shrink-0 px-2.5 py-2 font-mono text-[10px]"
                    title="BI-FAST Rp 2.500"
                  >
                    2.5k
                  </button>
                </div>
              </div>
            )}
          </div>

          {type === "transfer" ? (
            <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_auto_1fr]">
              <div>
                <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                  {t.txModal.wallet}
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="mt-1 w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#14100e]"
                >
                  {activeWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="hidden pb-2.5 text-[#5f5368] sm:block">
                <ArrowRight className="h-4 w-4" />
              </div>
              <div>
                <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                  {t.txModal.toWallet}
                </label>
                <select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className="mt-1 w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#14100e]"
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
                <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                  {t.txModal.wallet}
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="mt-1 w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#14100e]"
                >
                  {activeWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                  {t.txModal.merchant}
                </label>
                <input
                  type="text"
                  placeholder={t.txModal.merchantPlaceholder}
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="mt-1 w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#14100e]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
              {t.txModal.note}
            </label>
            <input
              type="text"
              placeholder={t.txModal.notePlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#14100e]"
            />
          </div>

          {error && (
            <p className="border border-[#b42e69]/30 bg-[#b42e69]/8 px-3 py-2 text-xs text-[#b42e69]">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeTxModal}
              className="gallery-btn px-4 py-2 text-xs"
            >
              {t.actions.cancel}
            </button>
            <button type="submit" className="gallery-btn-solid px-5 py-2 text-xs">
              {t.actions.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
