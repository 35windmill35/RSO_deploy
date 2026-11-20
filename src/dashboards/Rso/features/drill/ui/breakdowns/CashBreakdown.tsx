import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { formatPeriodLabel } from "@Rso/entities/rso/lib/period";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { formatMoney } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable } from "@Rso/shared/ui/DataTable/DataTable";
import { cashLines, type CashLine } from "@Rso/entities/rso/lib/cash";
import { BreakdownSection } from "./BreakdownSection";
import type { BreakdownProps } from "./types";

// Касса: поступления, выплаты и денежная прибыль по периодам уровня
export const CashBreakdown = observer(function CashBreakdown({ period, data }: BreakdownProps) {
  const { t } = useTranslation();
  const lines = cashLines(data, period, filtersStore.vat);

  return (
    <BreakdownSection title={t("rso.drill.cashTitle")} hint={t("rso.drill.cashHint")}>
      {lines.length === 0 ? (
        <BlockState kind="empty" />
      ) : (
        <DataTable<CashLine>
          columns={[
            {
              key: "period",
              label: t("rso.drill.period"),
              grow: true,
              render: (l) => formatPeriodLabel(l.period),
            },
            {
              key: "in",
              label: t("rso.kpi.cashIn.label"),
              align: "right",
              render: (l) => formatMoney(l.cashIn),
            },
            {
              key: "out",
              label: t("rso.kpi.cashOut.label"),
              align: "right",
              render: (l) => formatMoney(l.cashOut),
            },
            {
              key: "profit",
              label: t("rso.kpi.cashProfit.label"),
              align: "right",
              render: (l) => formatMoney(l.cashProfit),
            },
          ]}
          rows={lines}
          getRowKey={(l) => String(l.period.key)}
        />
      )}
    </BreakdownSection>
  );
});
