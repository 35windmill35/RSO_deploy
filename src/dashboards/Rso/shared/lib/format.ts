import i18n from "@/APP/i18n";

// Форматы §9 ТЗ заказчика: деньги «4 075 630 ₽», проценты — 1 знак после запятой.
// Единицы измерения — из i18n, локаль чисел и дат — из текущего языка приложения.

const NBSP = "\u00A0";
export const DASH = "\u2014";

// Intl-форматтеры дорогие — кэшируем по локали и набору опций
const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function locale(): string {
  return i18n.language || "ru";
}

function numberFormat(minDigits: number, maxDigits: number): Intl.NumberFormat {
  const key = `${locale()}:${minDigits}:${maxDigits}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale(), {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    });
    numberFormats.set(key, format);
  }
  return format;
}

function dateFormat(name: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale()}:${name}`;
  let format = dateFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale(), { ...options, timeZone: "UTC" });
    dateFormats.set(key, format);
  }
  return format;
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

const integer = (value: number) => numberFormat(0, 0).format(value);
const oneDecimal = (value: number) => numberFormat(1, 1).format(value);

export function formatNumber(value: number | null | undefined): string {
  return isNumber(value) ? integer(value) : DASH;
}

// Дробное число без единиц: «5,4»
export function formatDecimal(value: number | null | undefined, digits = 1): string {
  return isNumber(value) ? numberFormat(0, digits).format(value) : DASH;
}

export function formatMoney(value: number | null | undefined): string {
  return isNumber(value) ? `${integer(value)}${NBSP}${i18n.t("rso.unit.currency")}` : DASH;
}

// Для осей графиков: «4,1 млн», «850 тыс.»
export function formatCompactMoney(value: number | null | undefined): string {
  if (!isNumber(value)) return DASH;
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${oneDecimal(value / 1_000_000)}${NBSP}${i18n.t("rso.unit.million")}`;
  if (abs >= 1_000) return `${integer(value / 1_000)}${NBSP}${i18n.t("rso.unit.thousand")}`;
  return integer(value);
}

export function formatPct(value: number | null | undefined): string {
  return isNumber(value) ? `${oneDecimal(value)}${NBSP}%` : DASH;
}

export function formatHours(value: number | null | undefined): string {
  return isNumber(value) ? `${integer(value)}${NBSP}${i18n.t("short.hour")}` : DASH;
}

// Число для CSV под русский Excel: без разделителей тысяч, десятичная запятая
export function formatCsvNumber(value: number | null | undefined): string {
  return isNumber(value) ? String(Math.round(value * 100) / 100).replace(".", ",") : "";
}

export type DeltaTone = "positive" | "negative" | "neutral";

// Цвет дельты по смыслу метрики: у расходов рост — плохо; null — без оценки
export function deltaTone(
  delta: number | null | undefined,
  higherIsBetter: boolean | null = true,
): DeltaTone {
  if (!isNumber(delta) || higherIsBetter === null) return "neutral";
  // Знак — по показанному значению: «0,0» не красим, даже если на самом деле −0,01
  const shown = roundDelta(delta);
  if (shown === 0) return "neutral";
  return shown > 0 === higherIsBetter ? "positive" : "negative";
}

// Дельта, округлённая до 1 знака, как её видит пользователь
function roundDelta(delta: number): number {
  const rounded = Math.round(delta * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

// pct — относительное изменение, %; pp — изменение доли в процентных пунктах
export type DeltaUnit = "pct" | "pp";

export function formatDelta(
  delta: number | null | undefined,
  unit: DeltaUnit = "pct",
): string | null {
  if (!isNumber(delta)) return null;
  // Стрелка — по округлённому значению: «0,0 п.п.» без стрелки, а не «↓ 0,0 п.п.»
  const shown = roundDelta(delta);
  const arrow = shown > 0 ? "↑" : shown < 0 ? "↓" : "";
  const unitText = unit === "pp" ? i18n.t("rso.unit.pp") : "%";
  const text = `${oneDecimal(Math.abs(shown))}${NBSP}${unitText}`;
  return arrow ? `${arrow}${NBSP}${text}` : text;
}

// Абсолютное изменение со знаком: «+41», «−643»
export function formatSignedCount(value: number | null | undefined): string | null {
  if (!isNumber(value)) return null;
  const sign = value > 0 ? "+" : value < 0 ? "\u2212" : "";
  return `${sign}${integer(Math.abs(value))}`;
}

function parseIsoDate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  return match ? new Date(Date.UTC(+match[1], +match[2] - 1, +match[3])) : null;
}

// «15 сент., пн» — подпись дня в разбивке месяца
export function formatDay(value: string | null | undefined): string {
  const date = parseIsoDate(value);
  if (!date) return DASH;
  return dateFormat("day", { day: "numeric", month: "short", weekday: "short" }).format(date);
}

// «15.09.2026»
export function formatDate(value: string | null | undefined): string {
  const date = parseIsoDate(value);
  if (!date) return DASH;
  return dateFormat("date", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
