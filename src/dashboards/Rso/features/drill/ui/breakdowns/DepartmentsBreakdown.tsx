import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import {
  DASH,
  formatDecimal,
  formatHours,
  formatMoney,
  formatNumber,
  formatPct,
} from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { departmentLines, type DepartmentLine } from "../../model/breakdowns";
import { BreakdownSection } from "./BreakdownSection";
import type { BreakdownProps } from "./types";

interface DepartmentsBreakdownProps extends BreakdownProps {
  // revenue — оборот и ЗН по отделам, hours — нормочасы по отделам
  mode: "revenue" | "hours";
}

// Разбивка показателя по отделам (turnoverAndIncome за период)
export const DepartmentsBreakdown = observer(function DepartmentsBreakdown({
  period,
  data,
  mode,
}: DepartmentsBreakdownProps) {
  const { t } = useTranslation();
  const lines = departmentLines(data, period, filtersStore.vat);

  const nameColumn: DataTableColumn<DepartmentLine> = {
    key: "name",
    label: t("rso.col.department"),
    grow: true,
    render: (l) => l.name ?? DASH,
  };
  const countColumn: DataTableColumn<DepartmentLine> = {
    key: "count",
    label: t("rso.col.accountCount"),
    align: "right",
    render: (l) => formatNumber(l.accountCount),
  };
  const columns: DataTableColumn<DepartmentLine>[] =
    mode === "revenue"
      ? [
          nameColumn,
          {
            key: "turnover",
            label: t("rso.kpi.revenue.label"),
            align: "right",
            render: (l) => formatMoney(l.turnover),
          },
          {
            key: "share",
            label: t("rso.drill.share"),
            align: "right",
            render: (l) => formatPct(l.share),
          },
          countColumn,
          {
            key: "avg",
            label: t("rso.kpi.avgCheck.label"),
            align: "right",
            render: (l) => formatMoney(l.avgCheck),
          },
        ]
      : [
          nameColumn,
          {
            key: "hours",
            label: t("rso.kpi.normHours.label"),
            align: "right",
            render: (l) => formatHours(l.normHours),
          },
          countColumn,
          {
            key: "perAccount",
            label: t("rso.drill.hoursPerAccount"),
            align: "right",
            render: (l) => formatDecimal(l.normHoursPerAccount),
          },
        ];

  return (
    <BreakdownSection title={t("rso.drill.byDepartments")}>
      {lines.length === 0 ? (
        <BlockState kind="empty" />
      ) : (
        <DataTable<DepartmentLine> columns={columns} rows={lines} getRowKey={(l) => String(l.id)} />
      )}
    </BreakdownSection>
  );
});
