import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { CATEGORIES } from "../../data/categories";
import type { TransactionType } from "../../types/cashflow";
import { todayIsoDate } from "../../utils/format";

export const TransactionModal: React.FC = () => {
  const {
    isTxModalOpen,
    editingTx,
    defaultTxType,
    closeTxModal,
    saveTransaction,
    t,
    locale,
  } = useCashflow();

  const [type, setType] = useState<TransactionType>("expense");
  const [amountInput, setAmountInput] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [categoryId, setCategoryId] = useState("food");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTxModalOpen) return;
    setError(null);
    if (editingTx) {
      setType(editingTx.type);
      setAmountInput(String(editingTx.amountIdr));
      setDate(editingTx.date);
      setCategoryId(editingTx.categoryId);
      setMerchant(editingTx.merchant ?? "");
      setNote(editingTx.note);
    } else {
      setType(defaultTxType);
      setAmountInput("");
      setDate(todayIsoDate());
      setCategoryId(defaultTxType === "income" ? "salary" : "food");
      setMerchant("");
      setNote("");
    }
  }, [isTxModalOpen, editingTx, defaultTxType]);

  const filteredCategories = useMemo(
    () => CATEGORIES.filter((c) => c.type === type),
    [type]
  );

  useEffect(() => {
    if (!filteredCategories.some((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0]?.id ?? "other_expense");
    }
  }, [filteredCategories, categoryId]);

  if (!isTxModalOpen) return null;

  const parsedAmount = Math.round(Number(amountInput) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      setError(t.txModal.invalidAmountError);
      return;
    }

    saveTransaction(
      {
        type,
        date,
        amountIdr: parsedAmount,
        categoryId,
        merchant: merchant.trim() || undefined,
        note:
          note.trim() ||
          filteredCategories.find((c) => c.id === categoryId)?.[
            locale === "id" ? "nameId" : "nameEn"
          ] ||
          "Entry",
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
        className="my-auto w-full max-w-md border border-[#14100e]/25 bg-[#fdfbfd] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#14100e]/12 pb-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-[#5f5368] uppercase">
              SHIKAS CASHFLOW
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
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((item) => {
              const active = type === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setType(item)}
                  className={`border py-2 font-nav text-xs tracking-[0.14em] uppercase transition ${
                    active
                      ? item === "income"
                        ? "border-[#117a62] bg-[#117a62] text-white"
                        : "border-[#14100e] bg-[#14100e] text-white"
                      : "border-[#14100e]/20 bg-white text-[#5f5368] hover:text-[#14100e]"
                  }`}
                >
                  {t.cashflow[item]}
                </button>
              );
            })}
          </div>

          <div>
            <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
              {t.txModal.amount}
            </label>
            <div className="mt-1.5 flex items-center border border-[#14100e]/25 bg-white px-3.5 py-2.5 focus-within:border-[#14100e]">
              <span className="font-mono-num mr-2 text-sm font-semibold text-[#5f5368]">Rp</span>
              <input
                type="number"
                inputMode="numeric"
                step="1000"
                min="0"
                required
                placeholder="150000"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="font-mono-num w-full bg-transparent text-lg font-semibold text-[#14100e] outline-none"
              />
            </div>
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
          </div>

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
