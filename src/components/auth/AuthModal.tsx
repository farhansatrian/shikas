import React, { useEffect, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { isCloudSyncConfigured } from "../../config/ecosystem";
import { useCashflow, type AuthModalMode } from "../../context/CashflowContext";
import {
  getGoogleOAuthUrl,
  rememberPostAuthTab,
} from "../../services/shizukuAuth";

function ShizukuUmbrellaGlyph({ className = "h-6 w-6" }: { className?: string }) {
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

function GoogleColorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.86l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.34a7.2 7.2 0 0 1 0-4.68v-3.1H1.28a12 12 0 0 0 0 10.88l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.71c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.18 15.24 0 12 0A12 12 0 0 0 1.28 6.56l4 3.1C6.23 6.82 8.88 4.71 12 4.71Z"
      />
    </svg>
  );
}

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    closeAuthModal,
    activeTab,
    signIn,
    register,
    store,
    t,
  } = useCashflow();

  const [mode, setMode] = useState<AuthModalMode>("signin");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [importSandbox, setImportSandbox] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    setMode(authModalMode);
    setErrorMsg(null);
    setPassword("");
    setShowPassword(false);
    setSubmitting(false);
  }, [isAuthModalOpen, authModalMode]);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const cloudEnabled = isCloudSyncConfigured();
  const googleAuthHref = getGoogleOAuthUrl();

  const resolveError = (err: unknown): string => {
    const code = err instanceof Error ? err.message : "";
    const map = t.auth.errors as Record<string, string>;
    return map[code] || code || t.auth.errors.INVALID_CREDENTIALS;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await register(email, displayName, password, importSandbox);
      }
    } catch (err) {
      setErrorMsg(resolveError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleContinue = () => {
    if (!googleAuthHref) {
      setErrorMsg(t.auth.googleOfflineHint);
      return;
    }
    rememberPostAuthTab(activeTab);
    window.location.assign(googleAuthHref);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#14100e]/45 p-4 backdrop-blur-xs"
      onClick={closeAuthModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.auth.title}
        className="vn-frame animate-modal-in my-auto w-full max-w-[450px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Signature SHIZUKU Watercolor Band Header */}
        <div className="shikas-band-strip flex items-center justify-between px-4 py-2.5 text-white">
          <span className="font-mono text-[10.5px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
            {t.auth.title}
          </span>
          <div className="flex items-center gap-2.5">
            <span className="hidden font-mono text-[10px] font-semibold tracking-[0.14em] uppercase drop-shadow-2xs sm:inline">
              {mode === "signin" ? t.auth.signInTab : t.auth.registerTab}
            </span>
            <button
              type="button"
              onClick={closeAuthModal}
              aria-label={t.actions.close}
              className="inline-flex items-center gap-1 border border-white/45 bg-white/15 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-white uppercase transition hover:bg-white/30"
            >
              <span>ESC</span>
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="bg-white/96 p-5 sm:p-7">
          {/* Emblem & Title (Aligned 1:1 with SHIZUKU /account) */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-11 w-11 items-center justify-center border border-[#745bc7]/45 bg-gradient-to-b from-[#efe9fd] to-[#fde8f6] text-[#745bc7] shadow-[2px_2px_0_0_rgba(116,91,199,0.14)]">
              <ShizukuUmbrellaGlyph className="h-6 w-6" />
            </div>
            <h2 className="mt-3 font-editorial text-2xl font-bold tracking-[0.18em] text-[#14100e] uppercase">
              {mode === "signin" ? t.auth.signInHeading : t.auth.registerHeading}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#5d5370]">
              {cloudEnabled ? t.auth.subtitleCloud : t.auth.subtitleLocal}
            </p>
          </div>

          {/* Sharp 2-Tab Mode Switcher: SIGN IN | REGISTER */}
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="mt-5 grid grid-cols-2 border-[1.5px] border-[#745bc7] bg-[#fdfbff] font-mono text-[11px]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              onClick={() => {
                setMode("signin");
                setErrorMsg(null);
              }}
              className={`py-2 font-semibold tracking-[0.14em] uppercase transition ${
                mode === "signin"
                  ? "bg-[#745bc7] text-white"
                  : "text-[#5d5370] hover:bg-[#efe9fd] hover:text-[#14100e]"
              }`}
            >
              {t.auth.signInTab}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => {
                setMode("register");
                setErrorMsg(null);
              }}
              className={`border-l border-[#745bc7] py-2 font-semibold tracking-[0.14em] uppercase transition ${
                mode === "register"
                  ? "bg-[#745bc7] text-white"
                  : "text-[#5d5370] hover:bg-[#efe9fd] hover:text-[#14100e]"
              }`}
            >
              {t.auth.registerTab}
            </button>
          </div>

          {/* Continue with Google OAuth via SHIZUKU Hub */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleContinue}
              disabled={!googleAuthHref}
              title={!googleAuthHref ? t.auth.googleOfflineHint : undefined}
              className="flex w-full items-center justify-center gap-2.5 border-[1.5px] border-[#745bc7]/55 bg-white px-4 py-2.5 font-sans text-[13.5px] font-semibold text-[#14100e] shadow-[2px_2px_0_0_rgba(116,91,199,0.14)] transition hover:border-[#745bc7] hover:bg-[#f7f2ff] active:translate-x-[1px] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <GoogleColorIcon className="h-4 w-4 shrink-0" />
              <span>{t.auth.continueWithGoogle}</span>
            </button>
          </div>

          {/* Hairline Divider: OR WITH EMAIL */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#745bc7]/22" />
            <span className="font-mono text-[10px] tracking-[0.18em] text-[#7b6f94] uppercase">
              {t.auth.orWithEmail}
            </span>
            <div className="h-px flex-1 bg-[#745bc7]/22" />
          </div>

          {/* Crisp Bordered Email Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "register" && (
              <div>
                <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                  {t.auth.nameLabel}
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  maxLength={60}
                  placeholder={t.auth.namePlaceholder}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1.5 w-full border border-[#745bc7]/45 bg-white px-3.5 py-2 text-sm text-[#14100e] outline-none transition placeholder:text-[#8b7fa6] focus:border-[#745bc7] focus:ring-2 focus:ring-[#745bc7]/15"
                />
              </div>
            )}

            <div>
              <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                {t.auth.emailLabel}
              </label>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder={t.auth.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full border border-[#745bc7]/45 bg-white px-3.5 py-2 text-sm text-[#14100e] outline-none transition placeholder:text-[#8b7fa6] focus:border-[#745bc7] focus:ring-2 focus:ring-[#745bc7]/15"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                {t.auth.passwordLabel}
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder={t.auth.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[#745bc7]/45 bg-white py-2 pr-10 pl-3.5 text-sm text-[#14100e] outline-none transition placeholder:text-[#8b7fa6] focus:border-[#745bc7] focus:ring-2 focus:ring-[#745bc7]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-[#7b6f94] transition hover:text-[#745bc7]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {mode === "register" && store.transactions.length > 0 && (
              <label className="flex cursor-pointer items-start gap-2.5 border border-[#745bc7]/25 bg-[#f7f3fe] px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={importSandbox}
                  onChange={(e) => setImportSandbox(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-[#745bc7]"
                />
                <span className="text-[11px] leading-snug text-[#4e4361]">
                  <span className="block font-semibold text-[#14100e]">
                    {t.auth.importSandboxLabel}
                  </span>
                  <span className="text-[10px] text-[#5d5370]">
                    {t.auth.startFreshHint}
                  </span>
                </span>
              </label>
            )}

            {errorMsg && (
              <p className="border border-[#c837a5] bg-[#d749d5]/10 px-3 py-2 font-mono text-[11px] font-semibold text-[#c837a5]">
                ! {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="vn-btn-band mt-1 w-full py-2.5 disabled:opacity-60"
            >
              <span>▶</span>
              <span>
                {mode === "signin" ? t.auth.submitSignIn : t.auth.submitRegister}
              </span>
            </button>
          </form>

          {/* Subtle Mode Switch Link */}
          <div className="mt-4 border-t border-[#745bc7]/20 pt-3 text-center font-mono text-[10.5px] text-[#5d5370]">
            <span>
              {mode === "signin" ? t.auth.switchToRegister : t.auth.switchToSignIn}{" "}
            </span>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "register" : "signin");
                setErrorMsg(null);
              }}
              className="font-bold text-[#745bc7] underline underline-offset-4 hover:text-[#b8339f]"
            >
              {mode === "signin" ? t.auth.registerTab : t.auth.signInTab}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
