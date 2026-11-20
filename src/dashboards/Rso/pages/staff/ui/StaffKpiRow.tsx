import { useTranslation } from "react-i18next";
import { KpiCard, KpiGrid } from "@Rso/shared/ui/KpiCard/KpiCard";
import { formatMoney, formatNumber, formatPct } from "@Rso/shared/lib/format";
import type { StaffKpiId, StaffKpis } from "../model/staffData";

interface KpiConfig {
  id: StaffKpiId;
  format: (value: number | null) => string;
  // null — нейтральный показатель (ТЗ §4.4)
  higherIsBetter: boolean | null;
  deltaUnit: "pct" | "pp" | "count";
  // Касса: «без НДС» пока равно «с НДС» — подпись в режиме «без НДС»
  cash?: boolean;
}

// Порядок по ТЗ §6.1: ряд персонала, ряд денег
const SLOTS: readonly KpiConfig[] = [
  { id: "payrollTotal", format: formatMoney, higherIsBetter: null, deltaUnit: "pct" },
  { id: "payrollShare", format: formatPct, higherIsBetter: false, deltaUnit: "pp" },
  { id: "employees", format: formatNumber, higherIsBetter: null, deltaUnit: "count" },
  { id: "notHired", format: formatNumber, higherIsBetter: false, deltaUnit: "count" },
  { id: "payrollPerEmployee", format: formatMoney, higherIsBetter: null, deltaUnit: "pct" },
  { id: "cashIn", format: formatMoney, higherIsBetter: true, deltaUnit: "pct", cash: true },
  { id: "cashOut", format: formatMoney, higherIsBetter: false, deltaUnit: "pct", cash: true },
  { id: "cashProfit", format: formatMoney, higherIsBetter: true, deltaUnit: "pct", cash: true },
  { id: "expense", format: formatMoney, higherIsBetter: false, deltaUnit: "pct" },
  { id: "revenuePerEmployee", format: formatMoney, higherIsBetter: true, deltaUnit: "pct" },
];

interface StaffKpiRowProps {
  kpis: StaffKpis | null;
  loading: boolean;
  // Режим «без НДС» — у карточек кассы подпись «как с НДС»
  nettoNote: boolean;
  onOpen?: (id: StaffKpiId) => void;
}

// 10 KPI вкладки «Персонал и финансы»: 2 ряда по 5
export function StaffKpiRow({ kpis, loading, nettoNote, onOpen }: StaffKpiRowProps) {
  const { t } = useTranslation();

  const noteFor = (slot: KpiConfig): string | undefined => {
    if (slot.id === "payrollShare") return t("rso.staff.kpi.shareNote");
    if (slot.id === "employees" && kpis && kpis.zeroWage > 0) {
      return t("rso.staff.kpi.zeroWage", { count: kpis.zeroWage });
    }
    if (slot.cash && nettoNote) return t("rso.staff.cash.sameNote");
    return undefined;
  };

  return (
    <KpiGrid>
      {SLOTS.map((slot) => {
        const item = kpis?.values[slot.id];
        return (
          <KpiCard
            key={slot.id}
            label={t(`rso.kpi.${slot.id}.label`)}
            hint={t(`rso.kpi.${slot.id}.hint`)}
            value={item?.value ?? null}
            format={slot.format}
            delta={item?.delta ?? null}
            deltaUnit={slot.deltaUnit}
            higherIsBetter={slot.higherIsBetter}
            note={noteFor(slot)}
            loading={loading}
            onClick={onOpen ? () => onOpen(slot.id) : undefined}
          />
        );
      })}
    </KpiGrid>
  );
}
