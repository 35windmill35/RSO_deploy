import { useState } from "react";
import { useLocation } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { dashboardStore } from "@GrowthPoints/entities/dashboard/model/dashboardStore";
import { periodsStore } from "@GrowthPoints/entities/dashboard/model/periodsStore";
import type { MetricRow } from "@GrowthPoints/entities/dashboard/model/types";
import { Tooltip } from "@GrowthPoints/shared/ui/Tooltip/Tooltip";
import { BarChart } from "@GrowthPoints/shared/ui/charts/BarChart";
import { DataTable } from "@GrowthPoints/shared/ui/DataTable/DataTable";
import { AsyncBoundary } from "@GrowthPoints/shared/ui/AsyncBoundary/AsyncBoundary";
import { PageHeader } from "@GrowthPoints/shared/ui/PageHeader/PageHeader";
import { useDrillThrough } from "@GrowthPoints/features/drill-through/model/useDrillThrough";
import { DrillThroughModal } from "@GrowthPoints/features/drill-through/ui/DrillThroughModal";
import {
  formatCurrency,
  formatPercent,
  formatHours,
  calcDelta,
  formatDelta,
  isDeltaPositive,
  formatShortName,
} from "@GrowthPoints/shared/lib/formatters";
import { previousPeriodModeDative } from "@GrowthPoints/shared/lib/periodFormat";
import styles from "./Masters.module.css";
import { useTranslation } from "react-i18next";

interface MastersLocationState {
  highlightMasterId?: number;
}

