import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  AppSettings,
  Budget,
  CashflowStoreData,
  DisplayCurrencyMode,
  FxRateState,
  Locale,
  NavTab,
  RecurringItem,
  SavingsGoal,
  Transaction,
  Wallet,
} from "../types/cashflow";
import { createDemoSeedData, createFreshEmptyData } from "../data/seedData";
import {
  fetchRealtimeUsdToIdr,
  getInitialFxState,
  usdToIdrAmount,
} from "../services/fxService";
import { getMonthKey, shiftMonthKey } from "../utils/format";
import { TRANSLATIONS, type TranslationDict } from "../i18n/translations";

const STORE_KEY = "shikas_store_v1";

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function loadStoreFromStorage(): CashflowStoreData {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return createDemoSeedData();
    const parsed = JSON.parse(raw) as Partial<CashflowStoreData>;
    if (!Array.isArray(parsed.wallets) || !Array.isArray(parsed.transactions)) {
      return createDemoSeedData();
    }
    const defaults = createDemoSeedData().settings;
    return {
      version: 1,
      wallets: parsed.wallets,
      transactions: parsed.transactions,
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
      recurring: Array.isArray(parsed.recurring) ? parsed.recurring : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      settings: {
        ...defaults,
        ...(parsed.settings ?? {}),
      },
    };
  } catch {
    return createDemoSeedData();
  }
}

export interface ToastNotice {
  id: string;
  message: string;
  tone: "iris" | "success" | "danger";
}

interface CashflowContextValue {
  store: CashflowStoreData;
  fx: FxRateState;
  refreshFx: (force?: boolean) => Promise<void>;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  t: TranslationDict;
  locale: Locale;
  // Modals
  isTxModalOpen: boolean;
  editingTx: Transaction | null;
  defaultTxType: "income" | "expense" | "transfer";
  openNewTxModal: (type?: "income" | "expense" | "transfer") => void;
  openEditTxModal: (tx: Transaction) => void;
  closeTxModal: () => void;
  isFxModalOpen: boolean;
  setFxModalOpen: (open: boolean) => void;
  // CRUD Actions
  saveTransaction: (
    payload: Omit<Transaction, "id" | "createdAt">,
    existingId?: string
  ) => void;
  deleteTransaction: (id: string) => void;
  duplicateTransaction: (tx: Transaction) => void;
  saveWallet: (payload: Omit<Wallet, "id">, existingId?: string) => void;
  archiveWallet: (id: string) => void;
  upsertBudget: (month: string, categoryId: string, limitIdr: number) => void;
  deleteBudget: (id: string) => void;
  copyBudgetsFromPreviousMonth: (targetMonth: string) => boolean;
  saveRecurring: (payload: Omit<RecurringItem, "id">, existingId?: string) => void;
  deleteRecurring: (id: string) => void;
  logRecurringForMonth: (item: RecurringItem, monthKey: string) => void;
  saveGoal: (payload: Omit<SavingsGoal, "id">, existingId?: string) => void;
  contributeGoal: (goalId: string, addIdr: number) => void;
  deleteGoal: (id: string) => void;
  // Settings & Data
  updateSettings: (patch: Partial<AppSettings>) => void;
  setLocale: (locale: Locale) => void;
  setDisplayCurrency: (mode: DisplayCurrencyMode) => void;
  togglePrivacyMode: () => void;
  resetToDemoData: () => void;
  resetToFreshEmpty: () => void;
  importStoreData: (data: CashflowStoreData) => void;
  // Toasts
  toasts: ToastNotice[];
  notify: (message: string, tone?: ToastNotice["tone"]) => void;
}

const CashflowContext = createContext<CashflowContextValue | null>(null);

