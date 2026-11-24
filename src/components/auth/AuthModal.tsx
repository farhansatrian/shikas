import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SHIKAS_ASSETS } from "../../config/assets";
import { isCloudSyncConfigured } from "../../config/ecosystem";
import { useCashflow, type AuthModalMode } from "../../context/CashflowContext";

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    closeAuthModal,
    signIn,
    register,
    t,
  } = useCashflow();

  const [mode, setMode] = useState<AuthModalMode>("signin");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [importSandbox, setImportSandbox] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    setMode(authModalMode);
    setErrorMsg(null);
    setPassword("");
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#14100e]/45 p-4 backdrop-blur-xs"
      onClick={closeAuthModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.auth.title}
        className="vn-dialogue animate-modal-in my-auto w-full max-w-[440px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Vivid SHIZUKU Watercolor Band Header */}
        <div className="shikas-band-strip flex items-center justify-between px-4 py-2.5 text-white">
          <span className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase drop-shadow-2xs">
            {t.auth.title}
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

        <div className="p-5 sm:p-6">
          {/* SHIZUKU Identity Intro */}
          <div className="flex items-center gap-3.5 border-b border-[#745bc7]/20 pb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#745bc7] bg-gradient-to-b from-[#efe9fd] to-[#fde8f6] p-2">
              <img
                src={SHIKAS_ASSETS.umbrella}
                alt="SHIZUKU ID"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="font-editorial text-base font-bold tracking-[0.18em] text-[#745bc7] uppercase">
                SHIZUKU ECOSYSTEM
              </p>
              <p className="mt-0.5 font-mono text-[10.5px] leading-snug text-[#5d5370]">
                {cloudEnabled ? t.auth.subtitleCloud : t.auth.subtitleLocal}
              </p>
            </div>
          </div>

          {/* Sharp RPG Mode Toggle: SIGN IN | CREATE ID */}
          <div className="mt-4 grid grid-cols-2 border border-[#745bc7]">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg(null);
              }}
              className={`border-r border-[#745bc7] py-2 font-mono text-[10.5px] font-bold tracking-[0.14em] uppercase transition ${
                mode === "signin"
                  ? "bg-[#745bc7] text-white"
                  : "bg-white/75 text-[#5d5370] hover:bg-[#e5dcfb]/45 hover:text-[#14100e]"
              }`}
            >
              {mode === "signin" ? `▶ ${t.auth.signInTab}` : t.auth.signInTab}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMsg(null);
              }}
              className={`py-2 font-mono text-[10.5px] font-bold tracking-[0.14em] uppercase transition ${
                mode === "register"
                  ? "bg-[#745bc7] text-white"
                  : "bg-white/75 text-[#5d5370] hover:bg-[#e5dcfb]/45 hover:text-[#14100e]"
              }`}
            >
              {mode === "register" ? `▶ ${t.auth.registerTab}` : t.auth.registerTab}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            {mode === "register" && (
              <div>
                <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                  {t.auth.nameLabel}
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder={t.auth.namePlaceholder}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1.5 w-full border border-[#745bc7]/40 bg-white px-3 py-2 text-xs text-[#14100e] outline-none transition placeholder:text-[#5d5370]/60 focus:border-[#745bc7]"
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
                className="mt-1.5 w-full border border-[#745bc7]/40 bg-white px-3 py-2 font-mono text-xs text-[#14100e] outline-none transition placeholder:text-[#5d5370]/60 focus:border-[#745bc7]"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] font-semibold tracking-[0.16em] text-[#5d5370] uppercase">
                {t.auth.passwordLabel}
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder={t.auth.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full border border-[#745bc7]/40 bg-white px-3 py-2 font-mono text-xs text-[#14100e] outline-none transition placeholder:text-[#5d5370]/60 focus:border-[#745bc7]"
              />
            </div>

            {mode === "register" && (
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
