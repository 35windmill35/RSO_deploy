import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { pick } from "@Rso/entities/rso/lib/money";
import { summaryOf } from "@Rso/entities/rso/lib/summary";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { DASH, formatMoney } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable } from "@Rso/shared/ui/DataTable/DataTable";
import { expenseLines } from "../../model/breakdowns";
import { BreakdownSection } from "./BreakdownSection";
import type { BreakdownProps } from "./types";
import styles from "../DrillDrawer.module.css";

interface AmountLine {
  key: string;
  label: string;
  amount: number | null;
  kind: "plus" | "minus" | "total";
}

const SIGN: Record<AmountLine["kind"], string> = { plus: "+ ", minus: "\u2212 ", total: "= " };

// Операционная прибыль: выручка минус статьи расходов
export const ProfitBreakdown = observer(function ProfitBreakdown({ period, data }: BreakdownProps) {
  const { t } = useTranslation();
  const vat = filtersStore.vat;
  const summary = summaryOf(data, period);

  const lines: AmountLine[] = summary
    ? [
        {
          key: "revenue",
          label: t("rso.kpi.revenue.label"),
          amount: pick(summary, "REVENUE_TOTAL", vat),
          kind: "plus",
        },
        ...expenseLines(data, period, vat).map((line): AmountLine => ({
          key: line.key,
          label:
            line.category === null
              ? t("rso.drill.otherExpenses")
              : `${t(`rso.expenseCategory.${line.category}`, { defaultValue: line.category })}: ${line.article ?? DASH}`,
          amount: line.amount,
          kind: "minus",
        })),
        {
          key: "profit",
          label: t("rso.kpi.operatingProfit.label"),
          amount: pick(summary, "OPERATING_PROFIT", vat),
          kind: "total",
        },
      ]
    : [];

  return (
    <BreakdownSection title={t("rso.drill.profitTitle")} hint={t("rso.drill.profitHint")}>
      {lines.length === 0 ? (
        <BlockState kind="empty" />
      ) : (
        <DataTable<AmountLine>
          columns={[
            {
              key: "label",
              label: t("rso.drill.indicator"),
              grow: true,
              render: (l) => (
                <span className={l.kind === "total" ? styles.strong : undefined}>
                  {SIGN[l.kind]}
                  {l.label}
                </span>
              ),
            },
            {
              key: "amount",
              label: t("rso.drill.amount"),
              align: "right",
              render: (l) => (
                <span className={l.kind === "total" ? styles.strong : undefined}>
                  {formatMoney(l.amount)}
                </span>
              ),
            },
          ]}
          rows={lines}
          getRowKey={(l) => l.key}
        />
      )}
    </BreakdownSection>
  );
});
