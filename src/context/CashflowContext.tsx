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
  CashflowStoreData,
  Locale,
  NavTab,
  Transaction,
  TransactionType,
} from "../types/cashflow";
import { createDemoSeedData, createFreshEmptyData } from "../data/seedData";
import { getMonthKey } from "../utils/format";
import { TRANSLATIONS, type TranslationDict } from "../i18n/translations";

const STORE_KEY = "shikas_store_v4";

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
    if (!Array.isArray(parsed.transactions)) return createDemoSeedData();
    const defaults = createDemoSeedData().settings;
    return {
      version: 4,
      transactions: parsed.transactions,
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
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  t: TranslationDict;
  locale: Locale;
  // Modal
  isTxModalOpen: boolean;
  editingTx: Transaction | null;
  defaultTxType: TransactionType;
  openNewTxModal: (type?: TransactionType) => void;
  openEditTxModal: (tx: Transaction) => void;
  closeTxModal: () => void;
  // CRUD
  saveTransaction: (
    payload: Omit<Transaction, "id" | "createdAt">,
    existingId?: string
  ) => void;
  deleteTransaction: (id: string) => void;
  duplicateTransaction: (tx: Transaction) => void;
  // Settings & Data
  updateSettings: (patch: Partial<AppSettings>) => void;
  setLocale: (locale: Locale) => void;
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
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getMonthKey());
  const [isTxModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [defaultTxType, setDefaultTxType] = useState<TransactionType>("expense");
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const notify = useCallback((message: string, tone: ToastNotice["tone"] = "iris") => {
    const id = generateId("toast");
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      // Ignore quota issues
    }
  }, [store]);

  useEffect(() => {
    document.documentElement.lang = store.settings.locale;
  }, [store.settings.locale]);

  const openNewTxModal = useCallback((type: TransactionType = "expense") => {
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
            ? "Catatan diperbarui."
            : "Berhasil dicatat."
          : existingId
            ? "Entry updated."
            : "Entry recorded.",
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
        store.settings.locale === "id" ? "Catatan dihapus." : "Entry deleted.",
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
        store.settings.locale === "id" ? "Catatan diduplikasi." : "Entry duplicated.",
        "success"
      );
    },
    [notify, store.settings.locale]
  );

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

  const togglePrivacyMode = useCallback(() => {
    setStore((prev) => ({
      ...prev,
      settings: { ...prev.settings, privacyMode: !prev.settings.privacyMode },
    }));
  }, []);

  const resetToDemoData = useCallback(() => {
    const demo = createDemoSeedData();
    demo.settings.locale = store.settings.locale;
    demo.settings.shizukuWebsiteUrl = store.settings.shizukuWebsiteUrl;
    setStore(demo);
    setSelectedMonth(getMonthKey());
    notify(
      store.settings.locale === "id"
        ? "Dataset demo 6 bulan dimuat."
        : "6-month demo dataset loaded.",
      "success"
    );
  }, [notify, store.settings.locale, store.settings.shizukuWebsiteUrl]);

  const resetToFreshEmpty = useCallback(() => {
    const fresh = createFreshEmptyData();
    fresh.settings.locale = store.settings.locale;
    fresh.settings.shizukuWebsiteUrl = store.settings.shizukuWebsiteUrl;
    setStore(fresh);
    setSelectedMonth(getMonthKey());
    notify(
      store.settings.locale === "id"
        ? "Semua catatan dikosongkan."
        : "Cashflow cleared to a fresh start.",
      "iris"
    );
  }, [notify, store.settings.locale, store.settings.shizukuWebsiteUrl]);

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
      saveTransaction,
      deleteTransaction,
      duplicateTransaction,
      updateSettings,
      setLocale,
      togglePrivacyMode,
      resetToDemoData,
      resetToFreshEmpty,
      importStoreData,
      toasts,
      notify,
    }),
    [
      store,
      activeTab,
      selectedMonth,
      isTxModalOpen,
      editingTx,
      defaultTxType,
      openNewTxModal,
      openEditTxModal,
      closeTxModal,
      saveTransaction,
      deleteTransaction,
      duplicateTransaction,
      updateSettings,
      setLocale,
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
