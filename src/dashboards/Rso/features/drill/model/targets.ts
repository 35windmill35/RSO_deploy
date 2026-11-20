import type { MetricId } from "@Rso/entities/rso/lib/metrics";

// Что открыто в панели детализации. label — подпись в заголовке панели
// (название отдела, марки, группы); у метрики подпись берётся из словаря.
export type DrillTarget =
  | { kind: "metric"; metricId: MetricId }
  | { kind: "department"; id: number; label: string | null }
  | { kind: "accountType"; label: string | null }
  | { kind: "paymentType"; label: string | null }
  | { kind: "capacity"; departmentId: number; label: string | null }
  | { kind: "mark"; markId: number; label: string | null }
  | { kind: "model"; markId: number; modelId: number; carYear: number; label: string | null }
  | { kind: "stockGroup"; groupId: number; label: string | null }
  | { kind: "warehouse"; warehouseId: number; label: string | null }
  // Склад целиком: итоги и склады
  | { kind: "stock"; label: null }
  // Все товарные группы: таблица из карточки «Склад по группам»
  | { kind: "stockGroups"; label: null }
  // ФОТ компании; filter — сразу показать только не оформленных
  | { kind: "payroll"; filter?: "notHired"; label: null }
  // departmentId null — «без отдела»
  | { kind: "payrollDepartment"; departmentId: number | null; label: string | null }
  | { kind: "payrollPosition"; positionId: number; label: string | null }
  // Все должности: таблица из карточки «ФОТ по должностям»
  | { kind: "payrollPositions"; label: null }
  | { kind: "employee"; userId: number; label: string | null };

export type DrillTargetKind = DrillTarget["kind"];

// Цели, у которых drill-through заканчивается списком ЗН (есть поле в DashboardRSOAccounts)
export function targetUsesAccounts(target: DrillTarget): boolean {
  return (
    target.kind === "department" || target.kind === "accountType" || target.kind === "paymentType"
  );
}
