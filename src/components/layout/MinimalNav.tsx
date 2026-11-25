import React from "react";
import { ChevronDown, User } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import type { NavTab } from "../../types/cashflow";

const NAV_TABS: NavTab[] = ["home", "cashflow", "analytics"];

function ShizukuUmbrellaMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path d="M16 4V6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M5 17.5C5 11.425 9.925 6.5 16 6.5C22.075 6.5 27 11.425 27 17.5C24.8 16.2 22.8 16.2 21 17.5C19.2 16.2 17.4 16.2 16 17.5C14.6 16.2 12.8 16.2 11 17.5C9.2 16.2 7.2 16.2 5 17.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path
        d="M16 17.5V24.5C16 26.2 14.7 27.5 13 27.5C11.7 27.5 10.6 26.6 10.3 25.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8.5" r="1.1" fill="currentColor" fillOpacity="0.7" />
      <circle cx="25.5" cy="9.5" r="1.3" fill="currentColor" fillOpacity="0.55" />
    </svg>
  );
}

export const MinimalNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setLocale,
    t,
    locale,
    user,
    openAuthModal,
    openAccountPanel,
  } = useCashflow();

  const shortUserName = user
    ? user.displayName.trim().split(/\s+/)[0] ||
      user.email.split("@")[0] ||
      "ID"
    : "";

  const renderAccountTrigger = (compact = false) => {
    if (user) {
      return (
        <button
          type="button"
          onClick={openAccountPanel}
          title={`${locale === "id" ? "Masuk sebagai" : "Signed in as"} ${user.displayName} (${user.email})`}
          aria-label={`${t.nav.account}: ${user.displayName}`}
          className={`inline-flex shrink-0 items-center gap-1.5 border-[1.5px] border-[#745bc7] bg-[#745bc7] font-mono font-semibold text-white uppercase shadow-[2px_2px_0_0_rgba(116,91,199,0.22)] transition hover:bg-[#5f47a8] ${
            compact
              ? "px-2 py-1 text-[9.5px] tracking-[0.08em]"
              : "px-3 py-1.5 text-[10.5px] tracking-[0.12em]"
          }`}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 ring-2 ring-emerald-400/35"
            aria-hidden="true"
          />
          <span
            className={
              compact ? "max-w-[74px] truncate" : "max-w-[96px] truncate"
            }
          >
            {shortUserName}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-85" />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => openAuthModal("signin")}
        title={locale === "id" ? "Masuk dengan SHIZUKU ID" : "Sign in with SHIZUKU ID"}
        aria-label="SHIZUKU ID"
        className={`inline-flex shrink-0 items-center gap-1.5 border-[1.5px] border-[#745bc7] bg-white/85 font-mono font-semibold text-[#745bc7] uppercase shadow-[2px_2px_0_0_rgba(116,91,199,0.16)] transition hover:bg-[#745bc7] hover:text-white ${
          compact
            ? "px-2 py-1 text-[9.5px] tracking-[0.09em]"
            : "px-3 py-1.5 text-[10.5px] tracking-[0.12em]"
        }`}
      >
        <User className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
        <span>{t.nav.signIn}</span>
      </button>
    );
  };

  return (
    <header className="relative z-20 w-full">
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-5 pb-3 sm:px-10 sm:pt-8 sm:pb-4">
        <div className="flex flex-col gap-3.5 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-4">
          {/* Left: SHIKAS + Shizuku Umbrella logo (calibrated for 360px+ breathing room) */}
          <div className="flex items-center justify-between gap-2 md:justify-start">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              aria-label="shikas Home"
              className="group inline-flex shrink-0 items-center gap-1.5 text-[#745bc7] transition-opacity hover:opacity-75 focus:outline-none sm:gap-2"
            >
              <span className="font-editorial text-[17px] font-medium tracking-[0.22em] uppercase sm:text-[23px] sm:tracking-[0.28em]">
                SHIKAS
              </span>
              <ShizukuUmbrellaMark className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
            </button>

            {/* Mobile Right Controls: SHIZUKU ID Status + EN | ID */}
            <div className="flex shrink-0 items-center gap-2 md:hidden">
              {renderAccountTrigger(true)}
              <div
                role="group"
                aria-label="Language switcher"
                className="flex shrink-0 items-center gap-1 font-editorial text-xs font-bold tracking-[0.12em]"
              >
                <button
                  type="button"
                  onClick={() => setLocale("en")}
                  className={`px-0.5 py-0.5 ${
                    locale === "en"
                      ? "text-[#745bc7]"
                      : "text-[#745bc7]/40 transition hover:text-[#745bc7]/80"
                  }`}
                >
                  EN
                </button>
                <span className="text-[#745bc7]/30">|</span>
                <button
                  type="button"
                  onClick={() => setLocale("id")}
                  className={`px-0.5 py-0.5 ${
                    locale === "id"
                      ? "text-[#745bc7]"
                      : "text-[#745bc7]/40 transition hover:text-[#745bc7]/80"
                  }`}
                >
                  ID
                </button>
              </div>
            </div>
          </div>

          {/* Dead-Center 3-Tab Nav (HOME · CASHFLOW · ANALYTICS) */}
          <nav aria-label="Primary navigation" className="flex justify-center">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 sm:gap-x-11">
              {NAV_TABS.map((tab) => {
                const active = activeTab === tab;
                return (
                  <li key={tab}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`font-nav pb-0.5 text-[15px] tracking-[0.12em] uppercase transition sm:text-[16px] sm:tracking-[0.14em] ${
                        active
                          ? "border-b-[1.5px] border-[#14100e] font-medium text-[#14100e]"
                          : "border-b-[1.5px] border-transparent font-normal text-[#14100e]/60 hover:text-[#14100e]"
                      }`}
                    >
                      {t.nav[tab]}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Desktop Right: Aligned SHIZUKU ID Status + EN | ID */}
          <div className="hidden items-center justify-end gap-4 md:flex">
            {renderAccountTrigger(false)}

            <div
              role="group"
              aria-label="Language switcher"
              className="flex shrink-0 items-center gap-2 font-editorial text-[13px] font-bold tracking-[0.18em]"
            >
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={
                  locale === "en"
                    ? "text-[#745bc7]"
                    : "text-[#745bc7]/40 transition hover:text-[#745bc7]/80"
                }
              >
                EN
              </button>
              <span className="text-[#745bc7]/30">|</span>
              <button
                type="button"
                onClick={() => setLocale("id")}
                className={
                  locale === "id"
                    ? "text-[#745bc7]"
                    : "text-[#745bc7]/40 transition hover:text-[#745bc7]/80"
                }
              >
                ID
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
