import { useTranslation } from "react-i18next";
import type { StockRow } from "@Rso/entities/rso/api/contract";
import { finite } from "@Rso/entities/rso/lib/money";
import { stockTotals } from "@Rso/entities/rso/lib/sales";
import {
  DASH,
  formatMoney,
  formatNumber,
  formatPct,
  formatSignedCount,
} from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { KpiCard } from "@Rso/shared/ui/KpiCard/KpiCard";
import { drillStore, type DrillNode } from "../../model/drillStore";
import type { DrillTarget } from "../../model/targets";
import { DashboardGate } from "./gates";
import { MovementTable } from "./MovementTable";
import { StockGroupsTable } from "../stock/StockGroupsTable";
import styles from "../DrillDrawer.module.css";

type StockTarget = Extract<
  DrillTarget,
  { kind: "stockGroup" | "warehouse" | "stock" | "stockGroups" }
>;

interface StockViewProps {
  target: StockTarget;
  node: DrillNode;
}

// Карточка группы или склада (§ЗК 7: без позиций) или склад целиком. Суммы — с НДС
export function StockView({ target, node }: StockViewProps) {
  const { t } = useTranslation();

  return (
    <DashboardGate period={node.period}>
      {(data) => {
        if (target.kind === "stock" || target.kind === "stockGroups") {
          const totals = stockTotals(data);
          if (!totals) return <BlockState kind="empty" />;
          const warehouses = data.stockW ?? [];
          const columns: DataTableColumn<StockRow>[] = [
            {
              key: "name",
              label: t("rso.col.warehouse"),
              grow: true,
              render: (r) => r.WAREHOUSE_NAME ?? DASH,
            },
            {
              key: "stockEnd",
              label: t("rso.col.stockEnd"),
              align: "right",
              render: (r) => formatMoney(finite(r.STOCK_END_BRUTTO)),
            },
            {
              key: "profit",
              label: t("rso.col.profit"),
              align: "right",
              render: (r) => formatMoney(finite(r.PROFIT_BRUTTO)),
            },
            {
              key: "markup",
              label: t("rso.col.markup"),
              align: "right",
              render: (r) => formatPct(finite(r.MARKUP_PCT)),
            },
            {
              key: "turnoverPct",
              label: t("rso.col.turnoverPct"),
              align: "right",
              render: (r) => formatPct(finite(r.TURNOVER_PCT)),
            },
          ];
          return (
            <>
              <div className={styles.tiles}>
                <KpiCard
                  label={t("rso.kpi.stockEnd.label")}
                  value={totals.stockEnd}
                  format={formatMoney}
                />
                <KpiCard
                  label={t("rso.kpi.stockProfit.label")}
                  value={totals.profit}
                  format={formatMoney}
                />
                <KpiCard
                  label={t("rso.kpi.stockMarkup.label")}
                  value={totals.markupPct}
                  format={formatPct}
                />
                <KpiCard
                  label={t("rso.kpi.stockTurnover.label")}
                  value={totals.turnoverPct}
                  format={formatPct}
                />
                <KpiCard
                  label={t("rso.kpi.itemsCount.label")}
                  value={totals.items}
                  format={formatNumber}
                  delta={totals.itemsDelta}
                  deltaUnit="count"
                  higherIsBetter={null}
                />
              </div>
              {target.kind === "stockGroups" ? (
                <section className={styles.section}>
                  <div className={styles.sectionHead}>
                    <h3 className={styles.sectionTitle}>{t("rso.block.stockGroups.title")}</h3>
                    <span className={styles.sectionHint}>{t("rso.drill.clickHint")}</span>
                  </div>
                  <StockGroupsTable
                    rows={data.stockG ?? []}
                    onOpen={(r) =>
                      drillStore.pushTarget({
                        kind: "stockGroup",
                        groupId: r.GROUP_ID,
                        label: r.GROUP_NAME,
                      })
                    }
                  />
                </section>
              ) : (
                <section className={styles.section}>
                  <div className={styles.sectionHead}>
                    <h3 className={styles.sectionTitle}>{t("rso.block.stockWarehouses.title")}</h3>
                    <span className={styles.sectionHint}>{t("rso.drill.clickHint")}</span>
                  </div>
                  <DataTable<StockRow>
                    columns={columns}
                    rows={warehouses}
                    getRowKey={(r) => String(r.WAREHOUSE_ID)}
                    onRowClick={(r) =>
                      drillStore.pushTarget({
                        kind: "warehouse",
                        warehouseId: r.WAREHOUSE_ID,
                        label: r.WAREHOUSE_NAME,
                      })
                    }
                  />
                </section>
              )}
            </>
          );
        }

        const row =
          target.kind === "stockGroup"
            ? data.stockG?.find((item) => item.GROUP_ID === target.groupId)
            : data.stockW?.find((item) => item.WAREHOUSE_ID === target.warehouseId);
        if (!row) return <BlockState kind="empty" />;
        const delta = formatSignedCount(finite(row.ITEMS_COUNT_DELTA));
        return (
          <>
            <div className={styles.tiles}>
              <KpiCard
                label={t("rso.col.stockEnd")}
                value={finite(row.STOCK_END_BRUTTO)}
                format={formatMoney}
              />
              <KpiCard
                label={t("rso.col.profit")}
                value={finite(row.PROFIT_BRUTTO)}
                format={formatMoney}
                note={t("rso.sales.stock.saleNote", {
                  sale: formatMoney(finite(row.SHIPMENT_SALE_BRUTTO)),
                })}
              />
              <KpiCard
                label={t("rso.col.markup")}
                value={finite(row.MARKUP_PCT)}
                format={formatPct}
              />
              <KpiCard
                label={t("rso.col.turnoverPct")}
                value={finite(row.TURNOVER_PCT)}
                format={formatPct}
              />
              <KpiCard
                label={t("rso.col.itemsCount")}
                value={finite(row.ITEMS_COUNT_END)}
                format={formatNumber}
                note={delta ? t("rso.kpi.note.itemsDeltaValue", { value: delta }) : undefined}
              />
            </div>
            <MovementTable row={row} />
          </>
        );
      }}
    </DashboardGate>
  );
}
