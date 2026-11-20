import { jsPDF } from "jspdf";
import {
  formatNumber,
  formatPercent,
  isDeltaPositive,
  kpiDelta,
  type KpiKind,
} from "@Accidents/shared/lib/formatters";
import {
  comparisonLabel,
  formatPeriodLabel,
  type Period,
} from "@Accidents/entities/accident/lib/period";
import { collapseSlices, type BreakdownSlice } from "@Accidents/entities/accident/lib/metrics";
import type { OverviewData } from "@Accidents/pages/overview/model/overviewData";
import { COLOR, PAGE, registerPdfFonts } from "./pdfKit";
import {
  columns,
  drawPageFooters,
  flowBlocks,
  type BlockFactory,
  type FlowResult,
} from "./pdfFlow";
import {
  dataContextLines,
  kpiRow,
  reportHeader,
  type KpiCardData,
  type ReportDataContext,
} from "./pdfChrome";
import {
  DISTRIBUTION_ROW_HEIGHT,
  DUAL_ROW_HEIGHT,
  RANKED_ROW_HEIGHT,
  barChartBody,
  card,
  distributionBody,
  dualBarsBody,
  groupedBarChartBody,
  rankedBarsBody,
  tableCard,
} from "./pdfBlocks";
import {
  buildReportFilename,
  breakdownNote,
  formatCountAxis,
  formatMoneyAxis,
  formatPdfCurrency,
  splitMonthLabel,
} from "./pdfFormat";
import i18n from "@/APP/i18n";

// Как в свёрнутых таблицах на экране
const DRIVERS_TOP_N = 8;
const VEHICLES_TOP_N = 8;
const ROUTES_TOP_N = 8;
const MOTORCADES_TOP_N = 10;

const TREND_CHART_HEIGHT = 102;
const DAMAGE_CHART_HEIGHT = 76;

export interface OverviewReportFile {
  blob: Blob;
  filename: string;
  result: FlowResult;
}

export interface OverviewReportInput {
  data: OverviewData;
  period: Period;
  context: ReportDataContext;
  onSection?: (done: number, total: number) => void;
}

function kpiCards(data: OverviewData): KpiCardData[] {
  const { kpi, previousKpi } = data;

  const build = (
    label: string,
    value: string,
    kind: KpiKind,
    current: number | null,
    previous: number | null | undefined,
    higherIsBetter: boolean,
  ): KpiCardData => {
    const delta = previousKpi ? kpiDelta(kind, current, previous) : null;
    const positive = isDeltaPositive(delta?.value, higherIsBetter);
    return {
      label,
      value,
      delta: delta === null ? null : `${delta.text} ${comparisonLabel(data.comparison)}`,
      deltaTone: positive === null ? "neutral" : positive ? "positive" : "negative",
    };
  };

  return [
    build(
      i18n.t("roadAccidents.kpi.totalAccidents"),
      formatNumber(kpi.count),
      "count",
      kpi.count,
      previousKpi?.count,
      false,
    ),
    build(
      i18n.t("roadAccidents.kpi.damageSum"),
      formatPdfCurrency(kpi.sumDamage),
      "currency",
      kpi.sumDamage,
      previousKpi?.sumDamage,
      false,
    ),
    build(
      i18n.t("roadAccidents.kpi.compensationSum"),
      formatPdfCurrency(kpi.sumCompensated),
      "currency",
      kpi.sumCompensated,
      previousKpi?.sumCompensated,
      true,
    ),
    build(
      i18n.t("roadAccidents.kpi.compensationShare"),
      formatPercent(kpi.compensationShare),
      "percent",
      kpi.compensationShare,
      previousKpi?.compensationShare,
      true,
    ),
    build(
      i18n.t("roadAccidents.kpi.averageDamagePdf"),
      formatPdfCurrency(kpi.averageDamage),
      "currency",
      kpi.averageDamage,
      previousKpi?.averageDamage,
      false,
    ),
  ];
}

function motorcadeNote(data: OverviewData): string | undefined {
  const aggregates = data.motorcadeAgg;
  if (aggregates.length === 0) return i18n.t("roadAccidents.pdf.insight.noAccidents");
  if (aggregates.length === 1) return i18n.t("roadAccidents.pdf.insight.singleMotorcade");

  const top = aggregates[0];
  const total = data.kpi.count;
  if (!total) return undefined;
  return i18n.t("roadAccidents.pdf.insight.motorcadeLeader", {
    name: top.name,
    count: formatNumber(top.count),
    total: formatNumber(total),
    share: formatPercent(top.count / total),
  });
}

