import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import type { Period } from "@Rso/entities/rso/api/contract";
import { formatPeriodLabel } from "@Rso/entities/rso/lib/period";
import { METRICS, metricDelta, type Metric } from "@Rso/entities/rso/lib/metrics";
import { prevPeriod } from "@Rso/entities/rso/lib/periodKey";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { DASH, deltaTone, formatDelta } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { drillStore } from "../model/drillStore";
import styles from "./DrillDrawer.module.css";

interface PeriodChildrenTableProps {
  period: Period;
  metric: Metric;
}

interface ChildRow {
  period: Period;
  value: number | null;
  delta: number | null | undefined;
  related: (number | null)[];
}

// Год → кварталы, квартал → месяцы. Клик по строке — уровнем ниже.
export const PeriodChildrenTable = observer(function PeriodChildrenTable({
  period,
  metric,
}: PeriodChildrenTableProps) {
  const { t } = useTranslation();
  const vat = filtersStore.vat;
  const children = drillStore.children(period);
  const source = drillStore.childrenSource(period);
  const resource = source ? drillStore.dashboard(source) : undefined;
  const title = t(period.type === "Y" ? "rso.drill.byQuarters" : "rso.drill.byMonths");

  let content;
  if (!source || children.length === 0) {
    content = <BlockState kind="empty" message={t("rso.drill.noChildren")} />;
  } else if (!resource || resource.status === "loading") {
    content = <BlockState kind="loading" />;
  } else if (resource.status === "error") {
    content = (
      <BlockState kind="error" message={resource.error} onRetry={() => drillStore.retryNode()} />
    );
  } else {
    const related = metric.related.map((id) => METRICS[id]);
    const rows: ChildRow[] = children.map((child) => {
      const row = drillStore.summaryRow(child, source);
      const prevRow = drillStore.summaryRow(prevPeriod(child), source);
      const value = row ? metric.value(row, vat) : null;
      return {
        period: child,
        value,
        delta: metricDelta(metric, value, prevRow ? metric.value(prevRow, vat) : null),
        related: related.map((item) => (row ? item.value(row, vat) : null)),
      };
    });
    const max = Math.max(0, ...rows.map((row) => Math.abs(row.value ?? 0)));

    const columns: DataTableColumn<ChildRow>[] = [
      {
        key: "period",
        label: t("rso.drill.period"),
        render: (row) => formatPeriodLabel(row.period),
      },
      {
        key: "value",
        label: t(`rso.kpi.${metric.id}.label`),
        align: "right",
        grow: true,
        render: (row) => (
          <span className={styles.barCell}>
            <span className={styles.barTrack} aria-hidden="true">
              <span
                className={styles.barFill}
                style={{ width: `${max > 0 ? (Math.abs(row.value ?? 0) / max) * 100 : 0}%` }}
              />
            </span>
            <span className={styles.barValue}>{metric.format(row.value)}</span>
          </span>
        ),
      },
    ];
    if (metric.deltaUnit !== "none") {
      columns.push({
        key: "delta",
        label: t("rso.drill.delta"),
        align: "right",
        render: (row) => {
          const text = formatDelta(row.delta, metric.deltaUnit === "pp" ? "pp" : "pct");
          if (!text) return DASH;
          return (
            <span className={styles[deltaTone(row.delta, metric.higherIsBetter)]}>{text}</span>
          );
        },
      });
    }
    related.forEach((item, index) => {
      columns.push({
        key: item.id,
        label: t(`rso.kpi.${item.id}.label`),
        align: "right",
        render: (row) => item.format(row.related[index] ?? null),
      });
    });

    content = (
      <DataTable<ChildRow>
        columns={columns}
        rows={rows}
        getRowKey={(row) => String(row.period.key)}
        onRowClick={(row) => drillStore.push({ period: row.period })}
      />
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        <span className={styles.sectionHint}>{t("rso.drill.clickHint")}</span>
      </div>
      {content}
    </section>
  );
});
