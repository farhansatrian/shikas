import type { Locale } from "../types/cashflow";

export function formatIdr(amount: number, showSign = false): string {
  const abs = Math.round(Math.abs(amount));
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(abs);
  const sign = amount < 0 ? "-" : showSign && amount > 0 ? "+" : "";
  return `${sign}Rp ${formatted}`;
}

export function formatCompactIdr(amountIdr: number, locale: Locale): string {
  const abs = Math.abs(amountIdr);
  const sign = amountIdr < 0 ? "-" : "";
  const trimZero = (n: number) => n.toFixed(1).replace(/\.0$/, "");
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${trimZero(abs / 1_000_000_000)}${locale === "id" ? "M" : "B"}`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${trimZero(abs / 1_000_000)}${locale === "id" ? "jt" : "M"}`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${Math.round(abs / 1_000)}${locale === "id" ? "rb" : "k"}`;
  }
  return `${sign}Rp ${Math.round(abs)}`;
}

export function clampCycleStartDay(day?: number): number {
  const num = Number(day);
  if (!Number.isFinite(num)) return 1;
  return Math.min(28, Math.max(1, Math.round(num)));
}

export function getMonthKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const [yStr, mStr] = monthKey.split("-");
  const date = new Date(Number(yStr), Number(mStr) - 1 + deltaMonths, 1);
  return getMonthKey(date);
}

/**
 * Returns inclusive ISO date boundaries [startDate, endDate] for a given cycleKey ("YYYY-MM").
 * - cycleStartDay === 1: standard calendar month (YYYY-MM-01 .. YYYY-MM-<lastDay>)
 * - cycleStartDay 2..28: custom payday cycle (YYYY-MM-<D> .. <nextMonth>-<D-1>)
 */
export function getCycleDateRange(
  cycleKey: string,
  cycleStartDay = 1
): { startDate: string; endDate: string } {
  const day = clampCycleStartDay(cycleStartDay);
  if (day === 1) {
    const [y, m] = cycleKey.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      startDate: `${cycleKey}-01`,
      endDate: `${cycleKey}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  const nextMonthKey = shiftMonthKey(cycleKey, 1);
  return {
    startDate: `${cycleKey}-${String(day).padStart(2, "0")}`,
    endDate: `${nextMonthKey}-${String(day - 1).padStart(2, "0")}`,
  };
}

/**
 * Maps any ISO date ("YYYY-MM-DD") to its owning cycleKey ("YYYY-MM").
 * Every calendar day maps to exactly one cycle with zero gaps or overlaps.
 */
export function getCycleKeyForDate(
  dateIso: string,
  cycleStartDay = 1
): string {
  const day = clampCycleStartDay(cycleStartDay);
  const monthKey = dateIso.slice(0, 7);
  if (day === 1) return monthKey;
  const txDay = Number(dateIso.slice(8, 10)) || 1;
  return txDay >= day ? monthKey : shiftMonthKey(monthKey, -1);
}

export function getCurrentCycleKey(
  cycleStartDay = 1,
  date: Date = new Date()
): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return getCycleKeyForDate(`${y}-${m}-${d}`, cycleStartDay);
}

export function isDateInCycle(
  dateIso: string,
  cycleKey: string,
  cycleStartDay = 1
): boolean {
  const { startDate, endDate } = getCycleDateRange(cycleKey, cycleStartDay);
  return dateIso >= startDate && dateIso <= endDate;
}

export function formatMonthLabel(
  monthKey: string,
  locale: Locale,
  short = false
): string {
  const [yStr, mStr] = monthKey.split("-");
  const date = new Date(Number(yStr), Number(mStr) - 1, 1);
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    month: short ? "short" : "long",
    year: short ? "2-digit" : "numeric",
  }).format(date);
}

/**
 * Human-readable period label:
 * - cycleStartDay === 1: "November 2026" (short: "Nov 26") — identical to standard calendar view
 * - cycleStartDay > 1:   "25 Nov – 24 Dec 2026" (short: "25 Nov")
 */
export function formatCycleLabel(
  cycleKey: string,
  locale: Locale,
  cycleStartDay = 1,
  short = false
): string {
  const day = clampCycleStartDay(cycleStartDay);
  if (day === 1) {
    return formatMonthLabel(cycleKey, locale, short);
  }

  const { startDate, endDate } = getCycleDateRange(cycleKey, day);
  const [sY, sM, sD] = startDate.split("-").map(Number);
  const [eY, eM, eD] = endDate.split("-").map(Number);

  const intlLocale = locale === "id" ? "id-ID" : "en-US";
  const monthFmt = new Intl.DateTimeFormat(intlLocale, { month: "short" });
  const startMon = monthFmt.format(new Date(sY, sM - 1, 1));

  if (short) {
    return `${sD} ${startMon}`;
  }

  const endMon = monthFmt.format(new Date(eY, eM - 1, 1));
  if (sY === eY) {
    return `${sD} ${startMon} – ${eD} ${endMon} ${eY}`;
  }
  const sYr = String(sY).slice(-2);
  const eYr = String(eY).slice(-2);
  return `${sD} ${startMon} ${sYr} – ${eD} ${endMon} ${eYr}`;
}

export function formatDateHeading(dateIso: string, locale: Locale): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(dateIso: string, locale: Locale): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDaysRemainingInMonth(monthKey: string): number {
  const now = new Date();
  const currentKey = getMonthKey(now);
  const [y, m] = monthKey.split("-").map(Number);
  const totalDays = new Date(y, m, 0).getDate();
  if (monthKey === currentKey) {
    return Math.max(1, totalDays - now.getDate() + 1);
  }
  if (monthKey > currentKey) {
    return totalDays;
  }
  return 0;
}
