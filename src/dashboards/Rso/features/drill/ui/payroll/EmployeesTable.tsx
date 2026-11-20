import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type {
  EmployeeHistory,
  PayrollDelta as Delta,
  PayrollEmployee,
} from "@Rso/entities/rso/lib/payroll";
import { ratio } from "@Rso/entities/rso/lib/money";
import { formatMoney, formatNumber, formatPct } from "@Rso/shared/lib/format";
import { useCollapsedRows } from "@Rso/shared/lib/useCollapsedRows";
import { useTableSort } from "@Rso/shared/lib/useTableSort";
import { Collapsible } from "@Rso/shared/ui/Collapsible/Collapsible";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { PayrollDelta } from "./PayrollDelta";
import { employeeDepartment, employeeName, positionName, type Translate } from "./payrollLabels";
import styles from "./Payroll.module.css";

// full — поиск, отдел, должность, статус; status — только флажок статуса; none — без панели
export type EmployeesToolbar = "full" | "status" | "none";

interface EmployeesTableProps {
  employees: readonly PayrollEmployee[];
  history: EmployeeHistory;
  // Итог ФОТ компании — база доли
  total: number | null;
  toolbar?: EmployeesToolbar;
  initialNotHired?: boolean;
  onOpen?: (employee: PayrollEmployee) => void;
  // Свернуть до первых N строк с кнопкой «Показать все» (вкладка); без него — список целиком
  preview?: number;
}

interface EmployeeRow {
  employee: PayrollEmployee;
  name: string;
  position: string;
  department: string;
  wage: number;
  share: number | null;
  delta: Delta;
}

const PAGE_SIZE = 50;
// Постранично — только для больших списков (ТЗ §9.1)
const PAGING_FROM = 100;
const NO_DEPARTMENT = "none";

const departmentKeys = (employee: PayrollEmployee) =>
  employee.departments === null
    ? [NO_DEPARTMENT]
    : employee.departments.map((item) => String(item.id));

