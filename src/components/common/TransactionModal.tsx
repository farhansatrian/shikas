import React, { useEffect, useMemo, useState } from "react";
import { Calendar, X } from "lucide-react";
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#14100e]/45 p-4 backdrop-blur-xs"
      onClick={closeTxModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="vn-dialogue animate-modal-in my-auto w-full max-w-[530px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Vivid SHIZUKU Watercolor Band Title Bar */}
        <div className="shikas-band-strip flex items-center justify-between px-4 py-2.5 text-white">
          <span className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
            {editingTx ? t.txModal.editTitle : t.txModal.newTitle} // IDR
          </span>
          <button
            type="button"
            onClick={closeTxModal}
            aria-label={t.actions.close}
            className="inline-flex items-center gap-1 border border-white/45 bg-white/15 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-white uppercase transition hover:bg-white/30"
          >
            <span>ESC</span>
            <X className="h-3 w-3" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
          {/* Sharp RPG Command Mode Toggle: EXPENSE vs INCOME */}
          <div className="grid grid-cols-2 border border-[#745bc7]">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`border-r border-[#745bc7] py-2.5 font-mono text-[11px] font-bold tracking-[0.14em] uppercase transition ${
                !isIncome
                  ? "bg-[#d749d5]/16 text-[#c837a5]"
                  : "bg-white/60 text-[#5d5370] hover:bg-[#e5dcfb]/40 hover:text-[#14100e]"
              }`}
            >
              {!isIncome ? `▶ - ${t.cashflow.expense}` : `- ${t.cashflow.expense}`}
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`py-2.5 font-mono text-[11px] font-bold tracking-[0.14em] uppercase transition ${
                isIncome
                  ? "bg-[#2276a8]/15 text-[#2276a8]"
                  : "bg-white/60 text-[#5d5370] hover:bg-[#e5dcfb]/40 hover:text-[#14100e]"
              }`}
            >
              {isIncome ? `▶ + ${t.cashflow.income}` : `+ ${t.cashflow.income}`}
            </button>
          </div>

          {/* Sharp Monospace IDR Amount Chamber + Additive Chips */}
          <div className="border border-[#745bc7]/45 bg-white/80 px-4 py-4 text-center transition focus-within:border-[#745bc7] focus-within:bg-white">
            <label className="block font-mono text-[10px] font-semibold tracking-[0.18em] text-[#5d5370] uppercase">
              {t.txModal.amount}
            </label>
            <div className="mt-1.5 flex items-baseline justify-center gap-1.5">
              <span
                className={`font-mono-num text-xl font-bold ${
                  isIncome ? "text-[#2276a8]" : "text-[#c837a5]"
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
                className="font-mono-num w-full max-w-[200px] bg-transparent text-left text-3xl font-bold tracking-tight text-[#14100e] outline-none placeholder:text-[#5d5370]/35"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {quickAdds.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => addQuickAmount(chip.val)}
                  className="border border-[#745bc7]/40 bg-[#f5effe]/75 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#14100e] transition hover:border-[#745bc7] hover:bg-[#745bc7] hover:text-white"
                >
                  {chip.label}
                </button>
              ))}
              {parsedAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setRawDigits("")}
                  className="border border-[#c837a5]/45 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#c837a5] transition hover:bg-[#c837a5] hover:text-white"
                >
                  {locale === "id" ? "RESET" : "CLEAR"}
                </button>
              )}
            </div>
          </div>

          {/* Sharp RPG Category Grid */}
          <div>
            <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
              {t.txModal.category}
            </label>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {filteredCategories.map((c) => {
                const selected = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={`flex items-center gap-2 border px-2.5 py-2 text-left font-mono text-[11px] transition ${
                      selected
                        ? "border-[#745bc7] bg-[#e5dcfb]/70 font-bold text-[#14100e]"
                        : "border-[#745bc7]/25 bg-white/70 text-[#5d5370] hover:border-[#745bc7]/70 hover:bg-white hover:text-[#14100e]"
                    }`}
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center border"
                      style={{
                        borderColor: selected ? c.color : `${c.color}55`,
                        backgroundColor: selected ? c.color : "transparent",
                        color: selected ? "#ffffff" : c.color,
                      }}
                    >
                      <CategoryIcon name={c.icon} className="h-3 w-3" />
                    </span>
                    <span className="truncate">
                      {locale === "id" ? c.nameId : c.nameEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Shortcuts + Input */}
          <div>
            <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
              {t.txModal.date}
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDate(today)}
                className={`border px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase transition ${
                  date === today
                    ? "border-[#745bc7] bg-[#745bc7] text-white"
                    : "border-[#745bc7]/35 bg-white/75 text-[#5d5370] hover:border-[#745bc7] hover:text-[#14100e]"
                }`}
              >
                {locale === "id" ? "HARI INI" : "TODAY"}
              </button>
              <button
                type="button"
                onClick={() => setDate(yesterday)}
                className={`border px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase transition ${
                  date === yesterday
                    ? "border-[#745bc7] bg-[#745bc7] text-white"
                    : "border-[#745bc7]/35 bg-white/75 text-[#5d5370] hover:border-[#745bc7] hover:text-[#14100e]"
                }`}
              >
                {locale === "id" ? "KEMARIN" : "YESTERDAY"}
              </button>
              <div className="flex flex-1 items-center gap-1.5 border border-[#745bc7]/35 bg-white/80 px-3 py-1.5 focus-within:border-[#745bc7] focus-within:bg-white">
                <Calendar className="h-3.5 w-3.5 text-[#745bc7]" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent font-mono text-[11px] text-[#14100e] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Note & Merchant */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                {t.txModal.note}
              </label>
              <input
                type="text"
                placeholder={t.txModal.notePlaceholder}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5 w-full border border-[#745bc7]/35 bg-white/80 px-3 py-2 text-xs text-[#14100e] outline-none transition placeholder:text-[#5d5370]/65 focus:border-[#745bc7] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                {t.txModal.merchant}
              </label>
              <input
                type="text"
                placeholder={t.txModal.merchantPlaceholder}
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="mt-1.5 w-full border border-[#745bc7]/35 bg-white/80 px-3 py-2 text-xs text-[#14100e] outline-none transition placeholder:text-[#5d5370]/65 focus:border-[#745bc7] focus:bg-white"
              />
            </div>
          </div>

          {error && (
            <p className="border border-[#c837a5] bg-[#d749d5]/10 px-3 py-2 font-mono text-[11px] font-semibold text-[#c837a5]">
              ! {error}
            </p>
          )}

          {/* Footer Command Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-[#745bc7]/20 pt-4">
            <button
              type="button"
              onClick={closeTxModal}
              className="vn-btn-action px-4 py-2"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              className={`inline-flex items-center justify-center gap-1.5 border-[1.5px] px-5 py-2 font-mono text-[11px] font-bold tracking-[0.14em] text-white uppercase shadow-[3px_3px_0_0_rgba(116,91,199,0.28)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 ${
                isIncome
                  ? "border-[#1b5f89] bg-[#2276a8]"
                  : "vn-btn-band border-[#745bc7]"
              }`}
            >
              <span>▶</span>
              <span>
                {editingTx
                  ? t.actions.save
                  : isIncome
                    ? t.actions.addIncome
                    : t.actions.addExpense}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
