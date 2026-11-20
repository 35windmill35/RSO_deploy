import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
import { formatMoney, formatPct } from "@Rso/shared/lib/format";
import { CHART_ANIMATION, CHART_COLOR } from "@Rso/shared/lib/chartTheme";
import { ChartTooltip } from "@Rso/shared/ui/chart/ChartTooltip";
import type { StructureSlice } from "../model/overviewData";
import styles from "./OverviewBlocks.module.css";

const SLICE_COLOR: Record<StructureSlice["id"], string> = {
  parts: CHART_COLOR.secondary,
  work: CHART_COLOR.primary,
  other: CHART_COLOR.neutral,
};

interface RevenueStructureChartProps {
  slices: StructureSlice[];
  // Режим «без НДС»: суммы пересчитаны оценочно — показать пометку
  approx?: boolean;
  // Drill-down: структура оборота по отделам и клиентам
  onOpen?: () => void;
}

// Оборот компании: запчасти / работы / прочее. Суммы — в выбранном режиме НДС
// (пересчёт для «без НДС» — оценочный, через nettoFactor)
export function RevenueStructureChart({ slices, approx, onOpen }: RevenueStructureChartProps) {
  const { t } = useTranslation();
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const data = slices.map((slice) => ({ ...slice, name: t(`rso.structure.${slice.id}`) }));

  return (
    <div className={styles.donutLayout}>
      <div className={`${styles.donut} ${onOpen ? styles.clickableChart : ""}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
              onClick={() => onOpen?.()}
              {...CHART_ANIMATION}
            >
              {data.map((slice) => (
                <Cell key={slice.id} fill={SLICE_COLOR[slice.id]} />
              ))}
            </Pie>
            <Tooltip
              content={(props) => <ChartTooltip {...props} valueFormatter={formatMoney} />}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.donutCenter}>
          <span className={styles.donutValue}>{formatMoney(total)}</span>
          <span className={styles.donutCaption}>{t("rso.structure.total")}</span>
        </div>
      </div>

      <ul className={styles.sliceList}>
        {data.map((slice) => (
          <li key={slice.id}>
            <button
              type="button"
              className={`${styles.sliceItem} ${styles.rowButton}`}
              disabled={!onOpen}
              onClick={() => onOpen?.()}
            >
              <span className={styles.swatch} style={{ background: SLICE_COLOR[slice.id] }} />
              <span className={styles.sliceName}>{slice.name}</span>
              <span className={styles.sliceValue}>{formatMoney(slice.value)}</span>
              <span className={styles.sliceShare}>
                {formatPct(total > 0 ? (slice.value / total) * 100 : null)}
              </span>
            </button>
          </li>
        ))}
        {approx && <li className={styles.footnote}>{t("rso.vat.approxHint")}</li>}
        {onOpen && <li className={styles.hint}>{t("rso.drill.chartHint")}</li>}
      </ul>
    </div>
  );
}
