import { useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import { dashboardStore } from "@GrowthPoints/entities/dashboard/model/dashboardStore";
import { periodsStore } from "@GrowthPoints/entities/dashboard/model/periodsStore";
import type { MetricRow } from "@GrowthPoints/entities/dashboard/model/types";
import { BarChart } from "@GrowthPoints/shared/ui/charts/BarChart";
import { LineChart } from "@GrowthPoints/shared/ui/charts/LineChart";
import { PieChart, groupTopNWithOthers } from "@GrowthPoints/shared/ui/charts/PieChart";
import { DataTable } from "@GrowthPoints/shared/ui/DataTable/DataTable";
import { AsyncBoundary } from "@GrowthPoints/shared/ui/AsyncBoundary/AsyncBoundary";
import { PageHeader } from "@GrowthPoints/shared/ui/PageHeader/PageHeader";
import { useDrillThrough } from "@GrowthPoints/features/drill-through/model/useDrillThrough";
import { DrillThroughModal } from "@GrowthPoints/features/drill-through/ui/DrillThroughModal";
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  cleanName,
} from "@GrowthPoints/shared/lib/formatters";
import { CHART_COLORS } from "@GrowthPoints/shared/lib/chartColors";
import styles from "./Brands.module.css";
import i18n from "@/APP/i18n";
import { useTranslation } from "react-i18next";

type TabKey = "marks" | "models" | "years";

const TABS: { key: TabKey; label: string }[] = [
  { key: "marks", label: i18n.t("growthPoints.tab.marks") },
  { key: "models", label: i18n.t("growthPoints.tab.models") },
  { key: "years", label: i18n.t("growthPoints.tab.years") },
];

interface MarkFilter {
  id: number;
  name: string;
}

