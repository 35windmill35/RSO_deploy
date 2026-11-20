import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import type { AccountRow, Period } from "@Rso/entities/rso/api/contract";
import { formatPeriodLabel } from "@Rso/entities/rso/lib/period";
import { sliceValue } from "@Rso/entities/rso/lib/sales";
import { ratio } from "@Rso/entities/rso/lib/money";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { DASH, formatMoney, formatNumber } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { accountsTotals } from "../../model/accountsData";
import { drillStore, type DrillNode } from "../../model/drillStore";
import type { DrillTarget } from "../../model/targets";
import { AccountsGate } from "./gates";
import { SliceDayAccounts, SliceDays, SliceTiles } from "./SliceAccounts";
import styles from "../DrillDrawer.module.css";

type SliceTarget = Extract<DrillTarget, { kind: "accountType" | "paymentType" }>;

interface SliceViewProps {
  target: SliceTarget;
  node: DrillNode;
}

interface MonthRow {
  period: Period;
  // null — месяц ещё грузится или не загрузился
  turnover: number | null;
  count: number | null;
  status: "loading" | "ready" | "error";
}

// Вид услуги (тип ЗН) или форма оплаты: месяцы → дни → ЗН среза
export const SliceView = observer(function SliceView({ target, node }: SliceViewProps) {
  const { t } = useTranslation();
  const vat = filtersStore.vat;
  const { period } = node;
  const slice = target.kind;
  const match = (row: AccountRow) => sliceValue(row, slice) === target.label;
  const preset = target.label
    ? slice === "accountType"
      ? { accountType: target.label }
      : { paymentType: target.label }
    : undefined;

  if (node.day) {
    const day = node.day;
    return (
      <AccountsGate period={period}>
        {(rows) => (
          <SliceDayAccounts period={period} day={day} rows={rows} match={match} preset={preset} />
        )}
      </AccountsGate>
    );
  }

  if (period.type === "M") {
    return (
      <AccountsGate period={period}>
        {(rows) => {
          const sliced = rows.filter(match);
          return (
            <>
              <SliceTiles rows={sliced} />
              <SliceDays period={period} rows={sliced} />
            </>
          );
        }}
      </AccountsGate>
    );
  }

  // Квартал / год: срез по каждому посчитанному месяцу
  const months = drillStore.months(period);
  const monthRows: MonthRow[] = months.map((month) => {
    const resource = drillStore.accountsOf(month.key);
    if (resource?.status !== "ready" || !resource.data) {
      return {
        period: month,
        turnover: null,
        count: null,
        status: resource?.status === "error" ? "error" : "loading",
      };
    }
    const totals = accountsTotals(resource.data.filter(match), vat);
    return { period: month, turnover: totals.turnover, count: totals.count, status: "ready" };
  });
  const ready = months.flatMap((month) => {
    const resource = drillStore.accountsOf(month.key);
    return resource?.status === "ready" && resource.data ? resource.data.filter(match) : [];
  });
  const loaded = monthRows.filter((row) => row.status === "ready").length;
  const failed = monthRows.some((row) => row.status === "error");

  const columns: DataTableColumn<MonthRow>[] = [
    {
      key: "period",
      label: t("rso.drill.period"),
      grow: true,
      render: (r) => formatPeriodLabel(r.period),
    },
    {
      key: "turnover",
      label: t("rso.col.turnover"),
      align: "right",
      render: (r) => (r.status === "ready" ? formatMoney(r.turnover) : DASH),
    },
    {
      key: "count",
      label: t("rso.col.accountCount"),
      align: "right",
      render: (r) => (r.status === "ready" ? formatNumber(r.count) : DASH),
    },
    {
      key: "avg",
      label: t("rso.col.avgCheck"),
      align: "right",
      render: (r) => (r.status === "ready" ? formatMoney(ratio(r.turnover, r.count)) : DASH),
    },
  ];

  return (
    <>
      <SliceTiles rows={ready} />
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h3 className={styles.sectionTitle}>{t("rso.drill.byMonths")}</h3>
          <span className={styles.sectionHint}>
            {loaded < months.length
              ? t("rso.sales.services.progress", { done: loaded, total: months.length })
              : t("rso.drill.clickHint")}
          </span>
        </div>
        {months.length === 0 ? (
          <BlockState kind="empty" message={t("rso.drill.noChildren")} />
        ) : (
          <DataTable<MonthRow>
            columns={columns}
            rows={monthRows}
            getRowKey={(r) => String(r.period.key)}
            onRowClick={(r) => drillStore.push({ period: r.period })}
          />
        )}
        {failed && (
          <BlockState
            kind="error"
            message={t("rso.sales.services.partialError", {
              months: monthRows
                .filter((row) => row.status === "error")
                .map((row) => formatPeriodLabel(row.period))
                .join(", "),
            })}
            onRetry={() => drillStore.retryNode()}
          />
        )}
      </section>
    </>
  );
});
