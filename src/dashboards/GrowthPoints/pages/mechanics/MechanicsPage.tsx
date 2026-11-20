import { observer } from "mobx-react-lite";
import { dashboardStore } from "@GrowthPoints/entities/dashboard/model/dashboardStore";
import { periodsStore } from "@GrowthPoints/entities/dashboard/model/periodsStore";
import type { MetricRow } from "@GrowthPoints/entities/dashboard/model/types";
import { KpiCard } from "@GrowthPoints/shared/ui/KpiCard/KpiCard";
import { BarChart } from "@GrowthPoints/shared/ui/charts/BarChart";
import { ScatterChart } from "@GrowthPoints/shared/ui/charts/ScatterChart";
import { DataTable } from "@GrowthPoints/shared/ui/DataTable/DataTable";
import { AsyncBoundary } from "@GrowthPoints/shared/ui/AsyncBoundary/AsyncBoundary";
import { PageHeader } from "@GrowthPoints/shared/ui/PageHeader/PageHeader";
import { useDrillThrough } from "@GrowthPoints/features/drill-through/model/useDrillThrough";
import { DrillThroughModal } from "@GrowthPoints/features/drill-through/ui/DrillThroughModal";
import { CHART_COLORS } from "@GrowthPoints/shared/lib/chartColors";
import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatHours,
  formatServiceTime,
  calcDelta,
  formatDelta,
  isDeltaPositive,
  formatShortName,
} from "@GrowthPoints/shared/lib/formatters";
import { previousPeriodModeDative } from "@GrowthPoints/shared/lib/periodFormat";
import styles from "./Mechanics.module.css";
import { useTranslation } from "react-i18next";

