import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import type { AccountRow, Period } from "@Rso/entities/rso/api/contract";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { formatDay, formatMoney, formatNumber } from "@Rso/shared/lib/format";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { KpiCard } from "@Rso/shared/ui/KpiCard/KpiCard";
import {
  accountsTotals,
  groupByDay,
  type AccountFilters,
  type DayRow,
} from "../../model/accountsData";
import { drillStore } from "../../model/drillStore";
import { AccountsTable } from "../AccountsTable";
import styles from "../DrillDrawer.module.css";

interface SliceTilesProps {
  rows: readonly AccountRow[];
}

// Показатели среза по заказ-нарядам: оборот, количество, средний оборот
export const SliceTiles = observer(function SliceTiles({ rows }: SliceTilesProps) {
  const { t } = useTranslation();
  const totals = accountsTotals(rows, filtersStore.vat);
  return (
    <div className={styles.tiles}>
      <KpiCard
        label={t("rso.drill.accountsTurnover")}
        value={totals.turnover}
        format={formatMoney}
      />
      <KpiCard label={t("rso.kpi.accountCount.label")} value={totals.count} format={formatNumber} />
      <KpiCard label={t("rso.drill.avgTurnover")} value={totals.avgCheck} format={formatMoney} />
    </div>
  );
});

interface SliceDaysProps {
  period: Period;
  // ЗН месяца, уже отфильтрованные по срезу
  rows: readonly AccountRow[];
}

// Дни месяца по срезу. Клик по дню — ЗН дня, кнопка — все ЗН месяца
export const SliceDays = observer(function SliceDays({ period, rows }: SliceDaysProps) {
  const { t } = useTranslation();
  const days = groupByDay(rows, filtersStore.vat);
  const max = Math.max(0, ...days.map((row) => row.turnover));

  const columns: DataTableColumn<DayRow>[] = [
    { key: "date", label: t("rso.drill.day"), render: (row) => formatDay(row.date) },
    {
      key: "turnover",
      label: t("rso.col.turnover"),
      align: "right",
      grow: true,
      render: (row) => (
        <span className={styles.barCell}>
          <span className={styles.barTrack} aria-hidden="true">
            <span
              className={styles.barFill}
              style={{ width: `${max > 0 ? (row.turnover / max) * 100 : 0}%` }}
            />
          </span>
          <span className={styles.barValue}>{formatMoney(row.turnover)}</span>
        </span>
      ),
    },
    {
      key: "count",
      label: t("rso.col.accountCount"),
      align: "right",
      render: (row) => formatNumber(row.count),
    },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{t("rso.drill.byDays")}</h3>
        <button
          type="button"
          className={styles.linkButton}
          disabled={rows.length === 0}
          onClick={() => drillStore.push({ period, day: "all" })}
        >
          {t("rso.drill.showAllAccounts")}
        </button>
      </div>
      <DataTable<DayRow>
        columns={columns}
        rows={days}
        getRowKey={(row) => row.date}
        onRowClick={(row) => drillStore.push({ period, day: row.date })}
        emptyText={t("rso.drill.noAccounts")}
      />
      <p className={styles.footnote}>{t("rso.drill.turnoverHint")}</p>
    </section>
  );
});

interface SliceDayAccountsProps {
  period: Period;
  day: string;
  // Все ЗН месяца и срез: строки среза — для показателей, фильтр — для таблицы
  rows: readonly AccountRow[];
  match: (row: AccountRow) => boolean;
  preset?: Partial<AccountFilters>;
}

// ЗН дня (или всего месяца) по срезу. Если срез выражается фильтром таблицы —
// таблица получает все ЗН и выбранный фильтр, который можно снять
export const SliceDayAccounts = observer(function SliceDayAccounts({
  period,
  day,
  rows,
  match,
  preset,
}: SliceDayAccountsProps) {
  const ofDay = rows.filter((row) => day === "all" || row.DATE_EVENT?.slice(0, 10) === day);
  const sliced = ofDay.filter(match);
  return (
    <>
      <SliceTiles rows={sliced} />
      <AccountsTable rows={preset ? ofDay : sliced} period={period} day={day} preset={preset} />
    </>
  );
});
