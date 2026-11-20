import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { DASH, formatDecimal, formatMoney, formatNumber, formatPct } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { segmentLines, type SegmentLine } from "../../model/breakdowns";
import { BreakdownSection } from "./BreakdownSection";
import type { BreakdownProps } from "./types";

interface SegmentsBreakdownProps extends BreakdownProps {
  // structure — запчасти / работы, clients — визиты и средний чек
  mode: "structure" | "clients";
}

// Сегменты клиентов по отделам (clientSegment)
export const SegmentsBreakdown = observer(function SegmentsBreakdown({
  period,
  data,
  mode,
}: SegmentsBreakdownProps) {
  const { t } = useTranslation();
  const vat = filtersStore.vat;
  const lines = segmentLines(data, period, vat);

  const head: DataTableColumn<SegmentLine>[] = [
    {
      key: "department",
      label: t("rso.col.department"),
      grow: true,
      render: (l) => l.department ?? DASH,
    },
    { key: "segment", label: t("rso.drill.segment"), render: (l) => l.segment ?? DASH },
  ];
  const turnover: DataTableColumn<SegmentLine> = {
    key: "turnover",
    label: t("rso.col.turnover"),
    align: "right",
    render: (l) => formatMoney(l.turnover),
  };
  const columns: DataTableColumn<SegmentLine>[] =
    mode === "structure"
      ? [
          ...head,
          {
            key: "parts",
            label: t("rso.structure.parts"),
            align: "right",
            render: (l) => formatMoney(l.parts),
          },
          {
            key: "work",
            label: t("rso.structure.work"),
            align: "right",
            render: (l) => formatMoney(l.work),
          },
          turnover,
          {
            key: "ratio",
            label: t("rso.kpi.partsToWork.label"),
            align: "right",
            render: (l) => formatPct(l.partsToWorkPct),
          },
        ]
      : [
          ...head,
          {
            key: "count",
            label: t("rso.drill.visits"),
            align: "right",
            render: (l) => formatNumber(l.accountCount),
          },
          turnover,
          {
            key: "avg",
            label: t("rso.kpi.avgCheck.label"),
            align: "right",
            render: (l) => formatMoney(l.avgCheck),
          },
          {
            key: "hours",
            label: t("rso.segment.avgNormHours"),
            align: "right",
            render: (l) => formatDecimal(l.normHoursPerAccount),
          },
        ];

  return (
    <BreakdownSection
      title={t(mode === "structure" ? "rso.drill.structureTitle" : "rso.drill.segmentsTitle")}
      note={vat === "Netto" && lines.length > 0 ? t("rso.vat.approxHint") : undefined}
    >
      {lines.length === 0 ? (
        <BlockState kind="empty" />
      ) : (
        <DataTable<SegmentLine> columns={columns} rows={lines} getRowKey={(l) => l.key} />
      )}
    </BreakdownSection>
  );
});
