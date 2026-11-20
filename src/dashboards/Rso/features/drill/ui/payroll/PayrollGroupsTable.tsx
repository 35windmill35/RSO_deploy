import { useTranslation } from "react-i18next";
import type { PayrollGroupRow, PayrollGroups } from "@Rso/entities/rso/lib/payroll";
import { DASH, formatMoney, formatNumber, formatPct } from "@Rso/shared/lib/format";
import { useTableSort } from "@Rso/shared/lib/useTableSort";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { PayrollDelta } from "./PayrollDelta";
import { groupName, type PayrollGroupKind, type Translate } from "./payrollLabels";
import styles from "./Payroll.module.css";

interface PayrollGroupsTableProps {
  groups: PayrollGroups;
  kind: PayrollGroupKind;
  onOpen?: (row: PayrollGroupRow) => void;
}

const groupKey = (row: PayrollGroupRow) => (row.id === null ? "none" : String(row.id));

// Таблица ФОТ по отделам или должностям с итогом (ТЗ §7.2, §8). Общая для вкладки и панели
export function PayrollGroupsTable({ groups, kind, onOpen }: PayrollGroupsTableProps) {
  const { t } = useTranslation();
  const tr: Translate = (key) => t(key);
  const isDepartment = kind === "department";

  const columns: DataTableColumn<PayrollGroupRow>[] = [
    {
      key: "name",
      label: t(isDepartment ? "rso.col.department" : "rso.col.position"),
      grow: true,
      sortable: true,
      render: (r) => groupName(r, kind, tr),
    },
    {
      key: "employees",
      label: t("rso.kpi.employees.label"),
      align: "right",
      sortable: true,
      render: (r) => formatNumber(r.employees),
    },
    {
      key: "wage",
      label: t("rso.col.wage"),
      align: "right",
      sortable: true,
      render: (r) => formatMoney(r.wage),
    },
    {
      key: "share",
      label: t("rso.col.share"),
      align: "right",
      sortable: true,
      render: (r) => formatPct(r.share),
    },
    ...(isDepartment
      ? []
      : [
          {
            key: "avgWage",
            label: t("rso.kpi.payrollPerEmployee.label"),
            align: "right" as const,
            sortable: true,
            render: (r: PayrollGroupRow) => formatMoney(r.avgWage),
          },
        ]),
    {
      key: "delta",
      label: t("rso.col.deltaPrev"),
      align: "right",
      sortable: true,
      render: (r) => <PayrollDelta value={r.delta} />,
    },
    ...(isDepartment
      ? [
          {
            key: "notHired",
            label: t("rso.kpi.notHired.label"),
            align: "right" as const,
            sortable: true,
            render: (r: PayrollGroupRow) => (r.notHired > 0 ? formatNumber(r.notHired) : DASH),
          },
        ]
      : []),
  ];

  const table = useTableSort(
    groups.rows,
    {
      name: (r) => groupName(r, kind, tr),
      employees: (r) => r.employees,
      wage: (r) => r.wage,
      share: (r) => r.share,
      avgWage: (r) => r.avgWage,
      // «Новый» — как пустое значение, внизу
      delta: (r) => r.delta,
      notHired: (r) => r.notHired,
    },
    { key: "wage", order: -1 },
  );

  // «Без отдела» — всегда последней строкой, независимо от сортировки (ТЗ §7.2)
  const rows = [
    ...table.rows.filter((row) => row.id !== null || !isDepartment),
    ...table.rows.filter((row) => row.id === null && isDepartment),
  ];

  const { total } = groups;
  const footer = (
    <tr>
      <td>{t("rso.drill.total")}</td>
      <td className={styles.num}>{formatNumber(total.employees)}</td>
      <td className={styles.num}>{formatMoney(total.wage)}</td>
      <td className={styles.num}>{total.wage === null ? DASH : formatPct(100)}</td>
      {!isDepartment && (
        <td className={styles.num}>
          {formatMoney(
            total.wage !== null && total.employees > 0 ? total.wage / total.employees : null,
          )}
        </td>
      )}
      <td className={styles.num}>
        <PayrollDelta value={total.delta} />
      </td>
      {isDepartment && (
        <td className={styles.num}>{total.notHired > 0 ? formatNumber(total.notHired) : DASH}</td>
      )}
    </tr>
  );

  return (
    <DataTable<PayrollGroupRow>
      columns={columns}
      rows={rows}
      getRowKey={groupKey}
      onRowClick={onOpen}
      footer={footer}
      sort={table.sort}
      onSort={table.onSort}
    />
  );
}
