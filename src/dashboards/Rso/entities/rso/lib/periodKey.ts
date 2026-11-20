import type { Period, PeriodType } from "../api/contract";

// Чистая арифметика ключей периода (§1.1, §1.3 ТЗ заказчика), без i18n.
// M → YYYYMM, Q → YYYY*10+квартал, Y → YYYY

export const PERIOD_TYPES: readonly PeriodType[] = ["M", "Q", "Y"];

export function monthKey(year: number, month: number): number {
  return year * 100 + month;
}

export function quarterKey(year: number, quarter: number): number {
  return year * 10 + quarter;
}

export function periodYear(period: Period): number {
  if (period.type === "M") return Math.floor(period.key / 100);
  if (period.type === "Q") return Math.floor(period.key / 10);
  return period.key;
}

// Номер месяца (1–12) или квартала (1–4); у года — 0
export function periodPart(period: Period): number {
  if (period.type === "M") return period.key % 100;
  if (period.type === "Q") return period.key % 10;
  return 0;
}

// Сдвиг на n периодов того же уровня с переходом через год
export function shiftPeriod(period: Period, n: number): Period {
  const year = periodYear(period);
  if (period.type === "Y") return { type: "Y", key: year + n };

  const size = period.type === "M" ? 12 : 4;
  const index = year * size + (periodPart(period) - 1) + n;
  const newYear = Math.floor(index / size);
  const newPart = (((index % size) + size) % size) + 1;
  return {
    type: period.type,
    key: period.type === "M" ? monthKey(newYear, newPart) : quarterKey(newYear, newPart),
  };
}

// Прошлый период того же уровня: 202601 → 202512, 20261 → 20254, 2026 → 2025
export function prevPeriod(period: Period): Period {
  return shiftPeriod(period, -1);
}

export function periodOfDate(type: PeriodType, date: Date): Period {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (type === "M") return { type, key: monthKey(year, month) };
  if (type === "Q") return { type, key: quarterKey(year, Math.ceil(month / 3)) };
  return { type, key: year };
}

// Последний завершённый период уровня: в ноябре 2026 → октябрь 2026, III кв. 2026, 2025
export function lastClosedPeriod(type: PeriodType, date: Date): Period {
  return prevPeriod(periodOfDate(type, date));
}

// Уровнем ниже: год → 4 квартала, квартал → 3 месяца, месяц → нет
export function childPeriods(period: Period): Period[] {
  const year = periodYear(period);
  if (period.type === "Y") {
    return [1, 2, 3, 4].map((q) => ({ type: "Q" as const, key: quarterKey(year, q) }));
  }
  if (period.type === "Q") {
    const first = (periodPart(period) - 1) * 3 + 1;
    return [0, 1, 2].map((i) => ({ type: "M" as const, key: monthKey(year, first + i) }));
  }
  return [];
}
