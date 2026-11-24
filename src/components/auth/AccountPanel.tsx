import React, { useEffect, useRef } from "react";
import {
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  LogOut,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { SHIKAS_ASSETS } from "../../config/assets";
import { SHIZUKU_ECOSYSTEM } from "../../config/ecosystem";
import { useCashflow } from "../../context/CashflowContext";
import {
  exportBackupJson,
  exportTransactionsToCsv,
  parseBackupJson,
} from "../../services/exportService";

const RpgToggle: React.FC<{
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}> = ({ checked, onChange, ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={() => onChange(!checked)}
    className="inline-flex shrink-0 border border-[#745bc7] font-mono text-[10px] font-bold tracking-[0.14em] uppercase"
  >
    <span
      className={`px-2.5 py-1 transition ${
        checked ? "bg-[#745bc7] text-white" : "bg-white text-[#5d5370]"
      }`}
    >
      ON
    </span>
    <span
      className={`border-l border-[#745bc7] px-2.5 py-1 transition ${
        !checked ? "bg-[#d749d5]/16 text-[#b8339f]" : "bg-white text-[#5d5370]"
      }`}
    >
      OFF
    </span>
  </button>
);

export const AccountPanel: React.FC = () => {
  const {
    isAccountPanelOpen,
    closeAccountPanel,
    user,
    openAuthModal,
    signOut,
    store,
    t,
    locale,
    updateSettings,
    resetToDemoData,
    resetToFreshEmpty,
    importStoreData,
    notify,
  } = useCashflow();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isAccountPanelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAccountPanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAccountPanelOpen, closeAccountPanel]);

  if (!isAccountPanelOpen) return null;

  const shizukuHubUrl =
    SHIZUKU_ECOSYSTEM.hubUrl || store.settings.shizukuWebsiteUrl.trim();

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseBackupJson(String(reader.result ?? ""));
        importStoreData(parsed);
      } catch {
        notify(t.settings.importError, "danger");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#14100e]/40 backdrop-blur-xs"
      onClick={closeAccountPanel}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t.account.title}
        className="animate-modal-in flex h-full w-full max-w-[400px] flex-col border-l-[2px] border-[#745bc7] bg-[#fdf9ff] shadow-[-8px_0_32px_rgba(20,16,14,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Vivid SHIZUKU Watercolor Band Header */}
        <div className="shikas-band-strip flex shrink-0 items-center justify-between px-4 py-3 text-white">
          <span className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
            {t.account.title}
          </span>
          <button
            type="button"
            onClick={closeAccountPanel}
            aria-label={t.actions.close}
            className="inline-flex items-center gap-1 border border-white/45 bg-white/15 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-white uppercase transition hover:bg-white/30"
          >
            <span>ESC</span>
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* 1. SHIZUKU ID Identity Block */}
          <section className="border border-[#745bc7]/40 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#745bc7] bg-gradient-to-b from-[#efe9fd] to-[#fde8f6] p-2">
                <img
                  src={SHIKAS_ASSETS.umbrella}
                  alt="SHIZUKU"
                  className="h-8 w-auto object-contain"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-[#14100e]">
                    {user ? user.displayName : t.account.guestName}
                  </p>
                  <span
                    className={`border px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-[0.14em] uppercase ${
                      user
                        ? user.mode === "cloud"
                          ? "border-[#2276a8] bg-[#2276a8]/10 text-[#2276a8]"
                          : "border-[#745bc7] bg-[#745bc7]/10 text-[#745bc7]"
                        : "border-[#5d5370]/45 text-[#5d5370]"
                    }`}
                  >
                    {user
                      ? user.mode === "cloud"
                        ? t.account.cloudBadge
                        : t.account.localBadge
                      : t.account.sandboxBadge}
                  </span>
                </div>

                <p className="mt-0.5 truncate font-mono text-[11px] text-[#5d5370]">
                  {user ? user.email : t.account.guestDesc}
                </p>
              </div>
            </div>

            <div className="mt-3.5 border-t border-[#745bc7]/15 pt-3">
              {user ? (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="vn-btn-action w-full py-2"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t.actions.signOut}</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openAuthModal("signin")}
                    className="vn-btn-band py-2"
                  >
                    ▶ {t.actions.signIn}
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal("register")}
                    className="vn-btn-action py-2"
                  >
                    {t.auth.registerTab}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 2. SHIZUKU Ecosystem App Switcher */}
          <section>
            <h3 className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#745bc7] uppercase">
              {t.account.ecosystemTitle}
            </h3>
            <div className="mt-2 divide-y divide-[#745bc7]/15 border border-[#745bc7]/35 bg-white">
              <div className="flex items-center justify-between gap-2 bg-[#f5effe]/70 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-[#14100e]">
                    ▶ SHIKAS (雫)
                  </p>
                  <p className="text-[11px] text-[#5d5370]">{t.account.shikasDesc}</p>
                </div>
                <span className="shrink-0 border border-[#745bc7] bg-[#745bc7] px-1.5 py-0.5 font-mono text-[9px] font-bold text-white uppercase">
                  ACTIVE
                </span>
              </div>

              {shizukuHubUrl ? (
                <a
                  href={shizukuHubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 px-3.5 py-2.5 transition hover:bg-[#f7f3fe]"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-[#14100e]">
                      SHIZUKU (雫) HUB
                    </p>
                    <p className="text-[11px] text-[#5d5370]">
                      {t.account.shizukuHubDesc}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#745bc7]" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => notify(t.settings.shizukuNotDeployedToast, "iris")}
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition hover:bg-[#f7f3fe]"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-[#14100e]">
                      SHIZUKU (雫) HUB
                    </p>
                    <p className="text-[11px] text-[#5d5370]">
                      {t.account.shizukuHubDesc}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#745bc7]/70" />
                </button>
              )}
            </div>
            <p className="mt-1.5 font-mono text-[10px] text-[#5d5370]">
              {t.account.upcomingApp}
            </p>
          </section>

          {/* 3. Preferences */}
          <section>
            <h3 className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#745bc7] uppercase">
              {t.account.preferencesTitle}
            </h3>
            <div className="mt-2 divide-y divide-[#745bc7]/15 border border-[#745bc7]/35 bg-white px-3.5">
              <div className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-xs font-semibold text-[#14100e]">
                    {t.settings.privacyLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#5d5370]">
                    {t.settings.privacyDesc}
                  </p>
                </div>
                <RpgToggle
                  checked={store.settings.privacyMode}
                  onChange={(v) => updateSettings({ privacyMode: v })}
                  ariaLabel={t.settings.privacyLabel}
                />
              </div>

              <div className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-xs font-semibold text-[#14100e]">
                    {t.settings.rainLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#5d5370]">
                    {t.settings.rainDesc}
                  </p>
                </div>
                <RpgToggle
                  checked={store.settings.rainEnabled}
                  onChange={(v) => updateSettings({ rainEnabled: v })}
                  ariaLabel={t.settings.rainLabel}
                />
              </div>
            </div>
          </section>

          {/* 4. Export & Backup */}
          <section>
            <h3 className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#745bc7] uppercase">
              {t.account.dataTitle}
            </h3>
            <div className="mt-2 space-y-2.5 border border-[#745bc7]/35 bg-white p-3.5">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => exportTransactionsToCsv(store.transactions, locale)}
                  className="vn-btn-band py-2 text-[10px]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportBackupJson(store)}
                  className="vn-btn-action py-2 text-[10px]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="vn-btn-action py-2 text-[10px]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{locale === "id" ? "IMPOR" : "RESTORE"}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </div>

              <div className="flex flex-wrap gap-2 border-t border-[#745bc7]/15 pt-2.5">
                {!user && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t.settings.confirmDemo)) resetToDemoData();
                    }}
                    className="vn-btn-action flex-1 py-1.5 text-[10px]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>{t.actions.loadDemo}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t.settings.confirmFresh)) resetToFreshEmpty();
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 border border-[#c837a5] bg-[#d749d5]/8 py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#c837a5] uppercase transition hover:bg-[#c837a5] hover:text-white"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{t.actions.freshStart}</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};
