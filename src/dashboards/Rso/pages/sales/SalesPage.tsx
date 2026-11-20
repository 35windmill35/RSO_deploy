import { useEffect, useMemo, useState, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import type { Period } from "@Rso/entities/rso/api/contract";
import { pick } from "@Rso/entities/rso/lib/money";
import {
  carsData,
  departmentRows,
  departmentTrend,
  turnoverStructure,
  type TrendMeasure,
} from "@Rso/entities/rso/lib/sales";
import { summaryOf } from "@Rso/entities/rso/lib/summary";
import { accessStore } from "@Rso/entities/rso/model/accessStore";
import { dashboardStore } from "@Rso/entities/rso/model/dashboardStore";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { periodsStore } from "@Rso/entities/rso/model/periodsStore";
import {
  ensurePrevDashboard,
  hasPrevPeriod,
  prevDashboardResource,
} from "@Rso/entities/rso/model/prevDashboard";
import { drillStore } from "@Rso/features/drill/model/drillStore";
import type { DrillTarget } from "@Rso/features/drill/model/targets";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { Grid, GridItem } from "@Rso/shared/ui/Grid/Grid";
import { Section } from "@Rso/shared/ui/Section/Section";
import { computeSalesKpis, type SalesKpiId } from "./model/salesData";
import { CapacityBars } from "./ui/CapacityBars";
import { DepartmentsTrendChart } from "./ui/DepartmentsTrendChart";
import { DepartmentsTurnover } from "./ui/DepartmentsTurnover";
import { SalesKpiRow } from "./ui/SalesKpiRow";
import { ServicesBreakdown } from "./ui/ServicesBreakdown";
import { ServicesPlaceholder } from "./ui/ServicesPlaceholder";
import { StockGroups } from "./ui/StockGroups";
import { StockWarehouses } from "./ui/StockWarehouses";
import { TopCars } from "./ui/TopCars";
import { TurnoverStructure } from "./ui/TurnoverStructure";
import styles from "./ui/SalesBlocks.module.css";

// Куда ведёт клик по KPI вкладки
const KPI_TARGET: Record<SalesKpiId, DrillTarget> = {
  partsTurnover: { kind: "metric", metricId: "partsToWork" },
  workTurnover: { kind: "metric", metricId: "partsToWork" },
  partsToWork: { kind: "metric", metricId: "partsToWork" },
  loadPct: { kind: "capacity", departmentId: -1, label: null },
  soldHoursPct: { kind: "capacity", departmentId: -1, label: null },
  stockEnd: { kind: "stock", label: null },
  stockTurnover: { kind: "stock", label: null },
  stockMarkup: { kind: "stock", label: null },
  stockProfit: { kind: "stock", label: null },
  itemsCount: { kind: "stock", label: null },
};

// Вкладка «Продажи и виды услуг»: оборот по отделам и видам услуг, ремзона,
// автомобили, склад. Один ответ DashboardRSO + ответ за прошлый период для дельт
export const SalesPage = observer(function SalesPage() {
  const { t } = useTranslation();
  const period = filtersStore.period;
  const vat = filtersStore.vat;
  const dbIndex = accessStore.dbIndex;
  const { status, error } = dashboardStore;
  const data = dashboardStore.data;
  const [measure, setMeasure] = useState<TrendMeasure>("turnover");

  // Ответ за прошлый период — после основного: дельты ремзоны и склада
  const prevResource =
    dbIndex !== null && period ? prevDashboardResource(dbIndex, period) : undefined;
  const prev = prevResource?.data ?? null;
  const hasPrev = period ? hasPrevPeriod(period) : false;
  const periodType = period?.type;
  const periodKey = period?.key;
  useEffect(() => {
    if (status !== "ready" || dbIndex === null || !periodType || periodKey === undefined) return;
    ensurePrevDashboard(dbIndex, { type: periodType, key: periodKey });
  }, [status, dbIndex, periodType, periodKey]);

  const computed = useMemo(() => {
    if (!data || !period) return null;
    return {
      kpis: computeSalesKpis(data, prev, period, vat, hasPrev),
      departments: departmentRows(data, period, vat),
      structure: turnoverStructure(data, period, vat),
      cars: carsData(data, period, vat),
      revenue: pick(summaryOf(data, period), "REVENUE_TOTAL", vat),
    };
  }, [data, prev, period, vat, hasPrev]);
  const trend = useMemo(
    () => (data && period ? departmentTrend(data, period, vat, measure) : null),
    [data, period, vat, measure],
  );

  // Ошибка списка периодов важнее ошибки данных: без периода данных не будет
  const failure =
    periodsStore.status === "error"
      ? { message: periodsStore.error, retry: () => periodsStore.retry() }
      : status === "error"
        ? { message: error, retry: () => dashboardStore.reload() }
        : null;
  const noPeriods = periodsStore.status === "ready" && period === null;
  const loading = !failure && !noPeriods && (status === "loading" || status === "idle");

  // Состояние блока вместо данных; undefined — данные есть, блок рисует себя сам
  const fallback = (hasData: boolean): ReactNode | undefined => {
    if (failure) {
      return (
        <BlockState kind="error" message={failure.message ?? undefined} onRetry={failure.retry} />
      );
    }
    if (noPeriods) return <BlockState kind="empty" message={t("rso.periods.empty")} />;
    if (loading || !computed) return <BlockState kind="loading" />;
    if (!hasData) return <BlockState kind="empty" />;
    return undefined;
  };

  const open = (target: DrillTarget, at: Period | null = period) => {
    if (at) drillStore.open(target, at);
  };

  const stockG = data?.stockG ?? [];
  // Прошлый период: грузится — скелетон у дельт, упал — строка с повтором
  // Запрос за прошлый период уходит только после готового основного ответа: пока его нет
  // (загрузка, ошибка ответа или списка периодов) — дельты не «грузятся», а отсутствуют
  const prevLoading =
    !failure &&
    status === "ready" &&
    hasPrev &&
    (!prevResource || prevResource.status === "loading");
  const prevFailed = !failure && hasPrev && prevResource?.status === "error";

  return (
    <>
      <SalesKpiRow
        kpis={failure ? null : (computed?.kpis ?? null)}
        loading={loading}
        bruttoNote={vat === "Netto"}
        prevLoading={prevLoading}
        onOpen={computed ? (id) => open(KPI_TARGET[id]) : undefined}
      />
      {prevFailed && period && dbIndex !== null && (
        <div className={styles.prevError} role="alert">
          <span>{t("rso.sales.prevError")}</span>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => ensurePrevDashboard(dbIndex, period)}
          >
            {t("rso.block.retry")}
          </button>
        </div>
      )}

      <Section title={t("rso.section.turnover")}>
        <Grid>
          <GridItem span={6}>
            <DepartmentsTurnover
              data={computed?.departments ?? null}
              period={period}
              vat={vat}
              fallback={fallback(Boolean(computed?.departments))}
              onOpen={(row) => open({ kind: "department", id: row.id, label: row.name })}
            />
          </GridItem>
          <GridItem span={6}>
            <DepartmentsTrendChart
              trend={trend}
              measure={measure}
              onMeasureChange={setMeasure}
              period={period}
              fallback={fallback((trend?.points.length ?? 0) > 0)}
              onOpen={(id, name, key) =>
                period && open({ kind: "department", id, label: name }, { type: period.type, key })
              }
            />
          </GridItem>
          <GridItem span={6}>
            <TurnoverStructure
              data={computed?.structure ?? null}
              approx={vat === "Netto"}
              fallback={fallback(Boolean(computed?.structure.company))}
              onOpen={() => open({ kind: "metric", metricId: "partsToWork" })}
            />
          </GridItem>
          <GridItem span={6}>
            {/* key — блок пересоздаётся при смене периода и базы: сбрасывает «загрузить год» */}
            {period && dbIndex !== null && !fallback(true) ? (
              <ServicesBreakdown
                key={`${dbIndex}:${period.type}:${period.key}`}
                dbIndex={dbIndex}
                period={period}
                vat={vat}
                revenue={computed?.revenue ?? null}
                onOpen={(slice, name) => open({ kind: slice, label: name })}
              />
            ) : (
              <ServicesPlaceholder fallback={fallback(true)} />
            )}
          </GridItem>
        </Grid>
      </Section>

      <Section title={t("rso.section.capacityAndCars")}>
        <Grid>
          <GridItem span={4} wide>
            <CapacityBars
              data={data}
              prev={prev}
              prevLoading={prevLoading}
              fallback={fallback((data?.capacity?.length ?? 0) > 0)}
              onOpen={(departmentId, label) => open({ kind: "capacity", departmentId, label })}
            />
          </GridItem>
          <GridItem span={8}>
            <TopCars
              data={computed?.cars ?? null}
              period={period}
              vat={vat}
              fallback={fallback(Boolean(computed?.cars))}
              onOpenMark={(mark) =>
                open({ kind: "mark", markId: mark.markId, label: mark.markName })
              }
              onOpenModel={(model) =>
                open({
                  kind: "model",
                  markId: model.markId,
                  modelId: model.modelId,
                  carYear: model.carYear,
                  label: [model.markName, model.modelName].filter(Boolean).join(" ") || null,
                })
              }
            />
          </GridItem>
        </Grid>
      </Section>

      <Section
        title={
          vat === "Netto"
            ? `${t("rso.section.stock")} · ${t("rso.sales.stock.bruttoNote")}`
            : t("rso.section.stock")
        }
      >
        <Grid>
          <GridItem span={12}>
            <StockGroups
              rows={data?.stockG ?? null}
              period={period}
              fallback={fallback(stockG.length > 0)}
              onOpen={(row) =>
                open({ kind: "stockGroup", groupId: row.GROUP_ID, label: row.GROUP_NAME })
              }
              onOpenAll={() => open({ kind: "stockGroups", label: null })}
            />
          </GridItem>
          <GridItem span={12}>
            <StockWarehouses
              data={data}
              period={period}
              fallback={fallback((data?.stockW?.length ?? 0) > 0)}
              onOpen={(row) =>
                open({
                  kind: "warehouse",
                  warehouseId: row.WAREHOUSE_ID,
                  label: row.WAREHOUSE_NAME,
                })
              }
            />
          </GridItem>
        </Grid>
      </Section>
    </>
  );
});
