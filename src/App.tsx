import React from "react";
import { CashflowProvider, useCashflow } from "./context/CashflowContext";
import { ShizukuRainLayer } from "./components/layout/ShizukuRainLayer";
import { MinimalNav } from "./components/layout/MinimalNav";
import { Footer } from "./components/layout/Footer";
import { TransactionModal } from "./components/common/TransactionModal";
import { DashboardView } from "./components/dashboard/DashboardView";
import { CashflowView } from "./components/cashflow/CashflowView";
import { AnalyticsView } from "./components/analytics/AnalyticsView";
import { SettingsView } from "./components/settings/SettingsView";

const ToastStack: React.FC = () => {
  const { toasts } = useCashflow();
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const bg =
          toast.tone === "success"
            ? "bg-[#117a62] text-white"
            : toast.tone === "danger"
              ? "bg-[#b42e69] text-white"
              : "bg-[#111015] text-white";
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
    <div className="relative flex min-h-screen flex-col text-[#14100e]">
      <div className="shikas-watercolor-bg" aria-hidden="true" />
      <ShizukuRainLayer />
      <MinimalNav />

      <main className="relative z-10 mx-auto w-full max-w-[960px] flex-1 px-5 pt-2 pb-10 sm:px-8">
        {activeTab === "home" && <DashboardView />}
        {activeTab === "cashflow" && <CashflowView />}
        {activeTab === "analytics" && <AnalyticsView />}
        {activeTab === "data" && <SettingsView />}
      </main>

      <Footer />
      <TransactionModal />
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
