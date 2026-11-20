import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  GRID_PROPS,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
  ANIMATION,
  useGradientId,
  BAR_CURSOR,
  BAR_RADIUS,
  BAR_SIZE_GROUPED,
} from "@Accidents/shared/ui/chart/chartStyle";
import { BarGradient } from "@Accidents/shared/ui/chart/ChartGradients";
import { ChartTooltip } from "@Accidents/shared/ui/chart/ChartTooltip";
import { ChartCard, type ChartDataTable } from "@Accidents/widgets/chart-card/ChartCard";
import { drilldownStore } from "@Accidents/widgets/accident-drilldown/model/drilldownStore";
import { formatPeriodLabel, type Period } from "@Accidents/entities/accident/lib/period";
import { getMotorcadeKey } from "@Accidents/entities/accident/lib/motorcade";
import { COLOR_DAMAGE, COLOR_COMPENSATION } from "@Accidents/shared/lib/chartColors";
import {
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
  withCurrencyUnit,
} from "@Accidents/shared/lib/formatters";
import { CHART_MARGIN, barPayload, useCategoryXAxis } from "@Accidents/shared/lib/rechartsHelpers";
import type { MotorcadeAggregate } from "@Accidents/entities/accident/lib/metrics";
import type { OverviewData } from "../../model/overviewData";
import { useTranslation } from "react-i18next";

interface Props {
  data: OverviewData;
  period: Period;
}

export function MotorcadeDamageChart({ data, period }: Props) {
  const { t } = useTranslation();
  const gradientId = useGradientId();
  const periodLabel = formatPeriodLabel(period);

  const openMotorcade = (key: string) => {
    const agg = data.motorcadeAgg.find((m) => m.key === key);
    if (!agg) return;
    const rows = data.periodRows.filter((row) => getMotorcadeKey(row) === key);
    drilldownStore.open(`${agg.name} — ${periodLabel}`, rows);
  };

  const { containerRef, xAxisProps } = useCategoryXAxis(
    data.motorcadeAgg.map((a) => a.name),
    { mirrorPadding: true },
  );

  const table: ChartDataTable = {
    columns: [
      t("roadAccidents.common.motorcade"),
      t("roadAccidents.common.damage"),
      /*t("roadAccidents.common.compensation"),*/
      t("roadAccidents.kpi.compensationShare"),
    ],
    rows: data.motorcadeAgg.map((m) => [
      m.name,
      formatCurrency(m.sumDamage),
      /*formatCurrency(m.sumCompensated),*/
      formatPercent(m.sumDamage > 0 ? m.sumCompensated / m.sumDamage : null),
    ]),
  };

  return (
    <ChartCard
      table={table}
      title={t("roadAccidents.chart.damageByMotorcade")}
      subtitle={withCurrencyUnit(t("roadAccidents.chart.sumsForPeriod"))}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.motorcadeAgg} margin={CHART_MARGIN}>
            <defs>
              <BarGradient id={`${gradientId}-0`} color={COLOR_DAMAGE} />
              <BarGradient id={`${gradientId}-1`} color={COLOR_COMPENSATION} />
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="name" {...X_AXIS_PROPS} {...xAxisProps} />
            <YAxis {...Y_AXIS_PROPS} tickFormatter={formatCompactCurrency} />
            <Tooltip
              cursor={BAR_CURSOR}
              content={<ChartTooltip valueFormatter={formatCurrency} />}
            />
            <Bar
              maxBarSize={BAR_SIZE_GROUPED}
              {...ANIMATION}
              dataKey="sumDamage"
              name={t("roadAccidents.common.damage")}
              fill={`url(#${gradientId}-0)`}
              radius={BAR_RADIUS}
              style={{ cursor: "pointer" }}
              onClick={(entry) => openMotorcade(barPayload<MotorcadeAggregate>(entry).key)}
            />
            {/*<Bar
              maxBarSize={BAR_SIZE_GROUPED}
              {...ANIMATION}
              dataKey="sumCompensated"
              name={t("roadAccidents.common.compensation")}
              fill={`url(#${gradientId}-1)`}
              radius={BAR_RADIUS}
              style={{ cursor: "pointer" }}
              onClick={(entry) => openMotorcade(barPayload<MotorcadeAggregate>(entry).key)}
            />*/}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
