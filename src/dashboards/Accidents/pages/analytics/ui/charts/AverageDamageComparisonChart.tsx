import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  BAR_SIZE_SINGLE,
} from "@Accidents/shared/ui/chart/chartStyle";
import { BarGradient } from "@Accidents/shared/ui/chart/ChartGradients";
import { ChartTooltip } from "@Accidents/shared/ui/chart/ChartTooltip";
import { ChartCard, type ChartDataTable } from "@Accidents/widgets/chart-card/ChartCard";
import { drilldownStore } from "@Accidents/widgets/accident-drilldown/model/drilldownStore";
import { formatPeriodLabel, type Period } from "@Accidents/entities/accident/lib/period";
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from "@Accidents/shared/lib/chartColors";
import {
  formatCurrency,
  formatCompactCurrency,
  withCurrencyUnit,
} from "@Accidents/shared/lib/formatters";
import {
  CATEGORY_AXIS_HEIGHT,
  CHART_MARGIN,
  barPayload,
} from "@Accidents/shared/lib/rechartsHelpers";
import type { AnalyticsData } from "../../model/analyticsData";
import { useTranslation } from "react-i18next";

interface Props {
  data: AnalyticsData;
  period: Period;
}

interface Point {
  side: "a" | "b";
  name: string;
  averageDamage: number;
}

export function AverageDamageComparisonChart({ data, period }: Props) {
  const { t } = useTranslation();
  const gradientId = useGradientId();
  const periodLabel = formatPeriodLabel(period);

  const chartData: Point[] = [
    { side: "a", name: data.a.name, averageDamage: data.a.scope.kpi.averageDamage ?? 0 },
    { side: "b", name: data.b.name, averageDamage: data.b.scope.kpi.averageDamage ?? 0 },
  ];

  const handleClick = (side: "a" | "b") => {
    const target = side === "a" ? data.a : data.b;
    drilldownStore.open(
      t("roadAccidents.list.averageDamageFor", { name: target.name, period: periodLabel }),
      target.scope.periodRows.filter((row) => (row.ACCIDENT_DAMAGE ?? 0) > 0),
    );
  };

  const table: ChartDataTable = {
    columns: [t("roadAccidents.common.motorcade"), t("roadAccidents.kpi.averageDamage")],
    rows: [
      [data.a.name, formatCurrency(data.a.scope.kpi.averageDamage)],
      [data.b.name, formatCurrency(data.b.scope.kpi.averageDamage)],
    ],
  };

  return (
    <ChartCard
      table={table}
      title={t("roadAccidents.kpi.averageDamage")}
      subtitle={withCurrencyUnit(t("roadAccidents.chart.perDamagedAccident"))}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGIN}>
          <defs>
            <BarGradient id={`${gradientId}-0`} color={COMPARISON_COLOR_A} />
            <BarGradient id={`${gradientId}-1`} color={COMPARISON_COLOR_B} />
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis {...X_AXIS_PROPS} dataKey="name" height={CATEGORY_AXIS_HEIGHT} />
          <YAxis {...Y_AXIS_PROPS} tickFormatter={formatCompactCurrency} />
          <Tooltip cursor={BAR_CURSOR} content={<ChartTooltip valueFormatter={formatCurrency} />} />
          <Bar
            maxBarSize={BAR_SIZE_SINGLE}
            {...ANIMATION}
            dataKey="averageDamage"
            name={t("roadAccidents.kpi.averageDamageShort")}
            radius={BAR_RADIUS}
            style={{ cursor: "pointer" }}
            onClick={(entry) => handleClick(barPayload<Point>(entry).side)}
          >
            {chartData.map((point) => (
              <Cell
                key={point.side}
                fill={point.side === "a" ? `url(#${gradientId}-0)` : `url(#${gradientId}-1)`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
