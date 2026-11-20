import { useMemo, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import type { MetricId } from "@Rso/entities/rso/lib/metrics";
import { prevPeriodKeyFor } from "@Rso/entities/rso/model/dashboardCache";
import { dashboardStore } from "@Rso/entities/rso/model/dashboardStore";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { periodsStore } from "@Rso/entities/rso/model/periodsStore";
import { drillStore } from "@Rso/features/drill/model/drillStore";
import type { Period } from "@Rso/entities/rso/api/contract";
import { Card } from "@Rso/shared/ui/Card/Card";
import { Grid, GridItem } from "@Rso/shared/ui/Grid/Grid";
import { Section } from "@Rso/shared/ui/Section/Section";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { computeOverview } from "./model/overviewData";
import { OverviewKpiRow } from "./ui/OverviewKpiRow";
import { RevenueTrendChart } from "./ui/RevenueTrendChart";
import { PlanFact } from "./ui/PlanFact";
import { RevenueStructureChart } from "./ui/RevenueStructureChart";
import { ClientSegments } from "./ui/ClientSegments";

export const OverviewPage = observer(function OverviewPage() {
  const { t } = useTranslation();
  const period = filtersStore.period;
  const vat = filtersStore.vat;
  const { status, error } = dashboardStore;
  const raw = dashboardStore.data;
  const hasPrevPeriod = period ? prevPeriodKeyFor(period) !== period.key : false;
  const data = useMemo(
    () => computeOverview(raw, period, vat, hasPrevPeriod),
    [raw, period, vat, hasPrevPeriod],
  );

  // Drill-down по показателю за период (по умолчанию — выбранный). Ответ берётся
  // из общего кэша — за выбранный период он уже загружен
  const openDrill = (id: MetricId, target: Period | null = period) => {
    if (target) drillStore.open({ kind: "metric", metricId: id }, target);
  };
  const canDrill = Boolean(data && period);

  // Ошибка списка периодов важнее ошибки данных: без периода данных не будет
  const failure =
    periodsStore.status === "error"
      ? { message: periodsStore.error, retry: () => periodsStore.retry() }
      : status === "error"
        ? { message: error, retry: () => dashboardStore.reload() }
        : null;
  const noPeriods = periodsStore.status === "ready" && period === null;
  const loading = !failure && !noPeriods && (status === "loading" || status === "idle");

  // Содержимое блока или его состояние: ошибка, загрузка, нет данных
  const block = (hasData: boolean, content: () => ReactNode) => {
    if (failure) {
      return (
        <BlockState kind="error" message={failure.message ?? undefined} onRetry={failure.retry} />
      );
    }
    if (noPeriods) return <BlockState kind="empty" message={t("rso.periods.empty")} />;
    if (loading || !data) return <BlockState kind="loading" />;
    if (!hasData) return <BlockState kind="empty" />;
    return content();
  };

  return (
    <>
      <OverviewKpiRow
        kpis={failure ? null : (data?.kpis ?? null)}
        loading={loading}
        onOpen={canDrill ? (id) => openDrill(id) : undefined}
      />

      <Section title={t("rso.section.dynamics")}>
        <Grid>
          <GridItem span={8}>
            <Card
              title={t("rso.block.revenueTrend.title")}
              subtitle={t("rso.block.revenueTrend.subtitle")}
              variant="chart"
            >
              {block((data?.trend.length ?? 0) > 0, () =>
                data && period ? (
                  <RevenueTrendChart
                    points={data.trend}
                    periodType={period.type}
                    onOpen={(series, key) => openDrill(series, { type: period.type, key })}
                  />
                ) : null,
              )}
            </Card>
          </GridItem>
          <GridItem span={4}>
            <Card
              title={t("rso.block.planFact.title")}
              subtitle={t("rso.block.planFact.subtitle")}
              variant="chart"
            >
              {block(
                data?.planFact.some((row) => row.fact !== null) ?? false,
                () =>
                  data && (
                    <PlanFact
                      rows={data.planFact}
                      planSelling={data.planSelling}
                      onOpen={(id) => openDrill(id === "money" ? "planMoney" : "planGain")}
                    />
                  ),
              )}
            </Card>
          </GridItem>
        </Grid>
      </Section>

      <Section title={t("rso.section.structure")}>
        <Grid>
          <GridItem span={6}>
            <Card
              title={t("rso.block.revenueStructure.title")}
              subtitle={t("rso.block.revenueStructure.subtitle")}
              variant="chart"
            >
              {block(
                (data?.structure.length ?? 0) > 0,
                () =>
                  data && (
                    <RevenueStructureChart
                      slices={data.structure}
                      approx={vat === "Netto"}
                      onOpen={() => openDrill("partsToWork")}
                    />
                  ),
              )}
            </Card>
          </GridItem>
          <GridItem span={6}>
            <Card
              title={t("rso.block.clientSegment.title")}
              subtitle={t("rso.block.clientSegment.subtitle")}
              variant="chart"
            >
              {block(
                data?.segments !== null && data?.segments !== undefined,
                () =>
                  data?.segments && (
                    <ClientSegments
                      data={data.segments}
                      approx={vat === "Netto"}
                      onOpen={() => openDrill("clients")}
                    />
                  ),
              )}
            </Card>
          </GridItem>
        </Grid>
      </Section>
    </>
  );
});
