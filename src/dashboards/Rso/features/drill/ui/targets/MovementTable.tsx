import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { StockRow } from "@Rso/entities/rso/api/contract";
import { stockMovement } from "@Rso/entities/rso/lib/sales";
import { formatMoney } from "@Rso/shared/lib/format";
import { DataTable } from "@Rso/shared/ui/DataTable/DataTable";
import styles from "../DrillDrawer.module.css";

const SIGN = { "=": "", "+": "+ ", "-": "\u2212 " } as const;

// Каскад движения группы или склада: начало + поставки − возвраты − отгрузки = конец
export function MovementTable({ row }: { row: StockRow }) {
  const { t } = useTranslation();
  const { steps, mismatch } = stockMovement(row);

  // Расхождение баланса — разработчику, один раз на строку, а не на каждый рендер
  useEffect(() => {
    if (mismatch !== null && import.meta.env.DEV) {
      console.warn("[rso] stock balance mismatch", {
        group: row.GROUP_ID,
        warehouse: row.WAREHOUSE_ID,
        mismatch,
      });
    }
  }, [row.GROUP_ID, row.WAREHOUSE_ID, mismatch]);

  const lines = [
    ...steps.map((step) => ({
      key: step.id,
      label: `${SIGN[step.sign]}${t(`rso.sales.stock.step.${step.id}`)}`,
      value: formatMoney(step.value),
      strong: step.id === "begin" || step.id === "end",
    })),
    {
      key: "writeoff",
      label: t("rso.sales.stock.writeoff"),
      value: t("rso.sales.stock.writeoffNoData"),
      strong: false,
    },
    ...(mismatch !== null
      ? [
          {
            key: "mismatch",
            label: t("rso.sales.stock.balanceMismatch"),
            value: formatMoney(mismatch),
            strong: true,
          },
        ]
      : []),
  ];
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{t("rso.sales.stock.movement")}</h3>
        <span className={styles.sectionHint}>{t("rso.sales.stock.bruttoNote")}</span>
      </div>
      <DataTable<(typeof lines)[number]>
        columns={[
          {
            key: "label",
            label: t("rso.drill.indicator"),
            grow: true,
            render: (l) => <span className={l.strong ? styles.strong : undefined}>{l.label}</span>,
          },
          {
            key: "value",
            label: t("rso.drill.amount"),
            align: "right",
            render: (l) => <span className={l.strong ? styles.strong : undefined}>{l.value}</span>,
          },
        ]}
        rows={lines}
        getRowKey={(l) => l.key}
      />
    </section>
  );
}
