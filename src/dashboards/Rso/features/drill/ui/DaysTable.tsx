import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import type { Period } from "@Rso/entities/rso/api/contract";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { formatDay, formatMoney, formatNumber } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { drillStore } from "../model/drillStore";
import { groupByDay, type DayRow } from "../model/accountsData";
import type { Metric } from "@Rso/entities/rso/lib/metrics";
import styles from "./DrillDrawer.module.css";

interface DaysTableProps {
  period: Period;
  metric: Metric;
}

// Месяц → дни закрытия ЗН (по списку DashboardRSOAccounts). Клик — ЗН за день.
export const DaysTable = observer(function DaysTable({ period, metric }: DaysTableProps) {
  const { t } = useTranslation();
  const resource = drillStore.accountsOf(period.key);

  let content;
  if (!resource || resource.status === "loading") {
    content = <BlockState kind="loading" message={t("rso.drill.loadingAccounts")} />;
  } else if (resource.status === "error") {
    content = (
      <BlockState kind="error" message={resource.error} onRetry={() => drillStore.retryNode()} />
    );
  } else {
    const days = groupByDay(resource.data ?? [], filtersStore.vat);
    // Полоса — по показателю, с которого открыли панель. Значения — по заказ-нарядам
    // (оборот TURNOVER_TOTAL), а не выручка из summary, поэтому подписи «оборот»
    const barValue = (row: DayRow) =>
      metric.id === "accountCount"
        ? row.count
        : metric.id === "avgCheck"
          ? row.avgCheck
          : row.turnover;
    const barLabel =
      metric.id === "accountCount"
        ? t("rso.col.accountCount")
        : metric.id === "avgCheck"
          ? t("rso.drill.avgTurnover")
          : t("rso.col.turnover");
    const max = Math.max(0, ...days.map((row) => barValue(row) ?? 0));

    const columns: DataTableColumn<DayRow>[] = [
      { key: "date", label: t("rso.drill.day"), render: (row) => formatDay(row.date) },
      {
        key: "bar",
        label: barLabel,
        align: "right",
        grow: true,
        render: (row) => (
          <span className={styles.barCell}>
            <span className={styles.barTrack} aria-hidden="true">
              <span
                className={styles.barFill}
                style={{ width: `${max > 0 ? ((barValue(row) ?? 0) / max) * 100 : 0}%` }}
              />
            </span>
            <span className={styles.barValue}>{metric.format(barValue(row))}</span>
          </span>
        ),
      },
    ];
    if (metric.id !== "revenue") {
      columns.push({
        key: "turnover",
        label: t("rso.col.turnover"),
        align: "right",
        render: (row) => formatMoney(row.turnover),
      });
    }
    if (metric.id !== "accountCount") {
      columns.push({
        key: "count",
        label: t("rso.col.accountCount"),
        align: "right",
        render: (row) => formatNumber(row.count),
      });
    }

    content = (
      <>
        <DataTable<DayRow>
          columns={columns}
          rows={days}
          getRowKey={(row) => row.date}
          onRowClick={(row) => drillStore.push({ period, day: row.date })}
          emptyText={t("rso.drill.noAccounts")}
        />
        <p className={styles.footnote}>{t("rso.drill.turnoverHint")}</p>
      </>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{t("rso.drill.byDays")}</h3>
        <button
          type="button"
          className={styles.linkButton}
          disabled={resource?.status !== "ready"}
          onClick={() => drillStore.push({ period, day: "all" })}
        >
          {t("rso.drill.showAllAccounts")}
        </button>
      </div>
      {content}
    </section>
  );
});
