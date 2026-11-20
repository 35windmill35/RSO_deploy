import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Period } from "@Rso/entities/rso/api/contract";
import {
  employeeHistory,
  payrollByDepartment,
  payrollByPosition,
  payrollEmployees,
  payrollKpis,
  payrollSources,
  type PayrollEmployee,
  type PayrollGroupRow,
} from "@Rso/entities/rso/lib/payroll";
import { hasPrevPeriod } from "@Rso/entities/rso/model/prevDashboard";
import { formatMoney, formatNumber, formatPct } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { KpiCard } from "@Rso/shared/ui/KpiCard/KpiCard";
import { drillStore, type DrillNode } from "../../model/drillStore";
import type { DrillTarget } from "../../model/targets";
import { EmployeesTable } from "../payroll/EmployeesTable";
import { PayrollGroupsTable } from "../payroll/PayrollGroupsTable";
import { DashboardGate } from "./gates";
import styles from "../DrillDrawer.module.css";

type PayrollTarget = Extract<
  DrillTarget,
  { kind: "payroll" | "payrollDepartment" | "payrollPosition" | "payrollPositions" }
>;

interface PayrollViewProps {
  target: PayrollTarget;
  node: DrillNode;
}

const openEmployee = (employee: PayrollEmployee) =>
  drillStore.pushTarget({ kind: "employee", userId: employee.userId, label: employee.name });

const openDepartment = (row: PayrollGroupRow) =>
  drillStore.pushTarget({ kind: "payrollDepartment", departmentId: row.id, label: row.name });

const openPosition = (row: PayrollGroupRow) => {
  if (row.id !== null) {
    drillStore.pushTarget({ kind: "payrollPosition", positionId: row.id, label: row.name });
  }
};

const inDepartment = (id: number | null) => (employee: PayrollEmployee) =>
  id === null
    ? employee.departments === null
    : (employee.departments ?? []).some((item) => item.id === id);

// ФОТ компании, отдела или должности за период панели (ТЗ §14.2). Уровни по периоду
// не строятся: ФОТ есть только за текущий и прошлый период
export function PayrollView({ target, node }: PayrollViewProps) {
  return (
    <DashboardGate period={node.period}>
      {(data) => <PayrollContent target={target} period={node.period} data={data} />}
    </DashboardGate>
  );
}

interface PayrollContentProps {
  target: PayrollTarget;
  period: Period;
  data: Parameters<typeof payrollSources>[0];
}

