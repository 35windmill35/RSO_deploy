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
import type { MotorcadeData } from "@Accidents/pages/motorcade/model/motorcadeData";
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
  barChartBody,
  card,
  distributionBody,
  groupedBarChartBody,
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

const TREND_CHART_HEIGHT = 102;
const DAMAGE_CHART_HEIGHT = 76;

export interface MotorcadeReportInput {
  data: MotorcadeData;
  period: Period;
  motorcadeName: string;
  context: ReportDataContext;
  onSection?: (done: number, total: number) => void;
}

function kpiCards(data: MotorcadeData): KpiCardData[] {
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

  const cards = [
    build(
      i18n.t("roadAccidents.kpi.accidentCount"),
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
      i18n.t("roadAccidents.kpi.averageDamage"),
      formatPdfCurrency(kpi.averageDamage),
      "currency",
      kpi.averageDamage,
      previousKpi?.averageDamage,
      false,
    ),
    build(
      i18n.t("roadAccidents.kpi.driverFaultShare"),
      formatPercent(kpi.driverFaultShare),
      "percent",
      kpi.driverFaultShare,
      previousKpi?.driverFaultShare,
      false,
    ),
    build(
      i18n.t("roadAccidents.kpi.thirdPartyFaultShare"),
      formatPercent(kpi.thirdPartyFaultShare),
      "percent",
      kpi.thirdPartyFaultShare,
      previousKpi?.thirdPartyFaultShare,
      false,
    ),
  ];

  return cards;
}

function motorcadeBlocks(doc: jsPDF, input: MotorcadeReportInput): BlockFactory[] {
  const { data, period } = input;
  const periodLabel = formatPeriodLabel(period);
  const drivers = data.driversRanking.slice(0, DRIVERS_TOP_N);
  const vehicles = data.vehiclesRanking.slice(0, VEHICLES_TOP_N);
  const routes = data.routesRanking.slice(0, ROUTES_TOP_N);
  const cards = kpiCards(data);
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
      kicker: i18n.t("roadAccidents.pdf.kicker.motorcade"),
      title: i18n.t("roadAccidents.pdf.title.motorcade", { name: input.motorcadeName }),
      periodLabel,
      generatedAt: new Date(),
      filterLines: dataContextLines(input.context),
    }),
    kpiRow(doc, cards.slice(0, 4)),
    kpiRow(doc, cards.slice(4, 8), 4),
    trendCard,
    columns([causesCard, causersCard], [0.5, 0.5]),
    damageTrendCard,
    columns([driversTable, vehiclesTable], [0.5, 0.5]),
    columns([routesTable], [0.5]),
    causesTable,
  ];
}

export function buildMotorcadeReport(input: MotorcadeReportInput): {
  doc: jsPDF;
  result: FlowResult;
} {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  registerPdfFonts(doc);

  const result = flowBlocks(doc, motorcadeBlocks(doc, input), PAGE.marginTop, {
    onSection: input.onSection,
  });
  drawPageFooters(doc, result.failed);

  return { doc, result };
}

export function saveMotorcadeReport(input: MotorcadeReportInput): FlowResult {
  const { doc, result } = buildMotorcadeReport(input);
  doc.save(buildReportFilename("avtokolonna", input.period, new Date()));
  return result;
}
