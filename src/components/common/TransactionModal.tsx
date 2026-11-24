import React, { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Calendar, X } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import { CATEGORIES } from "../../data/categories";
import type { TransactionType } from "../../types/cashflow";
import { todayIsoDate } from "../../utils/format";
import { CategoryIcon } from "./CategoryIcon";

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
  const [rawDigits, setRawDigits] = useState("");
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
      setRawDigits(String(editingTx.amountIdr));
      setDate(editingTx.date);
      setCategoryId(editingTx.categoryId);
      setMerchant(editingTx.merchant ?? "");
      setNote(editingTx.note);
    } else {
      setType(defaultTxType);
      setRawDigits("");
      setDate(todayIsoDate());
      setCategoryId(defaultTxType === "income" ? "salary" : "food");
      setMerchant("");
      setNote("");
    }
  }, [isTxModalOpen, editingTx, defaultTxType]);

  // Close cleanly on Escape key
  useEffect(() => {
    if (!isTxModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTxModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isTxModalOpen, closeTxModal]);

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

  const parsedAmount = Number(rawDigits) || 0;
  const formattedAmount = formatDigitsWithDots(rawDigits);
  const today = todayIsoDate();
  const yesterday = getOffsetIsoDate(-1);

  const quickAdds =
    type === "income"
      ? [
          { label: locale === "id" ? "+500rb" : "+500k", val: 500_000 },
          { label: locale === "id" ? "+1jt" : "+1M", val: 1_000_000 },
          { label: locale === "id" ? "+5jt" : "+5M", val: 5_000_000 },
          { label: locale === "id" ? "+10jt" : "+10M", val: 10_000_000 },
        ]
      : [
          { label: locale === "id" ? "+25rb" : "+25k", val: 25_000 },
          { label: locale === "id" ? "+50rb" : "+50k", val: 50_000 },
          { label: locale === "id" ? "+100rb" : "+100k", val: 100_000 },
          { label: locale === "id" ? "+500rb" : "+500k", val: 500_000 },
        ];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 12);
    setRawDigits(digitsOnly);
    if (error) setError(null);
  };

  const addQuickAmount = (delta: number) => {
    setRawDigits(String(parsedAmount + delta));
    if (error) setError(null);
  };

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

  const isIncome = type === "income";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#1a1423]/45 p-4 backdrop-blur-sm"
      onClick={closeTxModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="animate-modal-in my-auto w-full max-w-[530px] rounded-3xl border border-[#745bc7]/20 bg-white/96 p-6 shadow-[0_30px_80px_-24px_rgba(38,22,74,0.38)] backdrop-blur-xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight text-[#1a1423]">
              {editingTx
                ? locale === "id"
                  ? "Ubah Catatan"
                  : "Edit Entry"
                : locale === "id"
                  ? "Catat Arus Kas"
                  : "Record Cashflow"}
            </h2>
            <p className="text-xs text-[#655978]">
              {locale === "id"
                ? "Pilih tipe, ketik nominal, lalu tap kategori."
                : "Choose type, enter IDR amount, and tap a category."}
            </p>
          </div>
          <button
            type="button"
            onClick={closeTxModal}
            aria-label={t.actions.close}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4effc] text-[#655978] transition hover:bg-[#e9dffb] hover:text-[#1a1423]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Tactile Segmented Pill: Expense vs Income */}
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#f4effc] p-1">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition ${
                !isIncome
                  ? "bg-white text-[#c43673] shadow-xs"
                  : "text-[#655978] hover:text-[#1a1423]"
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              {t.cashflow.expense}
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition ${
                isIncome
                  ? "bg-white text-[#108469] shadow-xs"
                  : "text-[#655978] hover:text-[#1a1423]"
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              {t.cashflow.income}
            </button>
          </div>

          {/* Hero Formatted IDR Amount Input + Quick Additive Chips */}
          <div className="rounded-2xl border border-[#745bc7]/16 bg-[#f9f6fe] px-4 py-4 text-center transition focus-within:border-[#745bc7]/45 focus-within:bg-white">
            <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#655978] uppercase">
              {t.txModal.amount}
            </label>
            <div className="mt-1.5 flex items-baseline justify-center gap-1.5">
              <span
                className={`font-mono-num text-xl font-bold ${
                  isIncome ? "text-[#108469]" : "text-[#745bc7]"
                }`}
              >
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                placeholder="0"
                value={formattedAmount}
                onChange={handleAmountChange}
                className="font-mono-num w-full max-w-[260px] bg-transparent text-center text-3xl font-bold tracking-tight text-[#1a1423] outline-none placeholder:text-[#655978]/35"
              />
            </div>

            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5">
              {quickAdds.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => addQuickAmount(chip.val)}
                  className="rounded-full border border-[#745bc7]/18 bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-[#1a1423] transition hover:border-[#745bc7] hover:text-[#745bc7]"
                >
                  {chip.label}
                </button>
              ))}
              {parsedAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setRawDigits("")}
                  className="rounded-full px-2.5 py-1 font-mono text-[11px] font-medium text-[#655978] transition hover:bg-[#c43673]/10 hover:text-[#c43673]"
                >
                  {locale === "id" ? "Reset" : "Clear"}
                </button>
              )}
            </div>
          </div>

          {/* Visual Tappable Category Chip Grid */}
          <div>
            <label className="block text-xs font-semibold text-[#1a1423]">
              {t.txModal.category}
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filteredCategories.map((c) => {
                const selected = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-medium transition ${
                      selected
                        ? "border-[#745bc7] bg-[#745bc7]/10 text-[#1a1423] shadow-2xs"
                        : "border-[#745bc7]/12 bg-[#f9f6fe]/75 text-[#655978] hover:border-[#745bc7]/35 hover:bg-white hover:text-[#1a1423]"
                    }`}
                  >
                    <span
                      className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: selected ? c.color : `${c.color}18`,
                        color: selected ? "#ffffff" : c.color,
                      }}
                    >
                      <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">
                      {locale === "id" ? c.nameId : c.nameEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Smart Date Shortcuts + Compact Date Input */}
          <div>
            <label className="block text-xs font-semibold text-[#1a1423]">
              {t.txModal.date}
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDate(today)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  date === today
                    ? "bg-[#745bc7] text-white"
                    : "bg-[#f4effc] text-[#655978] hover:text-[#1a1423]"
                }`}
              >
                {locale === "id" ? "Hari ini" : "Today"}
              </button>
              <button
                type="button"
                onClick={() => setDate(yesterday)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  date === yesterday
                    ? "bg-[#745bc7] text-white"
                    : "bg-[#f4effc] text-[#655978] hover:text-[#1a1423]"
                }`}
              >
                {locale === "id" ? "Kemarin" : "Yesterday"}
              </button>
              <div className="flex flex-1 items-center gap-1.5 rounded-full border border-[#745bc7]/16 bg-[#f9f6fe] px-3 py-1.5 focus-within:border-[#745bc7]/45 focus-within:bg-white">
                <Calendar className="h-3.5 w-3.5 text-[#745bc7]" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-[#1a1423] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Note & Merchant side-by-side */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#1a1423]">
                {t.txModal.note}
              </label>
              <input
                type="text"
                placeholder={t.txModal.notePlaceholder}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#745bc7]/14 bg-[#f9f6fe] px-3.5 py-2.5 text-xs text-[#1a1423] outline-none transition placeholder:text-[#655978]/65 focus:border-[#745bc7]/45 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1a1423]">
                {t.txModal.merchant}
              </label>
              <input
                type="text"
                placeholder={t.txModal.merchantPlaceholder}
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#745bc7]/14 bg-[#f9f6fe] px-3.5 py-2.5 text-xs text-[#1a1423] outline-none transition placeholder:text-[#655978]/65 focus:border-[#745bc7]/45 focus:bg-white"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-[#c43673]/10 px-3.5 py-2 text-xs font-medium text-[#c43673]">
              {error}
            </p>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={closeTxModal}
              className="shikas-btn-soft px-4.5 py-2.5 text-xs"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs font-semibold text-white shadow-md transition hover:opacity-95 ${
                isIncome
                  ? "bg-gradient-to-r from-[#108469] to-[#1ca384] shadow-[#108469]/30"
                  : "bg-gradient-to-r from-[#745bc7] via-[#7f5af0] to-[#b557dc] shadow-[#745bc7]/35"
              }`}
            >
              {editingTx
                ? t.actions.save
                : isIncome
                  ? t.actions.addIncome
                  : t.actions.addExpense}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
