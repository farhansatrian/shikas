import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Star, Trash2, X } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import type { AccountRole, PocketAccount } from "../../types/cashflow";
import { computeAccountBalances } from "../../utils/calculations";
import { MoneyDisplay } from "../common/MoneyDisplay";

const POCKET_COLORS = [
  { hex: "#2276a8", label: "Cerulean" },
  { hex: "#745bc7", label: "Iris" },
  { hex: "#1f8f6b", label: "Emerald" },
  { hex: "#c837a5", label: "Magenta" },
  { hex: "#4e5d78", label: "Slate" },
];

const QUICK_PRESETS: Array<{
  name: string;
  role: AccountRole;
  color: string;
}> = [
  { name: "Wondr", role: "daily", color: "#2276a8" },
  { name: "GoPay", role: "daily", color: "#1f8f6b" },
  { name: "BCA", role: "savings", color: "#745bc7" },
  { name: "Mandiri", role: "daily", color: "#2276a8" },
  { name: "Jago", role: "savings", color: "#c837a5" },
  { name: "OVO", role: "daily", color: "#745bc7" },
  { name: "Cash", role: "daily", color: "#4e5d78" },
];

function formatDigitsWithDots(digits: string): string {
  const clean = digits.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export const ManagePocketsModal: React.FC = () => {
  const {
    isPocketsModalOpen,
    closePocketsModal,
    store,
    saveAccount,
    deleteAccount,
    setDefaultAccount,
    t,
    locale,
  } = useCashflow();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<AccountRole>("daily");
  const [openingDigits, setOpeningDigits] = useState("");
  const [color, setColor] = useState("#2276a8");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overview = useMemo(
    () => computeAccountBalances(store.accounts, store.transactions),
    [store.accounts, store.transactions]
  );

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setRole("daily");
    setOpeningDigits("");
    setColor("#2276a8");
    setIsDefault(store.accounts.length === 0);
    setError(null);
  };

  useEffect(() => {
    if (!isPocketsModalOpen) return;
    resetForm();
  }, [isPocketsModalOpen]);

  useEffect(() => {
    if (!isPocketsModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePocketsModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPocketsModalOpen, closePocketsModal]);

  if (!isPocketsModalOpen) return null;

  const startEdit = (acc: PocketAccount) => {
    setEditingId(acc.id);
    setName(acc.name);
    setRole(acc.role);
    setOpeningDigits(
      acc.openingBalanceIdr > 0 ? String(acc.openingBalanceIdr) : ""
    );
    setColor(acc.color);
    setIsDefault(Boolean(acc.isDefault));
    setError(null);
  };

  const applyPreset = (preset: (typeof QUICK_PRESETS)[number]) => {
    setEditingId(null);
    setName(preset.name);
    setRole(preset.role);
    setColor(preset.color);
    setIsDefault(store.accounts.length === 0 && preset.role === "daily");
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(
        locale === "id"
          ? "Nama kantong wajib diisi."
          : "Pocket name is required."
      );
      return;
    }

    const openingBalanceIdr = Number(openingDigits) || 0;
    saveAccount(
      {
        name: trimmed,
        role,
        openingBalanceIdr,
        color,
        isDefault,
      },
      editingId ?? undefined
    );

    setEditingId(null);
    setName("");
    setRole("daily");
    setOpeningDigits("");
    setColor("#2276a8");
    setIsDefault(false);
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#14100e]/45 p-4 backdrop-blur-xs"
      onClick={closePocketsModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.pockets.modalTitle}
        className="vn-dialogue animate-modal-in my-auto flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Watercolor Band Header */}
        <div className="shikas-band-strip flex shrink-0 items-center justify-between gap-2 px-4 py-2.5 text-white">
          <span className="truncate font-mono text-[10.5px] font-semibold tracking-[0.18em] uppercase drop-shadow-2xs">
            {t.pockets.modalTitle}
          </span>
          <button
            type="button"
            onClick={closePocketsModal}
            aria-label={t.actions.close}
            className="inline-flex shrink-0 items-center gap-1 border border-white/45 bg-white/15 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-white uppercase transition hover:bg-white/30"
          >
            <span>ESC</span>
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {/* 1. Existing Pockets List */}
          {overview.items.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#745bc7] uppercase">
                  {locale === "id"
                    ? `KANTONG AKTIF (${overview.items.length})`
                    : `ACTIVE POCKETS (${overview.items.length})`}
                </h3>
                <span className="font-mono text-[10px] text-[#5d5370]">
                  {t.cashflow.totalSaved}:{" "}
                  <MoneyDisplay
                    amountIdr={overview.totalBalanceIdr}
                    className="font-bold text-[#14100e]"
                  />
                </span>
              </div>

              <ul className="divide-y divide-[#745bc7]/15 border border-[#745bc7]/35 bg-white">
                {overview.items.map(({ account, balanceIdr }) => (
                  <li
                    key={account.id}
                    className={`flex items-center justify-between gap-2.5 px-3 py-2.5 ${
                      editingId === account.id ? "bg-[#f4effe]" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-7 w-1 shrink-0"
                        style={{ backgroundColor: account.color }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-mono text-xs font-bold text-[#14100e]">
                            {account.name}
                          </span>
                          <span
                            className={`border px-1 py-0.5 font-mono text-[8px] font-bold tracking-[0.1em] uppercase ${
                              account.role === "savings"
                                ? "border-[#745bc7]/50 bg-[#745bc7]/10 text-[#745bc7]"
                                : "border-[#2276a8]/35 bg-[#2276a8]/8 text-[#2276a8]"
                            }`}
                          >
                            {account.role === "savings"
                              ? t.pockets.savingsLabel
                              : t.pockets.dailyLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-[#5d5370]">
                          {locale === "id" ? "Saldo:" : "Live:"}{" "}
                          <MoneyDisplay
                            amountIdr={balanceIdr}
                            className="font-semibold text-[#14100e]"
                          />{" "}
                          · {locale === "id" ? "Awal:" : "Open:"}{" "}
                          <MoneyDisplay amountIdr={account.openingBalanceIdr} />
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDefaultAccount(account.id)}
                        title={
                          locale === "id"
                            ? "Jadikan kantong utama"
                            : "Set as default pocket"
                        }
                        className={`p-1.5 transition ${
                          account.isDefault
                            ? "text-[#745bc7]"
                            : "text-[#5d5370]/50 hover:text-[#745bc7]"
                        }`}
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            account.isDefault ? "fill-[#745bc7]" : ""
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(account)}
                        aria-label={t.actions.edit}
                        className="p-1.5 text-[#5d5370] transition hover:text-[#745bc7]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t.pockets.confirmDelete)) {
                            deleteAccount(account.id);
                            if (editingId === account.id) resetForm();
                          }
                        }}
                        aria-label={t.actions.delete}
                        className="p-1.5 text-[#5d5370] transition hover:text-[#c837a5]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 2. Add / Edit Pocket Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-3.5 border border-[#745bc7]/40 bg-white/90 p-4"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#745bc7]/15 pb-2">
              <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#745bc7] uppercase">
                {editingId
                  ? locale === "id"
                    ? "▶ UBAH KANTONG"
                    : "▶ EDIT POCKET"
                  : locale === "id"
                    ? "▶ TAMBAH KANTONG BARU"
                    : "▶ ADD NEW POCKET"}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="font-mono text-[10px] font-semibold text-[#5d5370] underline hover:text-[#14100e]"
                >
                  {t.actions.cancel}
                </button>
              )}
            </div>

            {/* Quick Fill Presets (when adding) */}
            {!editingId && (
              <div>
                <span className="block font-mono text-[9.5px] font-semibold tracking-[0.14em] text-[#5d5370] uppercase">
                  {t.pockets.presetsLabel}
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {QUICK_PRESETS.map((preset) => {
                    const alreadyAdded = store.accounts.some(
                      (a) => a.name.toLowerCase() === preset.name.toLowerCase()
                    );
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] font-semibold transition ${
                          name.toLowerCase() === preset.name.toLowerCase()
                            ? "border-[#745bc7] bg-[#745bc7] text-white"
                            : alreadyAdded
                              ? "border-[#745bc7]/20 bg-[#f8f5fe] text-[#5d5370]/60 hover:border-[#745bc7]/50"
                              : "border-[#745bc7]/35 bg-white text-[#14100e] hover:border-[#745bc7] hover:bg-[#f4effe]"
                        }`}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0"
                          style={{
                            backgroundColor:
                              name.toLowerCase() === preset.name.toLowerCase()
                                ? "#ffffff"
                                : preset.color,
                          }}
                        />
                        <span>{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Name + Color Swatches */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="block font-mono text-[10px] font-semibold tracking-[0.14em] text-[#5d5370] uppercase">
                  {t.pockets.nameLabel}
                </label>
                <input
                  type="text"
                  maxLength={40}
                  placeholder={t.pockets.namePlaceholder}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  className="mt-1.5 w-full border border-[#745bc7]/40 bg-white px-3 py-2 text-xs text-[#14100e] outline-none transition placeholder:text-[#5d5370]/65 focus:border-[#745bc7]"
                />
              </div>

              <div>
                <span className="block font-mono text-[10px] font-semibold tracking-[0.14em] text-[#5d5370] uppercase">
                  {locale === "id" ? "WARNA" : "COLOR"}
                </span>
                <div className="mt-1.5 flex items-center gap-1.5 py-1">
                  {POCKET_COLORS.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => setColor(swatch.hex)}
                      aria-label={swatch.label}
                      className={`h-6 w-6 border transition ${
                        color === swatch.hex
                          ? "scale-110 border-[#14100e] ring-2 ring-[#745bc7]/35"
                          : "border-white/60 opacity-75 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Pocket Role 2-Tab Sharp Switcher */}
            <div>
              <span className="block font-mono text-[10px] font-semibold tracking-[0.14em] text-[#5d5370] uppercase">
                {t.pockets.roleLabel}
              </span>
              <div className="mt-1.5 grid grid-cols-2 border border-[#745bc7]">
                <button
                  type="button"
                  onClick={() => setRole("daily")}
                  className={`border-r border-[#745bc7] px-3 py-2 text-left transition ${
                    role === "daily"
                      ? "bg-[#2276a8]/14 text-[#14100e]"
                      : "bg-white text-[#5d5370] hover:bg-[#f5effe]"
                  }`}
                >
                  <p className="font-mono text-[10.5px] font-bold tracking-[0.12em] uppercase">
                    {role === "daily" ? "▶ " : ""}
                    {t.pockets.dailyLabel}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-[#5d5370]">
                    {t.pockets.dailyDesc}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("savings")}
                  className={`px-3 py-2 text-left transition ${
                    role === "savings"
                      ? "bg-[#745bc7]/14 text-[#14100e]"
                      : "bg-white text-[#5d5370] hover:bg-[#f5effe]"
                  }`}
                >
                  <p className="font-mono text-[10.5px] font-bold tracking-[0.12em] uppercase">
                    {role === "savings" ? "▶ " : ""}
                    {t.pockets.savingsLabel}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-[#5d5370]">
                    {t.pockets.savingsDesc}
                  </p>
                </button>
              </div>
            </div>

            {/* Opening Balance Input */}
            <div>
              <label className="block font-mono text-[10px] font-semibold tracking-[0.14em] text-[#5d5370] uppercase">
                {t.pockets.openingLabel}
              </label>
              <div className="mt-1.5 flex items-center gap-1.5 border border-[#745bc7]/40 bg-white px-3 py-2 focus-within:border-[#745bc7]">
                <span className="font-mono-num text-xs font-bold text-[#745bc7]">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatDigitsWithDots(openingDigits)}
                  onChange={(e) =>
                    setOpeningDigits(e.target.value.replace(/\D/g, "").slice(0, 12))
                  }
                  className="font-mono-num w-full bg-transparent text-sm font-bold text-[#14100e] outline-none placeholder:text-[#5d5370]/45"
                />
              </div>
              <p className="mt-1 font-mono text-[10px] leading-relaxed text-[#5d5370]">
                {t.pockets.openingHint}
              </p>
            </div>

            {/* Default Pocket Checkbox */}
            <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] text-[#14100e]">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#745bc7]"
              />
              <span>{t.pockets.defaultLabel}</span>
            </label>

            {error && (
              <p className="border border-[#c837a5] bg-[#d749d5]/10 px-3 py-1.5 font-mono text-[11px] font-semibold text-[#c837a5]">
                ! {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closePocketsModal}
                className="vn-btn-action px-4 py-2"
              >
                {t.actions.close}
              </button>
              <button type="submit" className="vn-btn-band px-5 py-2">
                <span>▶</span>
                <span>
                  {editingId ? t.actions.save : t.actions.addPocket}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
