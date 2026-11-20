import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
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
  BAR_SIZE_GROUPED,
} from "@Accidents/shared/ui/chart/chartStyle";
import { BarGradient } from "@Accidents/shared/ui/chart/ChartGradients";
import { ChartTooltip } from "@Accidents/shared/ui/chart/ChartTooltip";
import { ChartCard, type ChartDataTable } from "@Accidents/widgets/chart-card/ChartCard";
import { drilldownStore } from "@Accidents/widgets/accident-drilldown/model/drilldownStore";
import { formatPeriodLabel, type Period } from "@Accidents/entities/accident/lib/period";
import { getMotorcadeKey } from "@Accidents/entities/accident/lib/motorcade";
import { COLOR_COUNT } from "@Accidents/shared/lib/chartColors";
import { formatNumber } from "@Accidents/shared/lib/formatters";
import { CHART_MARGIN, barPayload, useCategoryXAxis } from "@Accidents/shared/lib/rechartsHelpers";
import type { MotorcadeAggregate } from "@Accidents/entities/accident/lib/metrics";
import type { OverviewData } from "../../model/overviewData";
import { useTranslation } from "react-i18next";

interface Props {
  data: OverviewData;
  period: Period;
}

// Включая «Не указана» — только на этом экране
export function MotorcadeCountChart({ data, period }: Props) {
  const { t } = useTranslation();
  const gradientId = useGradientId();
  const periodLabel = formatPeriodLabel(period);
  const { containerRef, xAxisProps } = useCategoryXAxis(
    data.motorcadeAgg.map((a) => a.name),
    { mirrorPadding: true },
  );

  const table: ChartDataTable = {
    columns: [t("roadAccidents.common.motorcade"), t("roadAccidents.common.accidents")],
    rows: data.motorcadeAgg.map((m) => [m.name, formatNumber(m.count)]),
  };

  return (
    <ChartCard
      table={table}
      title={t("roadAccidents.chart.accidentsByMotorcade")}
      subtitle={t("roadAccidents.chart.accidentsByMotorcadeSubtitle")}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.motorcadeAgg} margin={CHART_MARGIN}>
            <defs>
              <BarGradient id={`${gradientId}-0`} color={COLOR_COUNT} />
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="name" {...X_AXIS_PROPS} {...xAxisProps} />
            <YAxis {...Y_AXIS_PROPS} allowDecimals={false} />
            <Tooltip cursor={BAR_CURSOR} content={<ChartTooltip />} />
            <Bar
              maxBarSize={BAR_SIZE_GROUPED}
              {...ANIMATION}
              dataKey="count"
              name={t("roadAccidents.common.accidents")}
              radius={BAR_RADIUS}
              fill={`url(#${gradientId}-0)`}
              style={{ cursor: "pointer" }}
              onClick={(entry) => {
                const agg = barPayload<MotorcadeAggregate>(entry);
                const rows = data.periodRows.filter((row) => getMotorcadeKey(row) === agg.key);
                drilldownStore.open(`${agg.name} — ${periodLabel}`, rows);
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
