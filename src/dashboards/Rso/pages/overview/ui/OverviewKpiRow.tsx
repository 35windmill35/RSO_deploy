import { useTranslation } from "react-i18next";
import { METRICS, type MetricId } from "@Rso/entities/rso/lib/metrics";
import { KpiCard, KpiGrid } from "@Rso/shared/ui/KpiCard/KpiCard";
import { formatMoney, formatPct } from "@Rso/shared/lib/format";
import type { DeltaKpiId, OverviewKpis, PlanKpiId } from "../model/overviewData";

interface OverviewKpiRowProps {
  kpis: OverviewKpis | null;
  loading: boolean;
  // Клик по карточке — drill-down по показателю; undefined — карточки не кликабельны
  onOpen?: (id: MetricId) => void;
}

type KpiSlot = { kind: "metric"; id: DeltaKpiId } | { kind: "plan"; id: PlanKpiId };

// Порядок карточек по макету: 2 ряда по 5, план — последней карточкой ряда
const SLOTS: readonly KpiSlot[] = [
  { kind: "metric", id: "revenue" },
  { kind: "metric", id: "expense" },
  { kind: "metric", id: "operatingProfit" },
  { kind: "metric", id: "cashProfit" },
  { kind: "plan", id: "planMoney" },
  { kind: "metric", id: "accountCount" },
  { kind: "metric", id: "normHours" },
  { kind: "metric", id: "avgCheck" },
  { kind: "metric", id: "discount" },
  { kind: "plan", id: "planGain" },
];

// 10 KPI «Обзора»: 8 с дельтой к прошлому периоду + 2 плана (без дельты, §8.1)
export function OverviewKpiRow({ kpis, loading, onOpen }: OverviewKpiRowProps) {
  const { t } = useTranslation();

  const planNote = (plan: number | null) =>
    plan !== null && plan > 0
      ? t("rso.kpi.note.planValue", { value: formatMoney(plan) })
      : t("rso.plan.noPlan");

  return (
    <KpiGrid>
      {SLOTS.map((slot) => {
        const common = {
          label: t(`rso.kpi.${slot.id}.label`),
          hint: t(`rso.kpi.${slot.id}.hint`),
          loading,
          onClick: onOpen ? () => onOpen(slot.id) : undefined,
        };
        if (slot.kind === "plan") {
          const plan = kpis?.plans[slot.id];
          return (
            <KpiCard
              key={slot.id}
              {...common}
              value={plan?.pct ?? null}
              format={formatPct}
              note={plan ? planNote(plan.plan) : undefined}
            />
          );
        }
        const metric = METRICS[slot.id];
        const item = kpis?.metrics[slot.id];
        return (
          <KpiCard
            key={slot.id}
            {...common}
            value={item?.value ?? null}
            format={metric.format}
            delta={item?.delta ?? null}
            deltaUnit={metric.deltaUnit === "pp" ? "pp" : "pct"}
            higherIsBetter={metric.higherIsBetter}
          />
        );
      })}
    </KpiGrid>
  );
}
