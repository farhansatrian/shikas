import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AppSettings,
  CashflowStoreData,
  Locale,
  NavTab,
  PocketAccount,
  ReimbursementEntry,
  ReimburseStatus,
  ShizukuUser,
  Transaction,
  TransactionType,
} from "../types/cashflow";
import { SHIZUKU_ECOSYSTEM } from "../config/ecosystem";
import { normalizeCategoryId } from "../data/categories";
import { createDemoSeedData, createFreshEmptyData } from "../data/seedData";
import { sanitizeAccounts } from "../services/exportService";
import {
  clampCycleStartDay,
  getCurrentCycleKey,
} from "../utils/format";
import { getReimbursedTotalIdr, sanitizeReimbursement } from "../utils/reimburse";
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
      version: 5,
      accounts: sanitizeAccounts(parsed.accounts),
      transactions: parsed.transactions
        .filter(
          (tx) =>
            tx &&
            (tx.type === "income" ||
              tx.type === "expense" ||
              tx.type === "transfer")
        )
        .map((tx) => ({
          ...tx,
          categoryId: normalizeCategoryId(tx.categoryId, tx.type),
          accountId: tx.accountId || undefined,
          toAccountId: tx.toAccountId || undefined,
          feeIdr:
            tx.type === "transfer" && tx.feeIdr && tx.feeIdr > 0
              ? Math.round(tx.feeIdr)
              : undefined,
          reimburse:
            tx.type === "expense"
              ? sanitizeReimbursement(tx.reimburse, tx.amountIdr)
              : undefined,
        })),
      settings: {
        ...defaults,
        ...(parsed.settings ?? {}),
        cycleStartDay: clampCycleStartDay(parsed.settings?.cycleStartDay),
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
  accountId?: string;
  toAccountId?: string;
  feeIdr?: number;
  reimburseSettled?: boolean;
  reimburseFrom?: string;
  action: "created" | "updated" | "duplicated" | "reimbursed";
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
  // Pockets & Opening Balances Modal
  isPocketsModalOpen: boolean;
  openPocketsModal: () => void;
  closePocketsModal: () => void;
  saveAccount: (
    payload: Omit<PocketAccount, "id">,
    existingId?: string
  ) => void;
  deleteAccount: (id: string) => void;
  setDefaultAccount: (id: string) => void;
  // Transaction Modal
  isTxModalOpen: boolean;
  editingTx: Transaction | null;
  defaultTxType: TransactionType;
  openNewTxModal: (type?: TransactionType) => void;
  openEditTxModal: (tx: Transaction) => void;
  closeTxModal: () => void;
  // Reimburse Settlement Modal & Operations
  reimburseTxId: string | null;
  openReimburseModal: (txId: string) => void;
  closeReimburseModal: () => void;
  recordReimbursement: (
    txId: string,
    payload: {
      amountIdr: number;
      accountId?: string;
      date: string;
      note?: string;
    },
    markSettled: boolean
  ) => void;
  deleteReimbursementEntry: (txId: string, entryId: string) => void;
  setReimburseStatus: (txId: string, status: ReimburseStatus) => void;
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
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getCurrentCycleKey(loadLocalModeStore().settings.cycleStartDay)
  );
  const [user, setUser] = useState<ShizukuUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>("signin");
  const [isAccountPanelOpen, setAccountPanelOpen] = useState(false);
  const [isPocketsModalOpen, setPocketsModalOpen] = useState(false);

  const [isTxModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [defaultTxType, setDefaultTxType] = useState<TransactionType>("expense");
  const [reimburseTxId, setReimburseTxId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const [lastTxEvent, setLastTxEvent] = useState<TxBurstEvent | null>(null);

  // Prevents redundant PUT on initial DB hydration / auth transitions & enables clean debounced flush
  const skipNextPersistRef = useRef(true);
  const cloudSyncTimerRef = useRef<number | null>(null);
  const pendingCloudSyncRef = useRef<{
    user: ShizukuUser;
    store: CashflowStoreData;
  } | null>(null);

  const notify = useCallback((message: string, tone: ToastNotice["tone"] = "iris") => {
    const id = generateId("toast");
    setToasts((prev) => {
      if (prev.some((item) => item.message === message)) return prev;
      return [...prev.slice(-2), { id, message, tone }];
    });
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
        const resolvedCycleStartDay = clampCycleStartDay(
          ledger?.settings.cycleStartDay ?? 1
        );
        skipNextPersistRef.current = true;
        setUser(existing);
        setStore(
          ledger ?? {
            ...createFreshEmptyData(),
            settings: {
              ...createFreshEmptyData().settings,
              locale: resolvedLocale,
              cycleStartDay: resolvedCycleStartDay,
              shizukuWebsiteUrl: SHIZUKU_ECOSYSTEM.hubUrl,
            },
          }
        );
        setSelectedMonth(getCurrentCycleKey(resolvedCycleStartDay));

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

  // Flush any pending debounced cloud save immediately when closing/navigating away
  useEffect(() => {
    const flushOnHide = () => {
      const pending = pendingCloudSyncRef.current;
      if (!pending) return;
      if (cloudSyncTimerRef.current !== null) {
        window.clearTimeout(cloudSyncTimerRef.current);
        cloudSyncTimerRef.current = null;
      }
      pendingCloudSyncRef.current = null;
      void saveUserLedger(pending.user, pending.store, { keepalive: true });
    };

    window.addEventListener("pagehide", flushOnHide);
    return () => {
      window.removeEventListener("pagehide", flushOnHide);
    };
  }, []);

  // Persist to either authenticated database ledger (debounced + serialized) or local browser storage
  useEffect(() => {
    if (!authReady) return;

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    if (user) {
      pendingCloudSyncRef.current = { user, store };
      if (cloudSyncTimerRef.current !== null) {
        window.clearTimeout(cloudSyncTimerRef.current);
      }
      cloudSyncTimerRef.current = window.setTimeout(() => {
        cloudSyncTimerRef.current = null;
        const pending = pendingCloudSyncRef.current;
        if (!pending) return;
        pendingCloudSyncRef.current = null;
        void saveUserLedger(pending.user, pending.store).then((ok) => {
          if (!ok) {
            notify(
              pending.store.settings.locale === "id"
                ? "Gagal sinkron ke server SHIZUKU. Perubahan tetap aktif di layar ini."
                : "Could not sync to SHIZUKU server. Changes remain active here.",
              "danger"
            );
          }
        });
      }, 320);
      return;
    }

    try {
      localStorage.setItem(LOCAL_MODE_STORE_KEY, JSON.stringify(store));
    } catch {
      // Ignore quota issues
    }
  }, [store, user, authReady, notify]);

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
      skipNextPersistRef.current = true;
      setUser(signedUser);
      setStore(nextStore);
      setSelectedMonth(getCurrentCycleKey(nextStore.settings.cycleStartDay));
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
        accounts: importSandbox ? store.accounts : [],
        transactions: importSandbox ? store.transactions : [],
        settings: {
          ...store.settings,
          shizukuWebsiteUrl:
            store.settings.shizukuWebsiteUrl || SHIZUKU_ECOSYSTEM.hubUrl,
        },
      };
      await saveUserLedger(createdUser, nextStore);
      skipNextPersistRef.current = true;
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
    [notify, store.accounts, store.settings, store.transactions]
  );

  const signOut = useCallback(async () => {
    const currentLocale = store.settings.locale;
    // Flush any pending debounced cloud write before clearing auth session
    if (cloudSyncTimerRef.current !== null) {
      window.clearTimeout(cloudSyncTimerRef.current);
      cloudSyncTimerRef.current = null;
    }
    const pending = pendingCloudSyncRef.current;
    if (pending) {
      pendingCloudSyncRef.current = null;
      await saveUserLedger(pending.user, pending.store);
    }
    await signOutShizukuId();
    skipNextPersistRef.current = true;
    setUser(null);
    const localData = loadLocalModeStore();
    localData.settings.locale = currentLocale;
    setStore(localData);
    setSelectedMonth(getCurrentCycleKey(localData.settings.cycleStartDay));
    setLastTxEvent(null);
    setAccountPanelOpen(false);
    notify(
      currentLocale === "id"
        ? "Keluar dari akun. Kembali ke Mode Lokal."
        : "Signed out. Switched back to Local Mode.",
      "iris"
    );
  }, [notify, store.settings.locale]);

  const openPocketsModal = useCallback(() => {
    setPocketsModalOpen(true);
  }, []);

  const closePocketsModal = useCallback(() => {
    setPocketsModalOpen(false);
  }, []);

  const saveAccount = useCallback(
    (payload: Omit<PocketAccount, "id">, existingId?: string) => {
      setStore((prev) => {
        const cleanOpening = Math.max(
          0,
          Math.round(Number(payload.openingBalanceIdr) || 0)
        );
        const wantDefault = Boolean(payload.isDefault) || prev.accounts.length === 0;

        let nextAccounts: PocketAccount[];
        if (existingId) {
          nextAccounts = prev.accounts.map((acc) => {
            if (acc.id === existingId) {
              return {
                ...acc,
                ...payload,
                name: payload.name.trim(),
                openingBalanceIdr: cleanOpening,
                isDefault: wantDefault,
              };
            }
            return wantDefault ? { ...acc, isDefault: false } : acc;
          });
        } else {
          const created: PocketAccount = {
            ...payload,
            id: generateId("acc"),
            name: payload.name.trim(),
            openingBalanceIdr: cleanOpening,
            isDefault: wantDefault,
          };
          nextAccounts = [
            ...(wantDefault
              ? prev.accounts.map((acc) => ({ ...acc, isDefault: false }))
              : prev.accounts),
            created,
          ];
        }

        // Ensure at least one account stays marked default when accounts exist
        if (nextAccounts.length > 0 && !nextAccounts.some((a) => a.isDefault)) {
          nextAccounts = nextAccounts.map((a, idx) => ({
            ...a,
            isDefault: idx === 0,
          }));
        }

        return { ...prev, accounts: nextAccounts };
      });
      notify(
        store.settings.locale === "id"
          ? existingId
            ? "Kantong dana diperbarui."
            : "Kantong dana ditambahkan."
          : existingId
            ? "Pocket updated."
            : "Pocket added.",
        "success"
      );
    },
    [notify, store.settings.locale]
  );

  const deleteAccount = useCallback(
    (id: string) => {
      setStore((prev) => {
        let nextAccounts = prev.accounts.filter((acc) => acc.id !== id);
        if (nextAccounts.length > 0 && !nextAccounts.some((a) => a.isDefault)) {
          nextAccounts = nextAccounts.map((a, idx) => ({
            ...a,
            isDefault: idx === 0,
          }));
        }
        return { ...prev, accounts: nextAccounts };
      });
      notify(
        store.settings.locale === "id" ? "Kantong dihapus." : "Pocket deleted.",
        "iris"
      );
    },
    [notify, store.settings.locale]
  );

  const setDefaultAccount = useCallback((id: string) => {
    setStore((prev) => ({
      ...prev,
      accounts: prev.accounts.map((acc) => ({
        ...acc,
        isDefault: acc.id === id,
      })),
    }));
  }, []);

  const openNewTxModal = useCallback(
    (type: TransactionType = "expense") => {
      if (type === "transfer" && store.accounts.length < 2) {
        notify(TRANSLATIONS[store.settings.locale].pockets.needTwoError, "iris");
        setPocketsModalOpen(true);
        return;
      }
      setEditingTx(null);
      setDefaultTxType(type);
      setTxModalOpen(true);
    },
    [notify, store.accounts.length, store.settings.locale]
  );

  const openEditTxModal = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setDefaultTxType(tx.type);
    setTxModalOpen(true);
  }, []);

  const closeTxModal = useCallback(() => {
    setTxModalOpen(false);
    setEditingTx(null);
  }, []);

  const openReimburseModal = useCallback((txId: string) => {
    setReimburseTxId(txId);
  }, []);

  const closeReimburseModal = useCallback(() => {
    setReimburseTxId(null);
  }, []);

  const recordReimbursement = useCallback(
    (
      txId: string,
      payload: {
        amountIdr: number;
        accountId?: string;
        date: string;
        note?: string;
      },
      markSettled: boolean
    ) => {
      const targetTx = store.transactions.find((item) => item.id === txId);
      if (!targetTx || targetTx.type !== "expense") return;

      const alreadyReimbursed = getReimbursedTotalIdr(targetTx);
      const maxRemaining = Math.max(0, targetTx.amountIdr - alreadyReimbursed);
      const cleanAmt = Math.min(
        maxRemaining,
        Math.max(0, Math.round(payload.amountIdr || 0))
      );
      if (cleanAmt <= 0) return;

      const nowIso = new Date().toISOString();
      const newEntry: ReimbursementEntry = {
        id: generateId("rmb"),
        date: payload.date,
        amountIdr: cleanAmt,
        ...(payload.accountId ? { accountId: payload.accountId } : {}),
        ...(payload.note?.trim() ? { note: payload.note.trim().slice(0, 120) } : {}),
        createdAt: nowIso,
      };

      const isNowSettled =
        markSettled || alreadyReimbursed + cleanAmt >= targetTx.amountIdr;

      setStore((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) => {
          if (tx.id !== txId || tx.type !== "expense") return tx;
          const base = tx.reimburse ?? { status: "pending" as const, entries: [] };
          const nextReimburse = sanitizeReimbursement(
            {
              ...base,
              status: isNowSettled ? "settled" : "pending",
              settledAt: isNowSettled ? nowIso : undefined,
              entries: [...base.entries, newEntry],
            },
            tx.amountIdr
          );
          return { ...tx, reimburse: nextReimburse };
        }),
      }));

      setLastTxEvent({
        id: Date.now(),
        type: "expense",
        amountIdr: cleanAmt,
        note: targetTx.note,
        accountId: payload.accountId,
        reimburseSettled: isNowSettled,
        reimburseFrom: targetTx.reimburse?.from,
        action: "reimbursed",
      });

      notify(
        store.settings.locale === "id"
          ? isNowSettled
            ? "Reimburse dicatat & ditandai LUNAS."
            : "Reimburse sebagian berhasil dicatat."
          : isNowSettled
            ? "Reimbursement recorded & marked settled."
            : "Partial reimbursement recorded.",
        "success"
      );
    },
    [notify, store.settings.locale, store.transactions]
  );

  const deleteReimbursementEntry = useCallback(
    (txId: string, entryId: string) => {
      setStore((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) => {
          if (tx.id !== txId || tx.type !== "expense" || !tx.reimburse) return tx;
          const remainingEntries = tx.reimburse.entries.filter(
            (e) => e.id !== entryId
          );
          const nextReimburse = sanitizeReimbursement(
            {
              ...tx.reimburse,
              status: "pending",
              settledAt: undefined,
              entries: remainingEntries,
            },
            tx.amountIdr
          );
          return { ...tx, reimburse: nextReimburse };
        }),
      }));
      notify(
        store.settings.locale === "id"
          ? "Pembayaran reimburse dihapus."
          : "Reimbursement entry removed.",
        "iris"
      );
    },
    [notify, store.settings.locale]
  );

  const setReimburseStatus = useCallback(
    (txId: string, status: ReimburseStatus) => {
      const nowIso = new Date().toISOString();
      setStore((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) => {
          if (tx.id !== txId || tx.type !== "expense" || !tx.reimburse) return tx;
          const nextReimburse = sanitizeReimbursement(
            {
              ...tx.reimburse,
              status,
              settledAt: status === "settled" ? nowIso : undefined,
            },
            tx.amountIdr
          );
          return { ...tx, reimburse: nextReimburse };
        }),
      }));
      notify(
        store.settings.locale === "id"
          ? status === "settled"
            ? "Reimburse ditandai LUNAS."
            : "Reimburse dibuka kembali sebagai PENDING."
          : status === "settled"
            ? "Reimbursement marked as settled."
            : "Reimbursement reopened as pending.",
        status === "settled" ? "success" : "iris"
      );
    },
    [notify, store.settings.locale]
  );

  const saveTransaction = useCallback(
    (payload: Omit<Transaction, "id" | "createdAt">, existingId?: string) => {
      const cleanAmt = Math.max(0, Math.round(payload.amountIdr));
      const cleanPayload: Omit<Transaction, "id" | "createdAt"> =
        payload.type === "transfer"
          ? {
              type: "transfer",
              date: payload.date,
              amountIdr: cleanAmt,
              categoryId: "transfer",
              note: payload.note,
              merchant: undefined,
              accountId: payload.accountId || undefined,
              toAccountId: payload.toAccountId || undefined,
              feeIdr:
                payload.feeIdr && payload.feeIdr > 0
                  ? Math.round(payload.feeIdr)
                  : undefined,
              reimburse: undefined,
            }
          : {
              type: payload.type,
              date: payload.date,
              amountIdr: cleanAmt,
              categoryId: normalizeCategoryId(payload.categoryId, payload.type),
              note: payload.note,
              merchant: payload.merchant || undefined,
              accountId: payload.accountId || undefined,
              toAccountId: undefined,
              feeIdr: undefined,
              reimburse:
                payload.type === "expense"
                  ? sanitizeReimbursement(payload.reimburse, cleanAmt)
                  : undefined,
            };

      setStore((prev) => {
        if (existingId) {
          return {
            ...prev,
            transactions: prev.transactions.map((tx) =>
              tx.id === existingId ? { ...tx, ...cleanPayload } : tx
            ),
          };
        }
        const created: Transaction = {
          ...cleanPayload,
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
        type: cleanPayload.type,
        amountIdr: cleanPayload.amountIdr,
        note: cleanPayload.note,
        accountId: cleanPayload.accountId,
        toAccountId: cleanPayload.toAccountId,
        feeIdr: cleanPayload.feeIdr,
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
      setReimburseTxId((curr) => (curr === id ? null : curr));
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
        reimburse:
          tx.type === "expense" && tx.reimburse
            ? {
                status: "pending",
                ...(tx.reimburse.expectedIdr !== undefined
                  ? { expectedIdr: tx.reimburse.expectedIdr }
                  : {}),
                ...(tx.reimburse.from ? { from: tx.reimburse.from } : {}),
                entries: [],
              }
            : undefined,
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
        accountId: tx.accountId,
        toAccountId: tx.toAccountId,
        feeIdr: tx.feeIdr,
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
    const cleanPatch: Partial<AppSettings> = { ...patch };
    if (patch.cycleStartDay !== undefined) {
      const clamped = clampCycleStartDay(patch.cycleStartDay);
      cleanPatch.cycleStartDay = clamped;
      setSelectedMonth(getCurrentCycleKey(clamped));
    }
    setStore((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...cleanPatch },
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
    demo.settings.cycleStartDay = store.settings.cycleStartDay;
    demo.settings.shizukuWebsiteUrl =
      store.settings.shizukuWebsiteUrl || SHIZUKU_ECOSYSTEM.hubUrl;
    setStore(demo);
    setSelectedMonth(getCurrentCycleKey(demo.settings.cycleStartDay));
    setLastTxEvent(null);
    notify(
      store.settings.locale === "id"
        ? "Dataset demo 6 bulan dimuat."
        : "6-month demo dataset loaded.",
      "success"
    );
  }, [
    notify,
    store.settings.cycleStartDay,
    store.settings.locale,
    store.settings.shizukuWebsiteUrl,
  ]);

  const resetToFreshEmpty = useCallback(() => {
    const fresh = createFreshEmptyData();
    fresh.settings.locale = store.settings.locale;
    fresh.settings.cycleStartDay = store.settings.cycleStartDay;
    fresh.settings.shizukuWebsiteUrl =
      store.settings.shizukuWebsiteUrl || SHIZUKU_ECOSYSTEM.hubUrl;
    setStore(fresh);
    setSelectedMonth(getCurrentCycleKey(fresh.settings.cycleStartDay));
    setLastTxEvent(null);
    notify(
      store.settings.locale === "id"
        ? "Semua catatan dikosongkan."
        : "Cashflow cleared to a fresh start.",
      "iris"
    );
  }, [
    notify,
    store.settings.cycleStartDay,
    store.settings.locale,
    store.settings.shizukuWebsiteUrl,
  ]);

  const importStoreData = useCallback(
    (data: CashflowStoreData) => {
      const cycleStartDay = clampCycleStartDay(data.settings.cycleStartDay);
      const normalized: CashflowStoreData = {
        ...data,
        version: 5,
        accounts: sanitizeAccounts(data.accounts),
        transactions: data.transactions.map((tx) => ({
          ...tx,
          categoryId: normalizeCategoryId(tx.categoryId, tx.type),
          reimburse:
            tx.type === "expense"
              ? sanitizeReimbursement(tx.reimburse, tx.amountIdr)
              : undefined,
        })),
        settings: {
          ...data.settings,
          cycleStartDay,
        },
      };
      setStore(normalized);
      setSelectedMonth(getCurrentCycleKey(cycleStartDay));
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
      isPocketsModalOpen,
      openPocketsModal,
      closePocketsModal,
      saveAccount,
      deleteAccount,
      setDefaultAccount,
      isTxModalOpen,
      editingTx,
      defaultTxType,
      openNewTxModal,
      openEditTxModal,
      closeTxModal,
      reimburseTxId,
      openReimburseModal,
      closeReimburseModal,
      recordReimbursement,
      deleteReimbursementEntry,
      setReimburseStatus,
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
      isPocketsModalOpen,
      openPocketsModal,
      closePocketsModal,
      saveAccount,
      deleteAccount,
      setDefaultAccount,
      isTxModalOpen,
      editingTx,
      defaultTxType,
      openNewTxModal,
      openEditTxModal,
      closeTxModal,
      reimburseTxId,
      openReimburseModal,
      closeReimburseModal,
      recordReimbursement,
      deleteReimbursementEntry,
      setReimburseStatus,
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
