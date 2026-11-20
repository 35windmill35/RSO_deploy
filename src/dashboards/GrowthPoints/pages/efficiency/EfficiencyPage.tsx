import { useRef, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { dashboardStore } from "@GrowthPoints/entities/dashboard/model/dashboardStore";
import { periodsStore } from "@GrowthPoints/entities/dashboard/model/periodsStore";
import type { MetricRow } from "@GrowthPoints/entities/dashboard/model/types";
import { KpiCard } from "@GrowthPoints/shared/ui/KpiCard/KpiCard";
import { BarChart } from "@GrowthPoints/shared/ui/charts/BarChart";
import { DataTable } from "@GrowthPoints/shared/ui/DataTable/DataTable";
import { AsyncBoundary } from "@GrowthPoints/shared/ui/AsyncBoundary/AsyncBoundary";
import { PageHeader } from "@GrowthPoints/shared/ui/PageHeader/PageHeader";
import { useDrillThrough } from "@GrowthPoints/features/drill-through/model/useDrillThrough";
import { DrillThroughModal } from "@GrowthPoints/features/drill-through/ui/DrillThroughModal";
import {
  formatPercent,
  formatMinutes,
  formatHours,
  formatServiceTime,
  calcDelta,
  formatDelta,
  isDeltaPositive,
  cleanName,
  formatShortName,
} from "@GrowthPoints/shared/lib/formatters";
import { CHART_COLORS } from "@GrowthPoints/shared/lib/chartColors";
import { pastPeriodModeDative } from "@GrowthPoints/shared/lib/periodFormat";
import styles from "./Efficiency.module.css";
import { useTranslation } from "react-i18next";
import { URL_GROWTH_POINTS } from "@GrowthPoints/shared/config/urls";

type ClickMode = "drilldown" | "drillthrough";

// Экран «Эффективность» (ТЗ §4.2). Про клик на графиках «Т-фактор» и
// «Потери» по мастерам: это drill-down на экран «Мастера» с выделением
// (навигация с highlightMasterId, см. TASK-DEV-A.md/TASK-DEV-B.md — там же
// дальнейший drill-through к ЗН через таблицу на самом экране «Мастера»).
// Таблица марок — отдельный drill-through (список ЗН по марке) прямо здесь.
export const EfficiencyPage = observer(function EfficiencyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const drillThrough = useDrillThrough();

  const tFactorRef = useRef<HTMLDivElement>(null);
  const wastedRef = useRef<HTMLDivElement>(null);
  const marksRef = useRef<HTMLDivElement>(null);

  // ТЗ §4.2 требует для этих двух графиков и drill-down (клик по мастеру →
  // «Мастера» с выделением), и отдельный drill-through (список ЗН мастера).
  // Один клик по столбцу не может делать оба действия одновременно, поэтому
  // над каждым графиком — переключатель режима клика; по умолчанию
  // drill-down (более частый сценарий — посмотреть карточку мастера).
  const [tFactorMode, setTFactorMode] = useState<ClickMode>("drilldown");
  const [wastedMode, setWastedMode] = useState<ClickMode>("drilldown");

  const kpi = dashboardStore.kpi;
  const kpiPrev = dashboardStore.kpiPrev;
  const masters = dashboardStore.mastersFiltered;
  const marks = dashboardStore.marks;

  const tFactorData = masters.filter((m) => m.T_FACTOR !== null && m.T_FACTOR !== undefined);
  const wastedData = masters.filter(
    (m) => m.WASTED_TIME_MIN !== null && m.WASTED_TIME_MIN !== undefined,
  );
  const sortedMarks = [...marks].sort(
    (a, b) => ((b.TURNOVER as number) || 0) - ((a.TURNOVER as number) || 0),
  );

  // Средние потери по мастерам — точка отсчёта "хорошо/плохо" для
  // раскраски столбцов (см. референс в ТЗ: выше среднего — красный, ниже —
  // зелёный). Не строгое бизнес-правило, а наглядная подсветка на глаз.
  const avgWastedTime = wastedData.length
    ? wastedData.reduce((sum, m) => sum + (m.WASTED_TIME_MIN as number), 0) / wastedData.length
    : 0;

  // tFactorData/wastedData фильтруются по-разному (разные null-проверки) и
  // могут отличаться по длине — если не выровнять высоту явно, оси X у
  // двух соседних графиков могут разъехаться, как было на "Механиках".
  const mastersChartHeight = Math.max(
    280,
    Math.max(tFactorData.length, wastedData.length) * 36 + 40,
  );

  // Учитываем узкую панель фильтров над контентом (id стабильный, в
  // отличие от хэшированного CSS-модуль класса — см. widgets/app-sidebar/AppTopBar.jsx).
  const scrollToElement = (ref: RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    const header = document.getElementById("app-header");
    const headerHeight = header ? header.offsetHeight : 80;
    const top = ref.current.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const goToMasterDrillDown = (masterId: number) => {
    navigate(URL_GROWTH_POINTS.masters, { state: { highlightMasterId: masterId } });
  };

  const openMarkDrillThrough = (mark: MetricRow) => {
    drillThrough.open({
      title: `${t("growthPoints.accounts.byMark")} «${cleanName(mark.MARK_NAME)}»`,
      filterString: "MARK_ID=?",
      filterParam: [mark.MARK_ID as number],
    });
  };

  const openMasterDrillThrough = (master: MetricRow, subtitle: string) => {
    drillThrough.open({
      title: `${subtitle} ${t("growthPoints.masters", { name: formatShortName(master.MASTER_NAME) })}`,
      filterString: "MASTER_ID=?",
      filterParam: [master.MASTER_ID as number],
    });
  };

  const periodLabel = periodsStore.selectedPeriodLabel;

  // См. комментарий в KpiCard.jsx — подпись под дельтой зависит от режима
  // комбобокса периода (месяц/квартал/год).
  const deltaSuffix = pastPeriodModeDative(periodsStore.periodMode);

  return (
    <div className={styles.page}>
      <PageHeader
        title={t("growthPoints.page.efficiency")}
        subtitle={`${periodLabel} — ${t("growthPoints.operationEfficiency")}`}
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
                title={t("growthPoints.column.tFactor")}
                value={formatPercent(kpi.T_FACTOR)}
                delta={formatDelta(calcDelta(kpi.T_FACTOR, kpiPrev?.T_FACTOR))}
                deltaPositive={isDeltaPositive(calcDelta(kpi.T_FACTOR, kpiPrev?.T_FACTOR))}
                deltaSuffix={deltaSuffix}
                tooltip={t("growthPoints.powerLoad")}
                onClick={() => scrollToElement(tFactorRef)}
              />
              <KpiCard
                title={t("growthPoints.account.lost")}
                value={formatMinutes(kpi.WASTED_TIME_MIN)}
                delta={formatDelta(calcDelta(kpi.WASTED_TIME_MIN, kpiPrev?.WASTED_TIME_MIN))}
                deltaPositive={isDeltaPositive(
                  calcDelta(kpi.WASTED_TIME_MIN, kpiPrev?.WASTED_TIME_MIN),
                  {
                    higherIsBetter: false,
                  },
                )}
                deltaSuffix={deltaSuffix}
                tooltip={t("growthPoints.reductionImprovement")}
                onClick={() => scrollToElement(wastedRef)}
              />
              <KpiCard
                title={t("growthPoints.column.careless")}
                value={formatPercent(kpi.ACCURACY)}
                delta={formatDelta(calcDelta(kpi.ACCURACY, kpiPrev?.ACCURACY))}
                deltaPositive={isDeltaPositive(calcDelta(kpi.ACCURACY, kpiPrev?.ACCURACY))}
                deltaSuffix={deltaSuffix}
                tooltip={t("growthPoints.qualityExecution")}
                onClick={() => scrollToElement(marksRef)}
              />
              <KpiCard
                title={t("growthPoints.output")}
                value={formatHours(kpi.LABOR_TIME)}
                delta={formatDelta(calcDelta(kpi.LABOR_TIME, kpiPrev?.LABOR_TIME))}
                deltaPositive={isDeltaPositive(calcDelta(kpi.LABOR_TIME, kpiPrev?.LABOR_TIME))}
                deltaSuffix={deltaSuffix}
                tooltip={t("growthPoints.outputSumm")}
                onClick={() => navigate(URL_GROWTH_POINTS.mechanics)}
              />
            </div>

            <div className={styles.chartsRow}>
              <div className={styles.chartWrapper} ref={tFactorRef}>
                <div className={styles.chartHeader}>
                  <h3 className={styles.chartTitle}>{t("growthPoints.masterTFactor")}</h3>
                  <div className={styles.modeToggle}>
                    <button
                      type="button"
                      className={
                        tFactorMode === "drilldown" ? styles.modeBtnActive : styles.modeBtn
                      }
                      onClick={() => setTFactorMode("drilldown")}
                    >
                      {t("growthPoints.column.master")}
                    </button>
                    <button
                      type="button"
                      className={
                        tFactorMode === "drillthrough" ? styles.modeBtnActive : styles.modeBtn
                      }
                      onClick={() => setTFactorMode("drillthrough")}
                    >
                      {t("growthPoints.account.list")}
                    </button>
                  </div>
                </div>
                <BarChart
                  layout="vertical"
                  data={tFactorData}
                  categoryKey="MASTER_NAME"
                  dataKey="T_FACTOR"
                  label={t("growthPoints.column.tFactor")}
                  height={mastersChartHeight}
                  colorBySign
                  categoryFormatter={formatShortName}
                  valueFormatter={(value) => formatPercent(value)}
                  onBarClick={(item) =>
                    tFactorMode === "drilldown"
                      ? goToMasterDrillDown(item.MASTER_ID as number)
                      : openMasterDrillThrough(item, t("growthPoints.account.list"))
                  }
                />
              </div>

              <div className={styles.chartWrapper} ref={wastedRef}>
                <div className={styles.chartHeader}>
                  <h3 className={styles.chartTitle}>{t("growthPoints.account.masterLosts")}</h3>
                  <div className={styles.modeToggle}>
                    <button
                      type="button"
                      className={wastedMode === "drilldown" ? styles.modeBtnActive : styles.modeBtn}
                      onClick={() => setWastedMode("drilldown")}
                    >
                      {t("growthPoints.column.master")}
                    </button>
                    <button
                      type="button"
                      className={
                        wastedMode === "drillthrough" ? styles.modeBtnActive : styles.modeBtn
                      }
                      onClick={() => setWastedMode("drillthrough")}
                    >
                      {t("growthPoints.account.list")}
                    </button>
                  </div>
                </div>
                <BarChart
                  layout="vertical"
                  data={wastedData}
                  categoryKey="MASTER_NAME"
                  dataKey="WASTED_TIME_MIN"
                  label="Потери"
                  height={mastersChartHeight}
                  getColor={(m) =>
                    (m.WASTED_TIME_MIN as number) > avgWastedTime
                      ? CHART_COLORS.negative
                      : CHART_COLORS.positive
                  }
                  categoryFormatter={formatShortName}
                  valueFormatter={(value) => formatMinutes(value)}
                  onBarClick={(item) =>
                    wastedMode === "drilldown"
                      ? goToMasterDrillDown(item.MASTER_ID as number)
                      : openMasterDrillThrough(item, t("growthPoints.accountWithLost"))
                  }
                />
              </div>
            </div>

            <div className={styles.tableWrapper} ref={marksRef}>
              <h3 className={styles.tableTitle}>{t("growthPoints.efficiency.marks")}</h3>
              <DataTable
                columns={[
                  {
                    key: "MARK_NAME",
                    header: t("growthPoints.column.mark"),
                    render: (r) => cleanName(r.MARK_NAME) || "—",
                  },
                  {
                    key: "LABOR_TIME",
                    header: t("growthPoints.output"),
                    tooltip: t("growthPoints.hormhourSumma"),
                    render: (r) => formatHours(r.LABOR_TIME),
                  },
                  {
                    key: "AVG_SERVICE_TIME",
                    header: t("growthPoints.column.averageServiceTime"),
                    tooltip: t("growthPoints.averageServiceTimeByMark"),
                    render: (r) => formatServiceTime(r.AVG_SERVICE_TIME),
                  },
                  {
                    key: "T_FACTOR",
                    header: t("growthPoints.column.tFactor"),
                    tooltip: t("growthPoints.powerLoad"),
                    render: (r) => formatPercent(r.T_FACTOR),
                  },
                  {
                    key: "WASTED_TIME_MIN",
                    header: t("growthPoints.column.wasted"),
                    tooltip: t("growthPoints.account.lost"),
                    render: (r) => formatMinutes(r.WASTED_TIME_MIN),
                  },
                  {
                    key: "ACCURACY",
                    header: t("growthPoints.column.careless"),
                    tooltip: t("growthPoints.qualityExecution"),
                    render: (r) => formatPercent(r.ACCURACY),
                  },
                ]}
                data={sortedMarks}
                getRowKey={(r) => r.MARK_ID as number}
                onRowClick={openMarkDrillThrough}
              />
            </div>
          </>
        )}
      </AsyncBoundary>

      <DrillThroughModal {...drillThrough} />
    </div>
  );
});
