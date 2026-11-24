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
    <div className="space-y-7">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#5f5368] uppercase">
          PREFERENCES · BACKUP · ASSETS
        </p>
        <h1 className="font-nav mt-1 text-2xl font-medium tracking-[0.16em] text-[#14100e] uppercase sm:text-3xl">
          {t.settings.title}
        </h1>
      </div>

      {/* Preferences + Data Backup Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Display Preferences */}
        <section className="gallery-sheet p-6">
          <h2 className="font-nav text-base font-medium tracking-[0.15em] text-[#14100e] uppercase">
            {t.settings.preferencesTitle}
          </h2>

          <div className="mt-5 space-y-5">
            <div>
              <p className="font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                {locale === "id" ? "Bahasa" : "Language"}
              </p>
              <div className="mt-2 flex gap-2">
                {(["en", "id"] as const).map((lg) => (
                  <button
                    key={lg}
                    type="button"
                    onClick={() => setLocale(lg)}
                    className={`border px-3.5 py-1 font-mono text-[11px] uppercase transition ${
                      locale === lg
                        ? "border-[#14100e] bg-[#14100e] text-white"
                        : "border-[#14100e]/20 bg-white text-[#5f5368] hover:text-[#14100e]"
                    }`}
                  >
                    {lg === "en" ? "English (EN)" : "Indonesia (ID)"}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-start justify-between gap-4 border-t border-[#14100e]/10 pt-4">
              <div>
                <p className="text-sm font-medium text-[#14100e]">{t.settings.privacyLabel}</p>
                <p className="mt-0.5 text-xs text-[#5f5368]">{t.settings.privacyDesc}</p>
              </div>
              <input
                type="checkbox"
                checked={store.settings.privacyMode}
                onChange={(e) => updateSettings({ privacyMode: e.target.checked })}
                className="mt-1 h-4 w-4 accent-[#14100e]"
              />
            </label>

            <label className="flex cursor-pointer items-start justify-between gap-4 border-t border-[#14100e]/10 pt-4">
              <div>
                <p className="text-sm font-medium text-[#14100e]">{t.settings.rainLabel}</p>
                <p className="mt-0.5 text-xs text-[#5f5368]">{t.settings.rainDesc}</p>
              </div>
              <input
                type="checkbox"
                checked={store.settings.rainEnabled}
                onChange={(e) => updateSettings({ rainEnabled: e.target.checked })}
                className="mt-1 h-4 w-4 accent-[#14100e]"
              />
            </label>

            <div className="border-t border-[#14100e]/10 pt-4">
              <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                {t.settings.shizukuUrlLabel}
              </label>
              <input
                type="url"
                placeholder={t.settings.shizukuUrlPlaceholder}
                value={store.settings.shizukuWebsiteUrl}
                onChange={(e) => updateSettings({ shizukuWebsiteUrl: e.target.value })}
                className="mt-1.5 w-full border border-[#14100e]/22 bg-white px-3 py-2 font-mono text-xs text-[#14100e] outline-none placeholder:text-[#5f5368]/60 focus:border-[#14100e]"
              />
            </div>
          </div>
        </section>

        {/* Export / Backup / Demo */}
        <section className="gallery-sheet p-6">
          <h2 className="font-nav text-base font-medium tracking-[0.15em] text-[#14100e] uppercase">
            {t.settings.dataCardTitle}
          </h2>

          <div className="mt-5 divide-y divide-[#14100e]/10">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-sm font-medium text-[#14100e]">{t.actions.exportCsv}</p>
                <p className="mt-0.5 text-xs text-[#5f5368]">{t.settings.exportCsvDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => exportTransactionsToCsv(store.transactions, locale)}
                className="gallery-btn-solid shrink-0 px-3.5 py-2 text-xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#14100e]">
                  {t.actions.exportJson} / {t.actions.importJson}
                </p>
                <p className="mt-0.5 text-xs text-[#5f5368]">{t.settings.exportJsonDesc}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => exportBackupJson(store)}
                  className="gallery-btn px-3 py-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="gallery-btn px-3 py-1.5 text-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  RESTORE
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
              <p className="text-xs text-[#5f5368]">{t.settings.demoCardDesc}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t.settings.confirmDemo)) resetToDemoData();
                  }}
                  className="gallery-btn px-3.5 py-1.5 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t.actions.loadDemo}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t.settings.confirmFresh)) resetToFreshEmpty();
                  }}
                  className="inline-flex items-center gap-1.5 border border-[#b42e69]/50 bg-white/70 px-3.5 py-1.5 font-nav text-xs tracking-[0.14em] text-[#b42e69] uppercase transition hover:bg-[#b42e69] hover:text-white"
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
      <section className="gallery-sheet p-6">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-[#14100e]" />
          <h2 className="font-nav text-base font-medium tracking-[0.15em] text-[#14100e] uppercase">
            {locale === "id" ? "FOLDER ASSET & RUJUKAN PATH" : "ASSETS FOLDER & PATH REGISTRY"}
          </h2>
        </div>
        <p className="mt-1.5 text-xs text-[#5f5368]">
          {locale === "id"
            ? "Taruh gambar ilustrasi kamu ke folder public/assets/, lalu path-nya terdaftar di src/config/assets.ts:"
            : "Place custom artwork inside public/assets/ and reference paths in src/config/assets.ts:"}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 border border-[#14100e]/12 bg-white/80 p-4 font-mono text-xs text-[#14100e] sm:grid-cols-2">
          <div>
            <span className="text-[#5f5368]">Desktop BG:</span> {SHIKAS_ASSETS.bgWatercolorPc}
          </div>
          <div>
            <span className="text-[#5f5368]">Mobile BG:</span> {SHIKAS_ASSETS.bgWatercolorSp}
          </div>
          <div className="sm:col-span-2">
            <span className="text-[#5f5368]">Home Artwork:</span> {SHIKAS_ASSETS.heroMain}
          </div>
        </div>
      </section>
    </div>
  );
};