// Экран «Марки/Модели/Годы» (ТЗ §4.5) — три вкладки в пределах одной
// страницы (без отдельных маршрутов), чтобы сохранить единый глобальный
// фильтр по периоду/автоцентру сразу для всех трёх. Переход «Марки» →
// «Модели» с предфильтром по марке — через локальный state экрана.
export const BrandsPage = observer(function BrandsPage() {
  const drillThrough = useDrillThrough();
  const [activeTab, setActiveTab] = useState<TabKey>("marks");
  const [markFilter, setMarkFilter] = useState<MarkFilter | null>(null);
  const { t } = useTranslation();
  const marks = dashboardStore.marks;
  const models = dashboardStore.models;
  const years = dashboardStore.yearsFiltered;

  const marksPieData = useMemo(
    () => groupTopNWithOthers(marks, "MARK_NAME", "TURNOVER", 9),
    [marks],
  );
  const sortedMarks = useMemo(
    () => [...marks].sort((a, b) => ((b.TURNOVER as number) || 0) - ((a.TURNOVER as number) || 0)),
    [marks],
  );

  // Средний чек по тем же топ-9 маркам, что и в круговой диаграмме слева
  // (просьба заказчика — иначе на двух графиках разные наборы марок).
  // Для "Прочих" считаем не среднее из средних, а честный взвешенный чек:
  // сумма оборота / сумма ЗН по всем маркам, не попавшим в топ-9.
  const avgCashData = useMemo(() => {
    const top9 = sortedMarks.slice(0, 9);
    const rest = sortedMarks.slice(9);

    const data: { name: string; value: number; MARK_ID?: number }[] = top9.map((m) => ({
      name: cleanName(m.MARK_NAME),
      value: (m.AVG_CASH as number) || 0,
      MARK_ID: m.MARK_ID,
    }));

    if (rest.length) {
      const restTurnover = rest.reduce((sum, m) => sum + ((m.TURNOVER as number) || 0), 0);
      const restCount = rest.reduce((sum, m) => sum + ((m.ACCOUNT_COUNT as number) || 0), 0);
      data.push({ name: t("growthPoints.other"), value: restCount ? restTurnover / restCount : 0 });
    }

    return data;
  }, [sortedMarks]);

  const filteredModels = markFilter ? models.filter((m) => m.MARK_ID === markFilter.id) : models;
  const top10Models = useMemo(
    () =>
      [...filteredModels]
        .sort((a, b) => ((b.TURNOVER as number) || 0) - ((a.TURNOVER as number) || 0))
        .slice(0, 10),
    [filteredModels],
  );

  const openMarkDrillThrough = (mark: MetricRow) => {
    drillThrough.open({
      title: `${t("growthPoints.accounts.byMark")} «${cleanName(mark.MARK_NAME)}»`,
      filterString: "MARK_ID=?",
      filterParam: [mark.MARK_ID as number],
    });
  };

  const openModelDrillThrough = (model: MetricRow) => {
    drillThrough.open({
      title: `${t("growthPoints.accounts.byModel")} «${cleanName(model.MODEL_NAME)}»`,
      filterString: "MODEL_ID=?",
      filterParam: [model.MODEL_ID as number],
    });
  };

  const openYearDrillThrough = (yearItem: MetricRow) => {
    drillThrough.open({
      title: `${t("growthPoints.accounts.byYear")} ${yearItem.MANUFACTURE_YEAR}`,
      filterString: "MANUFACTURE_YEAR=?",
      filterParam: [yearItem.MANUFACTURE_YEAR as number],
    });
  };

  const goToModelsForMark = (mark: MetricRow) => {
    setMarkFilter({ id: mark.MARK_ID as number, name: cleanName(mark.MARK_NAME) });
    setActiveTab("models");
  };

  const periodLabel = periodsStore.selectedPeriodLabel;

  return (
    <div className={styles.page}>
      <PageHeader
        title={t("growthPoints.page.markModelYear")}
        subtitle={`${t("growthPoints.parkAnalyze")} — ${periodLabel}`}
      />

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AsyncBoundary
        isLoading={dashboardStore.isLoadingAny}
        error={dashboardStore.errorAny}
        isEmpty={!dashboardStore.isLoadingAny && marks.length === 0}
        onRetry={() =>
          periodsStore.selectedPeriod && dashboardStore.load(periodsStore.selectedPeriod)
        }
      >
        {activeTab === "marks" && (
          <div className={styles.tabContent}>
            <div className={styles.chartsRow}>
              <div className={styles.chartWrapper}>
                <h3 className={styles.chartTitle}>{t("growthPoints.marks.part")}</h3>
                <PieChart
                  data={marksPieData}
                  valueFormatter={(value) => formatCurrency(value)}
                  onSliceClick={(slice) => {
                    // "Прочие" — агрегированная категория без своего MARK_ID,
                    // клик по ней намеренно ничего не делает.
                    const mark = marks.find((m) => m.MARK_NAME === slice.name);
                    if (mark) openMarkDrillThrough(mark);
                  }}
                />
              </div>
              <div className={styles.chartWrapper}>
                <h3 className={styles.chartTitle}>{t("growthPoints.marks.medium.price")}</h3>
                <BarChart
                  layout="vertical"
                  data={avgCashData}
                  categoryKey="name"
                  dataKey="value"
                  label={t("growthPoints.marks.medium.price.label")}
                  valueFormatter={(value) => formatCurrency(value)}
                  onBarClick={(item) => {
                    // "Прочие" не кликабельны — нет своего MARK_ID
                    const mark = marks.find((m) => m.MARK_ID === item.MARK_ID);
                    if (mark) openMarkDrillThrough(mark);
                  }}
                />
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <h3 className={styles.tableTitle}>{t("growthPoints.marks.details")}</h3>
              <p className={styles.tableHint}>{t("growthPoints.marks.details.hint")}</p>
              <DataTable
                columns={[
                  {
                    key: "MARK_NAME",
                    header: t("growthPoints.column.mark"),
                    render: (r) => cleanName(r.MARK_NAME) || "—",
                  },
                  { key: "ACCOUNT_COUNT", header: t("growthPoints.column.account") },
                  {
                    key: "TURNOVER",
                    header: t("growthPoints.column.turnover"),
                    render: (r) => formatCurrency(r.TURNOVER),
                  },
                  {
                    key: "ARTICLE_WORK_RATIO",
                    header: t("growthPoints.column.ratioArticle"),
                    render: (r) => formatPercent(r.ARTICLE_WORK_RATIO),
                  },
                  {
                    key: "AVG_CASH",
                    header: t("growthPoints.column.cash"),
                    render: (r) => formatCurrency(r.AVG_CASH),
                  },
                  {
                    key: "RECOMMENDED_SUMM",
                    header: t("growthPoints.column.summa.reccomend"),
                    render: (r) => formatCurrency(r.RECOMMENDED_SUMM),
                  },
                ]}
                data={sortedMarks}
                getRowKey={(r) => r.MARK_ID as number}
                onRowClick={goToModelsForMark}
              />
            </div>
          </div>
        )}

        {activeTab === "models" && (
          <div className={styles.tabContent}>
            {markFilter && (
              <div className={styles.filterChip}>
                {`${t("growthPoints.filter.mark")} «${markFilter.name}»`}
                <button
                  type="button"
                  className={styles.filterChipClear}
                  onClick={() => setMarkFilter(null)}
                >
                  ✕
                </button>
              </div>
            )}

            <div className={styles.chartWrapper}>
              <h3 className={styles.chartTitle}>{t("growthPoints.filter.top10.oborot")}</h3>
              <BarChart
                layout="vertical"
                data={top10Models}
                categoryKey="MODEL_NAME"
                dataKey="TURNOVER"
                label={t("growthPoints.column.turnover")}
                valueFormatter={(value) => formatCurrency(value)}
                onBarClick={openModelDrillThrough}
              />
            </div>

            <div className={styles.tableWrapper}>
              <h3 className={styles.tableTitle}>{t("growthPoints.model.details")}</h3>
              <DataTable
                columns={[
                  {
                    key: "MODEL_NAME",
                    header: t("growthPoints.column.model"),
                    render: (r) => cleanName(r.MODEL_NAME) || "—",
                  },
                  { key: "ACCOUNT_COUNT", header: t("growthPoints.column.account") },
                  {
                    key: "TURNOVER",
                    header: t("growthPoints.column.turnover"),
                    render: (r) => formatCurrency(r.TURNOVER),
                  },
                  {
                    key: "ARTICLE_WORK_RATIO",
                    header: t("growthPoints.column.ratioArticle"),
                    render: (r) => formatPercent(r.ARTICLE_WORK_RATIO),
                  },
                  {
                    key: "AVG_CASH",
                    header: t("growthPoints.column.cash"),
                    render: (r) => formatCurrency(r.AVG_CASH),
                  },
                ]}
                data={top10Models}
                getRowKey={(r) => r.MODEL_ID as number}
                onRowClick={openModelDrillThrough}
              />
            </div>
          </div>
        )}

        {activeTab === "years" && (
          <div className={styles.tabContent}>
            <div className={styles.chartsRow}>
              <div className={styles.chartWrapper}>
                <h3 className={styles.chartTitle}>{t("growthPoints.oborot.year")}</h3>
                <BarChart
                  data={years}
                  categoryKey="MANUFACTURE_YEAR"
                  dataKey="TURNOVER"
                  label={t("growthPoints.column.turnover")}
                  valueFormatter={(value) => formatCurrency(value)}
                  onBarClick={openYearDrillThrough}
                />
              </div>
              <div className={styles.chartWrapper}>
                <h3 className={styles.chartTitle}>{t("growthPoints.oborot.account")}</h3>
                <BarChart
                  data={years}
                  categoryKey="MANUFACTURE_YEAR"
                  dataKey="ACCOUNT_COUNT"
                  label={t("growthPoints.account.count.label")}
                  valueFormatter={(value) => formatNumber(value)}
                  onBarClick={openYearDrillThrough}
                />
              </div>
            </div>
            <div className={styles.chartWrapper}>
              <h3 className={styles.chartTitle}>{t("growthPoints.oborot.medium.check")}</h3>
              <LineChart
                data={years}
                categoryKey="MANUFACTURE_YEAR"
                dataKey="AVG_CASH"
                label={t("growthPoints.column.cash")}
                color={CHART_COLORS.blue}
                valueFormatter={(value) => formatCurrency(value)}
              />
            </div>
          </div>
        )}
      </AsyncBoundary>

      <DrillThroughModal {...drillThrough} />
    </div>
  );
});
