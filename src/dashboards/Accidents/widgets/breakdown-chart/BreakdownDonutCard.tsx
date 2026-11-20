import { ChartCard, type ChartDataTable } from "@Accidents/widgets/chart-card/ChartCard";
import { CauseDonut } from "@Accidents/widgets/cause-donut/CauseDonut";
import { drilldownStore } from "@Accidents/widgets/accident-drilldown/model/drilldownStore";
import { collapseSlices, type BreakdownSlice } from "@Accidents/entities/accident/lib/metrics";
import { formatPeriodLabel, type Period } from "@Accidents/entities/accident/lib/period";
import { causerColor, sliceColor } from "@Accidents/shared/lib/chartColors";
import { formatNumber, formatPercent } from "@Accidents/shared/lib/formatters";
import { useTranslation } from "react-i18next";

interface Props {
  slices: BreakdownSlice[];
  period: Period;
}

interface CardProps extends Props {
  title: string;
  subtitle: string;
  column: string;
  height?: number;
  colorOf: (slice: BreakdownSlice, index: number) => string;
}

function BreakdownDonutCard({
  slices,
  period,
  title,
  subtitle,
  column,
  height,
  colorOf,
}: CardProps) {
  const { t } = useTranslation();
  const periodLabel = formatPeriodLabel(period);
  const total = slices.reduce((sum, s) => sum + s.count, 0);

  if (total === 0) {
    return (
      <ChartCard title={title} subtitle={subtitle}>
        <div style={{ color: "var(--color-text-faint)", fontSize: 13 }}>
          {t("roadAccidents.common.noDataForPeriod")}
        </div>
      </ChartCard>
    );
  }

  // В таблице — все значения, на кольце — первые пять и «Прочие»
  const table: ChartDataTable = {
    columns: [column, t("roadAccidents.common.accidents"), t("roadAccidents.common.share")],
    rows: slices.map((s) => [s.label, formatNumber(s.count), formatPercent(s.count / total, 1)]),
  };

  return (
    <ChartCard height={height} table={table} title={title} subtitle={subtitle}>
      <CauseDonut
        slices={collapseSlices(slices)}
        colorOf={colorOf}
        onSelect={(slice) => drilldownStore.open(`${slice.label} — ${periodLabel}`, slice.rows)}
      />
    </ChartCard>
  );
}

export function CausesDonutCard(props: Props) {
  const { t } = useTranslation();
  return (
    <BreakdownDonutCard
      {...props}
      title={t("roadAccidents.chart.causes")}
      subtitle={t("roadAccidents.chart.causesSubtitle")}
      column={t("roadAccidents.common.cause")}
      colorOf={(slice, index) => sliceColor(slice.key, index)}
      height={0}
    />
  );
}

export function CausersDonutCard(props: Props) {
  const { t } = useTranslation();
  return (
    <BreakdownDonutCard
      {...props}
      title={t("roadAccidents.chart.causers")}
      subtitle={t("roadAccidents.chart.causersSubtitle")}
      column={t("roadAccidents.common.causer")}
      colorOf={(slice, index) => causerColor(slice.key, index)}
      height={0}
    />
  );
}