// Экран «Мастера» (ТЗ §4.3). Карточка мастера = drill-down: локальное
// выделение (подсветка карточки, строки таблицы и столбца на графиках),
// БЕЗ перехода на другой экран. Клик по графику/строке таблицы = drill-through
// (список ЗН). Если пришли с «Эффективности» с highlightMasterId в state
// навигации — выделяем этого мастера сразу при открытии экрана.
export const MastersPage = observer(function MastersPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const drillThrough = useDrillThrough();

  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(
    (location.state as MastersLocationState | null)?.highlightMasterId ?? null,
  );

  const masters = dashboardStore.mastersFiltered;
  const mastersPrev = dashboardStore.mastersPrev;

  const prevById = new Map(mastersPrev.map((m) => [m.MASTER_ID, m]));

  const openMasterDrillThrough = (master: MetricRow) => {
    drillThrough.open({
      title: t("growthPoints.accounts.master.name", { name: formatShortName(master.MASTER_NAME) }),
      filterString: "MASTER_ID=?",
      filterParam: [master.MASTER_ID as number],
    });
  };

  const periodLabel = periodsStore.selectedPeriodLabel;

  return (
    <div className={styles.page}>
      <PageHeader
        title={t("growthPoints.mastersList")}
        subtitle={`${t("growthPoints.mastersStatistic")} — ${periodLabel}`}
      />

      <AsyncBoundary
        isLoading={dashboardStore.isLoadingAny}
        error={dashboardStore.errorAny}
        isEmpty={!dashboardStore.isLoadingAny && masters.length === 0}
        onRetry={() =>
          periodsStore.selectedPeriod && dashboardStore.load(periodsStore.selectedPeriod)
        }
      >
        <div className={styles.cardsGrid}>
          {masters.map((m) => (
            <div
              key={m.MASTER_ID}
              className={`${styles.masterCard} ${selectedMasterId === m.MASTER_ID ? styles.masterCardSelected : ""}`}
              onClick={() => setSelectedMasterId(m.MASTER_ID as number)}
            >
              <div className={styles.masterName}>{formatShortName(m.MASTER_NAME) || "—"}</div>
              <div className={styles.masterMetrics}>
                <Tooltip text={t("growthPoints.master.turnoverShareHint")}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>
                      {t("growthPoints.master.turnoverShare")}
                    </span>
                    <span className={styles.metricValue}>{formatPercent(m.TURNOVER_SHARE)}</span>
                  </div>
                </Tooltip>

                <Tooltip text={t("growthPoints.master.turnoverHint")}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>{t("growthPoints.column.turnover")}</span>
                    <span className={styles.metricValue}>{formatCurrency(m.TURNOVER)}</span>
                  </div>
                </Tooltip>

                <Tooltip text={t("growthPoints.master.accountCountHint")}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>{t("growthPoints.column.account")}</span>
                    <span className={styles.metricValue}>{m.ACCOUNT_COUNT ?? "—"}</span>
                  </div>
                </Tooltip>

                <Tooltip text={t("growthPoints.master.averageCashHint")}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>{t("growthPoints.column.cash")}</span>
                    <span className={styles.metricValue}>{formatCurrency(m.AVG_CASH)}</span>
                  </div>
                </Tooltip>

                <Tooltip text={t("growthPoints.master.articleWorkRatioHint")}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>
                      {t("growthPoints.master.articleWorkRatio")}
                    </span>
                    <span className={styles.metricValue}>
                      {formatPercent(m.ARTICLE_WORK_RATIO)}
                    </span>
                  </div>
                </Tooltip>

                <Tooltip text={t("growthPoints.master.tFactorHint")}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>{t("growthPoints.column.tFactor")}</span>
                    <span className={styles.metricValue}>{formatPercent(m.T_FACTOR)}</span>
                  </div>
                </Tooltip>

                <Tooltip text={t("growthPoints.master.accuracyHint")}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>{t("growthPoints.column.careless")}</span>
                    <span className={styles.metricValue}>{formatPercent(m.ACCURACY)}</span>
                  </div>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartWrapper}>
            <h3 className={styles.chartTitle}>{t("growthPoints.chart.turnoverByMasters")}</h3>

            <BarChart
              data={masters}
              categoryKey="MASTER_NAME"
              dataKey="TURNOVER"
              label={t("growthPoints.column.turnover")}
              valueFormatter={formatCurrency}
              categoryFormatter={formatShortName}
              onBarClick={openMasterDrillThrough}
              highlightKey="MASTER_ID"
              highlightValue={selectedMasterId}
            />
          </div>

          <div className={styles.chartWrapper}>
            <h3 className={styles.chartTitle}>{t("growthPoints.chart.accountCountByMasters")}</h3>

            <BarChart
              data={masters}
              categoryKey="MASTER_NAME"
              dataKey="ACCOUNT_COUNT"
              label={t("growthPoints.account.count.label")}
              categoryFormatter={formatShortName}
              onBarClick={openMasterDrillThrough}
              highlightKey="MASTER_ID"
              highlightValue={selectedMasterId}
            />
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <h3 className={styles.tableTitle}>{t("growthPoints.productivityEfficiency")}</h3>
          <DataTable
            columns={[
              {
                key: "MASTER_NAME",
                header: t("growthPoints.column.master"),
                render: (r) => formatShortName(r.MASTER_NAME) || "—",
              },
              {
                key: "ACCOUNT_COUNT",
                header: t("growthPoints.column.account"),
              },
              {
                key: "TURNOVER",
                header: t("growthPoints.column.turnover"),
                render: (r) => formatCurrency(r.TURNOVER),
              },
              {
                key: "AVG_CASH",
                header: t("growthPoints.column.cash"),
                render: (r) => formatCurrency(r.AVG_CASH),
              },
              {
                key: "ARTICLE_WORK_RATIO",
                header: t("growthPoints.column.ratioArticle"),
                render: (r) => formatPercent(r.ARTICLE_WORK_RATIO),
              },
              {
                key: "LABOR_TIME",
                header: t("growthPoints.output"),
                tooltip: t("growthPoints.hormhourSumma"),
                render: (r) => formatHours(r.LABOR_TIME),
              },

              {
                key: "T_FACTOR",
                header: t("growthPoints.column.tFactorDelta"),
                tooltip: t("growthPoints.tFactorDeltaHint", {
                  period: previousPeriodModeDative(periodsStore.periodMode),
                }),
                render: (r) => {
                  const prev = prevById.get(r.MASTER_ID);
                  const delta = prev ? calcDelta(r.T_FACTOR, prev.T_FACTOR) : null;
                  const positive = isDeltaPositive(delta);
                  return (
                    <>
                      {formatPercent(r.T_FACTOR)}{" "}
                      <span
                        className={
                          positive === true
                            ? styles.deltaPositive
                            : positive === false
                              ? styles.deltaNegative
                              : styles.deltaNeutral
                        }
                      >
                        {formatDelta(delta)}
                      </span>
                    </>
                  );
                },
              },
              {
                key: "WASTED_TIME_MIN",
                header: t("growthPoints.column.wasted"),
                render: (r) =>
                  r.WASTED_TIME_MIN == null ? "—" : `${r.WASTED_TIME_MIN} ${t("short.min")}`,
              },
              {
                key: "ACCURACY",
                header: t("growthPoints.column.careless"),
                render: (r) => formatPercent(r.ACCURACY),
              },
            ]}
            data={masters}
            getRowKey={(r) => r.MASTER_ID as number}
            onRowClick={openMasterDrillThrough}
          />
        </div>
      </AsyncBoundary>

      <DrillThroughModal {...drillThrough} />
    </div>
  );
});
