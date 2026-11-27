import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Calendar,
  HandCoins,
  PiggyBank,
  Plus,
  Star,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import type {
  ReimbursementInfo,
  ReimbursementPayer,
  ReimburseStatus,
  TransactionType,
} from "../../types/cashflow";
import { formatIdr, todayIsoDate } from "../../utils/format";
import { getReimbursedTotalIdr } from "../../utils/reimburse";
import { CategoryIcon } from "./CategoryIcon";

interface SplitPayerDraft {
  id: string;
  name: string;
  targetDigits: string;
  status: ReimburseStatus;
  settledAt?: string;
}

function makePayerId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pyr-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `pyr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

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
  const [reimburseIncludeFee, setReimburseIncludeFee] = useState(false);
  const [reimburseSplitMode, setReimburseSplitMode] = useState<"single" | "split">("single");
  const [reimburseFrom, setReimburseFrom] = useState("");
  const [reimburseTargetDigits, setReimburseTargetDigits] = useState("");
  const [splitPayers, setSplitPayers] = useState<SplitPayerDraft[]>([]);
  const [splitIncludeMe, setSplitIncludeMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const alreadyReimbursedIdr = useMemo(
    () => (editingTx ? getReimbursedTotalIdr(editingTx) : 0),
    [editingTx]
  );
  const hasRecordedRepayments =
    editingTx?.type === "expense" &&
    Boolean(editingTx.reimburse && editingTx.reimburse.entries.length > 0);
  const lockedPayerIds = useMemo(() => {
    const ids = new Set<string>();
    if (editingTx?.type === "expense" && editingTx.reimburse) {
      for (const e of editingTx.reimburse.entries) {
        if (e.payerId) ids.add(e.payerId);
      }
    }
    return ids;
  }, [editingTx]);

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
      const hasReimb = editingTx.type === "expense" && Boolean(editingTx.reimburse);
      setIsReimburse(hasReimb);
      setReimburseIncludeFee(Boolean(editingTx.reimburse?.includeFee));
      const existingPayers = editingTx.reimburse?.payers ?? [];
      if (hasReimb && existingPayers.length > 0) {
        setReimburseSplitMode("split");
        setSplitPayers(
          existingPayers.map((p) => ({
            id: p.id,
            name: p.name,
            targetDigits: p.expectedIdr ? String(p.expectedIdr) : "",
            status: p.status,
            settledAt: p.settledAt,
          }))
        );
        setReimburseFrom("");
        setReimburseTargetDigits("");
      } else {
        setReimburseSplitMode("single");
        setSplitPayers([]);
        setReimburseFrom(editingTx.reimburse?.from ?? "");
        setReimburseTargetDigits(
          editingTx.reimburse?.expectedIdr
            ? String(editingTx.reimburse.expectedIdr)
            : ""
        );
      }
      setSplitIncludeMe(true);
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
      setReimburseIncludeFee(false);
      setReimburseSplitMode("single");
      setReimburseFrom("");
      setReimburseTargetDigits("");
      setSplitPayers([]);
      setSplitIncludeMe(true);
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
  const parsedFee =
    type === "transfer" || type === "expense" ? Number(feeDigits) || 0 : 0;
  const reimburseBaseIdr =
    parsedAmount + (reimburseIncludeFee && parsedFee > 0 ? parsedFee : 0);
  const formattedAmount = formatDigitsWithDots(rawDigits);
  const today = todayIsoDate();
  const yesterday = getOffsetIsoDate(-1);

  const isIncome = type === "income";
  const isTransfer = type === "transfer";

  const fromAcc = accounts.find((a) => a.id === accountId);
  const toAcc = accounts.find((a) => a.id === toAccountId);

  const switchToSplitMode = () => {
    setReimburseSplitMode("split");
    setSplitPayers((curr) => {
      if (curr.length >= 2) return curr;
      const first: SplitPayerDraft = curr[0] ?? {
        id: makePayerId(),
        name: reimburseFrom.trim(),
        targetDigits: reimburseTargetDigits,
        status: "pending",
      };
      const second: SplitPayerDraft = {
        id: makePayerId(),
        name: "",
        targetDigits: "",
        status: "pending",
      };
      return [first, second];
    });
    if (error) setError(null);
  };

  const switchToSingleMode = () => {
    if (hasRecordedRepayments) {
      setError(t.reimburse.lockedHint);
      return;
    }
    setReimburseSplitMode("single");
    if (splitPayers[0]) {
      setReimburseFrom(splitPayers[0].name);
      setReimburseTargetDigits(splitPayers[0].targetDigits);
    }
    if (error) setError(null);
  };

  const applyEqualSplit = (totalPeople: number) => {
    if (reimburseBaseIdr <= 0 || totalPeople < 2) return;
    const friendCount = splitIncludeMe ? totalPeople - 1 : totalPeople;
    const perPerson = Math.round(reimburseBaseIdr / totalPeople);

    setSplitPayers((curr) => {
      const next: SplitPayerDraft[] = [];
      let assigned = 0;
      for (let i = 0; i < friendCount; i += 1) {
        const existing = curr[i];
        let share = perPerson;
        if (!splitIncludeMe && i === friendCount - 1) {
          share = Math.max(0, reimburseBaseIdr - assigned);
        }
        assigned += share;
        next.push({
          id: existing?.id ?? makePayerId(),
          name: existing?.name ?? "",
          targetDigits: share > 0 ? String(share) : "",
          status: existing?.status ?? "pending",
          settledAt: existing?.settledAt,
        });
      }
      return next;
    });
    if (error) setError(null);
  };

  const splitFixedSum = splitPayers.reduce(
    (sum, p) => sum + (Number(p.targetDigits) || 0),
    0
  );
  const splitHasFlexible = splitPayers.some((p) => !(Number(p.targetDigits) > 0));
  const splitExceedsBase =
    reimburseSplitMode === "split" &&
    reimburseBaseIdr > 0 &&
    splitFixedSum > reimburseBaseIdr;

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

    if (
      type === "expense" &&
      hasRecordedRepayments &&
      reimburseBaseIdr < alreadyReimbursedIdr
    ) {
      setError(
        `${t.reimburse.amountBelowReimbursed} (${formatIdr(alreadyReimbursedIdr)})`
      );
      return;
    }

    let nextReimburse: ReimbursementInfo | undefined;
    if (type === "expense" && isReimburse) {
      const existingReimburse =
        editingTx?.type === "expense" ? editingTx.reimburse : undefined;
      const includeFeeFlag = reimburseIncludeFee && parsedFee > 0;

      if (reimburseSplitMode === "split") {
        const cleanedPayers: ReimbursementPayer[] = [];
        let targetsSum = 0;
        for (const p of splitPayers) {
          const pName = p.name.trim().slice(0, 48);
          const pTarget = Number(p.targetDigits) || 0;
          if (!pName && pTarget <= 0) continue;
          if (!pName) {
            setError(
              locale === "id"
                ? "Isi nama tiap orang yang patungan."
                : "Enter a name for each person in the split."
            );
            return;
          }
          targetsSum += pTarget;
          cleanedPayers.push({
            id: p.id,
            name: pName,
            ...(pTarget > 0 ? { expectedIdr: pTarget } : {}),
            status: p.status,
            ...(p.settledAt ? { settledAt: p.settledAt } : {}),
          });
        }

        if (cleanedPayers.length === 0) {
          setError(
            locale === "id"
              ? "Tambahkan minimal 1 nama orang untuk patungan."
              : "Add at least 1 person's name for split bill."
          );
          return;
        }
        if (targetsSum > reimburseBaseIdr) {
          setError(
            locale === "id"
              ? `Total target patungan (${formatIdr(targetsSum)}) melebihi batas reimburse (${formatIdr(reimburseBaseIdr)}).`
              : `Combined split targets (${formatIdr(targetsSum)}) exceed reimbursable total (${formatIdr(reimburseBaseIdr)}).`
          );
          return;
        }

        nextReimburse = {
          status: existingReimburse?.status ?? "pending",
          ...(includeFeeFlag ? { includeFee: true } : {}),
          payers: cleanedPayers,
          from: cleanedPayers.map((p) => p.name).join(", "),
          ...(existingReimburse?.settledAt
            ? { settledAt: existingReimburse.settledAt }
            : {}),
          entries: existingReimburse?.entries ?? [],
        };
      } else {
        const parsedTarget = Number(reimburseTargetDigits) || 0;
        nextReimburse = {
          status: existingReimburse?.status ?? "pending",
          ...(includeFeeFlag ? { includeFee: true } : {}),
          ...(parsedTarget > 0
            ? { expectedIdr: Math.min(reimburseBaseIdr, parsedTarget) }
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
    }

    saveTransaction(
      {
        type,
        date,
        amountIdr: parsedAmount,
        categoryId,
        accountId: accounts.length > 0 && accountId ? accountId : undefined,
        feeIdr: type === "expense" && parsedFee > 0 ? parsedFee : undefined,
        merchant: merchant.trim() || undefined,
        reimburse: nextReimburse,
        note:
          note.trim() ||
          filteredCategories.find((c) => c.id === categoryId)?.nameEn ||
          filteredCategories.find((c) => c.id === categoryId)?.nameId ||
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
                              {acc.role === "savings" ? (
                                <PiggyBank
                                  className={`h-3 w-3 shrink-0 ${
                                    selected ? "text-white" : "text-[#745bc7]"
                                  }`}
                                />
                              ) : (
                                <Wallet
                                  className={`h-3 w-3 shrink-0 ${
                                    selected ? "text-white" : "text-[#2276a8]"
                                  }`}
                                />
                              )}
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
                              {acc.role === "savings" ? (
                                <PiggyBank
                                  className={`h-3 w-3 shrink-0 ${
                                    selected ? "text-white" : "text-[#745bc7]"
                                  }`}
                                />
                              ) : (
                                <Wallet
                                  className={`h-3 w-3 shrink-0 ${
                                    selected ? "text-white" : "text-[#2276a8]"
                                  }`}
                                />
                              )}
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
                            {isIncome ? (
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                                  selected
                                    ? "border-[#2276a8] bg-[#2276a8]/18 text-[#2276a8]"
                                    : "border-[#2276a8]/45 bg-[#2276a8]/6 text-[#2276a8]"
                                }`}
                              >
                                <CategoryIcon name={c.icon} className="h-3 w-3" />
                              </span>
                            ) : (
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
                            )}
                            <span className="truncate">
                              {c.nameEn || c.nameId}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expense-Only Optional Admin Fee (e.g. BI-FAST Rp 2.500 when lending or paying via external bank) */}
                  {type === "expense" && (
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
                                onClick={() => {
                                  setFeeDigits(
                                    presetFee === 0 ? "" : String(presetFee)
                                  );
                                  if (presetFee === 0) {
                                    setReimburseIncludeFee(false);
                                  }
                                  if (error) setError(null);
                                }}
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
                          onChange={(e) => {
                            const digits = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 9);
                            setFeeDigits(digits);
                            if (!(Number(digits) > 0)) {
                              setReimburseIncludeFee(false);
                            }
                            if (error) setError(null);
                          }}
                          className="font-mono-num w-full bg-transparent text-xs font-bold text-[#14100e] outline-none placeholder:text-[#5d5370]/45"
                        />
                      </div>

                      {parsedFee > 0 && parsedAmount > 0 && (
                        <p className="mt-1.5 font-mono text-[10px] text-[#4e4361]">
                          {fromAcc ? (
                            <span className="font-semibold text-[#14100e]">
                              {fromAcc.name}{" "}
                            </span>
                          ) : null}
                          <span className="font-bold text-[#c837a5]">
                            -{formatIdr(parsedAmount + parsedFee)}
                          </span>{" "}
                          <span className="text-[#5d5370]">
                            ({formatIdr(parsedFee)}{" "}
                            {locale === "id"
                              ? "masuk Bank & Admin"
                              : "in Bank & Admin"}
                            )
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Expense-Only Flexible Reimburse / Multi-Person Split-Bill Toggle */}
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

                          {/* Optional Fee Inclusion Toggle (only shown when Expense has Admin Fee > 0) */}
                          {parsedFee > 0 && (
                            <div className="space-y-1">
                              <span className="block font-mono text-[9.5px] font-semibold tracking-[0.14em] text-[#5d5370] uppercase">
                                {locale === "id"
                                  ? `BIAYA ADMIN (${formatIdr(parsedFee)})`
                                  : `ADMIN FEE (${formatIdr(parsedFee)})`}
                              </span>
                              <div className="grid grid-cols-2 border border-[#745bc7]/60 bg-white">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReimburseIncludeFee(false);
                                    if (
                                      reimburseSplitMode === "single" &&
                                      Number(reimburseTargetDigits) ===
                                        parsedAmount + parsedFee
                                    ) {
                                      setReimburseTargetDigits(
                                        String(parsedAmount)
                                      );
                                    }
                                    if (error) setError(null);
                                  }}
                                  className={`border-r border-[#745bc7]/50 px-2.5 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.08em] uppercase transition ${
                                    !reimburseIncludeFee
                                      ? "bg-[#745bc7] text-white"
                                      : "text-[#5d5370] hover:bg-[#f4effd] hover:text-[#14100e]"
                                  }`}
                                >
                                  {locale === "id"
                                    ? "TANPA FEE"
                                    : "WITHOUT FEE"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReimburseIncludeFee(true);
                                    if (
                                      reimburseSplitMode === "single" &&
                                      Number(reimburseTargetDigits) === parsedAmount &&
                                      parsedAmount > 0
                                    ) {
                                      setReimburseTargetDigits(
                                        String(parsedAmount + parsedFee)
                                      );
                                    }
                                    if (error) setError(null);
                                  }}
                                  className={`px-2.5 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.08em] uppercase transition ${
                                    reimburseIncludeFee
                                      ? "bg-[#745bc7] text-white"
                                      : "text-[#5d5370] hover:bg-[#f4effd] hover:text-[#14100e]"
                                  }`}
                                >
                                  {locale === "id"
                                    ? `TERMASUK FEE (+${formatIdr(parsedFee)})`
                                    : `INCLUDE FEE (+${formatIdr(parsedFee)})`}
                                </button>
                              </div>
                              <p className="font-mono text-[9.5px] text-[#5d5370]">
                                {reimburseIncludeFee
                                  ? locale === "id"
                                    ? `Total yang direimburse termasuk biaya admin (maks. ${formatIdr(reimburseBaseIdr)}).`
                                    : `Reimburse covers the admin fee too (max ${formatIdr(reimburseBaseIdr)}).`
                                  : locale === "id"
                                    ? `Biaya admin ${formatIdr(parsedFee)} tetap kamu tanggung di Bank & Admin.`
                                    : `You absorb the ${formatIdr(parsedFee)} fee in Bank & Admin.`}
                              </p>
                            </div>
                          )}

                          {/* 1 Person vs Multi-Person Split Switcher */}
                          <div className="grid grid-cols-2 border border-[#745bc7]/60 bg-white">
                            <button
                              type="button"
                              onClick={switchToSingleMode}
                              className={`border-r border-[#745bc7]/50 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.1em] uppercase transition ${
                                reimburseSplitMode === "single"
                                  ? "bg-[#745bc7] text-white"
                                  : "text-[#5d5370] hover:bg-[#f4effd] hover:text-[#14100e]"
                              }`}
                            >
                              {locale === "id" ? "1 ORANG" : "1 PERSON"}
                            </button>
                            <button
                              type="button"
                              onClick={switchToSplitMode}
                              className={`inline-flex items-center justify-center gap-1 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.1em] uppercase transition ${
                                reimburseSplitMode === "split"
                                  ? "bg-[#745bc7] text-white"
                                  : "text-[#5d5370] hover:bg-[#f4effd] hover:text-[#14100e]"
                              }`}
                            >
                              <Users className="h-3 w-3 shrink-0" />
                              <span>
                                {locale === "id"
                                  ? "PATUNGAN (2+ ORANG)"
                                  : "SPLIT (2+ PEOPLE)"}
                              </span>
                            </button>
                          </div>

                          {reimburseSplitMode === "single" ? (
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
                                    {reimburseBaseIdr > 0 && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setReimburseTargetDigits(
                                              String(
                                                Math.round(reimburseBaseIdr / 2)
                                              )
                                            )
                                          }
                                          className={`border px-1.5 py-0.5 font-mono text-[9px] font-semibold transition ${
                                            Number(reimburseTargetDigits) ===
                                            Math.round(reimburseBaseIdr / 2)
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
                                              String(reimburseBaseIdr)
                                            )
                                          }
                                          className={`border px-1.5 py-0.5 font-mono text-[9px] font-semibold transition ${
                                            Number(reimburseTargetDigits) ===
                                            reimburseBaseIdr
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
                                    value={formatDigitsWithDots(
                                      reimburseTargetDigits
                                    )}
                                    onChange={(e) =>
                                      setReimburseTargetDigits(
                                        e.target.value
                                          .replace(/\D/g, "")
                                          .slice(0, 12)
                                      )
                                    }
                                    className="font-mono-num w-full bg-transparent text-xs font-bold text-[#14100e] outline-none placeholder:font-normal placeholder:text-[#745bc7]/70"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {/* Quick Equal-Split Helper Bar (e.g. GoFood ÷3 with "Include me") */}
                              {reimburseBaseIdr > 0 && (
                                <div className="flex flex-wrap items-center justify-between gap-2 border border-[#745bc7]/25 bg-white px-2.5 py-2">
                                  <label className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[9.5px] font-semibold text-[#14100e]">
                                    <input
                                      type="checkbox"
                                      checked={splitIncludeMe}
                                      onChange={(e) =>
                                        setSplitIncludeMe(e.target.checked)
                                      }
                                      className="h-3 w-3 accent-[#745bc7]"
                                    />
                                    <span>
                                      {locale === "id"
                                        ? "Termasuk saya"
                                        : "Include me"}
                                    </span>
                                  </label>

                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="font-mono text-[9px] font-semibold text-[#5d5370] uppercase">
                                      {locale === "id" ? "Bagi rata:" : "Equal:"}
                                    </span>
                                    {[2, 3, 4].map((n) => (
                                      <button
                                        key={n}
                                        type="button"
                                        onClick={() => applyEqualSplit(n)}
                                        className="border border-[#745bc7]/40 bg-[#f5effe]/75 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-[#14100e] transition hover:border-[#745bc7] hover:bg-[#745bc7] hover:text-white"
                                      >
                                        ÷{n}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Multi-Person Rows */}
                              <div className="space-y-1.5">
                                {splitPayers.map((payer, idx) => {
                                  const isLocked = lockedPayerIds.has(payer.id);
                                  return (
                                    <div
                                      key={payer.id}
                                      className="grid grid-cols-[minmax(0,1fr)_minmax(108px,136px)_auto] items-center gap-1.5"
                                    >
                                      <input
                                        type="text"
                                        maxLength={48}
                                        placeholder={
                                          locale === "id"
                                            ? `Orang ${idx + 1} (cth. Andi)`
                                            : `Person ${idx + 1} (e.g. Andi)`
                                        }
                                        value={payer.name}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setSplitPayers((curr) =>
                                            curr.map((row) =>
                                              row.id === payer.id
                                                ? { ...row, name: val }
                                                : row
                                            )
                                          );
                                          if (error) setError(null);
                                        }}
                                        className="min-w-0 border border-[#745bc7]/35 bg-white px-2.5 py-1.5 text-xs text-[#14100e] outline-none placeholder:text-[#5d5370]/60 focus:border-[#745bc7]"
                                      />

                                      <div className="flex items-center gap-1 border border-[#745bc7]/35 bg-white px-2 py-1.5 focus-within:border-[#745bc7]">
                                        <span className="font-mono-num text-[11px] font-bold text-[#5d5370]">
                                          Rp
                                        </span>
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder={t.reimburse.flexibleChip}
                                          value={formatDigitsWithDots(
                                            payer.targetDigits
                                          )}
                                          onChange={(e) => {
                                            const digits = e.target.value
                                              .replace(/\D/g, "")
                                              .slice(0, 12);
                                            setSplitPayers((curr) =>
                                              curr.map((row) =>
                                                row.id === payer.id
                                                  ? { ...row, targetDigits: digits }
                                                  : row
                                              )
                                            );
                                            if (error) setError(null);
                                          }}
                                          className="font-mono-num w-full min-w-0 bg-transparent text-xs font-bold text-[#14100e] outline-none placeholder:font-normal placeholder:text-[#745bc7]/70"
                                        />
                                      </div>

                                      <button
                                        type="button"
                                        disabled={
                                          splitPayers.length <= 1 || isLocked
                                        }
                                        onClick={() =>
                                          setSplitPayers((curr) =>
                                            curr.filter(
                                              (row) => row.id !== payer.id
                                            )
                                          )
                                        }
                                        aria-label={t.actions.delete}
                                        className="flex h-8 w-8 items-center justify-center border border-[#745bc7]/25 bg-white text-[#5d5370] transition hover:border-[#c837a5] hover:text-[#c837a5] disabled:cursor-not-allowed disabled:opacity-35"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2">
                                {splitPayers.length < 12 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSplitPayers((curr) => [
                                        ...curr,
                                        {
                                          id: makePayerId(),
                                          name: "",
                                          targetDigits: "",
                                          status: "pending",
                                        },
                                      ])
                                    }
                                    className="inline-flex items-center gap-1 border border-[#745bc7]/45 bg-white px-2.5 py-1 font-mono text-[9.5px] font-bold tracking-[0.08em] text-[#745bc7] uppercase transition hover:bg-[#745bc7] hover:text-white"
                                  >
                                    <Plus className="h-3 w-3" />
                                    <span>
                                      {locale === "id"
                                        ? "Tambah Orang"
                                        : "Add Person"}
                                    </span>
                                  </button>
                                ) : (
                                  <span />
                                )}

                                {reimburseBaseIdr > 0 && (
                                  <span
                                    className={`font-mono text-[10px] ${
                                      splitExceedsBase
                                        ? "font-bold text-[#c837a5]"
                                        : "text-[#4e4361]"
                                    }`}
                                  >
                                    {splitExceedsBase
                                      ? locale === "id"
                                        ? `Melebihi batas ${formatIdr(reimburseBaseIdr)}!`
                                        : `Exceeds max ${formatIdr(reimburseBaseIdr)}!`
                                      : splitHasFlexible
                                        ? locale === "id"
                                          ? `Target tercatat: ${formatIdr(splitFixedSum)} + fleksibel`
                                          : `Targets: ${formatIdr(splitFixedSum)} + flexible`
                                        : locale === "id"
                                          ? `Teman: ${formatIdr(splitFixedSum)} · Bagianmu: ${formatIdr(Math.max(0, reimburseBaseIdr - splitFixedSum))}`
                                          : `Friends: ${formatIdr(splitFixedSum)} · Your share: ${formatIdr(Math.max(0, reimburseBaseIdr - splitFixedSum))}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

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
