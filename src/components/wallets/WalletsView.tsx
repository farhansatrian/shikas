import React, { useMemo, useState } from "react";
import { Archive, Pencil, Plus, X } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import type { Wallet, WalletType } from "../../types/cashflow";
import { computeTotalNetBalance, computeWalletBalances } from "../../utils/calculations";
import { MoneyDisplay } from "../common/MoneyDisplay";

const WALLET_COLORS = ["#14100e", "#745bc7", "#1e6c99", "#117a62", "#b42e69", "#7650f3"];

export const WalletsView: React.FC = () => {
  const { store, t, openNewTxModal, saveWallet, archiveWallet } = useCashflow();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Wallet | null>(null);

  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [type, setType] = useState<WalletType>("bank");
  const [initialBalance, setInitialBalance] = useState("0");
  const [color, setColor] = useState(WALLET_COLORS[0]);

  const activeWallets = useMemo(
    () => store.wallets.filter((w) => !w.isArchived),
    [store.wallets]
  );

  const balances = useMemo(
    () => computeWalletBalances(store.wallets, store.transactions),
    [store.wallets, store.transactions]
  );

  const totalBalance = useMemo(
    () => computeTotalNetBalance(store.wallets, balances),
    [store.wallets, balances]
  );

  const openNew = () => {
    setEditing(null);
    setName("");
    setInstitution("");
    setType("bank");
    setInitialBalance("0");
    setColor(WALLET_COLORS[0]);
    setModalOpen(true);
  };

  const openEdit = (w: Wallet) => {
    setEditing(w);
    setName(w.name);
    setInstitution(w.institution ?? "");
    setType(w.type);
    setInitialBalance(String(w.initialBalanceIdr));
    setColor(w.color);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveWallet(
      {
        name: name.trim(),
        institution: institution.trim() || undefined,
        type,
        initialBalanceIdr: Math.round(Number(initialBalance) || 0),
        color,
      },
      editing?.id
    );
    setModalOpen(false);
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#5f5368] uppercase">
            RECONCILED LIQUIDITY · {activeWallets.length} {t.dashboard.activeWallets}
          </p>
          <h1 className="font-nav mt-1 text-2xl font-medium tracking-[0.16em] text-[#14100e] uppercase sm:text-3xl">
            {t.wallets.title}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openNew}
            className="gallery-btn-solid px-4 py-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.actions.addWallet}
          </button>
          <button
            type="button"
            onClick={() => openNewTxModal("transfer")}
            className="gallery-btn px-4 py-2 text-xs"
          >
            {t.actions.transfer}
          </button>
        </div>
      </div>

      {/* Stark Monochrome Total Net Liquidity */}
      <section className="gallery-dark p-6 sm:p-7">
        <p className="font-mono text-[10px] tracking-[0.2em] text-white/55 uppercase">
          {t.dashboard.totalBalance}
        </p>
        <div className="mt-2">
          <MoneyDisplay
            amountIdr={totalBalance}
            forceDual
            primaryClassName="text-3xl font-semibold text-white"
            secondaryClassName="mt-1 text-sm text-white/60"
          />
        </div>

        {totalBalance > 0 && (
          <div className="mt-6">
            <div className="flex h-[4px] w-full overflow-hidden bg-white/15">
              {activeWallets.map((w) => {
                const bal = Math.max(0, balances[w.id] ?? w.initialBalanceIdr);
                const pct = totalBalance > 0 ? (bal / totalBalance) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={w.id}
                    style={{ width: `${pct}%`, backgroundColor: w.color }}
                    className="h-full"
                  />
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-white/75">
              {activeWallets.map((w) => {
                const bal = Math.max(0, balances[w.id] ?? w.initialBalanceIdr);
                const pct = totalBalance > 0 ? (bal / totalBalance) * 100 : 0;
                return (
                  <span key={w.id} className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: w.color }} />
                    <span>{w.name}</span>
                    <span className="text-white/50">{pct.toFixed(0)}%</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Wallet Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {activeWallets.map((w) => {
          const currentBal = balances[w.id] ?? w.initialBalanceIdr;
          const share = totalBalance > 0 ? Math.max(0, (currentBal / totalBalance) * 100) : 0;
          return (
            <article
              key={w.id}
              className="gallery-sheet gallery-sheet-hover flex flex-col justify-between p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-baseline gap-2.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: w.color }}
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-[#14100e]">{w.name}</h3>
                    <p className="mt-0.5 font-mono text-[11px] text-[#5f5368]">
                      {w.institution ? `${w.institution} · ` : ""}
                      {t.wallets.types[w.type]}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(w)}
                    aria-label={t.actions.edit}
                    className="p-1.5 text-[#5f5368] hover:text-[#14100e]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {activeWallets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t.wallets.deleteConfirm)) {
                          archiveWallet(w.id);
                        }
                      }}
                      aria-label="Archive"
                      className="p-1.5 text-[#5f5368] hover:text-[#b42e69]"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <MoneyDisplay
                  amountIdr={currentBal}
                  primaryClassName="text-xl font-semibold text-[#14100e]"
                  secondaryClassName="text-xs text-[#5f5368]"
                />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#14100e]/10 pt-3 font-mono text-[11px] text-[#5f5368]">
                <span>
                  {t.wallets.initialBalance}:{" "}
                  <MoneyDisplay
                    amountIdr={w.initialBalanceIdr}
                    inline
                    primaryClassName="text-[#5f5368]"
                    secondaryClassName="hidden"
                  />
                </span>
                <span className="text-[#14100e]">{share.toFixed(1)}%</span>
              </div>
            </article>
          );
        })}
      </div>

      {/* Minimalist Wallet Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111015]/55 p-4 backdrop-blur-xs"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md border border-[#14100e]/25 bg-[#fdfbfd] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#14100e]/12 pb-3">
              <h2 className="font-nav text-lg font-medium tracking-[0.14em] text-[#14100e] uppercase">
                {editing ? t.wallets.editWalletTitle : t.wallets.newWalletTitle}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-[#5f5368] hover:text-[#14100e]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                  {t.wallets.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="cth. BNI Taplus / OVO"
                  className="mt-1 w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#14100e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                    {t.wallets.typeLabel}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as WalletType)}
                    className="mt-1 w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#14100e]"
                  >
                    {(["bank", "ewallet", "cash", "savings"] as const).map((wt) => (
                      <option key={wt} value={wt}>
                        {t.wallets.types[wt]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                    {t.wallets.institutionLabel}
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Bank BNI"
                    className="mt-1 w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#14100e]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                  {t.wallets.initialBalance} (IDR)
                </label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="font-mono-num mt-1 w-full border border-[#14100e]/22 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#14100e]"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] tracking-[0.14em] text-[#5f5368] uppercase">
                  {t.wallets.colorLabel}
                </label>
                <div className="mt-2 flex items-center gap-2.5">
                  {WALLET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`h-6 w-6 rounded-full transition ${
                        color === c ? "ring-2 ring-[#14100e] ring-offset-2" : "opacity-70 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="gallery-btn px-4 py-2 text-xs"
                >
                  {t.actions.cancel}
                </button>
                <button type="submit" className="gallery-btn-solid px-5 py-2 text-xs">
                  {t.actions.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
