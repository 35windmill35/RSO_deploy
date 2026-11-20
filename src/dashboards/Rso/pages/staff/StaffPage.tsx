import { useMemo, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import type { Period } from "@Rso/entities/rso/api/contract";
import { dashboardStore } from "@Rso/entities/rso/model/dashboardStore";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { periodsStore } from "@Rso/entities/rso/model/periodsStore";
import { hasPrevPeriod } from "@Rso/entities/rso/model/prevDashboard";
import { expenseLines } from "@Rso/features/drill/model/breakdowns";
import { drillStore } from "@Rso/features/drill/model/drillStore";
import type { DrillTarget } from "@Rso/features/drill/model/targets";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { Grid, GridItem } from "@Rso/shared/ui/Grid/Grid";
import { Section } from "@Rso/shared/ui/Section/Section";
import {
  cashTrend,
  computeStaffKpis,
  periodSummary,
  staffPayroll,
  type StaffKpiId,
} from "./model/staffData";
import { CashTrendChart } from "./ui/CashTrendChart";
import { EmployeesBlock } from "./ui/EmployeesBlock";
import { ExpensesStructure } from "./ui/ExpensesStructure";
import { PayrollDepartments } from "./ui/PayrollDepartments";
import { PayrollPositions } from "./ui/PayrollPositions";
import { PeriodSummary } from "./ui/PeriodSummary";
import { StaffKpiRow } from "./ui/StaffKpiRow";

const PAYROLL: DrillTarget = { kind: "payroll", label: null };

// Куда ведёт клик по KPI вкладки (ТЗ §6.1)
const KPI_TARGET: Record<StaffKpiId, DrillTarget> = {
  payrollTotal: PAYROLL,
  payrollShare: PAYROLL,
  employees: PAYROLL,
  notHired: { kind: "payroll", filter: "notHired", label: null },
  payrollPerEmployee: PAYROLL,
  cashIn: { kind: "metric", metricId: "cashProfit" },
  cashOut: { kind: "metric", metricId: "cashProfit" },
  cashProfit: { kind: "metric", metricId: "cashProfit" },
  expense: { kind: "metric", metricId: "expense" },
  revenuePerEmployee: { kind: "metric", metricId: "revenue" },
};

// Вкладка «Персонал и финансы»: ФОТ по отделам, должностям и сотрудникам, касса,
// сводка периода, расходы. Один ответ DashboardRSO: прошлый период — prevPayroll и summary
export const StaffPage = observer(function StaffPage() {
  const { t } = useTranslation();
  const period = filtersStore.period;
  const vat = filtersStore.vat;
  const { status, error } = dashboardStore;
  const data = dashboardStore.data;
  const hasPrev = period ? hasPrevPeriod(period) : false;

  // ФОТ от НДС не зависит — пересчёт только при смене ответа или периода
  const payroll = useMemo(
    () => (data && period ? staffPayroll(data, period, hasPrev) : null),
    [data, period, hasPrev],
  );
  const computed = useMemo(() => {
    if (!data || !period) return null;
    return {
      kpis: computeStaffKpis(data, period, vat, hasPrev),
      cash: cashTrend(data, period, vat),
      summary: periodSummary(data, period, vat),
      expenses: expenseLines(data, period, vat),
    };
  }, [data, period, vat, hasPrev]);

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
  const fallback = (hasData: boolean, emptyMessage?: string): ReactNode | undefined => {
    if (failure) {
      return (
        <BlockState kind="error" message={failure.message ?? undefined} onRetry={failure.retry} />
      );
    }
    if (noPeriods) return <BlockState kind="empty" message={t("rso.periods.empty")} />;
    if (loading || !computed) return <BlockState kind="loading" />;
    if (!hasData) return <BlockState kind="empty" message={emptyMessage} />;
    return undefined;
  };
  const payrollFallback = fallback(Boolean(payroll), t("rso.staff.noPayroll"));

  const open = (target: DrillTarget, at: Period | null = period) => {
    if (at) drillStore.open(target, at);
  };

  return (
    <>
      <StaffKpiRow
        kpis={failure ? null : (computed?.kpis ?? null)}
        loading={loading}
        nettoNote={vat === "Netto"}
        onOpen={computed ? (id) => open(KPI_TARGET[id]) : undefined}
      />

      <Section title={t("rso.section.payroll")}>
        <Grid>
          <GridItem span={6}>
            <PayrollDepartments
              groups={payroll?.departments ?? null}
              period={period}
              fallback={payrollFallback}
              onOpen={(row) =>
                open({ kind: "payrollDepartment", departmentId: row.id, label: row.name })
              }
            />
          </GridItem>
          <GridItem span={6}>
            <PayrollPositions
              groups={payroll?.positions ?? null}
              period={period}
              fallback={payrollFallback}
              onOpen={(row) =>
                row.id !== null &&
                open({ kind: "payrollPosition", positionId: row.id, label: row.name })
              }
              onOpenAll={() => open({ kind: "payrollPositions", label: null })}
            />
          </GridItem>
          <GridItem span={12}>
            <EmployeesBlock
              payroll={payroll}
              period={period}
              fallback={payrollFallback}
              onOpen={(employee) =>
                open({ kind: "employee", userId: employee.userId, label: employee.name })
              }
            />
          </GridItem>
        </Grid>
      </Section>

      <Section title={t("rso.section.finance")}>
        <Grid>
          <GridItem span={8}>
            <CashTrendChart
              lines={computed?.cash ?? null}
              period={period}
              nettoHint={vat === "Netto"}
              fallback={fallback((computed?.cash.length ?? 0) > 0)}
              onOpen={(key) =>
                period &&
                open({ kind: "metric", metricId: "cashProfit" }, { type: period.type, key })
              }
            />
          </GridItem>
          <GridItem span={4} wide>
            <PeriodSummary
              lines={computed?.summary ?? null}
              fallback={fallback(Boolean(computed?.summary))}
              onOpen={(line) =>
                line.open &&
                open(line.open === "payroll" ? PAYROLL : { kind: "metric", metricId: line.open })
              }
            />
          </GridItem>
          <GridItem span={12}>
            <ExpensesStructure
              lines={computed?.expenses ?? null}
              period={period}
              vat={vat}
              fallback={fallback(true)}
              onOpen={() => open({ kind: "metric", metricId: "expense" })}
            />
          </GridItem>
        </Grid>
      </Section>
    </>
  );
});