// Экран «Механики» (ТЗ §4.4). В ответе API нет своего mechanicsPrev (в
// отличие от mastersPrev) — данные за предыдущий период для Δ Т-фактора
// подгружаются отдельным запросом на фронте (см. dashboardStore.js,
// mechanicsPrev/loadPrevPeriod), тем же методом getDashboardData.
export const MechanicsPage = observer(function MechanicsPage() {
  const { t } = useTranslation();
  const drillThrough = useDrillThrough();

  const mechanics = dashboardStore.mechanicsFiltered;
  const mechanicsPrev = dashboardStore.mechanicsPrev;
  const prevById = new Map(mechanicsPrev.map((m) => [m.MECHANIC_ID, m]));

  const mechanicCount = mechanics.length;
  const totalTurnover = mechanics.reduce((sum, m) => sum + ((m.TURNOVER as number) || 0), 0);

  const withAccountCount = mechanics.filter(
    (m) => m.ACCOUNT_COUNT !== null && m.ACCOUNT_COUNT !== undefined,
  );
  const avgAccountCount = withAccountCount.length
    ? withAccountCount.reduce((sum, m) => sum + (m.ACCOUNT_COUNT as number), 0) /
      withAccountCount.length
    : null;

  const withAccuracy = mechanics.filter((m) => m.ACCURACY !== null && m.ACCURACY !== undefined);
  const avgAccuracy = withAccuracy.length
    ? withAccuracy.reduce((sum, m) => sum + (m.ACCURACY as number), 0) / withAccuracy.length
    : null;

  const turnoverData = mechanics
    .filter((m) => m.TURNOVER !== null && m.TURNOVER !== undefined)
    .sort((a, b) => (b.TURNOVER as number) - (a.TURNOVER as number));

  const scatterData = mechanics.filter(
    (m) =>
      m.WASTED_TIME_MIN !== null &&
      m.WASTED_TIME_MIN !== undefined &&
      m.ACCURACY !== null &&
      m.ACCURACY !== undefined,
  );

  // В агрегатах ("mechanics") поле называется MECHANIC_ID, а в самих
  // заказ-нарядах (AccountListDashboardGrowingPoints) — MAIN_MECHANIC_ID.
  // Разные имена в разных методах API, это подтверждено реальным ответом
  // сервера 26.07.2026 (см. dashboardApi.js).
  const openMechanicDrillThrough = (mechanic: MetricRow) => {
    drillThrough.open({
      title: t("growthPoints.accounts.mechanic.name", {
        name: formatShortName(mechanic.MECHANIC_NAME),
      }),
      filterString: "MAIN_MECHANIC_ID=?",
      filterParam: [mechanic.MECHANIC_ID as number],
    });
  };

  const periodLabel = periodsStore.selectedPeriodLabel;

  // "Оборот по механикам" (вертикальный BarChart) и "Потери vs Аккуратность"
  // (ScatterChart) стоят рядом в один ряд — раньше у них были разные
  // дефолтные высоты (280 vs 320), из-за чего ось X слева заканчивалась
  // выше, чем справа, и снизу оставалось пустое место. Формула та же, что
  // внутри BarChart.jsx для vertical layout — считаем явно и передаём в оба
  // графика, чтобы оси совпадали независимо от числа механиков.
  const mechanicsChartHeight = Math.max(320, turnoverData.length * 36 + 40);

  return (
    <div className={styles.page}>
      <PageHeader
        title={t("growthPoints.mechanicsList")}
        subtitle={t("growthPoints.mechanicsStatisticPeriod", {
          period: periodLabel,
        })}
      />

      <AsyncBoundary
        isLoading={dashboardStore.isLoadingAny}
        error={dashboardStore.errorAny}
        isEmpty={!dashboardStore.isLoadingAny && mechanics.length === 0}
        onRetry={() =>
          periodsStore.selectedPeriod && dashboardStore.load(periodsStore.selectedPeriod)
        }
      >
        <div className={styles.kpiGrid}>
          <KpiCard
            title={t("growthPoints.mechanics.kpi.count")}
            value={formatNumber(mechanicCount)}
            tooltip={t("growthPoints.mechanics.kpi.countHint")}
          />
          <KpiCard
            title={t("growthPoints.mechanics.kpi.totalTurnover")}
            value={formatCurrency(totalTurnover)}
            tooltip={t("growthPoints.mechanics.kpi.totalTurnoverHint")}
          />
          <KpiCard
            title={t("growthPoints.mechanics.kpi.averageAccountCount")}
            value={formatNumber(avgAccountCount, { decimals: 1 })}
            tooltip={t("growthPoints.mechanics.kpi.averageAccountCountHint")}
          />

          <KpiCard
            title={t("growthPoints.mechanics.kpi.averageAccuracy")}
            value={formatPercent(avgAccuracy)}
            tooltip={t("growthPoints.mechanics.kpi.averageAccuracyHint")}
          />
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartWrapper}>
            <h3 className={styles.chartTitle}>{t("growthPoints.chart.turnoverByMechanics")}</h3>
            <div className={styles.chartFill} style={{ minHeight: mechanicsChartHeight }}>
              <BarChart
                layout="vertical"
                data={turnoverData}
                categoryKey="MECHANIC_NAME"
                dataKey="TURNOVER"
                label={t("growthPoints.column.turnover")}
                height="100%"
                valueFormatter={(value) => formatCurrency(value)}
                categoryFormatter={formatShortName}
                onBarClick={openMechanicDrillThrough}
              />
            </div>
          </div>

          <div className={styles.chartWrapper}>
            <h3 className={styles.chartTitle}> {t("growthPoints.chart.lossesVsAccuracy")}</h3>
            <p className={styles.scatterNote}>{t("growthPoints.chart.lossesVsAccuracyHint")}</p>
            <div className={styles.chartFill} style={{ minHeight: mechanicsChartHeight }}>
              <ScatterChart
                data={scatterData}
                xKey="WASTED_TIME_MIN"
                yKey="ACCURACY"
                nameKey="MECHANIC_NAME"
                xLabel={t("growthPoints.chart.lossesMinutes")}
                yLabel={t("growthPoints.chart.accuracyPercent")}
                height="100%"
                getColor={(m) =>
                  (m.ACCURACY as number) >= 75 ? CHART_COLORS.positive : CHART_COLORS.negative
                }
                onPointClick={openMechanicDrillThrough}
                nameFormatter={formatShortName}
              />
            </div>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <h3 className={styles.tableTitle}>{t("growthPoints.mechanics.fullTable")}</h3>
          <DataTable
            columns={[
              {
                key: "MECHANIC_NAME",
                header: t("growthPoints.column.mechanic"),
                render: (r) => formatShortName(r.MECHANIC_NAME) || "—",
              },
              {
                key: "ACCOUNT_COUNT",
                header: t("growthPoints.column.account"),
                tooltip: t("growthPoints.column.accountCountHint"),
                render: (r) => formatNumber(r.ACCOUNT_COUNT),
              },
              {
                key: "TURNOVER",
                header: t("growthPoints.column.turnover"),
                render: (r) => formatCurrency(r.TURNOVER),
              },
              {
                key: "AVG_CASH",
                header: t("growthPoints.column.cash"),
                tooltip: t("growthPoints.column.averageCashHint"),
                render: (r) => formatCurrency(r.AVG_CASH),
              },
              {
                key: "ARTICLE_WORK_RATIO",
                header: t("growthPoints.column.ratioArticle"),
                tooltip: t("growthPoints.column.articleWorkRatioHint"),
                render: (r) => formatPercent(r.ARTICLE_WORK_RATIO),
              },
              {
                key: "AVG_SERVICE_TIME",
                header: t("growthPoints.column.timeRepaer"),
                render: (r) => formatServiceTime(r.AVG_SERVICE_TIME),
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
                  const prev = prevById.get(r.MECHANIC_ID);
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
                tooltip: t("growthPoints.column.downtimePerAccount"),
                render: (row) =>
                  row.WASTED_TIME_MIN == null
                    ? "—"
                    : `${formatNumber(row.WASTED_TIME_MIN)} ${t("short.min")}`,
              },
              {
                key: "ACCURACY",
                header: t("growthPoints.column.careless"),
                tooltip: t("growthPoints.qualityExecution"),
                render: (r) => formatPercent(r.ACCURACY),
              },
            ]}
            data={mechanics}
            getRowKey={(r) => r.MECHANIC_ID as number}
            onRowClick={openMechanicDrillThrough}
          />
        </div>
      </AsyncBoundary>

      <DrillThroughModal {...drillThrough} />
    </div>
  );
});
