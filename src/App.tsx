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
        const accent =
          toast.tone === "success"
            ? "border-[#2276a8] text-[#14100e]"
            : toast.tone === "danger"
              ? "border-[#c837a5] text-[#c837a5]"
              : "border-[#745bc7] text-[#14100e]";
        const arrowColor =
          toast.tone === "success"
            ? "text-[#2276a8]"
            : toast.tone === "danger"
              ? "text-[#c837a5]"
              : "text-[#745bc7]";
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 border-[1.5px] bg-[#fdf9ff]/95 px-4 py-2 font-mono text-[11px] font-medium tracking-[0.06em] shadow-[3px_3px_0_0_rgba(116,91,199,0.22)] backdrop-blur-md ${accent}`}
          >
            <span className={arrowColor}>▶</span>
            <span>{toast.message}</span>
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
