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

export function formatMonthLabel(monthKey: string, locale: Locale, short = false): string {
  const [yStr, mStr] = monthKey.split("-");
  const date = new Date(Number(yStr), Number(mStr) - 1, 1);
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    month: short ? "short" : "long",
    year: short ? "2-digit" : "numeric",
  }).format(date);
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
