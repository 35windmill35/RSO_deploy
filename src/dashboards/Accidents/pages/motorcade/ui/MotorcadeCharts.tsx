import { MotorcadeTrendChart } from "./charts/MotorcadeTrendChart";
import {
  CausersDonutCard,
  CausesDonutCard,
} from "@Accidents/widgets/breakdown-chart/BreakdownDonutCard";
import { MotorcadeCauseDamageChart } from "./charts/MotorcadeCauseDamageChart";
import { MotorcadeDamageTrendChart } from "./charts/MotorcadeDamageTrendChart";
import type { MotorcadeData } from "../model/motorcadeData";
import type { Period } from "@Accidents/entities/accident/lib/period";
import styles from "./MotorcadeCharts.module.css";

interface MotorcadeChartsProps {
  data: MotorcadeData;
  period: Period;
}

export function MotorcadeCharts({ data, period }: MotorcadeChartsProps) {
  return (
    <div className={styles.grid}>
      <MotorcadeTrendChart data={data} />
      <CausersDonutCard slices={data.causerSlices} period={period} />
      <CausesDonutCard slices={data.causeSlices} period={period} />
      <MotorcadeCauseDamageChart data={data} period={period} />
      <MotorcadeDamageTrendChart data={data} />
    </div>
  );
}