function PayrollContent({ target, period, data }: PayrollContentProps) {
  const { t } = useTranslation();
  const sources = payrollSources(data, period, hasPrevPeriod(period));
  if (!sources.cur) return <BlockState kind="empty" message={t("rso.staff.noPayroll")} />;

  const employees = payrollEmployees(sources.cur);
  const history = employeeHistory(employees, sources.prev);
  const departments = payrollByDepartment(sources.cur, sources.prev);
  const total = departments.total.wage;

  const section = (title: string, content: ReactNode, hint = true) => (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {hint && <span className={styles.sectionHint}>{t("rso.drill.clickHint")}</span>}
      </div>
      {content}
    </section>
  );

  // Все должности: ФОТ, сотрудники, средний ФОТ и таблица должностей
  if (target.kind === "payrollPositions") {
    const kpis = payrollKpis(sources.cur, sources.prev, sources.revenue, sources.prevRevenue);
    return (
      <>
        <div className={styles.tiles}>
          <KpiCard
            label={t("rso.kpi.payrollTotal.label")}
            value={kpis.total}
            format={formatMoney}
            delta={kpis.totalDelta}
            higherIsBetter={null}
          />
          <KpiCard
            label={t("rso.kpi.employees.label")}
            value={kpis.employees}
            format={formatNumber}
            delta={kpis.employeesDelta}
            deltaUnit="count"
            higherIsBetter={null}
          />
          <KpiCard
            label={t("rso.kpi.payrollPerEmployee.label")}
            value={kpis.perEmployee}
            format={formatMoney}
            delta={kpis.perEmployeeDelta}
            higherIsBetter={null}
          />
        </div>
        {section(
          t("rso.block.payrollPositions.title"),
          <PayrollGroupsTable
            groups={payrollByPosition(sources.cur, sources.prev)}
            kind="position"
            onOpen={openPosition}
          />,
        )}
      </>
    );
  }

  if (target.kind === "payroll") {
    const kpis = payrollKpis(sources.cur, sources.prev, sources.revenue, sources.prevRevenue);
    const tiles = (
      <div className={styles.tiles}>
        <KpiCard
          label={t("rso.kpi.payrollTotal.label")}
          value={kpis.total}
          format={formatMoney}
          delta={kpis.totalDelta}
          higherIsBetter={null}
        />
        <KpiCard
          label={t("rso.kpi.payrollShare.label")}
          value={kpis.share}
          format={formatPct}
          delta={kpis.shareDelta}
          deltaUnit="pp"
          higherIsBetter={false}
          note={t("rso.staff.kpi.shareNote")}
        />
        <KpiCard
          label={t("rso.kpi.employees.label")}
          value={kpis.employees}
          format={formatNumber}
          delta={kpis.employeesDelta}
          deltaUnit="count"
          higherIsBetter={null}
        />
        <KpiCard
          label={t("rso.kpi.notHired.label")}
          value={kpis.notHired}
          format={formatNumber}
          delta={kpis.notHiredDelta}
          deltaUnit="count"
          higherIsBetter={false}
        />
      </div>
    );
    const employeesTable = (
      <EmployeesTable
        employees={employees}
        history={history}
        total={total}
        toolbar="status"
        initialNotHired={target.filter === "notHired"}
        onOpen={openEmployee}
      />
    );
    if (target.filter === "notHired") {
      return (
        <>
          {tiles}
          {section(t("rso.block.payrollEmployees.title"), employeesTable)}
        </>
      );
    }
    return (
      <>
        {tiles}
        {section(
          t("rso.block.payrollByDept.title"),
          <PayrollGroupsTable groups={departments} kind="department" onOpen={openDepartment} />,
        )}
        {section(
          t("rso.block.payrollPositions.title"),
          <PayrollGroupsTable
            groups={payrollByPosition(sources.cur, sources.prev)}
            kind="position"
            onOpen={openPosition}
          />,
        )}
        {section(t("rso.block.payrollEmployees.title"), employeesTable)}
      </>
    );
  }

  const isDepartment = target.kind === "payrollDepartment";
  const row = isDepartment
    ? departments.rows.find((item) => item.id === target.departmentId)
    : payrollByPosition(sources.cur, sources.prev).rows.find(
        (item) => item.id === target.positionId,
      );
  // Отдела или должности нет в ответе за период (например, после смены базы)
  if (!row) return <BlockState kind="empty" />;

  const members = employees.filter(
    isDepartment
      ? inDepartment(target.departmentId)
      : (employee) => employee.positionId === target.positionId,
  );

  return (
    <>
      <div className={styles.tiles}>
        <KpiCard
          label={t("rso.col.wage")}
          value={row.wage}
          format={formatMoney}
          delta={row.delta ?? null}
          higherIsBetter={null}
          note={row.delta === undefined ? t("rso.sales.delta.new") : undefined}
        />
        <KpiCard label={t("rso.col.share")} value={row.share} format={formatPct} />
        <KpiCard label={t("rso.kpi.employees.label")} value={row.employees} format={formatNumber} />
        {isDepartment ? (
          <KpiCard label={t("rso.kpi.notHired.label")} value={row.notHired} format={formatNumber} />
        ) : (
          <KpiCard
            label={t("rso.kpi.payrollPerEmployee.label")}
            value={row.avgWage}
            format={formatMoney}
          />
        )}
      </div>
      {section(
        t("rso.block.payrollEmployees.title"),
        <>
          <EmployeesTable
            employees={members}
            history={history}
            total={total}
            toolbar="none"
            onOpen={openEmployee}
          />
          {isDepartment && target.departmentId === null && (
            <p className={styles.footnote}>{t("rso.staff.noDepartmentHint")}</p>
          )}
        </>,
      )}
    </>
  );
}