export const CashflowProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [store, setStore] = useState<CashflowStoreData>(loadStoreFromStorage);
  const [fx, setFx] = useState<FxRateState>(getInitialFxState);
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getMonthKey());
  const [isTxModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [defaultTxType, setDefaultTxType] = useState<"income" | "expense" | "transfer">("expense");
  const [isFxModalOpen, setFxModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const notify = useCallback((message: string, tone: ToastNotice["tone"] = "iris") => {
    const id = generateId("toast");
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  // Persist store on change
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      // Ignore quota issues
    }
  }, [store]);

  // Sync HTML lang attribute
  useEffect(() => {
    document.documentElement.lang = store.settings.locale;
  }, [store.settings.locale]);

  // Live FX fetch on mount + periodic refresh
  const refreshFx = useCallback(async (force = false) => {
    if (force) {
      setFx((prev) => ({ ...prev, status: "loading" }));
    }
    const next = await fetchRealtimeUsdToIdr(force);
    setFx(next);
  }, []);

  useEffect(() => {
    void refreshFx(false);
    const interval = window.setInterval(() => {
      void refreshFx(false);
    }, 15 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [refreshFx]);

  const openNewTxModal = useCallback((type: "income" | "expense" | "transfer" = "expense") => {
    setEditingTx(null);
    setDefaultTxType(type);
    setTxModalOpen(true);
  }, []);

  const openEditTxModal = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setDefaultTxType(tx.type);
    setTxModalOpen(true);
  }, []);

  const closeTxModal = useCallback(() => {
    setTxModalOpen(false);
    setEditingTx(null);
  }, []);

  const saveTransaction = useCallback(
    (payload: Omit<Transaction, "id" | "createdAt">, existingId?: string) => {
      setStore((prev) => {
        if (existingId) {
          return {
            ...prev,
            transactions: prev.transactions.map((tx) =>
              tx.id === existingId ? { ...tx, ...payload } : tx
            ),
          };
        }
        const created: Transaction = {
          ...payload,
          id: generateId("tx"),
          createdAt: new Date().toISOString(),
        };
        return {
          ...prev,
          transactions: [created, ...prev.transactions],
        };
      });
      notify(
        store.settings.locale === "id"
          ? existingId
            ? "Transaksi diperbarui."
            : "Transaksi berhasil dicatat."
          : existingId
            ? "Transaction updated."
            : "Transaction recorded.",
        "success"
      );
    },
    [notify, store.settings.locale]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setStore((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((tx) => tx.id !== id),
      }));
      notify(
        store.settings.locale === "id" ? "Transaksi dihapus." : "Transaction deleted.",
        "iris"
      );
    },
    [notify, store.settings.locale]
  );

  const duplicateTransaction = useCallback(
    (tx: Transaction) => {
      const copy: Transaction = {
        ...tx,
        id: generateId("tx"),
        createdAt: new Date().toISOString(),
      };
      setStore((prev) => ({
        ...prev,
        transactions: [copy, ...prev.transactions],
      }));
      notify(
        store.settings.locale === "id" ? "Transaksi diduplikasi." : "Transaction duplicated.",
        "success"
      );
    },
    [notify, store.settings.locale]
  );

  const saveWallet = useCallback(
    (payload: Omit<Wallet, "id">, existingId?: string) => {
      setStore((prev) => {
        if (existingId) {
          return {
            ...prev,
            wallets: prev.wallets.map((w) => (w.id === existingId ? { ...w, ...payload } : w)),
          };
        }
        return {
          ...prev,
          wallets: [...prev.wallets, { ...payload, id: generateId("w") }],
        };
      });
      notify(
        store.settings.locale === "id" ? "Dompet disimpan." : "Wallet saved.",
        "success"
      );
    },
    [notify, store.settings.locale]
  );

  const archiveWallet = useCallback(
    (id: string) => {
      setStore((prev) => ({
        ...prev,
        wallets: prev.wallets.map((w) => (w.id === id ? { ...w, isArchived: true } : w)),
      }));
      notify(
        store.settings.locale === "id" ? "Dompet diarsipkan." : "Wallet archived.",
        "iris"
      );
    },
    [notify, store.settings.locale]
  );

  const upsertBudget = useCallback(
    (month: string, categoryId: string, limitIdr: number) => {
      setStore((prev) => {
        const existing = prev.budgets.find(
          (b) => b.month === month && b.categoryId === categoryId
        );
        if (existing) {
          return {
            ...prev,
            budgets: prev.budgets.map((b) =>
              b.id === existing.id ? { ...b, limitIdr } : b
            ),
          };
        }
        const created: Budget = {
          id: generateId("b"),
          month,
          categoryId,
          limitIdr,
        };
        return {
          ...prev,
          budgets: [...prev.budgets, created],
        };
      });
      notify(
        store.settings.locale === "id" ? "Anggaran diperbarui." : "Budget saved.",
        "success"
      );
    },
    [notify, store.settings.locale]
  );

  const deleteBudget = useCallback(
    (id: string) => {
      setStore((prev) => ({
        ...prev,
        budgets: prev.budgets.filter((b) => b.id !== id),
      }));
    },
    []
  );

  const copyBudgetsFromPreviousMonth = useCallback(
    (targetMonth: string): boolean => {
      const prevMonth = shiftMonthKey(targetMonth, -1);
      let copied = false;
      setStore((prev) => {
        const prevBudgets = prev.budgets.filter((b) => b.month === prevMonth);
        if (prevBudgets.length === 0) return prev;
        copied = true;
        const existingCats = new Set(
          prev.budgets.filter((b) => b.month === targetMonth).map((b) => b.categoryId)
        );
        const toAdd: Budget[] = prevBudgets
          .filter((b) => !existingCats.has(b.categoryId))
          .map((b) => ({
            id: generateId("b"),
            month: targetMonth,
            categoryId: b.categoryId,
            limitIdr: b.limitIdr,
          }));
        return {
          ...prev,
          budgets: [...prev.budgets, ...toAdd],
        };
      });
      return copied;
    },
    []
  );

  const saveRecurring = useCallback(
    (payload: Omit<RecurringItem, "id">, existingId?: string) => {
      setStore((prev) => {
        if (existingId) {
          return {
            ...prev,
            recurring: prev.recurring.map((r) =>
              r.id === existingId ? { ...r, ...payload } : r
            ),
          };
        }
        return {
          ...prev,
          recurring: [...prev.recurring, { ...payload, id: generateId("rec") }],
        };
      });
      notify(
        store.settings.locale === "id" ? "Item rutin disimpan." : "Recurring item saved.",
        "success"
      );
    },
    [notify, store.settings.locale]
  );

  const deleteRecurring = useCallback((id: string) => {
    setStore((prev) => ({
      ...prev,
      recurring: prev.recurring.filter((r) => r.id !== id),
    }));
  }, []);

  const logRecurringForMonth = useCallback(
    (item: RecurringItem, monthKey: string) => {
      const [y, m] = monthKey.split("-").map(Number);
      const maxDay = new Date(y, m, 0).getDate();
      const day = String(Math.min(item.dayOfMonth, maxDay)).padStart(2, "0");
      const date = `${monthKey}-${day}`;

      const isUsd = item.currency === "USD";
      const amountIdr = isUsd ? usdToIdrAmount(item.amount, fx.usdToIdr) : Math.round(item.amount);

      const tx: Transaction = {
        id: generateId("tx"),
        type: item.type,
        date,
        amountIdr,
        categoryId: item.categoryId,
        walletId: item.walletId,
        note: item.title,
        merchant: item.note,
        originalCurrency: item.currency,
        originalAmount: item.amount,
        fxRateAtEntry: isUsd ? fx.usdToIdr : undefined,
        recurringId: item.id,
        createdAt: new Date().toISOString(),
      };

      setStore((prev) => ({
        ...prev,
        transactions: [tx, ...prev.transactions],
      }));
      notify(
        store.settings.locale === "id"
          ? `"${item.title}" dicatat ke buku kas.`
          : `"${item.title}" logged to ledger.`,
        "success"
      );
    },
    [fx.usdToIdr, notify, store.settings.locale]
  );

  const saveGoal = useCallback(
    (payload: Omit<SavingsGoal, "id">, existingId?: string) => {
      setStore((prev) => {
        if (existingId) {
          return {
            ...prev,
            goals: prev.goals.map((g) => (g.id === existingId ? { ...g, ...payload } : g)),
          };
        }
        return {
          ...prev,
          goals: [...prev.goals, { ...payload, id: generateId("goal") }],
        };
      });
      notify(
        store.settings.locale === "id" ? "Target tabungan disimpan." : "Savings goal saved.",
        "success"
      );
    },
    [notify, store.settings.locale]
  );

  const contributeGoal = useCallback(
    (goalId: string, addIdr: number) => {
      setStore((prev) => ({
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === goalId ? { ...g, savedIdr: Math.max(0, g.savedIdr + addIdr) } : g
        ),
      }));
      notify(
        store.settings.locale === "id" ? "Progres target diperbarui!" : "Goal progress updated!",
        "success"
      );
    },
    [notify, store.settings.locale]
  );

  const deleteGoal = useCallback((id: string) => {
    setStore((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setStore((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, []);

  const setLocale = useCallback(
    (locale: Locale) => updateSettings({ locale }),
    [updateSettings]
  );

  const setDisplayCurrency = useCallback(
    (displayCurrency: DisplayCurrencyMode) => updateSettings({ displayCurrency }),
    [updateSettings]
  );

  const togglePrivacyMode = useCallback(() => {
    setStore((prev) => ({
      ...prev,
      settings: { ...prev.settings, privacyMode: !prev.settings.privacyMode },
    }));
  }, []);

  const resetToDemoData = useCallback(() => {
    const demo = createDemoSeedData();
    demo.settings.locale = store.settings.locale;
    setStore(demo);
    setSelectedMonth(getMonthKey());
    notify(
      store.settings.locale === "id"
        ? "Dataset demo 4 bulan dimuat."
        : "4-month realistic demo dataset loaded.",
      "success"
    );
  }, [notify, store.settings.locale]);

  const resetToFreshEmpty = useCallback(() => {
    const fresh = createFreshEmptyData();
    fresh.settings.locale = store.settings.locale;
    setStore(fresh);
    setSelectedMonth(getMonthKey());
    notify(
      store.settings.locale === "id"
        ? "Buku kas direset ke kondisi kosong."
        : "Ledger cleared to a fresh start.",
      "iris"
    );
  }, [notify, store.settings.locale]);

  const importStoreData = useCallback(
    (data: CashflowStoreData) => {
      setStore(data);
      notify(TRANSLATIONS[data.settings.locale].settings.importSuccess, "success");
    },
    [notify]
  );

  const value = useMemo<CashflowContextValue>(
    () => ({
      store,
      fx,
      refreshFx,
      activeTab,
      setActiveTab,
      selectedMonth,
      setSelectedMonth,
      t: TRANSLATIONS[store.settings.locale],
      locale: store.settings.locale,
      isTxModalOpen,
      editingTx,
      defaultTxType,
      openNewTxModal,
      openEditTxModal,
      closeTxModal,
      isFxModalOpen,
      setFxModalOpen,
      saveTransaction,
      deleteTransaction,
      duplicateTransaction,
      saveWallet,
      archiveWallet,
      upsertBudget,
      deleteBudget,
      copyBudgetsFromPreviousMonth,
      saveRecurring,
      deleteRecurring,
      logRecurringForMonth,
      saveGoal,
      contributeGoal,
      deleteGoal,
      updateSettings,
      setLocale,
      setDisplayCurrency,
      togglePrivacyMode,
      resetToDemoData,
      resetToFreshEmpty,
      importStoreData,
      toasts,
      notify,
    }),
    [
      store,
      fx,
      refreshFx,
      activeTab,
      selectedMonth,
      isTxModalOpen,
      editingTx,
      defaultTxType,
      openNewTxModal,
      openEditTxModal,
      closeTxModal,
      isFxModalOpen,
      saveTransaction,
      deleteTransaction,
      duplicateTransaction,
      saveWallet,
      archiveWallet,
      upsertBudget,
      deleteBudget,
      copyBudgetsFromPreviousMonth,
      saveRecurring,
      deleteRecurring,
      logRecurringForMonth,
      saveGoal,
      contributeGoal,
      deleteGoal,
      updateSettings,
      setLocale,
      setDisplayCurrency,
      togglePrivacyMode,
      resetToDemoData,
      resetToFreshEmpty,
      importStoreData,
      toasts,
      notify,
    ]
  );

  return <CashflowContext.Provider value={value}>{children}</CashflowContext.Provider>;
};

export function useCashflow(): CashflowContextValue {
  const ctx = useContext(CashflowContext);
  if (!ctx) throw new Error("useCashflow must be used within CashflowProvider");
  return ctx;
}
