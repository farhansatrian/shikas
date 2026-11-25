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
  ShizukuUser,
  Transaction,
  TransactionType,
} from "../types/cashflow";
import { SHIZUKU_ECOSYSTEM } from "../config/ecosystem";
import { normalizeCategoryId } from "../data/categories";
import { createDemoSeedData, createFreshEmptyData } from "../data/seedData";
import { getMonthKey } from "../utils/format";
import { TRANSLATIONS, type TranslationDict } from "../i18n/translations";
import {
  acknowledgeOAuthCallback,
  consumeOAuthCallbackFromUrl,
  getCurrentSession,
  loadUserLedger,
  peekPostAuthTab,
  registerShizukuId,
  saveUserLedger,
  signInWithShizukuId,
  signOutShizukuId,
} from "../services/shizukuAuth";

const LOCAL_MODE_STORE_KEY = "shikas_local_v5";

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function loadLocalModeStore(): CashflowStoreData {
  try {
    const raw = localStorage.getItem(LOCAL_MODE_STORE_KEY);
    if (!raw) {
      const fresh = createFreshEmptyData();
      fresh.settings.shizukuWebsiteUrl = SHIZUKU_ECOSYSTEM.hubUrl;
      return fresh;
    }
    const parsed = JSON.parse(raw) as Partial<CashflowStoreData>;
    if (!Array.isArray(parsed.transactions)) {
      const fresh = createFreshEmptyData();
      fresh.settings.shizukuWebsiteUrl = SHIZUKU_ECOSYSTEM.hubUrl;
      return fresh;
    }
    const defaults = createFreshEmptyData().settings;
    return {
      version: 4,
      transactions: parsed.transactions.map((tx) => ({
        ...tx,
        categoryId: normalizeCategoryId(tx.categoryId, tx.type),
      })),
      settings: {
        ...defaults,
        ...(parsed.settings ?? {}),
        shizukuWebsiteUrl:
          parsed.settings?.shizukuWebsiteUrl || SHIZUKU_ECOSYSTEM.hubUrl,
      },
    };
  } catch {
    const fresh = createFreshEmptyData();
    fresh.settings.shizukuWebsiteUrl = SHIZUKU_ECOSYSTEM.hubUrl;
    return fresh;
  }
}

export interface ToastNotice {
  id: string;
  message: string;
  tone: "iris" | "success" | "danger";
}

export interface TxBurstEvent {
  id: number;
  type: TransactionType;
  amountIdr: number;
  note: string;
  action: "created" | "updated" | "duplicated";
}

export type AuthModalMode = "signin" | "register";

