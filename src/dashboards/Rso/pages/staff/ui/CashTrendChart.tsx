import type { ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import type { Period } from "@Rso/entities/rso/api/contract";
import type { CashLine } from "@Rso/entities/rso/lib/cash";
import { formatPeriodLabel, formatPeriodShortLabel } from "@Rso/entities/rso/lib/period";
import {
  CHART_ANIMATION,
  CHART_COLOR,
  GRID_PROPS,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
} from "@Rso/shared/lib/chartTheme";
import { DASH, formatCompactMoney, formatMoney } from "@Rso/shared/lib/format";
import { Card } from "@Rso/shared/ui/Card/Card";
import { ChartTooltip } from "@Rso/shared/ui/chart/ChartTooltip";
import styles from "./StaffBlocks.module.css";

interface ChartPoint {
  key: number;
  label: string;
  isSelected: boolean;
  cashIn: number | null;
  cashOut: number | null;
  cashProfit: number | null;
}

interface CashTrendChartProps {
  // Периоды уровня по возрастанию
  lines: CashLine[] | null;
  period: Period | null;
  // Режим «без НДС»: касса пока равна «с НДС» — пометка (П-13)
  nettoHint: boolean;
  fallback?: ReactNode;
  // Клик по столбцу — drill «Прибыль по кассе» за этот период
  onOpen?: (periodKey: number) => void;
}

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: ChartPoint;
}

const SERIES = [
  { id: "cashIn", color: CHART_COLOR.primary, line: false },
  { id: "cashOut", color: CHART_COLOR.secondary, line: false },
  { id: "cashProfit", color: CHART_COLOR.positive, line: true },
] as const;

// Точка прибыли: отрицательная — красным, знак виден и в тултипе (ТЗ §10)
function ProfitDot({ cx, cy, index, payload }: DotProps) {
  if (cx === undefined || cy === undefined || !payload || payload.cashProfit === null) {
    return <g key={index} />;
  }
  return (
    <circle
      key={index}
      cx={cx}
      cy={cy}
      r={payload.isSelected ? 5 : 3.5}
      fill={payload.cashProfit < 0 ? CHART_COLOR.negative : CHART_COLOR.positive}
      stroke={CHART_COLOR.card}
      strokeWidth={1.5}
    />
  );
}

// Касса: приход и расход столбцами, прибыль по кассе линией за периоды уровня (ТЗ §10)
export function CashTrendChart({
  lines,
  period,
  nettoHint,
  fallback,
  onOpen,
}: CashTrendChartProps) {
  const { t } = useTranslation();

  const card = (content: ReactNode) => (
    <Card
      title={t("rso.block.cashFlow.title")}
      subtitle={t("rso.block.cashFlow.subtitle")}
      variant="chart"
    >
      {content}
    </Card>
  );

  if (fallback || !lines || !period) return card(fallback);

  const data: ChartPoint[] = lines.map((line) => ({
    key: line.period.key,
    label: formatPeriodShortLabel(line.period),
    isSelected: line.period.key === period.key,
    cashIn: line.cashIn,
    cashOut: line.cashOut,
    cashProfit: line.cashProfit,
  }));
  const hasNegative = data.some((point) => (point.cashProfit ?? 0) < 0);
  const name = (id: (typeof SERIES)[number]["id"]) => t(`rso.staff.series.${id}`);
  const open = (entry: { payload?: unknown }) => {
    const point = entry.payload as ChartPoint | undefined;
    if (onOpen && point) onOpen(point.key);
  };

  return card(
    <>
      <div className={`${styles.chart} ${onOpen ? styles.clickableChart : ""}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...X_AXIS_PROPS} interval="preserveStartEnd" minTickGap={8} />
            <YAxis {...Y_AXIS_PROPS} tickFormatter={(value: number) => formatCompactMoney(value)} />
            <Tooltip
              cursor={{ fill: "var(--rso-hover)" }}
              content={(props) => {
                const point = props.payload?.[0]?.payload as ChartPoint | undefined;
                return (
                  <ChartTooltip
                    {...props}
                    title={
                      point ? formatPeriodLabel({ type: period.type, key: point.key }) : undefined
                    }
                    valueFormatter={formatMoney}
                  />
                );
              }}
            />
            {hasNegative && <ReferenceLine y={0} stroke={CHART_COLOR.neutral} />}
            {SERIES.filter((item) => !item.line).map((item) => (
              <Bar
                key={item.id}
                dataKey={item.id}
                name={name(item.id)}
                fill={item.color}
                maxBarSize={28}
                onClick={open}
                {...CHART_ANIMATION}
              >
                {/* Выбранный период ярче остальных */}
                {data.map((point) => (
                  <Cell key={point.key} fillOpacity={point.isSelected ? 1 : 0.55} />
                ))}
              </Bar>
            ))}
            <Line
              type="monotone"
              dataKey="cashProfit"
              name={name("cashProfit")}
              stroke={CHART_COLOR.positive}
              strokeWidth={2}
              dot={(props: DotProps) => <ProfitDot {...props} />}
              activeDot={false}
              connectNulls={false}
              {...CHART_ANIMATION}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className={styles.legend}>
          {SERIES.map((item) => (
            <span key={item.id} className={styles.legendItem}>
              <span
                className={item.line ? styles.swatchLine : styles.swatch}
                style={{ background: item.color }}
              />
              {name(item.id)}
            </span>
          ))}
        </div>
        {data.length === 1 && <p className={styles.footnote}>{t("rso.sales.trend.single")}</p>}
      </div>
      {nettoHint && <p className={styles.footnote}>{t("rso.staff.cash.nettoHint")}</p>}
      {/* Drill за любой период — с клавиатуры и для экранного диктора */}
      {onOpen && (
        <table className={styles.srOnly}>
          <caption>{t("rso.block.cashFlow.title")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("rso.drill.period")}</th>
              {SERIES.map((item) => (
                <th key={item.id} scope="col">
                  {name(item.id)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.key}>
                <th scope="row">
                  <button type="button" onClick={() => onOpen(point.key)}>
                    {formatPeriodLabel({ type: period.type, key: point.key })}
                  </button>
                </th>
                {SERIES.map((item) => (
                  <td key={item.id}>
                    {point[item.id] === null ? DASH : formatMoney(point[item.id])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>,
  );
}
