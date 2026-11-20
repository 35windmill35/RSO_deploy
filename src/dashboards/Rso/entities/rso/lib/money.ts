import type { Money, SummaryRow, VatMode } from "../api/contract";

// Единственная точка выбора «нетто / брутто» (§1.2 ТЗ заказчика).
// Компоненты не читают поля ..._NETTO / ..._BRUTTO напрямую.

const SUFFIX: Record<VatMode, "NETTO" | "BRUTTO"> = { Netto: "NETTO", Brutto: "BRUTTO" };

export function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function pick<K extends string>(
  row: Money<K> | null | undefined,
  base: K,
  vat: VatMode,
): number | null {
  if (!row) return null;
  return finite(row[`${base}_${SUFFIX[vat]}` as `${K}_${"NETTO" | "BRUTTO"}`]);
}

// Разница двух значений; null, если нет хотя бы одного
export function diff(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a - b;
}

// Деление с защитой от нуля и null
export function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
}

// Дельта к прошлому периоду: (cur − prev) / |prev| × 100
export function deltaPct(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// Разделы clientSegment и склада приходят только с НДС. Для режима «без НДС»
// суммы пересчитываются пропорционально выручке периода: нетто / брутто.
// Это оценка (точно — только при единой ставке НДС), в интерфейсе она помечается.
export function nettoFactor(summary: SummaryRow | undefined, vat: VatMode): number {
  if (vat === "Brutto" || !summary) return 1;
  return (
    ratio(pick(summary, "REVENUE_TOTAL", "Netto"), pick(summary, "REVENUE_TOTAL", "Brutto")) ?? 1
  );
}
