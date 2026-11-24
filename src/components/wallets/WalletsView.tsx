import React, { useMemo, useState } from "react";
import { Archive, ArrowLeftRight, Pencil, Plus, X } from "lucide-react";
import { useCashflow } from "../../context/CashflowContext";
import type { Wallet, WalletType } from "../../types/cashflow";
import { computeTotalNetBalance, computeWalletBalances } from "../../utils/calculations";
import { WalletTypeIcon } from "../common/CategoryIcon";
import { MoneyDisplay } from "../common/MoneyDisplay";

const WALLET_COLORS = ["#745bc7", "#7650f3", "#2276a8", "#14866d", "#d749d5", "#c23b7b"];

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
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-[#745bc7] uppercase">
            RECONCILED LIQUIDITY · {activeWallets.length} {t.dashboard.activeWallets}
          </p>
          <h1 className="font-editorial mt-1.5 text-[30px] font-normal leading-none tracking-[7px] text-[#745bc7] uppercase sm:text-[36px] sm:tracking-[9px]">
            {t.wallets.title}
          </h1>
          <p className="mt-2 text-sm text-[#5d5370]">{t.wallets.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openNew}
            className="tuyu-primary-btn px-4 py-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.actions.addWallet}
          </button>
          <button
            type="button"
            onClick={() => openNewTxModal("transfer")}
            className="tuyu-pill-btn px-3.5 py-2 text-[11px]"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {t.actions.transfer}
          </button>
        </div>
      </div>

      {/* Total Net Liquidity + Distribution Bar */}
      <section className="twilight-card rounded-2xl p-6 text-white">
        <p className="font-mono text-[11px] tracking-[0.18em] text-[#e5dcfb]/75 uppercase">
          {t.dashboard.totalBalance}
        </p>
        <div className="mt-2">
          <MoneyDisplay
            amountIdr={totalBalance}
            forceDual
            primaryClassName="text-3xl font-bold text-white"
            secondaryClassName="mt-1 text-sm text-[#e5dcfb]/80"
          />
        </div>

        {/* Segmented liquidity bar */}
        {totalBalance > 0 && (
          <div className="mt-5">
            <p className="font-mono text-[10px] tracking-[0.16em] text-[#e5dcfb]/75 uppercase">
              {t.wallets.distribution}
            </p>
            <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-white/12">
              {activeWallets.map((w) => {
                const bal = Math.max(0, balances[w.id] ?? w.initialBalanceIdr);
                const pct = totalBalance > 0 ? (bal / totalBalance) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={w.id}
                    style={{ width: `${pct}%`, backgroundColor: w.color }}
                    title={`${w.name}: ${pct.toFixed(1)}%`}
                    className="h-full transition-all"
                  />
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#e5dcfb]/90">
              {activeWallets.map((w) => {
                const bal = Math.max(0, balances[w.id] ?? w.initialBalanceIdr);
                const pct = totalBalance > 0 ? (bal / totalBalance) * 100 : 0;
                return (
                  <span key={w.id} className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: w.color }} />
                    <span>{w.name}</span>
                    <span className="font-mono text-[11px] text-white/75">{pct.toFixed(0)}%</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Wallet Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeWallets.map((w) => {
          const currentBal = balances[w.id] ?? w.initialBalanceIdr;
          const share = totalBalance > 0 ? Math.max(0, (currentBal / totalBalance) * 100) : 0;
          return (
            <article
              key={w.id}
              className="tuyu-sheet tuyu-sheet-hover flex flex-col justify-between rounded-2xl p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs"
                      style={{ backgroundColor: w.color }}
                    >
                      <WalletTypeIcon type={w.type} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#14100e]">{w.name}</h3>
                      <p className="text-xs text-[#5d5370]">
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
                      className="rounded-lg p-1.5 text-[#5d5370] transition hover:bg-[#745bc7]/12 hover:text-[#745bc7]"
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
                        className="rounded-lg p-1.5 text-[#5d5370] transition hover:bg-[#c23b7b]/12 hover:text-[#c23b7b]"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="font-mono text-[10px] tracking-[0.14em] text-[#5d5370] uppercase">
                    {t.wallets.currentBalance}
                  </p>
                  <div className="mt-1">
                    <MoneyDisplay
                      amountIdr={currentBal}
                      primaryClassName="text-xl font-bold text-[#14100e]"
                      secondaryClassName="text-xs text-[#5d5370]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#745bc7]/14 pt-3 text-[11px] text-[#5d5370]">
                <span>
                  {t.wallets.initialBalance}:{" "}
                  <MoneyDisplay
                    amountIdr={w.initialBalanceIdr}
                    inline
                    primaryClassName="font-medium text-[#5d5370]"
                    secondaryClassName="hidden"
                  />
                </span>
                <span className="font-mono font-semibold text-[#745bc7]">
                  {share.toFixed(1)}%
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {/* Add/Edit Wallet Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b1530]/55 p-4 backdrop-blur-xs"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#745bc7]/30 bg-[#f8f5ff] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-editorial text-xl font-semibold tracking-[0.16em] text-[#745bc7] uppercase">
                {editing ? t.wallets.editWalletTitle : t.wallets.newWalletTitle}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-[#5d5370] hover:bg-[#745bc7]/12"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                  {t.wallets.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="cth. BNI Taplus / OVO"
                  className="mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#7650f3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                    {t.wallets.typeLabel}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as WalletType)}
                    className="mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#7650f3]"
                  >
                    {(["bank", "ewallet", "cash", "savings"] as const).map((wt) => (
                      <option key={wt} value={wt}>
                        {t.wallets.types[wt]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                    {t.wallets.institutionLabel}
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Bank BNI"
                    className="mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#7650f3]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                  {t.wallets.initialBalance} (IDR)
                </label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="font-mono-num mt-1 w-full rounded-xl border border-[#745bc7]/28 bg-white px-3 py-2 text-sm text-[#14100e] outline-none focus:border-[#7650f3]"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold tracking-wider text-[#5d5370] uppercase">
                  {t.wallets.colorLabel}
                </label>
                <div className="mt-2 flex items-center gap-2.5">
                  {WALLET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`h-7 w-7 rounded-full transition ${
                        color === c ? "scale-110 ring-2 ring-[#14100e] ring-offset-2" : "opacity-75 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-[#745bc7]/30 px-4 py-2 text-xs font-semibold text-[#5d5370]"
                >
                  {t.actions.cancel}
                </button>
                <button type="submit" className="tuyu-primary-btn px-5 py-2 text-xs">
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
