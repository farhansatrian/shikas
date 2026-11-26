import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Calendar, HandCoins, Star, X } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import type { ReimbursementInfo, TransactionType } from "../../types/cashflow";
import { formatIdr, todayIsoDate } from "../../utils/format";
import { getReimbursedTotalIdr } from "../../utils/reimburse";
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

const FEE_PRESETS = [0, 1_000, 2_500, 6_500];

export const TransactionModal: React.FC = () => {
  const {
    store,
    isTxModalOpen,
    isCategoriesModalOpen,
    editingTx,
    defaultTxType,
    closeTxModal,
    openPocketsModal,
    openCategoriesModal,
    openReimburseModal,
    saveTransaction,
    t,
    locale,
  } = useCashflow();

  const accounts = store.accounts;
  const defaultAccountId = useMemo(
    () => accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? "",
    [accounts]
  );

  const pickDefaultToAccount = (fromId: string): string => {
    const savingsTarget = accounts.find(
      (a) => a.id !== fromId && a.role === "savings"
    );
    if (savingsTarget) return savingsTarget.id;
    return accounts.find((a) => a.id !== fromId)?.id ?? "";
  };

  const [type, setType] = useState<TransactionType>("expense");
  const [rawDigits, setRawDigits] = useState("");
  const [feeDigits, setFeeDigits] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [categoryId, setCategoryId] = useState("food");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [isReimburse, setIsReimburse] = useState(false);
  const [reimburseFrom, setReimburseFrom] = useState("");
  const [reimburseTargetDigits, setReimburseTargetDigits] = useState("");
  const [error, setError] = useState<string | null>(null);

  const alreadyReimbursedIdr = useMemo(
    () => (editingTx ? getReimbursedTotalIdr(editingTx) : 0),
    [editingTx]
  );
  const hasRecordedRepayments =
    editingTx?.type === "expense" &&
    Boolean(editingTx.reimburse && editingTx.reimburse.entries.length > 0);

  useEffect(() => {
    if (!isTxModalOpen) return;
    setError(null);
    if (editingTx) {
      const validFromId =
        editingTx.accountId && accounts.some((a) => a.id === editingTx.accountId)
          ? editingTx.accountId
          : editingTx.type === "transfer"
            ? defaultAccountId
            : "";
      const validToId =
        editingTx.toAccountId &&
        accounts.some((a) => a.id === editingTx.toAccountId)
          ? editingTx.toAccountId
          : pickDefaultToAccount(validFromId || defaultAccountId);

      setType(editingTx.type);
      setRawDigits(String(editingTx.amountIdr));
      setFeeDigits(editingTx.feeIdr ? String(editingTx.feeIdr) : "");
      setDate(editingTx.date);
      setCategoryId(editingTx.categoryId);
      setAccountId(validFromId);
      setToAccountId(validToId);
      setMerchant(editingTx.merchant ?? "");
      setNote(editingTx.note);
      setIsReimburse(editingTx.type === "expense" && Boolean(editingTx.reimburse));
      setReimburseFrom(editingTx.reimburse?.from ?? "");
      setReimburseTargetDigits(
        editingTx.reimburse?.expectedIdr
          ? String(editingTx.reimburse.expectedIdr)
          : ""
      );
    } else {
      setType(defaultTxType);
      setRawDigits("");
      setFeeDigits("");
      setDate(todayIsoDate());
      const firstIncomeCat =
        store.categories.find((c) => c.type === "income")?.id ?? "other_income";
      const firstExpenseCat =
        store.categories.find((c) => c.type === "expense")?.id ?? "other_expense";
      setCategoryId(
        defaultTxType === "income"
          ? firstIncomeCat
          : defaultTxType === "transfer"
            ? "transfer"
            : firstExpenseCat
      );
      setAccountId(defaultAccountId);
      setToAccountId(pickDefaultToAccount(defaultAccountId));
      setMerchant("");
      setNote("");
      setIsReimburse(false);
      setReimburseFrom("");
      setReimburseTargetDigits("");
    }
  }, [isTxModalOpen, editingTx, defaultTxType, defaultAccountId]);

  // Close cleanly on Escape key (only when ManageCategoriesModal is not open on top)
  useEffect(() => {
    if (!isTxModalOpen || isCategoriesModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTxModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isTxModalOpen, isCategoriesModalOpen, closeTxModal]);

  const filteredCategories = useMemo(
    () => store.categories.filter((c) => c.type === type),
    [store.categories, type]
  );

  useEffect(() => {
    if (type === "transfer") {
      setCategoryId("transfer");
      if (!accountId && defaultAccountId) setAccountId(defaultAccountId);
      if (
        accounts.length >= 2 &&
        (!toAccountId || toAccountId === (accountId || defaultAccountId))
      ) {
        setToAccountId(pickDefaultToAccount(accountId || defaultAccountId));
      }
      return;
    }
    if (!filteredCategories.some((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0]?.id ?? "other_expense");
    }
  }, [filteredCategories, categoryId, type, accounts.length]);

  if (!isTxModalOpen) return null;

  const parsedAmount = Number(rawDigits) || 0;
  const parsedFee = type === "transfer" ? Number(feeDigits) || 0 : 0;
  const formattedAmount = formatDigitsWithDots(rawDigits);
  const today = todayIsoDate();
  const yesterday = getOffsetIsoDate(-1);

  const isIncome = type === "income";
  const isTransfer = type === "transfer";

  const fromAcc = accounts.find((a) => a.id === accountId);
  const toAcc = accounts.find((a) => a.id === toAccountId);

  const quickAdds = isIncome
    ? [
        { label: locale === "id" ? "+500rb" : "+500k", val: 500_000 },
        { label: locale === "id" ? "+1jt" : "+1M", val: 1_000_000 },
        { label: locale === "id" ? "+5jt" : "+5M", val: 5_000_000 },
        { label: locale === "id" ? "+10jt" : "+10M", val: 10_000_000 },
      ]
    : isTransfer
      ? [
          { label: locale === "id" ? "+100rb" : "+100k", val: 100_000 },
          { label: locale === "id" ? "+500rb" : "+500k", val: 500_000 },
          { label: locale === "id" ? "+1jt" : "+1M", val: 1_000_000 },
          { label: locale === "id" ? "+5jt" : "+5M", val: 5_000_000 },
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

  const handleSelectFromPocket = (nextFrom: string) => {
    if (nextFrom === toAccountId) {
      setToAccountId(accountId);
    }
    setAccountId(nextFrom);
    if (error) setError(null);
  };

  const handleSelectToPocket = (nextTo: string) => {
    if (nextTo === accountId) {
      setAccountId(toAccountId);
    }
    setToAccountId(nextTo);
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      setError(t.txModal.invalidAmountError);
      return;
    }

    if (isTransfer) {
      if (!accountId || !toAccountId) {
        setError(t.txModal.missingPocketError);
        return;
      }
      if (accountId === toAccountId) {
        setError(t.txModal.samePocketError);
        return;
      }

      const fallbackNote =
        fromAcc && toAcc
          ? `Transfer ${fromAcc.name} → ${toAcc.name}`
          : "Transfer";

      saveTransaction(
        {
          type: "transfer",
          date,
          amountIdr: parsedAmount,
          categoryId: "transfer",
          accountId,
          toAccountId,
          feeIdr: parsedFee > 0 ? parsedFee : undefined,
          note: note.trim() || fallbackNote,
        },
        editingTx?.id
      );
      closeTxModal();
      return;
    }

    if (type === "expense" && hasRecordedRepayments && parsedAmount < alreadyReimbursedIdr) {
      setError(
        `${t.reimburse.amountBelowReimbursed} (${formatIdr(alreadyReimbursedIdr)})`
      );
      return;
    }

    let nextReimburse: ReimbursementInfo | undefined;
    if (type === "expense" && isReimburse) {
      const parsedTarget = Number(reimburseTargetDigits) || 0;
      const existingReimburse =
        editingTx?.type === "expense" ? editingTx.reimburse : undefined;
      nextReimburse = {
        status: existingReimburse?.status ?? "pending",
        ...(parsedTarget > 0
          ? { expectedIdr: Math.min(parsedAmount, parsedTarget) }
          : {}),
        ...(reimburseFrom.trim()
          ? { from: reimburseFrom.trim().slice(0, 80) }
          : {}),
        ...(existingReimburse?.settledAt
          ? { settledAt: existingReimburse.settledAt }
          : {}),
        entries: existingReimburse?.entries ?? [],
      };
    }

    saveTransaction(
      {
        type,
        date,
        amountIdr: parsedAmount,
        categoryId,
        accountId: accounts.length > 0 && accountId ? accountId : undefined,
        merchant: merchant.trim() || undefined,
        reimburse: nextReimburse,
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#14100e]/45 p-4 backdrop-blur-xs"
      onClick={closeTxModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="vn-dialogue animate-modal-in my-auto flex max-h-[92vh] w-full max-w-[540px] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Vivid SHIZUKU Watercolor Band Title Bar */}
        <div className="shikas-band-strip flex shrink-0 items-center justify-between px-4 py-2.5 text-white">
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

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
        >
          {/* Sharp 3-Mode RPG Command Toggle: EXPENSE | INCOME | TRANSFER */}
          <div className="grid grid-cols-3 border border-[#745bc7]">
            <button
              type="button"
              onClick={() => {
                setType("expense");
                setError(null);
              }}
              className={`border-r border-[#745bc7] py-2.5 font-mono text-[10px] font-bold tracking-[0.1em] uppercase transition sm:text-[11px] sm:tracking-[0.12em] ${
                type === "expense"
                  ? "bg-[#d749d5]/16 text-[#c837a5]"
                  : "bg-white/60 text-[#5d5370] hover:bg-[#e5dcfb]/40 hover:text-[#14100e]"
              }`}
            >
              {type === "expense" ? "▶ " : ""}- {t.cashflow.expense}
            </button>
            <button
              type="button"
              disabled={hasRecordedRepayments}
              onClick={() => {
                setType("income");
                setError(null);
              }}
              className={`border-r border-[#745bc7] py-2.5 font-mono text-[10px] font-bold tracking-[0.1em] uppercase transition disabled:cursor-not-allowed disabled:opacity-45 sm:text-[11px] sm:tracking-[0.12em] ${
                isIncome
                  ? "bg-[#2276a8]/15 text-[#2276a8]"
                  : "bg-white/60 text-[#5d5370] hover:bg-[#e5dcfb]/40 hover:text-[#14100e]"
              }`}
            >
              {isIncome ? "▶ " : ""}+ {t.cashflow.income}
            </button>
            <button
              type="button"
              disabled={hasRecordedRepayments}
              onClick={() => {
                setType("transfer");
                setError(null);
              }}
              className={`py-2.5 font-mono text-[10px] font-bold tracking-[0.1em] uppercase transition disabled:cursor-not-allowed disabled:opacity-45 sm:text-[11px] sm:tracking-[0.12em] ${
                isTransfer
                  ? "bg-[#745bc7]/16 text-[#745bc7]"
                  : "bg-white/60 text-[#5d5370] hover:bg-[#e5dcfb]/40 hover:text-[#14100e]"
              }`}
            >
              {isTransfer ? "▶ " : ""}⇄ {t.cashflow.transfer}
            </button>
          </div>

          {/* Transfer guard when < 2 pockets */}
          {isTransfer && accounts.length < 2 ? (
            <div className="border border-[#745bc7]/45 bg-[#f7f3fe] p-4 text-center">
              <p className="font-mono text-xs text-[#4e4361]">
                {t.pockets.needTwoError}
              </p>
              <button
                type="button"
                onClick={() => {
                  closeTxModal();
                  openPocketsModal();
                }}
                className="vn-btn-band mt-3 px-4 py-2"
              >
                ▶ {t.pockets.setupCta}
              </button>
            </div>
          ) : (
            <>
              {/* Sharp Monospace IDR Amount Chamber + Additive Chips */}
              <div className="border border-[#745bc7]/45 bg-white/80 px-4 py-3.5 text-center transition focus-within:border-[#745bc7] focus-within:bg-white">
                <label className="block font-mono text-[10px] font-semibold tracking-[0.18em] text-[#5d5370] uppercase">
                  {t.txModal.amount}
                </label>
                <div className="mt-1.5 flex items-baseline justify-center gap-1.5">
                  <span
                    className={`font-mono-num text-xl font-bold ${
                      isIncome
                        ? "text-[#2276a8]"
                        : isTransfer
                          ? "text-[#745bc7]"
                          : "text-[#c837a5]"
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

                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
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

              {/* TRANSFER: From Pocket -> To Pocket + Optional Admin Fee */}
              {isTransfer ? (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* FROM POCKET */}
                    <div>
                      <span className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                        {t.txModal.fromPocket}
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {accounts.map((acc) => {
                          const selected = accountId === acc.id;
                          return (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => handleSelectFromPocket(acc.id)}
                              className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[11px] transition ${
                                selected
                                  ? "border-[#745bc7] bg-[#745bc7] font-bold text-white"
                                  : "border-[#745bc7]/30 bg-white text-[#14100e] hover:border-[#745bc7]"
                              }`}
                            >
                              <span
                                className="h-2 w-2 shrink-0"
                                style={{
                                  backgroundColor: selected
                                    ? "#ffffff"
                                    : acc.color,
                                }}
                              />
                              <span>{acc.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* TO POCKET */}
                    <div>
                      <span className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                        {t.txModal.toPocket}
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {accounts.map((acc) => {
                          const selected = toAccountId === acc.id;
                          return (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => handleSelectToPocket(acc.id)}
                              className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[11px] transition ${
                                selected
                                  ? "border-[#745bc7] bg-[#745bc7] font-bold text-white"
                                  : "border-[#745bc7]/30 bg-white text-[#14100e] hover:border-[#745bc7]"
                              }`}
                            >
                              <span
                                className="h-2 w-2 shrink-0"
                                style={{
                                  backgroundColor: selected
                                    ? "#ffffff"
                                    : acc.color,
                                }}
                              />
                              <span>{acc.name}</span>
                              {acc.role === "savings" && (
                                <span
                                  className={`text-[8.5px] uppercase ${
                                    selected
                                      ? "text-white/85"
                                      : "text-[#745bc7]"
                                  }`}
                                >
                                  ({t.pockets.savingsLabel})
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Optional Admin Fee Row */}
                  <div className="border border-[#745bc7]/30 bg-[#faf7ff] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[#5d5370] uppercase">
                        {t.txModal.adminFee}
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {FEE_PRESETS.map((presetFee) => {
                          const active = parsedFee === presetFee;
                          return (
                            <button
                              key={presetFee}
                              type="button"
                              onClick={() =>
                                setFeeDigits(
                                  presetFee === 0 ? "" : String(presetFee)
                                )
                              }
                              className={`border px-2 py-0.5 font-mono text-[10px] font-semibold transition ${
                                active
                                  ? "border-[#745bc7] bg-[#745bc7] text-white"
                                  : "border-[#745bc7]/30 bg-white text-[#5d5370] hover:border-[#745bc7] hover:text-[#14100e]"
                              }`}
                            >
                              {presetFee === 0
                                ? locale === "id"
                                  ? "Gratis"
                                  : "Free"
                                : formatIdr(presetFee)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 border border-[#745bc7]/35 bg-white px-2.5 py-1.5 focus-within:border-[#745bc7]">
                      <span className="font-mono-num text-xs font-bold text-[#5d5370]">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatDigitsWithDots(feeDigits)}
                        onChange={(e) =>
                          setFeeDigits(
                            e.target.value.replace(/\D/g, "").slice(0, 9)
                          )
                        }
                        className="font-mono-num w-full bg-transparent text-xs font-bold text-[#14100e] outline-none placeholder:text-[#5d5370]/45"
                      />
                    </div>

                    {fromAcc && toAcc && parsedAmount > 0 && (
                      <p className="mt-2 flex flex-wrap items-center gap-1 font-mono text-[10px] text-[#4e4361]">
                        <span className="font-semibold text-[#14100e]">
                          {fromAcc.name}
                        </span>
                        <span className="text-[#c837a5]">
                          -{formatIdr(parsedAmount + parsedFee)}
                        </span>
                        <ArrowRight className="h-3 w-3 text-[#745bc7]" />
                        <span className="font-semibold text-[#14100e]">
                          {toAcc.name}
                        </span>
                        <span className="text-[#2276a8]">
                          +{formatIdr(parsedAmount)}
                        </span>
                        {parsedFee > 0 && (
                          <span className="text-[#5d5370]">
                            ({formatIdr(parsedFee)}{" "}
                            {locale === "id"
                              ? "masuk Admin Bank"
                              : "in Bank & Admin"}
                            )
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* 1-Tap Pocket Selector for Income / Expense (when pockets exist) */}
                  {accounts.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                          {t.txModal.pocket}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            closeTxModal();
                            openPocketsModal();
                          }}
                          className="font-mono text-[9.5px] font-semibold tracking-[0.1em] text-[#745bc7] uppercase hover:underline"
                        >
                          {t.actions.managePockets}
                        </button>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {accounts.map((acc) => {
                          const selected = accountId === acc.id;
                          return (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => setAccountId(acc.id)}
                              className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[11px] transition ${
                                selected
                                  ? "border-[#745bc7] bg-[#e5dcfb]/80 font-bold text-[#14100e]"
                                  : "border-[#745bc7]/28 bg-white/80 text-[#5d5370] hover:border-[#745bc7] hover:text-[#14100e]"
                              }`}
                            >
                              <span
                                className="h-2 w-2 shrink-0"
                                style={{ backgroundColor: acc.color }}
                              />
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

                  {/* Sharp RPG Category Grid */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                        {t.txModal.category}
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          openCategoriesModal(isIncome ? "income" : "expense")
                        }
                        className="font-mono text-[9.5px] font-semibold tracking-[0.1em] text-[#745bc7] uppercase hover:underline"
                      >
                        {t.actions.manageCategories}
                      </button>
                    </div>
                    <div
                      className={`mt-2 grid gap-1.5 ${
                        filteredCategories.length <= 2
                          ? "grid-cols-2"
                          : "grid-cols-2 sm:grid-cols-3"
                      }`}
                    >
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
                                backgroundColor: selected
                                  ? c.color
                                  : "transparent",
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

                  {/* Expense-Only Flexible Reimburse / Split-Bill Toggle */}
                  {type === "expense" && (
                    <div
                      className={`border p-3 transition ${
                        isReimburse
                          ? "border-[#745bc7] bg-[#f7f3fe]"
                          : "border-[#745bc7]/30 bg-white/75"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (hasRecordedRepayments) {
                            setError(t.reimburse.lockedHint);
                            return;
                          }
                          setIsReimburse((v) => !v);
                          if (error) setError(null);
                        }}
                        className="flex w-full items-center justify-between gap-2 text-left"
                      >
                        <span className="flex items-center gap-2 font-mono text-[10.5px] font-bold tracking-[0.1em] text-[#14100e] uppercase">
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center border font-mono text-[10px] ${
                              isReimburse
                                ? "border-[#745bc7] bg-[#745bc7] text-white"
                                : "border-[#745bc7]/55 bg-white text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <HandCoins className="h-3.5 w-3.5 shrink-0 text-[#745bc7]" />
                          <span>{t.reimburse.toggleLabel}</span>
                        </span>

                        <span
                          className={`shrink-0 border px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-[0.12em] uppercase ${
                            isReimburse
                              ? "border-[#745bc7] bg-[#745bc7] text-white"
                              : "border-[#745bc7]/35 text-[#5d5370]"
                          }`}
                        >
                          {isReimburse ? "ON" : "OFF"}
                        </span>
                      </button>

                      {isReimburse && (
                        <div className="mt-3 space-y-3 border-t border-[#745bc7]/20 pt-3">
                          <p className="font-mono text-[10px] leading-relaxed text-[#4e4361]">
                            {t.reimburse.toggleHint}
                          </p>

                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            <div>
                              <label className="block font-mono text-[9.5px] font-semibold tracking-[0.14em] text-[#5d5370] uppercase">
                                {t.reimburse.fromLabel}
                              </label>
                              <input
                                type="text"
                                placeholder={t.reimburse.fromPlaceholder}
                                value={reimburseFrom}
                                onChange={(e) => setReimburseFrom(e.target.value)}
                                className="mt-1 w-full border border-[#745bc7]/35 bg-white px-2.5 py-1.5 text-xs text-[#14100e] outline-none placeholder:text-[#5d5370]/65 focus:border-[#745bc7]"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <label className="truncate font-mono text-[9.5px] font-semibold tracking-[0.12em] text-[#5d5370] uppercase">
                                  {locale === "id"
                                    ? "Target (Opsional)"
                                    : "Target (Optional)"}
                                </label>
                                <div className="flex shrink-0 gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setReimburseTargetDigits("")}
                                    className={`border px-1.5 py-0.5 font-mono text-[9px] font-semibold transition ${
                                      !reimburseTargetDigits
                                        ? "border-[#745bc7] bg-[#745bc7] text-white"
                                        : "border-[#745bc7]/30 bg-white text-[#5d5370] hover:border-[#745bc7]"
                                    }`}
                                  >
                                    {t.reimburse.flexibleChip}
                                  </button>
                                  {parsedAmount > 0 && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setReimburseTargetDigits(
                                            String(Math.round(parsedAmount / 2))
                                          )
                                        }
                                        className={`border px-1.5 py-0.5 font-mono text-[9px] font-semibold transition ${
                                          Number(reimburseTargetDigits) ===
                                          Math.round(parsedAmount / 2)
                                            ? "border-[#745bc7] bg-[#745bc7] text-white"
                                            : "border-[#745bc7]/30 bg-white text-[#5d5370] hover:border-[#745bc7]"
                                        }`}
                                      >
                                        50%
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setReimburseTargetDigits(
                                            String(parsedAmount)
                                          )
                                        }
                                        className={`border px-1.5 py-0.5 font-mono text-[9px] font-semibold transition ${
                                          Number(reimburseTargetDigits) ===
                                          parsedAmount
                                            ? "border-[#745bc7] bg-[#745bc7] text-white"
                                            : "border-[#745bc7]/30 bg-white text-[#5d5370] hover:border-[#745bc7]"
                                        }`}
                                      >
                                        100%
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="mt-1 flex items-center gap-1.5 border border-[#745bc7]/35 bg-white px-2.5 py-1.5 focus-within:border-[#745bc7]">
                                <span className="font-mono-num text-xs font-bold text-[#5d5370]">
                                  Rp
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder={t.reimburse.flexibleChip}
                                  value={formatDigitsWithDots(reimburseTargetDigits)}
                                  onChange={(e) =>
                                    setReimburseTargetDigits(
                                      e.target.value.replace(/\D/g, "").slice(0, 12)
                                    )
                                  }
                                  className="font-mono-num w-full bg-transparent text-xs font-bold text-[#14100e] outline-none placeholder:font-normal placeholder:text-[#745bc7]/70"
                                />
                              </div>
                            </div>
                          </div>

                          {hasRecordedRepayments && editingTx && (
                            <div className="flex flex-wrap items-center justify-between gap-2 border border-[#1f8f6b]/40 bg-white px-2.5 py-2 font-mono text-[10px]">
                              <span className="text-[#1f8f6b]">
                                {locale === "id"
                                  ? `Sudah diterima ${formatIdr(alreadyReimbursedIdr)}`
                                  : `Already reimbursed ${formatIdr(alreadyReimbursedIdr)}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const id = editingTx.id;
                                  closeTxModal();
                                  openReimburseModal(id);
                                }}
                                className="font-bold text-[#745bc7] underline"
                              >
                                {locale === "id"
                                  ? "Kelola pembayaran →"
                                  : "Manage repayments →"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

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
              <div
                className={`grid grid-cols-1 gap-3 ${
                  isTransfer ? "" : "sm:grid-cols-2"
                }`}
              >
                <div>
                  <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                    {t.txModal.note}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      isTransfer && fromAcc && toAcc
                        ? `Transfer ${fromAcc.name} → ${toAcc.name}`
                        : t.txModal.notePlaceholder
                    }
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1.5 w-full border border-[#745bc7]/35 bg-white/80 px-3 py-2 text-xs text-[#14100e] outline-none transition placeholder:text-[#5d5370]/65 focus:border-[#745bc7] focus:bg-white"
                  />
                </div>

                {!isTransfer && (
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
                )}
              </div>

              {error && (
                <p className="border border-[#c837a5] bg-[#d749d5]/10 px-3 py-2 font-mono text-[11px] font-semibold text-[#c837a5]">
                  ! {error}
                </p>
              )}

              {/* Footer Command Buttons (sticky inside modal so always visible on short screens) */}
              <div className="sticky -bottom-4 -mx-4 flex items-center justify-end gap-2.5 border-t border-[#745bc7]/20 bg-[#fdf9ff]/95 px-4 py-3 backdrop-blur-xs sm:-bottom-6 sm:-mx-6 sm:px-6 sm:py-4">
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
                      : isTransfer
                        ? "border-[#5d46ad] bg-[#745bc7]"
                        : "vn-btn-band border-[#745bc7]"
                  }`}
                >
                  <span>▶</span>
                  <span>
                    {editingTx
                      ? t.actions.save
                      : isIncome
                        ? t.actions.addIncome
                        : isTransfer
                          ? t.actions.transfer
                          : t.actions.addExpense}
                  </span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
