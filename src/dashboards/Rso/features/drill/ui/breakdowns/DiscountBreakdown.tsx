import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { DASH, formatMoney, formatPct } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable } from "@Rso/shared/ui/DataTable/DataTable";
import { discountLines, type DiscountLine } from "../../model/breakdowns";
import { BreakdownSection } from "./BreakdownSection";
import type { BreakdownProps } from "./types";

// Скидки по отделам и сегментам клиентов
export const DiscountBreakdown = observer(function DiscountBreakdown({
  period,
  data,
}: BreakdownProps) {
  const { t } = useTranslation();
  const vat = filtersStore.vat;
  const lines = discountLines(data, period, vat);

  return (
    <BreakdownSection
      title={t("rso.drill.discountTitle")}
      note={vat === "Netto" && lines.length > 0 ? t("rso.vat.approxHint") : undefined}
    >
      {lines.length === 0 ? (
        <BlockState kind="empty" />
      ) : (
        <DataTable<DiscountLine>
          columns={[
            {
              key: "department",
              label: t("rso.col.department"),
              grow: true,
              render: (l) => l.department ?? DASH,
            },
            { key: "segment", label: t("rso.drill.segment"), render: (l) => l.segment ?? DASH },
            {
              key: "turnover",
              label: t("rso.col.turnover"),
              align: "right",
              render: (l) => formatMoney(l.turnover),
            },
            {
              key: "discount",
              label: t("rso.drill.discountSum"),
              align: "right",
              render: (l) => formatMoney(l.discount),
            },
            {
              key: "pct",
              label: t("rso.kpi.discount.label"),
              align: "right",
              render: (l) => formatPct(l.discountPct),
            },
          ]}
          rows={lines}
          getRowKey={(l) => l.key}
        />
      )}
    </BreakdownSection>
  );
});
