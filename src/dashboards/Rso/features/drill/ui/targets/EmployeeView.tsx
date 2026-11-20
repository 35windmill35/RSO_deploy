import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  employeeHistory,
  payrollEmployees,
  payrollSources,
  payrollTotal,
} from "@Rso/entities/rso/lib/payroll";
import { hasPrevPeriod } from "@Rso/entities/rso/model/prevDashboard";
import { DASH, formatDelta, formatMoney, formatPct } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { KpiCard } from "@Rso/shared/ui/KpiCard/KpiCard";
import type { DrillNode } from "../../model/drillStore";
import type { DrillTarget } from "../../model/targets";
import { employeeDepartment, positionName, type Translate } from "../payroll/payrollLabels";
import { DashboardGate } from "./gates";
import payroll from "../payroll/Payroll.module.css";
import styles from "../DrillDrawer.module.css";

type EmployeeTarget = Extract<DrillTarget, { kind: "employee" }>;

interface EmployeeViewProps {
  target: EmployeeTarget;
  node: DrillNode;
}

// Карточка сотрудника за период панели: ФОТ, прошлый период, дельта, доля (ТЗ §14.2).
// Персональные данные — ТЗ §9.4
export function EmployeeView({ target, node }: EmployeeViewProps) {
  const { t } = useTranslation();
  const tr: Translate = (key) => t(key);
  const { period } = node;

  return (
    <DashboardGate period={period}>
      {(data) => {
        const sources = payrollSources(data, period, hasPrevPeriod(period));
        if (!sources.cur) return <BlockState kind="empty" message={t("rso.staff.noPayroll")} />;
        const employees = payrollEmployees(sources.cur);
        const employee = employees.find((item) => item.userId === target.userId);
        if (!employee) return <BlockState kind="empty" />;

        const history = employeeHistory([employee], sources.prev);
        const delta = history.deltas.get(employee.userId);
        // Прошлого периода нет — «—»; сотрудника в прошлом не было — 0
        const previous = sources.prev ? (history.previous.get(employee.userId) ?? 0) : null;
        const total = payrollTotal(sources.cur);
        const share = employee.wage > 0 && total ? (employee.wage / total) * 100 : null;

        const details: [string, ReactNode][] = [
          [t("rso.col.position"), positionName(employee, tr)],
          [
            t("rso.col.department"),
            employee.departments === null ? (
              <span className={payroll.hintText} title={t("rso.staff.noDepartmentHint")}>
                {employeeDepartment(employee, tr)}
              </span>
            ) : (
              employeeDepartment(employee, tr)
            ),
          ],
          [
            t("rso.col.status"),
            employee.isNotHired ? (
              <span className={payroll.badge}>{t("rso.staff.notHired")}</span>
            ) : (
              DASH
            ),
          ],
        ];

        return (
          <>
            <div className={styles.tiles}>
              <KpiCard label={t("rso.col.wage")} value={employee.wage} format={formatMoney} />
              <KpiCard label={t("rso.staff.prevWage")} value={previous} format={formatMoney} />
              <KpiCard
                label={t("rso.col.deltaPrev")}
                value={delta ?? null}
                format={(value) => formatDelta(value) ?? DASH}
                note={delta === undefined ? t("rso.sales.delta.new") : undefined}
              />
              <KpiCard label={t("rso.col.share")} value={share} format={formatPct} />
            </div>
            <section className={styles.section}>
              <dl className={payroll.card}>
                {details.map(([label, value]) => (
                  <div key={label} className={payroll.cardRow}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        );
      }}
    </DashboardGate>
  );
}
