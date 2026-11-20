import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router-dom";
import { dashboardStore } from "@GrowthPoints/entities/dashboard/model/dashboardStore";
import { periodsStore } from "@GrowthPoints/entities/dashboard/model/periodsStore";
import type { TrendRow } from "@GrowthPoints/entities/dashboard/model/types";
import { KpiCard } from "@GrowthPoints/shared/ui/KpiCard/KpiCard";
import { BarChart } from "@GrowthPoints/shared/ui/charts/BarChart";
import { LineChart } from "@GrowthPoints/shared/ui/charts/LineChart";
import { AsyncBoundary } from "@GrowthPoints/shared/ui/AsyncBoundary/AsyncBoundary";
import { PageHeader } from "@GrowthPoints/shared/ui/PageHeader/PageHeader";
import { useDrillThrough } from "@GrowthPoints/features/drill-through/model/useDrillThrough";
import { DrillThroughModal } from "@GrowthPoints/features/drill-through/ui/DrillThroughModal";
import { CHART_COLORS } from "@GrowthPoints/shared/lib/chartColors";
import { pastPeriodModeDative } from "@GrowthPoints/shared/lib/periodFormat";
import {
  formatCurrency,
  formatPercent,
  formatHours,
  formatServiceTime,
  formatMinutes,
  formatNumber,
  calcDelta,
  formatDelta,
  isDeltaPositive,
} from "@GrowthPoints/shared/lib/formatters";
import styles from "./OverviewPage.module.css";
import { useTranslation } from "react-i18next";
import { URL_GROWTH_POINTS } from "../../shared/config/urls";
import store from "@/APP/store/root";

