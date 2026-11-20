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
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from "@Accidents/shared/lib/chartColors";
import { formatPercent } from "@Accidents/shared/lib/formatters";
import { CHART_MARGIN, barPayload, useCategoryXAxis } from "@Accidents/shared/lib/rechartsHelpers";
import type { AnalyticsData, BreakdownComparisonRow } from "../../model/analyticsData";
import { useTranslation } from "react-i18next";

interface Props {
  data: AnalyticsData;
  period: Period;
}

interface ChartProps extends Props {
  rows: BreakdownComparisonRow[];
  title: string;
  subtitle: string;
  column: string;
}

// Доли, а не абсолютные числа — сравнимо для автоколонн разного размера
function BreakdownComparisonChart({ data, period, rows, title, subtitle, column }: ChartProps) {
  const gradientId = useGradientId();
  const periodLabel = formatPeriodLabel(period);
  const chartData = rows;

  const openSlice = (key: string, side: "a" | "b") => {
    const row = chartData.find((r) => r.key === key);
    if (!row) return;
    const name = side === "a" ? data.a.name : data.b.name;
    const rows = side === "a" ? row.rowsA : row.rowsB;
    drilldownStore.open(`${row.label} — ${name}, ${periodLabel}`, rows);
  };

  const { containerRef, xAxisProps } = useCategoryXAxis(chartData.map((r) => r.label));

  const table: ChartDataTable = {
    columns: [column, data.a.name, data.b.name],
    rows: chartData.map((r) => [r.label, formatPercent(r.shareA), formatPercent(r.shareB)]),
  };

  return (
    <ChartCard
      table={table}
      title={title}
      subtitle={subtitle}
      legend={[
        { label: data.a.name, color: COMPARISON_COLOR_A },
        { label: data.b.name, color: COMPARISON_COLOR_B },
      ]}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={CHART_MARGIN}>
            <defs>
              <BarGradient id={`${gradientId}-0`} color={COMPARISON_COLOR_A} />
              <BarGradient id={`${gradientId}-1`} color={COMPARISON_COLOR_B} />
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...X_AXIS_PROPS} {...xAxisProps} />
            <YAxis {...Y_AXIS_PROPS} tickFormatter={(v: number) => formatPercent(v)} />
            <Tooltip
              cursor={BAR_CURSOR}
              content={<ChartTooltip valueFormatter={formatPercent} />}
            />
            <Bar
              maxBarSize={BAR_SIZE_GROUPED}
              {...ANIMATION}
              dataKey="shareA"
              name={data.a.name}
              fill={`url(#${gradientId}-0)`}
              radius={BAR_RADIUS}
              style={{ cursor: "pointer" }}
              onClick={(entry) => openSlice(barPayload<BreakdownComparisonRow>(entry).key, "a")}
            />
            <Bar
              maxBarSize={BAR_SIZE_GROUPED}
              {...ANIMATION}
              dataKey="shareB"
              name={data.b.name}
              fill={`url(#${gradientId}-1)`}
              radius={BAR_RADIUS}
              style={{ cursor: "pointer" }}
              onClick={(entry) => openSlice(barPayload<BreakdownComparisonRow>(entry).key, "b")}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function CausesComparisonChart(props: Props) {
  const { t } = useTranslation();
  return (
    <BreakdownComparisonChart
      {...props}
      rows={props.data.causeComparison}
      title={t("roadAccidents.chart.causesComparison")}
      subtitle={t("roadAccidents.chart.causesComparisonSubtitle")}
      column={t("roadAccidents.common.cause")}
    />
  );
}

export function CausersComparisonChart(props: Props) {
  const { t } = useTranslation();
  return (
    <BreakdownComparisonChart
      {...props}
      rows={props.data.causerComparison}
      title={t("roadAccidents.chart.causersComparison")}
      subtitle={t("roadAccidents.chart.causersComparisonSubtitle")}
      column={t("roadAccidents.common.causer")}
    />
  );
}
