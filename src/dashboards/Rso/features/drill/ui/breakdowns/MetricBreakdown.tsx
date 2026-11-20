import type { ComponentType } from "react";
import type { DashboardRsoData, Period } from "@Rso/entities/rso/api/contract";
import type { Metric, MetricId } from "@Rso/entities/rso/lib/metrics";
import { CapacityBreakdown } from "./CapacityBreakdown";
import { CashBreakdown } from "./CashBreakdown";
import { DepartmentsBreakdown } from "./DepartmentsBreakdown";
import { DiscountBreakdown } from "./DiscountBreakdown";
import { ExpensesBreakdown } from "./ExpensesBreakdown";
import { PlansBreakdown } from "./PlansBreakdown";
import { ProfitBreakdown } from "./ProfitBreakdown";
import { SegmentsBreakdown } from "./SegmentsBreakdown";
import type { BreakdownProps } from "./types";

function RevenueByDepartments(props: BreakdownProps) {
  return <DepartmentsBreakdown {...props} mode="revenue" />;
}

function NormHoursBreakdown(props: BreakdownProps) {
  return (
    <>
      <DepartmentsBreakdown {...props} mode="hours" />
      <CapacityBreakdown {...props} />
    </>
  );
}

function StructureBreakdown(props: BreakdownProps) {
  return <SegmentsBreakdown {...props} mode="structure" />;
}

function ClientsBreakdown(props: BreakdownProps) {
  return <SegmentsBreakdown {...props} mode="clients" />;
}

// Из чего складывается показатель. Record по MetricId: новая метрика без разбивки
// не скомпилируется, пока для неё явно не указан компонент или null
const BREAKDOWNS: Record<MetricId, ComponentType<BreakdownProps> | null> = {
  revenue: RevenueByDepartments,
  accountCount: RevenueByDepartments,
  avgCheck: RevenueByDepartments,
  normHours: NormHoursBreakdown,
  expense: ExpensesBreakdown,
  operatingProfit: ProfitBreakdown,
  cashProfit: CashBreakdown,
  discount: DiscountBreakdown,
  planMoney: PlansBreakdown,
  planGain: PlansBreakdown,
  partsToWork: StructureBreakdown,
  clients: ClientsBreakdown,
};

interface MetricBreakdownProps {
  metric: Metric;
  period: Period;
  data: DashboardRsoData | undefined;
}

export function MetricBreakdown({ metric, period, data }: MetricBreakdownProps) {
  const Breakdown = BREAKDOWNS[metric.id];
  return Breakdown ? <Breakdown period={period} data={data} /> : null;
}
