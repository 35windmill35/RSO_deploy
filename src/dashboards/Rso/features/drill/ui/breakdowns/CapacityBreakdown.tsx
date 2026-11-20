import { useTranslation } from "react-i18next";
import { formatHours, formatNumber, formatPct } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable } from "@Rso/shared/ui/DataTable/DataTable";
import { companyCapacity } from "../../model/breakdowns";
import { BreakdownSection } from "./BreakdownSection";
import type { BreakdownProps } from "./types";

interface CapacityLine {
  key: string;
  value: string;
}

// Загрузка ремзоны по компании: доступные, записанные и проданные часы, посты
export function CapacityBreakdown({ data }: BreakdownProps) {
  const { t } = useTranslation();
  const capacity = companyCapacity(data);

  const rows: CapacityLine[] = capacity
    ? [
        { key: "available", value: formatHours(capacity.AVAILABLE_HOURS) },
        { key: "booked", value: formatHours(capacity.BOOKED_HOURS) },
        { key: "sold", value: formatHours(capacity.SOLD_HOURS) },
        { key: "load", value: formatPct(capacity.LOAD_PCT) },
        {
          key: "posts",
          value: t("rso.drill.postsValue", {
            posts: formatNumber(capacity.POST_COUNT),
            stations: formatNumber(capacity.STATION_COUNT),
          }),
        },
      ]
    : [];

  return (
    <BreakdownSection title={t("rso.drill.capacityTitle")}>
      {rows.length === 0 ? (
        <BlockState kind="empty" />
      ) : (
        <DataTable<CapacityLine>
          columns={[
            {
              key: "label",
              label: t("rso.drill.indicator"),
              grow: true,
              render: (r) => t(`rso.drill.capacity.${r.key}`),
            },
            { key: "value", label: t("rso.drill.value"), align: "right", render: (r) => r.value },
          ]}
          rows={rows}
          getRowKey={(r) => r.key}
        />
      )}
    </BreakdownSection>
  );
}