function overviewBlocks(doc: jsPDF, input: OverviewReportInput): BlockFactory[] {
  const { data, period } = input;
  const periodLabel = formatPeriodLabel(period);
  const motorcades = data.motorcadeAgg.slice(0, MOTORCADES_TOP_N);
  const drivers = data.driversRanking.slice(0, DRIVERS_TOP_N);
  const vehicles = data.vehiclesRanking.slice(0, VEHICLES_TOP_N);
  const routes = data.routesRanking.slice(0, ROUTES_TOP_N);
  const causeTotal = data.causeSlices.reduce(
    (acc, slice) => ({
      count: acc.count + slice.count,
      sumDamage: acc.sumDamage + slice.sumDamage,
      sumCompensated: acc.sumCompensated + slice.sumCompensated,
    }),
    { count: 0, sumDamage: 0, sumCompensated: 0 },
  );
  const causeChart = collapseSlices(data.causeSlices);

  const trendCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: i18n.t("roadAccidents.chart.accidentsTrend"),
      legend: [{ label: i18n.t("roadAccidents.common.accidents"), color: COLOR.accent }],
      bodyHeight: TREND_CHART_HEIGHT,
      drawBody: barChartBody(
        doc,
        data.monthlyCounts.map((item) => ({ ...splitMonthLabel(item.ym), value: item.count })),
        {
          height: TREND_CHART_HEIGHT,
          color: COLOR.accent,
          formatTick: formatCountAxis,
          formatValue: formatCountAxis,
          labelLines: 2,
          integerTicks: true,
        },
      ),
    });

  const distributionCard =
    (title: string, slices: BreakdownSlice[], note: string): BlockFactory =>
    (x, width) =>
      card(doc, x, width, {
        title,
        bodyHeight: Math.max(slices.length, 1) * DISTRIBUTION_ROW_HEIGHT,
        note,
        drawBody: distributionBody(
          doc,
          slices.map((slice) => ({
            label: slice.label,
            value: slice.count,
            formatted: formatNumber(slice.count),
          })),
          COLOR.accent,
        ),
      });
  const causesCard = distributionCard(
    i18n.t("roadAccidents.chart.causes"),
    causeChart,
    breakdownNote(data.causeSlices, data.kpi.count, "cause"),
  );
  const causersCard = distributionCard(
    i18n.t("roadAccidents.chart.causers"),
    data.causerSlices,
    breakdownNote(data.causerSlices, data.kpi.count, "causer"),
  );

  const damageTrendCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: i18n.t("roadAccidents.chart.damageTrend"),
      legend: [
        { label: i18n.t("roadAccidents.common.damage"), color: COLOR.accent },
        { label: i18n.t("roadAccidents.common.compensation"), color: COLOR.compensation },
      ],
      bodyHeight: DAMAGE_CHART_HEIGHT,
      drawBody: groupedBarChartBody(
        doc,
        data.monthlyCounts.map((item) => ({
          ...splitMonthLabel(item.ym),
          primary: item.sumDamage,
          secondary: item.sumCompensated,
        })),
        {
          height: DAMAGE_CHART_HEIGHT,
          colors: [COLOR.accent, COLOR.compensation],
          formatTick: formatMoneyAxis,
          labelLines: 2,
        },
      ),
    });

  const motorcadeCountCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: i18n.t("roadAccidents.chart.accidentsByMotorcade"),
      bodyHeight: Math.max(1, motorcades.length) * RANKED_ROW_HEIGHT,
      note: motorcadeNote(data),
      drawBody: rankedBarsBody(
        doc,
        motorcades.map((item) => ({
          label: item.name,
          value: item.count,
          formatted: formatNumber(item.count),
        })),
        { color: COLOR.accent },
      ),
    });

  const motorcadeDamageCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: i18n.t("roadAccidents.chart.damageByMotorcade"),
      legend: [
        { label: i18n.t("roadAccidents.common.damage"), color: COLOR.accent },
        { label: i18n.t("roadAccidents.common.compensation"), color: COLOR.compensation },
      ],
      bodyHeight: Math.max(1, motorcades.length) * DUAL_ROW_HEIGHT,
      note: motorcades.length === 0 ? i18n.t("roadAccidents.pdf.insight.noAccidents") : undefined,
      drawBody: dualBarsBody(
        doc,
        motorcades.map((item) => ({
          label: item.name,
          primary: item.sumDamage,
          secondary: item.sumCompensated,
          formatted: formatPdfCurrency(item.sumDamage),
        })),
        { colors: [COLOR.accent, COLOR.compensation] },
      ),
    });

  const driversTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: i18n.t("roadAccidents.table.topDrivers", { count: DRIVERS_TOP_N }),
      columns: [
        { header: i18n.t("roadAccidents.common.driver"), ratio: 0.55 },
        {
          header: i18n.t("roadAccidents.common.accidents"),
          ratio: 0.15,
          align: "right",
          mono: true,
        },
        { header: i18n.t("roadAccidents.common.damage"), ratio: 0.3, align: "right", mono: true },
      ],
      rows: drivers.map((row) => ({
        cells: [row.name, formatNumber(row.count), formatPdfCurrency(row.sumDamage)],
      })),
      note:
        data.driversRanking.length > DRIVERS_TOP_N
          ? i18n.t("roadAccidents.pdf.note.truncated", {
              shown: DRIVERS_TOP_N,
              total: formatNumber(data.driversRanking.length),
            })
          : undefined,
    });

  const vehiclesTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: i18n.t("roadAccidents.table.topVehicles", { count: VEHICLES_TOP_N }),
      columns: [
        { header: i18n.t("roadAccidents.common.vehicle"), ratio: 0.55 },
        {
          header: i18n.t("roadAccidents.common.accidents"),
          ratio: 0.15,
          align: "right",
          mono: true,
        },
        { header: i18n.t("roadAccidents.common.damage"), ratio: 0.3, align: "right", mono: true },
      ],
      rows: vehicles.map((row) => ({
        cells: [row.name, formatNumber(row.count), formatPdfCurrency(row.sumDamage)],
      })),
      note:
        data.vehiclesRanking.length > VEHICLES_TOP_N
          ? i18n.t("roadAccidents.pdf.note.truncated", {
              shown: VEHICLES_TOP_N,
              total: formatNumber(data.vehiclesRanking.length),
            })
          : undefined,
    });

  const routesTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: i18n.t("roadAccidents.table.topRoutes", { count: ROUTES_TOP_N }),
      columns: [
        { header: i18n.t("roadAccidents.common.route"), ratio: 0.55 },
        {
          header: i18n.t("roadAccidents.common.accidents"),
          ratio: 0.15,
          align: "right",
          mono: true,
        },
        { header: i18n.t("roadAccidents.common.damage"), ratio: 0.3, align: "right", mono: true },
      ],
      emptyText: i18n.t("roadAccidents.table.noRoutes"),
      rows: routes.map((row) => ({
        cells: [row.name, formatNumber(row.count), formatPdfCurrency(row.sumDamage)],
      })),
      note:
        data.routesRanking.length > ROUTES_TOP_N
          ? i18n.t("roadAccidents.pdf.note.truncated", {
              shown: ROUTES_TOP_N,
              total: formatNumber(data.routesRanking.length),
            })
          : undefined,
    });

  const causesTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: i18n.t("roadAccidents.chart.damageByCause"),
      columns: [
        { header: i18n.t("roadAccidents.common.cause"), ratio: 0.34 },
        {
          header: i18n.t("roadAccidents.common.accidents"),
          ratio: 0.12,
          align: "right",
          mono: true,
        },
        { header: i18n.t("roadAccidents.common.damage"), ratio: 0.2, align: "right", mono: true },
        {
          header: i18n.t("roadAccidents.common.compensation"),
          ratio: 0.2,
          align: "right",
          mono: true,
        },
        {
          header: i18n.t("roadAccidents.kpi.compensationShare"),
          ratio: 0.14,
          align: "right",
          mono: true,
        },
      ],
      rows: [
        ...data.causeSlices.map((slice, index) => ({
          cells: [
            slice.label,
            formatNumber(slice.count),
            formatPdfCurrency(slice.sumDamage),
            formatPdfCurrency(slice.sumCompensated),
            slice.sumDamage > 0 ? formatPercent(slice.sumCompensated / slice.sumDamage) : "—",
          ],
          highlighted: index === 0,
        })),
        {
          cells: [
            i18n.t("roadAccidents.common.total"),
            formatNumber(causeTotal.count),
            formatPdfCurrency(causeTotal.sumDamage),
            formatPdfCurrency(causeTotal.sumCompensated),
            causeTotal.sumDamage > 0
              ? formatPercent(causeTotal.sumCompensated / causeTotal.sumDamage)
              : "—",
          ],
          emphasized: true,
        },
      ],
    });

  return [
    reportHeader(doc, {
      kicker: i18n.t("roadAccidents.pdf.kicker.overview"),
      title: i18n.t("roadAccidents.pdf.title.overview"),
      periodLabel,
      generatedAt: new Date(),
      filterLines: [
        i18n.t("roadAccidents.pdf.filter.allMotorcades"),
        ...dataContextLines(input.context),
      ],
    }),
    kpiRow(doc, kpiCards(data)),
    trendCard,
    columns([causesCard, causersCard], [0.5, 0.5]),
    damageTrendCard,
    columns([motorcadeCountCard, motorcadeDamageCard], [0.5, 0.5]),
    columns([driversTable, vehiclesTable], [0.5, 0.5]),
    columns([routesTable], [0.5]),
    causesTable,
  ];
}

// Векторная отрисовка: текст остаётся текстом, вёрстка не зависит от окна
export function buildOverviewReport(input: OverviewReportInput): {
  doc: jsPDF;
  result: FlowResult;
} {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  registerPdfFonts(doc);

  const result = flowBlocks(doc, overviewBlocks(doc, input), PAGE.marginTop, {
    onSection: input.onSection,
  });
  drawPageFooters(doc, result.failed);

  return { doc, result };
}

export function saveOverviewReport(input: OverviewReportInput): FlowResult {
  const { doc, result } = buildOverviewReport(input);
  doc.save(buildReportFilename("obzor", input.period, new Date()));
  return result;
}

export function createOverviewReportFile(input: OverviewReportInput): OverviewReportFile {
  const { doc, result } = buildOverviewReport(input);
  return {
    blob: doc.output("blob"),
    filename: buildReportFilename("obzor", input.period, new Date()),
    result,
  };
}
