import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { causerColor } from "@Accidents/shared/lib/chartColors";
import {
  formatCurrency,
  formatCompactCurrency,
  withCurrencyUnit,
} from "@Accidents/shared/lib/formatters";
import { CHART_MARGIN, barPayload, useCategoryXAxis } from "@Accidents/shared/lib/rechartsHelpers";
import { collapseSlices, type BreakdownSlice } from "@Accidents/entities/accident/lib/metrics";
import type { MotorcadeData } from "../../model/motorcadeData";
import { useTranslation } from "react-i18next";

interface Props {
  data: MotorcadeData;
  period: Period;
}

export function MotorcadeCauseDamageChart({ data, period }: Props) {
  const { t } = useTranslation();
  const gradientId = useGradientId();
  const periodLabel = formatPeriodLabel(period);
  const chartData = collapseSlices(data.causeSlices);

  const openCause = (key: string) => {
    const slice = chartData.find((s) => s.key === key);
    if (slice) drilldownStore.open(`${slice.label} — ${periodLabel}`, slice.rows);
  };

  const { containerRef, xAxisProps } = useCategoryXAxis(chartData.map((s) => s.label));

  const table: ChartDataTable = {
    columns: [t("roadAccidents.common.cause"), t("roadAccidents.common.damage")],
    rows: data.causeSlices.map((s) => [s.label, formatCurrency(s.sumDamage)]),
  };

  return (
    <ChartCard
      table={table}
      title={t("roadAccidents.chart.damageByCause")}
      subtitle={withCurrencyUnit(t("roadAccidents.chart.sumsForPeriod"))}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={CHART_MARGIN}>
            <defs>
              {chartData.map((slice, index) => (
                <BarGradient
                  key={slice.key}
                  id={`${gradientId}-damage-${index}`}
                  color={causerColor(slice.key, index)}
                />
              ))}
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...X_AXIS_PROPS} {...xAxisProps} />
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
              radius={BAR_RADIUS}
              shape={(props) => (
                <Rectangle {...props} fill={`url(#${gradientId}-damage-${props.index})`} />
              )}
              style={{ cursor: "pointer" }}
              onClick={(entry) => openCause(barPayload<BreakdownSlice>(entry).key)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
