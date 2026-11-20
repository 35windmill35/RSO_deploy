import { useTranslation } from "react-i18next";
import { KpiCard, KpiGrid } from "@Rso/shared/ui/KpiCard/KpiCard";
import { formatHours, formatMoney, formatNumber, formatPct } from "@Rso/shared/lib/format";
import type { SalesKpiId, SalesKpis } from "../model/salesData";

interface KpiConfig {
  id: SalesKpiId;
  format: (value: number | null) => string;
  // null — нейтральный показатель
  higherIsBetter: boolean | null;
  deltaUnit: "pct" | "pp" | "count";
  // Суммы склада всегда с НДС — подпись в режиме «без НДС»
  stock?: boolean;
  // Дельта считается по ответу за прошлый период (ремзона, склад)
  fromPrev?: boolean;
}

// Порядок по ТЗ: ряд продаж и ремзоны, ряд склада
const SLOTS: readonly KpiConfig[] = [
  { id: "partsTurnover", format: formatMoney, higherIsBetter: true, deltaUnit: "pct" },
  { id: "workTurnover", format: formatMoney, higherIsBetter: true, deltaUnit: "pct" },
  { id: "partsToWork", format: formatPct, higherIsBetter: null, deltaUnit: "pp" },
  { id: "loadPct", format: formatPct, higherIsBetter: true, deltaUnit: "pp", fromPrev: true },
  { id: "soldHoursPct", format: formatPct, higherIsBetter: true, deltaUnit: "pp", fromPrev: true },
  {
    id: "stockEnd",
    format: formatMoney,
    higherIsBetter: null,
    deltaUnit: "pct",
    stock: true,
    fromPrev: true,
  },
  {
    id: "stockTurnover",
    format: formatPct,
    higherIsBetter: true,
    deltaUnit: "pp",
    stock: true,
    fromPrev: true,
  },
  {
    id: "stockMarkup",
    format: formatPct,
    higherIsBetter: true,
    deltaUnit: "pp",
    stock: true,
    fromPrev: true,
  },
  {
    id: "stockProfit",
    format: formatMoney,
    higherIsBetter: true,
    deltaUnit: "pct",
    stock: true,
    fromPrev: true,
  },
  { id: "itemsCount", format: formatNumber, higherIsBetter: null, deltaUnit: "count", stock: true },
];

interface SalesKpiRowProps {
  kpis: SalesKpis | null;
  loading: boolean;
  // Режим «без НДС» — у карточек склада подпись «с НДС»
  bruttoNote: boolean;
  // Ответ за прошлый период ещё грузится — у дельт ремзоны и склада скелетон
  prevLoading: boolean;
  onOpen?: (id: SalesKpiId) => void;
}

// 10 KPI вкладки «Продажи и виды услуг»: 2 ряда по 5
export function SalesKpiRow({ kpis, loading, bruttoNote, prevLoading, onOpen }: SalesKpiRowProps) {
  const { t } = useTranslation();

  const noteFor = (slot: KpiConfig): string | undefined => {
    if (slot.id === "soldHoursPct" && kpis?.hours) {
      return t("rso.kpi.note.hoursOf", {
        sold: formatHours(kpis.hours.sold),
        available: formatHours(kpis.hours.available),
      });
    }
    if (slot.id === "itemsCount" && kpis) return t("rso.kpi.note.itemsDelta");
    if (slot.stock && bruttoNote) return t("rso.sales.stock.bruttoNote");
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
            deltaLoading={Boolean(slot.fromPrev) && prevLoading}
            onClick={onOpen ? () => onOpen(slot.id) : undefined}
          />
        );
      })}
    </KpiGrid>
  );
}