// Экран «Обзор» (ТЗ §4.1) — эталонная реализация: 8 KPI-карточек + 4
// графика "за 12 месяцев". Остальные разработчики могут ориентироваться
// на этот файл как на пример использования shared/ui и dashboardStore.
export const OverviewPage = observer(function OverviewPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const drillThrough = useDrillThrough();

  const kpi = dashboardStore.kpi;
  const kpiPrev = dashboardStore.kpiPrev;
  const monthly = dashboardStore.monthly;

  const periodLabel = periodsStore.selectedPeriodLabel;
  const generatedOn = new Intl.DateTimeFormat(i18n.language, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  // Заголовок трендов подстраивается под текущий режим — при "по кварталу"/
  // "по году" monthly[] содержит не 12 месяцев, а все кварталы/года из
  // истории (см. periodsStore/dashboardStore), поэтому "за 12 мес" там
  // будет враньём.
  const trendSuffix =
    periodsStore.periodMode === "year"
      ? t("growthPoints.trend.years")
      : periodsStore.periodMode === "quarter"
        ? t("growthPoints.trend.quarters")
        : t("growthPoints.trend.months12");

  // Подпись под дельтой KPI-карточек ("к прошлому месяцу"/"кварталу"/"году") —
  // тоже зависит от periodMode, см. комментарий в KpiCard.jsx.
  const deltaSuffix = pastPeriodModeDative(periodsStore.periodMode);

  // Drill-through для каждой KPI-карточки (кнопка-иконка в углу, отдельно
  // от drill-down по клику на саму карточку). Сортировка по номеру ЗН —
  // по умолчанию внутри useDrillThrough.
  const openDrillThrough = (title: string) => {
    drillThrough.open({ title });
  };

  // Клик по бару/точке на графике тренда — выбрать именно этот период.
  // Тип элемента (месяц/квартал/год) зависит от текущего periodMode,
  // поэтому режим комбобокса переключаем вслед за тем, что реально
  // кликнули, а не всегда форсируем "месяц" (как было раньше, когда тренд
  // мог быть только помесячным).
  const handleTrendClick = (item: TrendRow) => {
    if (item.PERIOD_TYPE === "Y") {
      periodsStore.setPeriodMode("year");
      periodsStore.setSelectedYear(item.PERIOD_YEAR as number);
    } else if (item.PERIOD_TYPE === "Q") {
      periodsStore.setPeriodMode("quarter");
      periodsStore.setSelectedQuarter(item.PERIOD_YQ as number);
    } else {
      periodsStore.setSelectedPeriod(item.PERIOD_YM as number);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title={t("growthPoints.overview.title", {
          period: periodLabel,
        })}
        subtitle={t("growthPoints.overview.subtitle", {
          firmName: store.auth.currentFirm?.FIRM_SHORT_NAME ?? "",
          date: generatedOn,
        })}
      />

      <AsyncBoundary
        isLoading={dashboardStore.isLoadingAny}
        error={dashboardStore.errorAny}
        isEmpty={!dashboardStore.isLoadingAny && !kpi}
        onRetry={() =>
          periodsStore.selectedPeriod && dashboardStore.load(periodsStore.selectedPeriod)
        }
      >
        {kpi && (
          <>
            <div className={styles.kpiGrid}>
              <KpiCard
                title={t("growthPoints.column.turnover")}
                value={formatCurrency(kpi.TURNOVER)}
                delta={formatDelta(calcDelta(kpi.TURNOVER, kpiPrev?.TURNOVER))}
                deltaPositive={isDeltaPositive(calcDelta(kpi.TURNOVER, kpiPrev?.TURNOVER))}
                deltaSuffix={deltaSuffix}
                tooltip={t("growthPoints.kpi.turnover.monthHint")}
                onClick={() => navigate(URL_GROWTH_POINTS.masters)}
                onDrillThrough={() => openDrillThrough(t("growthPoints.accounts.periodList"))}
              />
              <KpiCard
                title={t("growthPoints.kpi.accountCount")}
                value={formatNumber(kpi.ACCOUNT_COUNT)}
                delta={formatDelta(calcDelta(kpi.ACCOUNT_COUNT, kpiPrev?.ACCOUNT_COUNT))}
                deltaPositive={isDeltaPositive(
                  calcDelta(kpi.ACCOUNT_COUNT, kpiPrev?.ACCOUNT_COUNT),
                )}
                deltaSuffix={deltaSuffix}
                tooltip={t("growthPoints.kpi.accountCount.monthHint")}
                onClick={() => navigate(URL_GROWTH_POINTS.masters)}
                onDrillThrough={() => openDrillThrough(t("growthPoints.accounts.periodList"))}
              />
              <KpiCard
                title={t("growthPoints.column.cash")}
                value={formatCurrency(kpi.AVG_CASH)}
                delta={formatDelta(calcDelta(kpi.AVG_CASH, kpiPrev?.AVG_CASH))}
                deltaPositive={isDeltaPositive(calcDelta(kpi.AVG_CASH, kpiPrev?.AVG_CASH))}
                deltaSuffix={deltaSuffix}
                tooltip={t("growthPoints.kpi.averageCashHint")}
                onClick={() => navigate(URL_GROWTH_POINTS.brands)}
                onDrillThrough={() => openDrillThrough(t("growthPoints.accounts.withAmounts"))}
              />
              <KpiCard
                title={t("growthPoints.column.tFactor")}
                value={formatPercent(kpi.T_FACTOR)}
                delta={formatDelta(calcDelta(kpi.T_FACTOR, kpiPrev?.T_FACTOR))}
                deltaPositive={isDeltaPositive(calcDelta(kpi.T_FACTOR, kpiPrev?.T_FACTOR))}
                deltaSuffix={deltaSuffix}
                tooltip={t("growthPoints.kpi.tFactorHint")}
                onClick={() => navigate(URL_GROWTH_POINTS.efficiency)}
                onDrillThrough={() => openDrillThrough(t("growthPoints.accounts.withTFactor"))}
              />
              <KpiCard
                title={t("growthPoints.column.careless")}
                value={formatPercent(kpi.ACCURACY)}
                delta={formatDelta(calcDelta(kpi.ACCURACY, kpiPrev?.ACCURACY))}
                deltaPositive={isDeltaPositive(calcDelta(kpi.ACCURACY, kpiPrev?.ACCURACY))}
                deltaSuffix={deltaSuffix}
                tooltip={t("growthPoints.kpi.accuracyHint")}
                onClick={() => navigate(URL_GROWTH_POINTS.efficiency)}
                onDrillThrough={() => openDrillThrough(t("growthPoints.accounts.period"))}
              />
              <KpiCard
                title={t("growthPoints.output")}
                value={formatHours(kpi.LABOR_TIME)}
                delta={formatDelta(calcDelta(kpi.LABOR_TIME, kpiPrev?.LABOR_TIME))}
                deltaPositive={isDeltaPositive(calcDelta(kpi.LABOR_TIME, kpiPrev?.LABOR_TIME))}
                deltaSuffix={deltaSuffix}
                tooltip={t("growthPoints.kpi.outputHint")}
                onClick={() => navigate(URL_GROWTH_POINTS.mechanics)}
                onDrillThrough={() =>
                  openDrillThrough(t("growthPoints.accounts.withStandardHours"))
                }
              />
              <KpiCard
                title={t("growthPoints.column.timeRepaer")}
                value={formatServiceTime(kpi.AVG_SERVICE_TIME)}
                delta={formatDelta(calcDelta(kpi.AVG_SERVICE_TIME, kpiPrev?.AVG_SERVICE_TIME))}
                deltaPositive={isDeltaPositive(
                  calcDelta(kpi.AVG_SERVICE_TIME, kpiPrev?.AVG_SERVICE_TIME),
                )}
                deltaSuffix={deltaSuffix}
                tooltip={t("growthPoints.kpi.serviceTimeHint")}
                onClick={() => navigate(URL_GROWTH_POINTS.mechanics)}
                onDrillThrough={() => openDrillThrough(t("growthPoints.accounts.withServiceTime"))}
              />
              <KpiCard
                title={t("growthPoints.kpi.lossesPerAccount")}
                value={formatMinutes(kpi.WASTED_TIME_MIN)}
                delta={formatDelta(calcDelta(kpi.WASTED_TIME_MIN, kpiPrev?.WASTED_TIME_MIN))}
                deltaPositive={isDeltaPositive(
                  calcDelta(kpi.WASTED_TIME_MIN, kpiPrev?.WASTED_TIME_MIN),
                  {
                    higherIsBetter: false,
                  },
                )}
                deltaSuffix={deltaSuffix}
                tooltip={t("growthPoints.kpi.lossesPerAccountHint")}
                onClick={() => navigate(URL_GROWTH_POINTS.efficiency)}
                onDrillThrough={() => openDrillThrough(t("growthPoints.accounts.withLosses"))}
              />
            </div>

            <div className={styles.chartsGrid}>
              <div className={styles.chartCard}>
                <h2>
                  {t("growthPoints.chart.turnoverTrend", {
                    period: trendSuffix,
                  })}
                </h2>
                <BarChart
                  data={monthly}
                  categoryKey="MONTH_LABEL"
                  dataKey="TURNOVER"
                  label={t("growthPoints.column.turnover")}
                  valueFormatter={(value) => formatCurrency(value)}
                  onBarClick={handleTrendClick}
                />
              </div>
              <div className={styles.chartCard}>
                <h2>
                  {t("growthPoints.chart.accountCountTrend", {
                    period: trendSuffix,
                  })}
                </h2>
                <LineChart
                  data={monthly}
                  categoryKey="MONTH_LABEL"
                  dataKey="ACCOUNT_COUNT"
                  label={t("growthPoints.account.count.label")}
                  color={CHART_COLORS.blue}
                  valueFormatter={(value) => formatNumber(value)}
                  onPointClick={handleTrendClick}
                />
              </div>
              <div className={styles.chartCard}>
                <h2>
                  {t("growthPoints.chart.averageCashTrend", {
                    period: trendSuffix,
                  })}
                </h2>
                <LineChart
                  data={monthly}
                  categoryKey="MONTH_LABEL"
                  dataKey="AVG_CASH"
                  label={t("growthPoints.column.cash")}
                  color={CHART_COLORS.positive}
                  valueFormatter={(value) => formatCurrency(value)}
                  onPointClick={handleTrendClick}
                />
              </div>
              <div className={styles.chartCard}>
                <h2>
                  {t("growthPoints.chart.articleWorkRatioTrend", {
                    period: trendSuffix,
                  })}
                </h2>
                <LineChart
                  data={monthly}
                  categoryKey="MONTH_LABEL"
                  dataKey="ARTICLE_WORK_RATIO"
                  label={t("growthPoints.articleWorkRatio")}
                  color={CHART_COLORS.purple}
                  valueFormatter={(value) => formatPercent(value)}
                  onPointClick={handleTrendClick}
                />
              </div>
            </div>
          </>
        )}
      </AsyncBoundary>

      <DrillThroughModal {...drillThrough} />
    </div>
  );
});
