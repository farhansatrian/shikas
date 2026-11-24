import React, { useRef } from "react";
import {
  Download,
  FileSpreadsheet,
  FolderOpen,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { SHIKAS_ASSETS } from "../../config/assets";
import { useCashflow } from "../../context/CashflowContext";
import {
  exportBackupJson,
  exportTransactionsToCsv,
  parseBackupJson,
} from "../../services/exportService";

const ToggleSwitch: React.FC<{
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
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
      checked ? "bg-[#745bc7]" : "bg-[#745bc7]/20"
    }`}
  >
    <span
      className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition-transform ${
        checked ? "translate-x-5.5" : "translate-x-1"
      }`}
    />
  </button>
);

export const SettingsView: React.FC = () => {
  const {
    store,
    t,
    locale,
    updateSettings,
    setLocale,
    resetToDemoData,
    resetToFreshEmpty,
    importStoreData,
    notify,
  } = useCashflow();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    <div className="space-y-6">
      <div>
        <h1 className="font-nav text-2xl font-medium tracking-[0.14em] text-[#1a1423] uppercase sm:text-[28px]">
          {t.settings.title}
        </h1>
      </div>

      {/* Preferences + Data Backup Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Display Preferences */}
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-xs font-bold tracking-[0.12em] text-[#655978] uppercase">
            {t.settings.preferencesTitle}
          </h2>

          <div className="mt-5 space-y-5">
            <div>
              <p className="text-xs font-semibold text-[#1a1423]">
                {locale === "id" ? "Bahasa" : "Language"}
              </p>
              <div className="mt-2 inline-flex rounded-full bg-[#f4effc] p-1">
                {(["en", "id"] as const).map((lg) => (
                  <button
                    key={lg}
                    type="button"
                    onClick={() => setLocale(lg)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      locale === lg
                        ? "bg-white text-[#745bc7] shadow-xs"
                        : "text-[#655978] hover:text-[#1a1423]"
                    }`}
                  >
                    {lg === "en" ? "English (EN)" : "Indonesia (ID)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-[#745bc7]/12 pt-4">
              <div>
                <p className="text-sm font-semibold text-[#1a1423]">{t.settings.privacyLabel}</p>
                <p className="mt-0.5 text-xs text-[#655978]">{t.settings.privacyDesc}</p>
              </div>
              <ToggleSwitch
                checked={store.settings.privacyMode}
                onChange={(v) => updateSettings({ privacyMode: v })}
                ariaLabel={t.settings.privacyLabel}
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-[#745bc7]/12 pt-4">
              <div>
                <p className="text-sm font-semibold text-[#1a1423]">{t.settings.rainLabel}</p>
                <p className="mt-0.5 text-xs text-[#655978]">{t.settings.rainDesc}</p>
              </div>
              <ToggleSwitch
                checked={store.settings.rainEnabled}
                onChange={(v) => updateSettings({ rainEnabled: v })}
                ariaLabel={t.settings.rainLabel}
              />
            </div>

            <div className="border-t border-[#745bc7]/12 pt-4">
              <label className="block text-xs font-semibold text-[#1a1423]">
                {t.settings.shizukuUrlLabel}
              </label>
              <input
                type="url"
                placeholder={t.settings.shizukuUrlPlaceholder}
                value={store.settings.shizukuWebsiteUrl}
                onChange={(e) => updateSettings({ shizukuWebsiteUrl: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-[#745bc7]/16 bg-[#f8f5fe] px-3.5 py-2.5 font-mono text-xs text-[#1a1423] outline-none transition placeholder:text-[#655978]/60 focus:border-[#745bc7]/45 focus:bg-white"
              />
            </div>
          </div>
        </section>

        {/* Export / Backup / Demo */}
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-xs font-bold tracking-[0.12em] text-[#655978] uppercase">
            {t.settings.dataCardTitle}
          </h2>

          <div className="mt-5 divide-y divide-[#745bc7]/12">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-sm font-semibold text-[#1a1423]">{t.actions.exportCsv}</p>
                <p className="mt-0.5 text-xs text-[#655978]">{t.settings.exportCsvDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => exportTransactionsToCsv(store.transactions, locale)}
                className="shikas-btn-primary shrink-0 px-4 py-2 text-xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#1a1423]">
                  {t.actions.exportJson} / {t.actions.importJson}
                </p>
                <p className="mt-0.5 text-xs text-[#655978]">{t.settings.exportJsonDesc}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => exportBackupJson(store)}
                  className="shikas-btn-soft px-3.5 py-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shikas-btn-soft px-3.5 py-1.5 text-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Restore
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </div>
            </div>

            <div className="pt-4">
              <p className="text-xs text-[#655978]">{t.settings.demoCardDesc}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t.settings.confirmDemo)) resetToDemoData();
                  }}
                  className="shikas-btn-soft px-3.5 py-1.5 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t.actions.loadDemo}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t.settings.confirmFresh)) resetToFreshEmpty();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#c43673]/30 bg-[#c43673]/8 px-3.5 py-1.5 text-xs font-semibold text-[#c43673] transition hover:bg-[#c43673] hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t.actions.freshStart}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Assets Path Reference */}
      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-[#745bc7]" />
          <h2 className="text-xs font-bold tracking-[0.12em] text-[#655978] uppercase">
            {locale === "id" ? "FOLDER ASSET & RUJUKAN PATH" : "ASSETS FOLDER & PATH REGISTRY"}
          </h2>
        </div>
        <p className="mt-1.5 text-xs text-[#655978]">
          {locale === "id"
            ? "Taruh gambar ilustrasi kamu ke folder public/assets/, lalu path-nya terdaftar di src/config/assets.ts:"
            : "Place custom artwork inside public/assets/ and reference paths in src/config/assets.ts:"}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl bg-[#f7f4fc] p-4 font-mono text-xs text-[#1a1423] sm:grid-cols-2">
          <div>
            <span className="text-[#745bc7]">Desktop BG:</span> {SHIKAS_ASSETS.bgWatercolorPc}
          </div>
          <div>
            <span className="text-[#745bc7]">Mobile BG:</span> {SHIKAS_ASSETS.bgWatercolorSp}
          </div>
          <div className="sm:col-span-2">
            <span className="text-[#745bc7]">Home Artwork:</span> {SHIKAS_ASSETS.heroMain}
          </div>
        </div>
      </section>
    </div>
  );
};
