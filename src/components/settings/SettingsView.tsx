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
        checked ? "bg-[#745bc7] text-white" : "bg-white/70 text-[#5d5370]"
      }`}
    >
      ON
    </span>
    <span
      className={`border-l border-[#745bc7] px-2.5 py-1 transition ${
        !checked ? "bg-[#d749d5]/20 text-[#c837a5]" : "bg-white/70 text-[#5d5370]"
      }`}
    >
      OFF
    </span>
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
      {/* Preferences + Data Backup Grid (Starts cleanly at same top line as CASHFLOW & ANALYTICS) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Display Preferences */}
        <section className="vn-frame overflow-hidden">
          <div className="shikas-band-strip px-4 py-2 text-white">
            <h2 className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
              {t.settings.preferencesTitle}
            </h2>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                {locale === "id" ? "BAHASA / LANGUAGE" : "LANGUAGE"}
              </p>
              <div className="mt-2 inline-flex border border-[#745bc7]">
                {(["en", "id"] as const).map((lg, i) => (
                  <button
                    key={lg}
                    type="button"
                    onClick={() => setLocale(lg)}
                    className={`px-4 py-1.5 font-mono text-[11px] font-bold tracking-[0.1em] uppercase transition ${
                      i > 0 ? "border-l border-[#745bc7]" : ""
                    } ${
                      locale === lg
                        ? "bg-[#745bc7] text-white"
                        : "bg-white/75 text-[#5d5370] hover:bg-[#e5dcfb]/50 hover:text-[#14100e]"
                    }`}
                  >
                    {locale === lg ? "▶ " : ""}
                    {lg === "en" ? "ENGLISH (EN)" : "INDONESIA (ID)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-[#745bc7]/20 pt-4">
              <div>
                <p className="text-sm font-semibold text-[#14100e]">{t.settings.privacyLabel}</p>
                <p className="mt-0.5 text-xs text-[#5d5370]">{t.settings.privacyDesc}</p>
              </div>
              <RpgToggle
                checked={store.settings.privacyMode}
                onChange={(v) => updateSettings({ privacyMode: v })}
                ariaLabel={t.settings.privacyLabel}
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-[#745bc7]/20 pt-4">
              <div>
                <p className="text-sm font-semibold text-[#14100e]">{t.settings.rainLabel}</p>
                <p className="mt-0.5 text-xs text-[#5d5370]">{t.settings.rainDesc}</p>
              </div>
              <RpgToggle
                checked={store.settings.rainEnabled}
                onChange={(v) => updateSettings({ rainEnabled: v })}
                ariaLabel={t.settings.rainLabel}
              />
            </div>

            <div className="border-t border-[#745bc7]/20 pt-4">
              <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                {t.settings.shizukuUrlLabel}
              </label>
              <input
                type="url"
                placeholder={t.settings.shizukuUrlPlaceholder}
                value={store.settings.shizukuWebsiteUrl}
                onChange={(e) => updateSettings({ shizukuWebsiteUrl: e.target.value })}
                className="mt-1.5 w-full border border-[#745bc7]/40 bg-white/80 px-3 py-2 font-mono text-xs text-[#14100e] outline-none transition placeholder:text-[#5d5370]/60 focus:border-[#745bc7] focus:bg-white"
              />
            </div>
          </div>
        </section>

        {/* Export / Backup / Demo */}
        <section className="vn-frame overflow-hidden">
          <div className="shikas-band-strip px-4 py-2 text-white">
            <h2 className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
              {t.settings.dataCardTitle}
            </h2>
          </div>

          <div className="divide-y divide-[#745bc7]/20 p-5">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-sm font-semibold text-[#14100e]">{t.actions.exportCsv}</p>
                <p className="mt-0.5 text-xs text-[#5d5370]">{t.settings.exportCsvDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => exportTransactionsToCsv(store.transactions, locale)}
                className="vn-btn-band shrink-0 px-3.5 py-2"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#14100e]">
                  {t.actions.exportJson} / {t.actions.importJson}
                </p>
                <p className="mt-0.5 text-xs text-[#5d5370]">{t.settings.exportJsonDesc}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => exportBackupJson(store)}
                  className="vn-btn-action px-3 py-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="vn-btn-action px-3 py-1.5"
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
              <p className="text-xs text-[#5d5370]">{t.settings.demoCardDesc}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t.settings.confirmDemo)) resetToDemoData();
                  }}
                  className="vn-btn-action px-3.5 py-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t.actions.loadDemo}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t.settings.confirmFresh)) resetToFreshEmpty();
                  }}
                  className="inline-flex items-center gap-1.5 border-[1.5px] border-[#c837a5] bg-[#d749d5]/10 px-3.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.1em] text-[#c837a5] uppercase transition hover:bg-[#c837a5] hover:text-white"
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
      <section className="vn-frame-subtle p-5">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-[#745bc7]" />
          <h2 className="font-mono text-[11px] font-bold tracking-[0.16em] text-[#745bc7] uppercase">
            {locale === "id" ? "FOLDER ASSET & RUJUKAN PATH" : "ASSETS FOLDER & PATH REGISTRY"}
          </h2>
        </div>
        <p className="mt-1.5 text-xs text-[#5d5370]">
          {locale === "id"
            ? "Taruh gambar ilustrasi kamu ke folder public/assets/, lalu path-nya terdaftar di src/config/assets.ts:"
            : "Place custom artwork inside public/assets/ and reference paths in src/config/assets.ts:"}
        </p>
        <div className="mt-3.5 grid grid-cols-1 gap-2 border border-[#745bc7]/30 bg-white/75 p-4 font-mono text-[11px] text-[#14100e] sm:grid-cols-2">
          <div>
            <span className="text-[#745bc7]">Desktop BG:</span> {SHIKAS_ASSETS.bgWatercolorPc}
          </div>
          <div>
            <span className="text-[#745bc7]">Mobile BG:</span> {SHIKAS_ASSETS.bgWatercolorSp}
          </div>
          <div>
            <span className="text-[#745bc7]">Footer Band:</span> {SHIKAS_ASSETS.bgWatercolorBand}
          </div>
          <div>
            <span className="text-[#745bc7]">Umbrella:</span> {SHIKAS_ASSETS.umbrella}
          </div>
          <div className="sm:col-span-2">
            <span className="text-[#745bc7]">Home Artwork:</span> {SHIKAS_ASSETS.heroMain}
          </div>
        </div>
      </section>
    </div>
  );
};
