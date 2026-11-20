import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { METRICS, metricDelta, type Metric } from "@Rso/entities/rso/lib/metrics";
import { prevPeriod } from "@Rso/entities/rso/lib/periodKey";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { KpiCard } from "@Rso/shared/ui/KpiCard/KpiCard";
import { formatMoney, formatNumber } from "@Rso/shared/lib/format";
import { drillStore, type DrillNode } from "../model/drillStore";
import { accountsTotals } from "../model/accountsData";
import { PeriodChildrenTable } from "./PeriodChildrenTable";
import { DaysTable } from "./DaysTable";
import { AccountsTable } from "./AccountsTable";
import { MetricBreakdown } from "./breakdowns/MetricBreakdown";
import styles from "./DrillDrawer.module.css";

interface DrillNodeViewProps {
  node: DrillNode;
  metric: Metric;
}

// Содержимое уровня панели
export const DrillNodeView = observer(function DrillNodeView({ node, metric }: DrillNodeViewProps) {
  const { t } = useTranslation();
  const vat = filtersStore.vat;
  const { period } = node;

  // ─── День или все ЗН месяца: показатели — по списку заказ-нарядов ──────
  // Это оборот по ЗН (TURNOVER_TOTAL), а не выручка из summary — подписи свои
  if (node.day) {
    const resource = drillStore.accountsOf(period.key);
    if (!resource || resource.status === "loading") return <BlockState kind="loading" />;
    if (resource.status === "error" || !resource.data) {
      return (
        <BlockState kind="error" message={resource.error} onRetry={() => drillStore.retryNode()} />
      );
    }
    const rows = resource.data.filter(
      (row) => node.day === "all" || row.DATE_EVENT?.slice(0, 10) === node.day,
    );
    const totals = accountsTotals(rows, vat);
    return (
      <>
        <div className={styles.tiles}>
          <KpiCard
            label={t("rso.drill.accountsTurnover")}
            value={totals.turnover}
            format={formatMoney}
          />
          <KpiCard
            label={t("rso.kpi.accountCount.label")}
            value={totals.count}
            format={formatNumber}
          />
          <KpiCard
            label={t("rso.drill.avgTurnover")}
            value={totals.avgCheck}
            format={formatMoney}
          />
        </div>
        <AccountsTable rows={rows} period={period} day={node.day} />
      </>
    );
  }

  // ─── Период: показатели — из DashboardRSO.summary ─────────────────────
  const own = drillStore.dashboard(period);
  if (!own || own.status === "loading") return <BlockState kind="loading" />;
  if (own.status === "error") {
    return <BlockState kind="error" message={own.error} onRetry={() => drillStore.retryNode()} />;
  }

  const row = drillStore.summaryRow(period);
  const prevRow = drillStore.summaryRow(prevPeriod(period), period);
  const tileMetrics = [metric, ...metric.related.map((id) => METRICS[id])];

  return (
    <>
      <div className={styles.tiles}>
        {tileMetrics.map((item) => {
          const value = row ? item.value(row, vat) : null;
          const previous = prevRow ? item.value(prevRow, vat) : null;
          return (
            <KpiCard
              key={item.id}
              label={t(`rso.kpi.${item.id}.label`)}
              value={value}
              format={item.format}
              delta={metricDelta(item, value, previous)}
              deltaUnit={item.deltaUnit === "pp" ? "pp" : "pct"}
              higherIsBetter={item.higherIsBetter}
            />
          );
        })}
      </div>

      {period.type !== "M" && <PeriodChildrenTable period={period} metric={metric} />}

      {period.type === "M" && metric.accounts && <DaysTable period={period} metric={metric} />}

      {/* Из чего складывается показатель — на каждом уровне */}
      <MetricBreakdown metric={metric} period={period} data={own.data} />
    </>
  );
});
