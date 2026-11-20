import { CausersComparisonChart, CausesComparisonChart } from "./charts/CausesComparisonChart";
import { AverageDamageComparisonChart } from "./charts/AverageDamageComparisonChart";
import { DamageCompensationComparisonChart } from "./charts/DamageCompensationComparisonChart";
import { AccidentsCountTrendChart } from "./charts/AccidentsCountTrendChart";
import { DamageSumTrendChart } from "./charts/DamageSumTrendChart";
import { CompensatedSumTrendChart } from "./charts/CompensatedSumTrendChart";
import { RepeatDriversComparisonChart } from "./charts/RepeatDriversComparisonChart";
import type { AnalyticsData } from "../model/analyticsData";
import type { AccidentRow } from "@Accidents/entities/accident/model/types";
import type { Period } from "@Accidents/entities/accident/lib/period";
import styles from "./AnalyticsCharts.module.css";

interface AnalyticsChartsProps {
  data: AnalyticsData;
  period: Period;
  rowsA: AccidentRow[];
  rowsB: AccidentRow[];
}

export function AnalyticsCharts({ data, period, rowsA, rowsB }: AnalyticsChartsProps) {
  return (
    <div className={styles.grid}>
      <CausersComparisonChart data={data} period={period} />
      <CausesComparisonChart data={data} period={period} />
      <AverageDamageComparisonChart data={data} period={period} />
      <DamageCompensationComparisonChart data={data} period={period} />
      <AccidentsCountTrendChart data={data} rowsA={rowsA} rowsB={rowsB} />
      <DamageSumTrendChart data={data} rowsA={rowsA} rowsB={rowsB} />
      <CompensatedSumTrendChart data={data} rowsA={rowsA} rowsB={rowsB} />
      <RepeatDriversComparisonChart data={data} />
    </div>
  );
}
