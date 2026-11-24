import React from "react";
import { CashflowProvider, useCashflow } from "./context/CashflowContext";
import { ShizukuRainLayer } from "./components/layout/ShizukuRainLayer";
import { Header } from "./components/layout/Header";
import { NavigationBar } from "./components/layout/Navigation";
import { Footer } from "./components/layout/Footer";
import { FxConverterModal } from "./components/common/FxConverterModal";
import { TransactionModal } from "./components/common/TransactionModal";
import { DashboardView } from "./components/dashboard/DashboardView";
import { LedgerView } from "./components/ledger/LedgerView";
import { WalletsView } from "./components/wallets/WalletsView";
import { BudgetsView } from "./components/budgets/BudgetsView";
import { AnalyticsView } from "./components/analytics/AnalyticsView";
import { PlanningView } from "./components/planning/PlanningView";
import { SettingsView } from "./components/settings/SettingsView";

const ToastStack: React.FC = () => {
  const { toasts } = useCashflow();
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-50 flex flex-col gap-2 md:bottom-6">
      {toasts.map((toast) => {
        const bg =
          toast.tone === "success"
            ? "bg-[#14866d] text-white"
            : toast.tone === "danger"
              ? "bg-[#c23b7b] text-white"
              : "bg-[#2b1f4d] text-[#f4f0ff]";
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-full px-4 py-2 text-xs font-semibold shadow-lg ${bg}`}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
};

const ShiKasShell: React.FC = () => {
  const { activeTab } = useCashflow();

  return (
    <div className="shizuku-canvas relative flex min-h-screen flex-col text-[#14100e]">
      <ShizukuRainLayer />
      <Header />
      <NavigationBar />

      <main className="relative z-10 mx-auto w-full max-w-[1160px] flex-1 px-4 pt-6 pb-8 sm:px-6">
        {activeTab === "dashboard" && <DashboardView />}
        {activeTab === "ledger" && <LedgerView />}
        {activeTab === "wallets" && <WalletsView />}
        {activeTab === "budgets" && <BudgetsView />}
        {activeTab === "analytics" && <AnalyticsView />}
        {activeTab === "planning" && <PlanningView />}
        {activeTab === "settings" && <SettingsView />}
      </main>

      <Footer />
      <TransactionModal />
      <FxConverterModal />
      <ToastStack />
    </div>
  );
};

export function App() {
  return (
    <CashflowProvider>
      <ShiKasShell />
    </CashflowProvider>
  );
}

export default App;
