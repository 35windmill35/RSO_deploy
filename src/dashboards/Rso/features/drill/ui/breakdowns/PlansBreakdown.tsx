import { useTranslation } from "react-i18next";
import { summaryOf } from "@Rso/entities/rso/lib/summary";
import { DASH, formatMoney, formatPct } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable } from "@Rso/shared/ui/DataTable/DataTable";
import { planLines, type PlanLine } from "../../model/breakdowns";
import { BreakdownSection } from "./BreakdownSection";
import type { BreakdownProps } from "./types";
import styles from "../DrillDrawer.module.css";

// Выполнение всех планов периода. Суммы всегда с НДС — так считает API
export function PlansBreakdown({ period, data }: BreakdownProps) {
  const { t } = useTranslation();
  const lines = planLines(summaryOf(data, period));

  return (
    <BreakdownSection
      title={t("rso.drill.plansTitle")}
      hint={t("rso.drill.plansHint")}
      note={lines.length > 0 ? t("rso.plan.bruttoNote") : undefined}
    >
      {lines.length === 0 ? (
        <BlockState kind="empty" />
      ) : (
        <DataTable<PlanLine>
          columns={[
            {
              key: "name",
              label: t("rso.drill.plan"),
              grow: true,
              render: (l) => t(`rso.drill.planName.${l.id}`),
            },
            {
              key: "plan",
              label: t("rso.plan.plan"),
              align: "right",
              render: (l) => (l.plan ? formatMoney(l.plan) : t("rso.plan.noPlan")),
            },
            {
              key: "fact",
              label: t("rso.plan.fact"),
              align: "right",
              render: (l) => formatMoney(l.fact),
            },
            {
              key: "pct",
              label: t("rso.drill.completion"),
              align: "right",
              render: (l) => formatPct(l.pct),
            },
            {
              key: "deviation",
              label: t("rso.drill.deviation"),
              align: "right",
              render: (l) =>
                l.deviation === null ? (
                  DASH
                ) : (
                  <span className={l.deviation >= 0 ? styles.positive : styles.negative}>
                    {l.deviation > 0 ? "+" : ""}
                    {formatMoney(l.deviation)}
                  </span>
                ),
            },
          ]}
          rows={lines}
          getRowKey={(l) => l.id}
        />
      )}
    </BreakdownSection>
  );
}