interface CashflowContextValue {
  store: CashflowStoreData;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  t: TranslationDict;
  locale: Locale;
  // SHIZUKU ID Auth & Account Panel
  user: ShizukuUser | null;
  authReady: boolean;
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  isAccountPanelOpen: boolean;
  openAccountPanel: () => void;
  closeAccountPanel: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    displayName: string,
    password: string,
    importSandbox: boolean
  ) => Promise<void>;
  signOut: () => Promise<void>;
  // Transaction Modal
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
  // Reactive visual event for Raindrop Vessel & Dialogue Box (silent, zero SFX)
  lastTxEvent: TxBurstEvent | null;
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
  const [store, setStore] = useState<CashflowStoreData>(loadLocalModeStore);
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getMonthKey());
  const [user, setUser] = useState<ShizukuUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>("signin");
  const [isAccountPanelOpen, setAccountPanelOpen] = useState(false);

  const [isTxModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [defaultTxType, setDefaultTxType] = useState<TransactionType>("expense");
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const [lastTxEvent, setLastTxEvent] = useState<TxBurstEvent | null>(null);

  const notify = useCallback((message: string, tone: ToastNotice["tone"] = "iris") => {
    const id = generateId("toast");
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  // Capture Google OAuth #shizuku_token hash (if redirected back from SHIZUKU) & restore active session on boot + hashchange
  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      const { tokenCaptured, oauthError } = consumeOAuthCallbackFromUrl();
      const postAuthTab = tokenCaptured ? peekPostAuthTab() : null;

      if (oauthError && active) {
        const dict = TRANSLATIONS[store.settings.locale].auth.errors as Record<
          string,
          string
        >;
        notify(
          dict[oauthError] || dict.GOOGLE_AUTH_FAILED || oauthError,
          "danger"
        );
      }

      const existing = await getCurrentSession();
      if (!active) return;

      if (existing) {
        const ledger = await loadUserLedger(existing);
        if (!active) return;
        const resolvedLocale = ledger?.settings.locale ?? store.settings.locale;
        setUser(existing);
        setStore(
          ledger ?? {
            ...createFreshEmptyData(),
            settings: {
              ...createFreshEmptyData().settings,
              locale: resolvedLocale,
              shizukuWebsiteUrl: SHIZUKU_ECOSYSTEM.hubUrl,
            },
          }
        );

        if (tokenCaptured) {
          setAuthModalOpen(false);
          setActiveTab(postAuthTab === "analytics" ? "analytics" : "cashflow");
          notify(
            resolvedLocale === "id"
              ? `Masuk sebagai ${existing.displayName} via SHIZUKU ID.`
              : `Signed in as ${existing.displayName} via SHIZUKU ID.`,
            "success"
          );
          acknowledgeOAuthCallback();
        }
      } else if (tokenCaptured && active) {
        notify(
          TRANSLATIONS[store.settings.locale].auth.errors.GOOGLE_AUTH_FAILED,
          "danger"
        );
        acknowledgeOAuthCallback();
      } else if (oauthError && active) {
        acknowledgeOAuthCallback();
      }
      setAuthReady(true);
    };

    void syncSession();

    const onHashChange = () => {
      if (window.location.hash.includes("shizuku_token=")) {
        void syncSession();
      }
    };
    window.addEventListener("hashchange", onHashChange);

    return () => {
      active = false;
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  // Persist to either authenticated database ledger or local browser storage
  useEffect(() => {
    if (!authReady) return;
    if (user) {
      void saveUserLedger(user, store);
    } else {
      try {
        localStorage.setItem(LOCAL_MODE_STORE_KEY, JSON.stringify(store));
      } catch {
        // Ignore quota issues
      }
    }
  }, [store, user, authReady]);

  useEffect(() => {
    document.documentElement.lang = store.settings.locale;
  }, [store.settings.locale]);

  const openAuthModal = useCallback((mode: AuthModalMode = "signin") => {
    setAccountPanelOpen(false);
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const openAccountPanel = useCallback(() => {
    setAuthModalOpen(false);
    setAccountPanelOpen(true);
  }, []);

  const closeAccountPanel = useCallback(() => {
    setAccountPanelOpen(false);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const signedUser = await signInWithShizukuId(email, password);
      const existingLedger = await loadUserLedger(signedUser);
      const nextStore: CashflowStoreData = existingLedger ?? {
        ...createFreshEmptyData(),
        settings: {
          ...store.settings,
          shizukuWebsiteUrl:
            store.settings.shizukuWebsiteUrl || SHIZUKU_ECOSYSTEM.hubUrl,
        },
      };
      setUser(signedUser);
      setStore(nextStore);
      setLastTxEvent(null);
      setAuthModalOpen(false);
      notify(
        store.settings.locale === "id"
          ? `Selamat datang kembali, ${signedUser.displayName}.`
          : `Welcome back, ${signedUser.displayName}.`,
        "success"
      );
    },
    [notify, store.settings]
  );

  const register = useCallback(
    async (
      email: string,
      displayName: string,
      password: string,
      importSandbox: boolean
    ) => {
      const createdUser = await registerShizukuId(email, displayName, password);
      const base = createFreshEmptyData();
      const nextStore: CashflowStoreData = {
        ...base,
        transactions: importSandbox ? store.transactions : [],
        settings: {
          ...store.settings,
          shizukuWebsiteUrl:
            store.settings.shizukuWebsiteUrl || SHIZUKU_ECOSYSTEM.hubUrl,
        },
      };
      await saveUserLedger(createdUser, nextStore);
      setUser(createdUser);
      setStore(nextStore);
      setLastTxEvent(null);
      setAuthModalOpen(false);
      notify(
        store.settings.locale === "id"
          ? `SHIZUKU ID dibuat untuk ${createdUser.displayName}.`
          : `SHIZUKU ID created for ${createdUser.displayName}.`,
        "success"
      );
    },
    [notify, store.settings, store.transactions]
  );

  const signOut = useCallback(async () => {
    const currentLocale = store.settings.locale;
    await signOutShizukuId();
    setUser(null);
    const localData = loadLocalModeStore();
    localData.settings.locale = currentLocale;
    setStore(localData);
    setLastTxEvent(null);
    setAccountPanelOpen(false);
    notify(
      currentLocale === "id"
        ? "Keluar dari akun. Kembali ke Mode Lokal."
        : "Signed out. Switched back to Local Mode.",
      "iris"
    );
  }, [notify, store.settings.locale]);

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
      setLastTxEvent({
        id: Date.now(),
        type: payload.type,
        amountIdr: payload.amountIdr,
        note: payload.note,
        action: existingId ? "updated" : "created",
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
      setLastTxEvent({
        id: Date.now(),
        type: tx.type,
        amountIdr: tx.amountIdr,
        note: tx.note,
        action: "duplicated",
      });
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
    demo.settings.shizukuWebsiteUrl =
      store.settings.shizukuWebsiteUrl || SHIZUKU_ECOSYSTEM.hubUrl;
    setStore(demo);
    setSelectedMonth(getMonthKey());
    setLastTxEvent(null);
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
    fresh.settings.shizukuWebsiteUrl =
      store.settings.shizukuWebsiteUrl || SHIZUKU_ECOSYSTEM.hubUrl;
    setStore(fresh);
    setSelectedMonth(getMonthKey());
    setLastTxEvent(null);
    notify(
      store.settings.locale === "id"
        ? "Semua catatan dikosongkan."
        : "Cashflow cleared to a fresh start.",
      "iris"
    );
  }, [notify, store.settings.locale, store.settings.shizukuWebsiteUrl]);

  const importStoreData = useCallback(
    (data: CashflowStoreData) => {
      const normalized: CashflowStoreData = {
        ...data,
        transactions: data.transactions.map((tx) => ({
          ...tx,
          categoryId: normalizeCategoryId(tx.categoryId, tx.type),
        })),
      };
      setStore(normalized);
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
      user,
      authReady,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      isAccountPanelOpen,
      openAccountPanel,
      closeAccountPanel,
      signIn,
      register,
      signOut,
      isTxModalOpen,
      editingTx,
      defaultTxType,
      openNewTxModal,
      openEditTxModal,
      closeTxModal,
      saveTransaction,
      deleteTransaction,
      duplicateTransaction,
      lastTxEvent,
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
      user,
      authReady,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      isAccountPanelOpen,
      openAccountPanel,
      closeAccountPanel,
      signIn,
      register,
      signOut,
      isTxModalOpen,
      editingTx,
      defaultTxType,
      openNewTxModal,
      openEditTxModal,
      closeTxModal,
      saveTransaction,
      deleteTransaction,
      duplicateTransaction,
      lastTxEvent,
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
