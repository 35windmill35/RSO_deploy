import { useState, type ReactNode } from "react";
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
import { useTranslation } from "react-i18next";
import type { Period } from "@Rso/entities/rso/api/contract";
import { formatPeriodLabel, formatPeriodShortLabel } from "@Rso/entities/rso/lib/period";
import type { DepartmentTrend, TrendMeasure } from "@Rso/entities/rso/lib/sales";
import {
  CHART_ANIMATION,
  CHART_COLOR,
  GRID_PROPS,
  SERIES_COLORS,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
} from "@Rso/shared/lib/chartTheme";
import {
  DASH,
  formatCompactMoney,
  formatHours,
  formatMoney,
  formatNumber,
  formatPct,
} from "@Rso/shared/lib/format";
import { Card } from "@Rso/shared/ui/Card/Card";
import { ChartTooltip } from "@Rso/shared/ui/chart/ChartTooltip";
import { Segmented } from "@Rso/shared/ui/Segmented/Segmented";
import styles from "./SalesBlocks.module.css";

// Отделы с шестого объединяются в «Прочие отделы»
const MAX_SERIES = SERIES_COLORS.length;
const OTHERS = "others";

interface ChartPoint {
  key: number;
  label: string;
  isSelected: boolean;
  [series: string]: number | string | boolean | null;
}

interface DepartmentsTrendChartProps {
  trend: DepartmentTrend | null;
  measure: TrendMeasure;
  onMeasureChange: (measure: TrendMeasure) => void;
  period: Period | null;
  fallback?: ReactNode;
  // Клик по столбцу отдела — drill по отделу за этот период
  onOpen?: (departmentId: number, name: string | null, periodKey: number) => void;
}

const FORMATS: Record<TrendMeasure, (value: number) => string> = {
  turnover: formatMoney,
  accounts: formatNumber,
  hours: formatHours,
};

const AXIS_FORMATS: Record<TrendMeasure, (value: number) => string> = {
  turnover: formatCompactMoney,
  accounts: formatNumber,
  hours: formatNumber,
};

// Динамика оборота, ЗН или нормо-часов по отделам: столбцы с накоплением за 12 периодов
export function DepartmentsTrendChart({
  trend,
  measure,
  onMeasureChange,
  period,
  fallback,
  onOpen,
}: DepartmentsTrendChartProps) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const actions = (
    <Segmented<TrendMeasure>
      tone="card"
      label={t("rso.sales.measure.label")}
      value={measure}
      options={[
        { value: "turnover", label: t("rso.sales.measure.turnover") },
        { value: "accounts", label: t("rso.sales.measure.accounts") },
        { value: "hours", label: t("rso.sales.measure.hours") },
      ]}
      onChange={onMeasureChange}
    />
  );

  const card = (content: ReactNode) => (
    <Card
      title={t("rso.block.turnoverTrend.title")}
      subtitle={t("rso.block.turnoverTrend.subtitle")}
      variant="chart"
      actions={actions}
    >
      {content}
    </Card>
  );

  if (fallback || !trend || !period) return card(fallback);

  const main = trend.series.slice(0, MAX_SERIES - (trend.series.length > MAX_SERIES ? 1 : 0));
  const rest = trend.series.slice(main.length);
  const series = [
    ...main.map((item, index) => ({
      id: String(item.id),
      departmentId: item.id as number | null,
      name: item.name ?? DASH,
      color: SERIES_COLORS[index],
    })),
    ...(rest.length > 0
      ? [
          {
            id: OTHERS,
            departmentId: null,
            name: t("rso.sales.otherDepartments"),
            color: CHART_COLOR.neutral,
          },
        ]
      : []),
  ];

  const data: ChartPoint[] = trend.points.map((point) => {
    const row: ChartPoint = {
      key: point.key,
      label: formatPeriodShortLabel({ type: period.type, key: point.key }),
      isSelected: point.key === period.key,
    };
    main.forEach((item) => {
      row[String(item.id)] = point.values[item.id] ?? null;
    });
    if (rest.length > 0) {
      row[OTHERS] = rest.reduce((sum, item) => sum + (point.values[item.id] ?? 0), 0);
    }
    return row;
  });

  const toggle = (id: string) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const format = FORMATS[measure];
  const totals = new Map(trend.points.map((point) => [point.key, point.total]));

  return card(
    <>
      <div className={`${styles.chart} ${onOpen ? styles.clickableChart : ""}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...X_AXIS_PROPS} interval="preserveStartEnd" minTickGap={8} />
            <YAxis
              {...Y_AXIS_PROPS}
              tickFormatter={(value: number) => AXIS_FORMATS[measure](value)}
            />
            <Tooltip
              cursor={{ fill: "var(--rso-hover)" }}
              content={(props) => {
                const point = props.payload?.[0]?.payload as ChartPoint | undefined;
                // Доля отдела — от итога периода по всем отделам, включая скрытые
                const total = point ? (totals.get(point.key) ?? 0) : 0;
                return (
                  <ChartTooltip
                    {...props}
                    title={
                      point ? formatPeriodLabel({ type: period.type, key: point.key }) : undefined
                    }
                    valueFormatter={(value) =>
                      `${format(value)} · ${formatPct(total ? (value / total) * 100 : null)}`
                    }
                    footer={
                      point ? { label: t("rso.drill.total"), value: format(total) } : undefined
                    }
                  />
                );
              }}
            />
            {series
              .filter((item) => !hidden.has(item.id))
              .map((item) => (
                <Bar
                  key={item.id}
                  dataKey={item.id}
                  name={item.name}
                  stackId="departments"
                  fill={item.color}
                  maxBarSize={48}
                  className={item.departmentId === null ? styles.staticBar : undefined}
                  onClick={(entry: { payload?: unknown }) => {
                    const point = entry.payload as ChartPoint | undefined;
                    if (onOpen && point && item.departmentId !== null) {
                      onOpen(item.departmentId, item.name, point.key);
                    }
                  }}
                  {...CHART_ANIMATION}
                >
                  {/* Выбранный период ярче остальных */}
                  {data.map((point) => (
                    <Cell key={point.key} fillOpacity={point.isSelected ? 1 : 0.55} />
                  ))}
                </Bar>
              ))}
          </BarChart>
        </ResponsiveContainer>
        <div className={styles.legend}>
          {series.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.legendItem} ${hidden.has(item.id) ? styles.legendHidden : ""}`}
              aria-pressed={!hidden.has(item.id)}
              onClick={() => toggle(item.id)}
            >
              <span className={styles.swatch} style={{ background: item.color }} />
              {item.name}
            </button>
          ))}
        </div>
        {data.length === 1 && <p className={styles.footnote}>{t("rso.sales.trend.single")}</p>}
      </div>
      {/* Drill по отделу за любой период — с клавиатуры и для экранного диктора */}
      {onOpen && (
        <table className={styles.srOnly}>
          <caption>{t("rso.block.turnoverTrend.title")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("rso.drill.period")}</th>
              {main.map((item) => (
                <th key={item.id} scope="col">
                  {item.name ?? DASH}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.key}>
                <th scope="row">{formatPeriodLabel({ type: period.type, key: point.key })}</th>
                {main.map((item) => {
                  // Отдела не было в периоде — прочерк, как в тултипе графика, и без перехода
                  const value = point[String(item.id)];
                  return (
                    <td key={item.id}>
                      {typeof value === "number" ? (
                        <button type="button" onClick={() => onOpen(item.id, item.name, point.key)}>
                          {format(value)}
                        </button>
                      ) : (
                        DASH
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>,
  );
}
