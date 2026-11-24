import React, { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Umbrella,
} from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import type { DisplayCurrencyMode } from "../../types/cashflow";
import { formatIdr } from "../../utils/format";

export const Header: React.FC = () => {
  const {
    store,
    fx,
    refreshFx,
    t,
    locale,
    setLocale,
    setDisplayCurrency,
    togglePrivacyMode,
    openNewTxModal,
    setFxModalOpen,
    setActiveTab,
  } = useCashflow();

  const [clockText, setClockText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const tick = () => {
      try {
        const now = new Date();
        const time = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(now);
        const date = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
          timeZone: "Asia/Jakarta",
          weekday: "short",
          day: "numeric",
          month: "short",
        }).format(now);
        setClockText(`${date} · ${time} WIB`);
      } catch {
        setClockText("");
      }
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [locale]);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshing(true);
    await refreshFx(true);
    setRefreshing(false);
  };

  const currencyModes: Array<{ value: DisplayCurrencyMode; label: string }> = [
    { value: "IDR", label: t.fx.modeIdr },
    { value: "USD", label: t.fx.modeUsd },
    { value: "DUAL", label: t.fx.modeDual },
  ];

  const statusColor =
    fx.status === "live"
      ? "bg-[#14866d]"
      : fx.status === "loading"
        ? "bg-[#7650f3] animate-pulse"
        : "bg-[#b7791f]";

  return (
    <header className="sticky top-0 z-40 border-b border-[#745bc7]/18 bg-[#e5dcfb]/86 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1160px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand Identity (SHIZUKU Suite) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className="group flex items-center gap-2.5 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#745bc7] via-[#7650f3] to-[#d749d5] text-white shadow-sm transition group-hover:scale-105">
              <Umbrella className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-editorial text-[21px] font-semibold tracking-[0.22em] text-[#745bc7] uppercase">
                  SHIKAS
                </span>
                <span className="text-xs font-medium text-[#745bc7]/80">(雫)</span>
              </div>
              <p className="hidden font-mono text-[10px] tracking-[0.14em] text-[#5d5370] uppercase sm:block">
                {clockText || t.brandSubtitle}
              </p>
            </div>
          </button>

          <a
            href={store.settings.shizukuPortfolioUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 rounded-full border border-[#745bc7]/28 bg-white/55 px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.12em] text-[#745bc7] uppercase transition hover:border-[#7650f3] hover:bg-white/90 lg:inline-flex"
            title="SHIZUKU Workspace"
          >
            {t.workspaceReturn}
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>

        {/* Right Controls: Live FX Pill, Currency Mode, Privacy, Locale, Add */}
        <div className="flex items-center gap-2">
          {/* Real-Time USD/IDR Rate Pill */}
          <button
            type="button"
            onClick={() => setFxModalOpen(true)}
            className="group flex items-center gap-2 rounded-full border border-[#745bc7]/28 bg-white/75 px-3 py-1.5 text-xs transition hover:border-[#7650f3] hover:bg-white"
            title={t.fx.converterSubtitle}
          >
            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
            <span className="font-mono-num font-medium text-[#14100e]">
              <span className="hidden sm:inline">1 USD = </span>
              {formatIdr(fx.usdToIdr)}
            </span>
            <ArrowLeftRight className="h-3 w-3 text-[#745bc7] transition group-hover:rotate-180" />
            <span
              role="button"
              tabIndex={0}
              onClick={handleRefresh}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void handleRefresh(e as unknown as React.MouseEvent);
                }
              }}
              aria-label={t.actions.refreshRate}
              className="rounded-full p-0.5 text-[#745bc7] hover:bg-[#745bc7]/12"
            >
              <RefreshCw
                className={`h-3 w-3 ${refreshing || fx.status === "loading" ? "animate-spin" : ""}`}
              />
            </span>
          </button>

          {/* Display Currency Mode Toggle (Desktop/Tablet) */}
          <div
            role="group"
            aria-label="Display currency"
            className="hidden items-center rounded-full border border-[#745bc7]/25 bg-white/65 p-0.5 md:flex"
          >
            {currencyModes.map((m) => {
              const active = store.settings.displayCurrency === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setDisplayCurrency(m.value)}
                  className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider transition ${
                    active
                      ? "bg-[#745bc7] text-white shadow-xs"
                      : "text-[#5d5370] hover:text-[#745bc7]"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Privacy Mask Toggle */}
          <button
            type="button"
            onClick={togglePrivacyMode}
            aria-label={t.settings.privacyLabel}
            title={t.settings.privacyLabel}
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
              store.settings.privacyMode
                ? "border-[#7650f3] bg-[#7650f3] text-white"
                : "border-[#745bc7]/25 bg-white/65 text-[#745bc7] hover:bg-white"
            }`}
          >
            {store.settings.privacyMode ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Exact SHIZUKU EN | ID Switcher */}
          <div
            role="group"
            aria-label="Language switcher"
            className="flex items-center gap-1.5 px-1 font-editorial text-xs font-bold tracking-[0.16em]"
          >
            <button
              type="button"
              onClick={() => setLocale("id")}
              className={`transition ${
                locale === "id" ? "text-[#745bc7]" : "text-[#745bc7]/40 hover:text-[#745bc7]/80"
              }`}
            >
              ID
            </button>
            <span className="text-[#745bc7]/35">|</span>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`transition ${
                locale === "en" ? "text-[#745bc7]" : "text-[#745bc7]/40 hover:text-[#745bc7]/80"
              }`}
            >
              EN
            </button>
          </div>

          {/* Primary Quick Add CTA */}
          <button
            type="button"
            onClick={() => openNewTxModal("expense")}
            className="tuyu-primary-btn h-8.5 px-3.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.actions.addTransaction}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
