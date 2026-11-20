import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import type { AccountRow, Period } from "@Rso/entities/rso/api/contract";
import { formatPeriodLabel } from "@Rso/entities/rso/lib/period";
import { departmentRows, turnoverGroup } from "@Rso/entities/rso/lib/sales";
import { pick, finite, ratio } from "@Rso/entities/rso/lib/money";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { formatHours, formatMoney, formatNumber } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { KpiCard } from "@Rso/shared/ui/KpiCard/KpiCard";
import { drillStore, type DrillNode } from "../../model/drillStore";
import type { DrillTarget } from "../../model/targets";
import { AccountsGate, DashboardGate } from "./gates";
import { DepartmentMismatch } from "./DepartmentMismatch";
import { SliceDayAccounts, SliceDays } from "./SliceAccounts";
import styles from "../DrillDrawer.module.css";

type DepartmentTarget = Extract<DrillTarget, { kind: "department" }>;

interface DepartmentViewProps {
  target: DepartmentTarget;
  node: DrillNode;
}

interface ChildRow {
  period: Period;
  turnover: number | null;
  accounts: number | null;
  hours: number | null;
}

// В ЗН нет ID отдела — сопоставление по названию (оба обрезаны в normalize)
const matchDepartment = (name: string | null) => (row: AccountRow) =>
  (row.DEPARTMENT_NAME ?? null) === name;

const matchAll = () => true;

// По turnoverAndIncome у отдела есть ЗН, а в списке ЗН месяца нет ни одного с его
// названием — название не совпало с данными ЗН. Отдел без ЗН за период (accounts = 0)
// и неизвестное число ЗН (ответ ещё не загружен) несовпадением не считаются
const isMismatch = (
  rows: readonly AccountRow[],
  match: (row: AccountRow) => boolean,
  departmentAccounts: number | null,
) => departmentAccounts !== null && departmentAccounts > 0 && rows.length > 0 && !rows.some(match);

// Отдел: показатели из turnoverAndIncome → дочерние периоды или дни → ЗН отдела
export const DepartmentView = observer(function DepartmentView({
  target,
  node,
}: DepartmentViewProps) {
  const { t } = useTranslation();
  const vat = filtersStore.vat;
  const { period } = node;
  const match = matchDepartment(target.label);
  const preset = target.label ? { department: target.label } : undefined;

  if (node.day) {
    const day = node.day;
    // Число ЗН отдела за месяц — из ответа DashboardRSO уровня (загружается вместе с узлом)
    const departmentAccounts =
      departmentRows(drillStore.dashboard(period)?.data, period, vat)?.rows.find(
        (item) => item.id === target.id,
      )?.accounts ?? null;
    return (
      <AccountsGate period={period}>
        {(rows) =>
          isMismatch(rows, match, departmentAccounts) ? (
            <>
              <DepartmentMismatch
                department={target.label}
                accountDepartments={rows.map((row) => row.DEPARTMENT_NAME)}
              />
              <SliceDayAccounts period={period} day={day} rows={rows} match={matchAll} />
            </>
          ) : (
            <SliceDayAccounts period={period} day={day} rows={rows} match={match} preset={preset} />
          )
        }
      </AccountsGate>
    );
  }

  return (
    <DashboardGate period={period}>
      {(data) => {
        const row = departmentRows(data, period, vat)?.rows.find((item) => item.id === target.id);
        const tiles = (
          <div className={styles.tiles}>
            <KpiCard
              label={t("rso.col.turnover")}
              value={row?.turnover ?? null}
              format={formatMoney}
              delta={row?.delta ?? null}
            />
            <KpiCard
              label={t("rso.kpi.accountCount.label")}
              value={row?.accounts ?? null}
              format={formatNumber}
            />
            <KpiCard
              label={t("rso.col.avgCheck")}
              value={row?.avgCheck ?? null}
              format={formatMoney}
            />
            <KpiCard
              label={t("rso.col.normHours")}
              value={row?.hours ?? null}
              format={formatHours}
            />
          </div>
        );

        if (period.type === "M") {
          return (
            <>
              {tiles}
              <AccountsGate period={period}>
                {(rows) =>
                  isMismatch(rows, match, row?.accounts ?? null) ? (
                    <>
                      <DepartmentMismatch
                        department={target.label}
                        accountDepartments={rows.map((row) => row.DEPARTMENT_NAME)}
                      />
                      <SliceDays period={period} rows={rows} />
                    </>
                  ) : (
                    <SliceDays period={period} rows={rows.filter(match)} />
                  )
                }
              </AccountsGate>
            </>
          );
        }

        // Квартал / год: дочерние периоды из ответа за последний дочерний период
        const source = drillStore.childrenSource(period);
        const children = drillStore.children(period);
        return (
          <>
            {tiles}
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h3 className={styles.sectionTitle}>
                  {t(period.type === "Y" ? "rso.drill.byQuarters" : "rso.drill.byMonths")}
                </h3>
                <span className={styles.sectionHint}>{t("rso.drill.clickHint")}</span>
              </div>
              {!source || children.length === 0 ? (
                <BlockState kind="empty" message={t("rso.drill.noChildren")} />
              ) : (
                <DashboardGate period={source}>
                  {(childData) => {
                    const rows: ChildRow[] = children.map((child) => {
                      const item = turnoverGroup(childData, child).find(
                        (r) => r.DEPARTMENT_ID === target.id,
                      );
                      return {
                        period: child,
                        turnover: item ? pick(item, "TURNOVER_TOTAL", vat) : null,
                        accounts: item ? finite(item.ACCOUNT_COUNT) : null,
                        hours: item ? finite(item.NORM_HOUR) : null,
                      };
                    });
                    const columns: DataTableColumn<ChildRow>[] = [
                      {
                        key: "period",
                        label: t("rso.drill.period"),
                        grow: true,
                        render: (r) => formatPeriodLabel(r.period),
                      },
                      {
                        key: "turnover",
                        label: t("rso.col.turnover"),
                        align: "right",
                        render: (r) => formatMoney(r.turnover),
                      },
                      {
                        key: "accounts",
                        label: t("rso.col.accountCount"),
                        align: "right",
                        render: (r) => formatNumber(r.accounts),
                      },
                      {
                        key: "avg",
                        label: t("rso.col.avgCheck"),
                        align: "right",
                        render: (r) => formatMoney(ratio(r.turnover, r.accounts)),
                      },
                      {
                        key: "hours",
                        label: t("rso.col.normHours"),
                        align: "right",
                        render: (r) => formatHours(r.hours),
                      },
                    ];
                    return (
                      <DataTable<ChildRow>
                        columns={columns}
                        rows={rows}
                        getRowKey={(r) => String(r.period.key)}
                        onRowClick={(r) => drillStore.push({ period: r.period })}
                      />
                    );
                  }}
                </DashboardGate>
              )}
            </section>
          </>
        );
      }}
    </DashboardGate>
  );
});
