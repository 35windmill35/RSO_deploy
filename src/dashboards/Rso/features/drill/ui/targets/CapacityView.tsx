import { useTranslation } from "react-i18next";
import type { CapacityRow } from "@Rso/entities/rso/api/contract";
import { capacityRow, capacityView, type CapacityView as View } from "@Rso/entities/rso/lib/sales";
import { DASH, formatHours, formatNumber, formatPct } from "@Rso/shared/lib/format";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { KpiCard } from "@Rso/shared/ui/KpiCard/KpiCard";
import type { DrillNode } from "../../model/drillStore";
import type { DrillTarget } from "../../model/targets";
import { DashboardGate } from "./gates";
import styles from "../DrillDrawer.module.css";

type CapacityTarget = Extract<DrillTarget, { kind: "capacity" }>;

interface CapacityViewProps {
  target: CapacityTarget;
  node: DrillNode;
}

// Ремзона: часы и проценты выбранного отдела или компании + таблица по всем строкам capacity
export function CapacityView({ target, node }: CapacityViewProps) {
  const { t } = useTranslation();

  return (
    <DashboardGate period={node.period}>
      {(data) => {
        const view = capacityView(capacityRow(data, target.departmentId, target.label));
        const rows = (data.capacity ?? [])
          .map((row: CapacityRow) => capacityView(row))
          .filter((row): row is View => row !== null);
        const name = (row: View) =>
          row.departmentId === -1 ? t("rso.sales.capacity.company") : (row.name ?? DASH);
        const columns: DataTableColumn<View>[] = [
          { key: "name", label: t("rso.col.department"), grow: true, render: name },
          {
            key: "available",
            label: t("rso.sales.capacity.available"),
            align: "right",
            render: (r) => formatHours(r.available),
          },
          {
            key: "booked",
            label: t("rso.sales.capacity.booked"),
            align: "right",
            render: (r) => formatHours(r.booked),
          },
          {
            key: "sold",
            label: t("rso.sales.capacity.sold"),
            align: "right",
            render: (r) => formatHours(r.sold),
          },
          {
            key: "load",
            label: t("rso.kpi.loadPct.label"),
            align: "right",
            render: (r) => formatPct(r.loadPct),
          },
          {
            key: "soldPct",
            label: t("rso.kpi.soldHoursPct.label"),
            align: "right",
            render: (r) => formatPct(r.soldPct),
          },
          {
            key: "posts",
            label: t("rso.col.posts"),
            align: "right",
            render: (r) => formatNumber(r.posts),
          },
        ];
        return (
          <>
            <div className={styles.tiles}>
              <KpiCard
                label={t("rso.sales.capacity.available")}
                value={view?.available ?? null}
                format={formatHours}
              />
              <KpiCard
                label={t("rso.kpi.loadPct.label")}
                value={view?.loadPct ?? null}
                format={formatPct}
                note={t("rso.sales.capacity.bookedHours", { value: formatHours(view?.booked) })}
              />
              <KpiCard
                label={t("rso.kpi.soldHoursPct.label")}
                value={view?.soldPct ?? null}
                format={formatPct}
                note={t("rso.sales.capacity.soldHours", { value: formatHours(view?.sold) })}
              />
            </div>
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h3 className={styles.sectionTitle}>{t("rso.drill.byDepartments")}</h3>
              </div>
              <DataTable<View>
                columns={columns}
                rows={rows}
                getRowKey={(r) => String(r.departmentId)}
              />
              <p className={styles.footnote}>{t("rso.sales.capacity.note")}</p>
            </section>
          </>
        );
      }}
    </DashboardGate>
  );
}
