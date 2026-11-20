import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { carsData, type CarLine } from "@Rso/entities/rso/lib/sales";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { DASH, formatMoney, formatNumber, formatPct } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { KpiCard } from "@Rso/shared/ui/KpiCard/KpiCard";
import { drillStore, type DrillNode } from "../../model/drillStore";
import type { DrillTarget } from "../../model/targets";
import { DashboardGate } from "./gates";
import styles from "../DrillDrawer.module.css";

type CarsTarget = Extract<DrillTarget, { kind: "mark" | "model" }>;

interface CarsViewProps {
  target: CarsTarget;
  node: DrillNode;
}

// Марка → модели; модель → карточка. Списка ЗН нет: в DashboardRSOAccounts нет марки (§ЗК 7)
export const CarsView = observer(function CarsView({ target, node }: CarsViewProps) {
  const { t } = useTranslation();
  const vat = filtersStore.vat;
  const { period } = node;

  return (
    <DashboardGate period={period}>
      {(data) => {
        const cars = carsData(data, period, vat);
        const models = (cars?.models ?? []).filter((line) =>
          target.kind === "mark"
            ? line.markId === target.markId
            : line.markId === target.markId &&
              line.modelId === target.modelId &&
              line.carYear === target.carYear,
        );
        if (models.length === 0) return <BlockState kind="empty" />;
        const accounts = models.reduce((sum, line) => sum + line.accounts, 0);
        const turnover = models.reduce((sum, line) => sum + line.turnover, 0);
        const share = models.reduce((sum, line) => sum + (line.revenueShare ?? 0), 0);

        const columns: DataTableColumn<CarLine>[] = [
          {
            key: "model",
            label: t("rso.col.model"),
            grow: true,
            render: (l) => l.modelName ?? DASH,
          },
          ...(cars?.hasYears
            ? [
                {
                  key: "year",
                  label: t("rso.col.year"),
                  render: (l: CarLine) =>
                    l.carYear > 0 ? String(l.carYear) : t("rso.sales.cars.yearUnknown"),
                },
              ]
            : []),
          {
            key: "department",
            label: t("rso.col.department"),
            render: (l) => l.departmentNames.join(", ") || DASH,
          },
          {
            key: "accounts",
            label: t("rso.col.visits"),
            align: "right",
            render: (l) => formatNumber(l.accounts),
          },
          {
            key: "turnover",
            label: t("rso.col.turnover"),
            align: "right",
            render: (l) => formatMoney(l.turnover),
          },
          {
            key: "avg",
            label: t("rso.col.avgCheck"),
            align: "right",
            render: (l) => formatMoney(l.avgCheck),
          },
        ];

        return (
          <>
            <div className={styles.tiles}>
              <KpiCard label={t("rso.col.visits")} value={accounts} format={formatNumber} />
              <KpiCard label={t("rso.col.turnover")} value={turnover} format={formatMoney} />
              <KpiCard
                label={t("rso.col.avgCheck")}
                value={accounts ? turnover / accounts : null}
                format={formatMoney}
              />
              <KpiCard label={t("rso.col.revenueShare")} value={share} format={formatPct} />
            </div>
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h3 className={styles.sectionTitle}>{t("rso.sales.cars.models")}</h3>
              </div>
              <DataTable<CarLine>
                columns={columns}
                rows={models}
                getRowKey={(l) => l.key}
                onRowClick={
                  target.kind === "mark"
                    ? (l) =>
                        drillStore.pushTarget({
                          kind: "model",
                          markId: l.markId,
                          modelId: l.modelId,
                          carYear: l.carYear,
                          label: [l.markName, l.modelName].filter(Boolean).join(" ") || null,
                        })
                    : undefined
                }
              />
              <p className={styles.footnote}>{t("rso.sales.cars.noAccounts")}</p>
            </section>
          </>
        );
      }}
    </DashboardGate>
  );
});