// Сотрудники с ФОТ, должностью, отделом и статусом (ТЗ §9). Общая для вкладки и панели.
// Строки без начислений — серым и всегда внизу, в итог числа сотрудников не входят
export function EmployeesTable({
  employees,
  history,
  total,
  toolbar = "full",
  initialNotHired = false,
  preview,
  onOpen,
}: EmployeesTableProps) {
  const { t } = useTranslation();
  const tr: Translate = (key) => t(key);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [onlyNotHired, setOnlyNotHired] = useState(initialNotHired);
  const [page, setPage] = useState(0);

  const all: EmployeeRow[] = employees.map((employee) => ({
    employee,
    name: employeeName(employee, tr),
    position: positionName(employee, tr),
    department: employeeDepartment(employee, tr),
    wage: employee.wage,
    share: employee.wage > 0 && total ? (ratio(employee.wage, total) ?? 0) * 100 : null,
    delta: history.deltas.get(employee.userId) ?? null,
  }));

  // Опции фильтров — из всех строк, «Без отдела» последней
  const departmentOptions = new Map<string, string>();
  employees.forEach((employee) =>
    (employee.departments ?? []).forEach((item) =>
      departmentOptions.set(String(item.id), item.name ?? String(item.id)),
    ),
  );
  const departments = [...departmentOptions.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  if (employees.some((employee) => employee.departments === null)) {
    departments.push([NO_DEPARTMENT, t("rso.staff.noDepartment")]);
  }
  const positions = [
    ...new Map(all.map((row) => [String(row.employee.positionId), row.position])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));

  const query = search.trim().toLocaleLowerCase();
  const visible = all.filter(
    (row) =>
      (!query || row.name.toLocaleLowerCase().includes(query)) &&
      (!department || departmentKeys(row.employee).includes(department)) &&
      (!position || String(row.employee.positionId) === position) &&
      (!onlyNotHired || row.employee.isNotHired),
  );
  const paid = visible.filter((row) => row.wage > 0);
  const unpaid = visible
    .filter((row) => row.wage <= 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const table = useTableSort(
    paid,
    {
      name: (r) => r.name,
      position: (r) => r.position,
      department: (r) => r.department,
      status: (r) => (r.employee.isNotHired ? 1 : 0),
      wage: (r) => r.wage,
      share: (r) => r.share,
      delta: (r) => r.delta,
    },
    { key: "wage", order: -1 },
  );
  const collapse = useCollapsedRows([...table.rows, ...unpaid], preview);
  const rows = collapse.rows;

  // Постранично — только раскрытый список
  const paged = !collapse.collapsed && rows.length > PAGING_FROM;
  const pageCount = paged ? Math.ceil(rows.length / PAGE_SIZE) : 1;
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = paged
    ? rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
    : rows;

  const muted = (row: EmployeeRow, content: ReactNode) =>
    row.wage > 0 ? content : <span className={styles.muted}>{content}</span>;

  const columns: DataTableColumn<EmployeeRow>[] = [
    {
      key: "name",
      label: t("rso.col.employee"),
      grow: true,
      sortable: true,
      render: (r) => muted(r, r.name),
    },
    {
      key: "position",
      label: t("rso.col.position"),
      sortable: true,
      render: (r) => muted(r, r.position),
    },
    {
      key: "department",
      label: t("rso.col.department"),
      sortable: true,
      render: (r) =>
        r.employee.departments === null ? (
          <span className={styles.hintText} title={t("rso.staff.noDepartmentHint")}>
            {r.department}
          </span>
        ) : (
          muted(r, r.department)
        ),
    },
    {
      key: "status",
      label: t("rso.col.status"),
      sortable: true,
      render: (r) =>
        r.employee.isNotHired ? (
          <span className={styles.badge}>{t("rso.staff.notHired")}</span>
        ) : null,
    },
    {
      key: "wage",
      label: t("rso.col.wage"),
      align: "right",
      sortable: true,
      render: (r) => muted(r, formatMoney(r.wage)),
    },
    {
      key: "share",
      label: t("rso.col.share"),
      align: "right",
      sortable: true,
      render: (r) => muted(r, formatPct(r.share)),
    },
    {
      key: "delta",
      label: t("rso.col.deltaPrev"),
      align: "right",
      sortable: true,
      render: (r) => <PayrollDelta value={r.delta} />,
    },
  ];

  const visibleWage = visible.reduce((sum, row) => sum + row.wage, 0);
  const footer = (
    <tr>
      <td colSpan={4}>
        {t("rso.staff.visibleTotal")} ({formatNumber(paid.length)})
      </td>
      <td className={styles.num}>{formatMoney(visibleWage)}</td>
      <td className={styles.num}>{formatPct(total ? (visibleWage / total) * 100 : null)}</td>
      <td />
    </tr>
  );

  const resetPage =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(0);
    };

  return (
    <>
      {toolbar !== "none" && (
        <div className={styles.toolbar}>
          {toolbar === "full" && (
            <>
              <input
                type="search"
                className={styles.control}
                placeholder={t("rso.staff.search")}
                aria-label={t("rso.staff.search")}
                value={search}
                onChange={(event) => resetPage(setSearch)(event.target.value)}
              />
              <select
                className={styles.control}
                aria-label={t("rso.col.department")}
                value={department}
                onChange={(event) => resetPage(setDepartment)(event.target.value)}
              >
                <option value="">{t("rso.staff.allDepartments")}</option>
                {departments.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                className={styles.control}
                aria-label={t("rso.col.position")}
                value={position}
                onChange={(event) => resetPage(setPosition)(event.target.value)}
              >
                <option value="">{t("rso.staff.allPositions")}</option>
                {positions.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </>
          )}
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={onlyNotHired}
              onChange={(event) => resetPage(setOnlyNotHired)(event.target.checked)}
            />
            {t("rso.staff.onlyNotHired")}
          </label>
        </div>
      )}
      <Collapsible
        collapsed={collapse.collapsed}
        collapsible={collapse.collapsible}
        total={collapse.total}
        onToggle={collapse.toggle}
      >
        <DataTable<EmployeeRow>
          columns={columns}
          rows={pageRows}
          getRowKey={(row) => String(row.employee.userId)}
          onRowClick={onOpen ? (row) => onOpen(row.employee) : undefined}
          footer={collapse.collapsed ? undefined : footer}
          sort={table.sort}
          onSort={table.onSort}
        />
      </Collapsible>
      {paged && (
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.pagerButton}
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            ←
          </button>
          <span>{t("rso.drill.page", { page: currentPage + 1, total: pageCount })}</span>
          <button
            type="button"
            className={styles.pagerButton}
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
