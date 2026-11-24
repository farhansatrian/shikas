import React, { useRef, useState } from "react";
import {
  Calculator,
  CloudRain,
  Download,
  EyeOff,
  FileSpreadsheet,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import {
  exportBackupJson,
  exportTransactionsToCsv,
  parseBackupJson,
} from "../../services/exportService";
import { idrToUsd } from "../../services/fxService";
import { formatFxTimestamp, formatIdr, formatUsd } from "../../utils/format";

export const SettingsView: React.FC = () => {
  const {
    store,
    fx,
    refreshFx,
    t,
    locale,
    updateSettings,
    setFxModalOpen,
    resetToDemoData,
    resetToFreshEmpty,
    importStoreData,
    notify,
  } = useCashflow();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshFx(true);
    setRefreshing(false);
  };

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
        <p className="font-mono text-[11px] tracking-[0.22em] text-[#745bc7] uppercase">
          LOCAL-FIRST STORAGE · LIVE FX · BACKUP
        </p>
        <h1 className="font-editorial mt-1.5 text-[30px] font-normal leading-none tracking-[7px] text-[#745bc7] uppercase sm:text-[36px] sm:tracking-[9px]">
          {t.settings.title}
        </h1>
        <p className="mt-2 text-sm text-[#5d5370]">{t.settings.subtitle}</p>
      </div>

      {/* Live FX Diagnostics Card */}
      <section className="twilight-card rounded-2xl p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-[#e5dcfb]/75 uppercase">
              {t.settings.fxCardTitle}
            </p>
            <p className="font-mono-num mt-2 text-2xl font-bold text-white sm:text-3xl">
              1 USD = {formatIdr(fx.usdToIdr)}
            </p>
            <p className="mt-1 font-mono text-xs text-[#e5dcfb]/80">
              Rp 1.000.000 = {formatUsd(idrToUsd(1_000_000, fx.usdToIdr))} · {t.fx.source}:{" "}
              {fx.source} · {t.fx.updated}: {formatFxTimestamp(fx.updatedAt, locale)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/12 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/22"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {t.actions.refreshRate}
            </button>
            <button
              type="button"
              onClick={() => setFxModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/12 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/22"
            >
              <Calculator className="h-3.5 w-3.5" />
              {t.actions.fxConverter}
            </button>
          </div>
        </div>
      </section>

      {/* Preferences + Data Management Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Display Preferences */}
        <section className="tuyu-sheet rounded-2xl p-5 sm:p-6">
          <h2 className="font-editorial text-lg font-semibold tracking-[0.18em] text-[#745bc7] uppercase">
            {t.settings.preferencesTitle}
          </h2>

          <div className="mt-5 space-y-4">
            {/* Privacy toggle */}
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#745bc7]/18 bg-white/70 p-3.5">
              <div className="flex items-start gap-3">
                <EyeOff className="mt-0.5 h-4 w-4 text-[#745bc7]" />
                <div>
                  <p className="text-sm font-semibold text-[#14100e]">{t.settings.privacyLabel}</p>
                  <p className="text-xs text-[#5d5370]">{t.settings.privacyDesc}</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={store.settings.privacyMode}
                onChange={(e) => updateSettings({ privacyMode: e.target.checked })}
                className="mt-1 h-4 w-4 accent-[#745bc7]"
              />
            </label>

            {/* Rain layer toggle */}
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#745bc7]/18 bg-white/70 p-3.5">
              <div className="flex items-start gap-3">
                <CloudRain className="mt-0.5 h-4 w-4 text-[#2276a8]" />
                <div>
                  <p className="text-sm font-semibold text-[#14100e]">{t.settings.rainLabel}</p>
                  <p className="text-xs text-[#5d5370]">{t.settings.rainDesc}</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={store.settings.rainEnabled}
                onChange={(e) => updateSettings({ rainEnabled: e.target.checked })}
                className="mt-1 h-4 w-4 accent-[#745bc7]"
              />
            </label>

            {/* Portfolio URL */}
            <div>
              <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                {t.settings.portfolioUrlLabel}
              </label>
              <input
                type="url"
                value={store.settings.shizukuPortfolioUrl}
                onChange={(e) => updateSettings({ shizukuPortfolioUrl: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3.5 py-2 font-mono text-xs text-[#14100e] outline-none focus:border-[#7650f3]"
              />
            </div>
          </div>
        </section>

        {/* Export / Backup / Demo Mode */}
        <section className="tuyu-sheet rounded-2xl p-5 sm:p-6">
          <h2 className="font-editorial text-lg font-semibold tracking-[0.18em] text-[#745bc7] uppercase">
            {t.settings.dataCardTitle}
          </h2>

          <div className="mt-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#745bc7]/18 bg-white/70 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#14100e]">{t.actions.exportCsv}</p>
                <p className="text-xs text-[#5d5370]">{t.settings.exportCsvDesc}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  exportTransactionsToCsv(
                    store.transactions,
                    store.wallets,
                    fx.usdToIdr,
                    locale
                  )
                }
                className="tuyu-primary-btn shrink-0 px-3.5 py-2 text-xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#745bc7]/18 bg-white/70 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#14100e]">
                  {t.actions.exportJson} / {t.actions.importJson}
                </p>
                <p className="text-xs text-[#5d5370]">{t.settings.exportJsonDesc}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => exportBackupJson(store)}
                  className="tuyu-pill-btn px-3 py-1.5 text-[10px]"
                >
                  <Download className="h-3.5 w-3.5" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="tuyu-pill-btn px-3 py-1.5 text-[10px]"
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

            <div className="rounded-xl border border-[#745bc7]/18 bg-white/70 p-3.5">
              <p className="text-xs text-[#5d5370]">{t.settings.demoCardDesc}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t.settings.confirmDemo)) resetToDemoData();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#745bc7]/35 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#745bc7] hover:bg-[#745bc7]/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t.actions.loadDemo}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t.settings.confirmFresh)) resetToFreshEmpty();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#c23b7b]/35 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#c23b7b] hover:bg-[#c23b7b]/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t.actions.freshStart}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* SHIZUKU Workspace Card Metadata Helper */}
      <section className="tuyu-sheet rounded-2xl p-5 sm:p-6">
        <h2 className="font-editorial text-lg font-semibold tracking-[0.18em] text-[#745bc7] uppercase">
          {t.settings.integrationTitle}
        </h2>
        <p className="mt-1.5 text-sm text-[#5d5370]">{t.settings.integrationDesc}</p>
        <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-[#745bc7]/20 bg-white/80 p-4 font-mono text-xs text-[#14100e] sm:grid-cols-2">
          <div>
            <span className="text-[#745bc7]">Name:</span> ShiKas
          </div>
          <div>
            <span className="text-[#745bc7]">Badge:</span> APP
          </div>
          <div>
            <span className="text-[#745bc7]">Category:</span> Finance
          </div>
          <div>
            <span className="text-[#745bc7]">Repository:</span> github.com/farhansatrian/shikas
          </div>
          <div className="sm:col-span-2">
            <span className="text-[#745bc7]">Description (ID):</span> Aplikasi arus kas pribadi dengan dompet multi-akun, anggaran, dan konversi kurs real-time IDR ↔ USD.
          </div>
          <div className="sm:col-span-2">
            <span className="text-[#745bc7]">Description (EN):</span> Personal cashflow ledger, multi-wallet tracker, monthly budgets, and live IDR ↔ USD exchange rate analytics.
          </div>
        </div>
      </section>
    </div>
  );
};
