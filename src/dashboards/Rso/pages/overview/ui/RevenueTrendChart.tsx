import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import type { PeriodType } from "@Rso/entities/rso/api/contract";
import { formatPeriodLabel, formatPeriodShortLabel } from "@Rso/entities/rso/lib/period";
import { formatCompactMoney, formatMoney } from "@Rso/shared/lib/format";
import {
  CHART_ANIMATION,
  CHART_COLOR,
  GRID_PROPS,
  LINE_CURSOR,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
} from "@Rso/shared/lib/chartTheme";
import { ChartTooltip } from "@Rso/shared/ui/chart/ChartTooltip";
import type { TrendPoint } from "../model/overviewData";
import styles from "./OverviewBlocks.module.css";

export type TrendSeries = "revenue" | "operatingProfit";

interface RevenueTrendChartProps {
  points: TrendPoint[];
  periodType: PeriodType;
  // Drill-down: показатель серии за период с ключом key
  onOpen?: (series: TrendSeries, key: number) => void;
}

export function RevenueTrendChart({ points, periodType, onOpen }: RevenueTrendChartProps) {
  const { t } = useTranslation();
  const data = points.map((point) => ({
    ...point,
    label: formatPeriodShortLabel({ type: periodType, key: point.key }),
  }));
  const selected = data.find((point) => point.isSelected);

  return (
    <div className={`${styles.chart} ${onOpen ? styles.clickableChart : ""}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
          onClick={(state) => {
            // Клик в любом месте колонки периода — выручка за этот период.
            // Вне области данных индекс null: Number(null) === 0 открыл бы самый старый период
            const raw = state?.activeTooltipIndex;
            if (!onOpen || raw === null || raw === undefined || raw === "") return;
            const index = Number(raw);
            if (!Number.isInteger(index) || index < 0 || index >= data.length) return;
            onOpen("revenue", data[index].key);
          }}
        >
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...X_AXIS_PROPS} interval="preserveStartEnd" minTickGap={12} />
          <YAxis {...Y_AXIS_PROPS} tickFormatter={(value: number) => formatCompactMoney(value)} />
          {selected && (
            <ReferenceLine x={selected.label} stroke={CHART_COLOR.neutral} strokeDasharray="4 4" />
          )}
          <Tooltip
            cursor={LINE_CURSOR}
            content={(props) => (
              <ChartTooltip
                {...props}
                title={
                  props.payload?.[0]
                    ? formatPeriodLabel({
                        type: periodType,
                        key: (props.payload[0].payload as TrendPoint).key,
                      })
                    : undefined
                }
                valueFormatter={formatMoney}
              />
            )}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name={t("rso.series.revenue")}
            stroke={CHART_COLOR.primary}
            strokeWidth={2.5}
            dot={{ r: 3, fill: CHART_COLOR.primary, strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: CHART_COLOR.card, strokeWidth: 2 }}
            connectNulls
            {...CHART_ANIMATION}
          />
          <Line
            type="monotone"
            dataKey="operatingProfit"
            name={t("rso.series.operatingProfit")}
            stroke={CHART_COLOR.secondary}
            strokeWidth={2}
            dot={{ r: 2.5, fill: CHART_COLOR.secondary, strokeWidth: 0 }}
            activeDot={{ r: 4.5, stroke: CHART_COLOR.card, strokeWidth: 2 }}
            connectNulls
            {...CHART_ANIMATION}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className={styles.legend}>
        {(
          [
            ["revenue", CHART_COLOR.primary],
            ["operatingProfit", CHART_COLOR.secondary],
          ] as const
        ).map(([series, color]) =>
          onOpen && selected ? (
            <button
              key={series}
              type="button"
              className={`${styles.legendItem} ${styles.legendButton}`}
              onClick={() => onOpen(series, selected.key)}
            >
              <span className={styles.swatch} style={{ background: color }} />
              {t(`rso.series.${series}`)}
            </button>
          ) : (
            <span key={series} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: color }} />
              {t(`rso.series.${series}`)}
            </span>
          ),
        )}
        {onOpen && <span className={styles.hint}>{t("rso.drill.chartHint")}</span>}
      </div>
    </div>
  );
}
