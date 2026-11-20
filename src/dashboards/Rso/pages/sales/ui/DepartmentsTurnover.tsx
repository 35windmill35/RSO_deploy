import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Period, VatMode } from "@Rso/entities/rso/api/contract";
import type { DepartmentRow, DepartmentsData } from "@Rso/entities/rso/lib/sales";
import {
  DASH,
  deltaTone,
  formatCsvNumber,
  formatDelta,
  formatHours,
  formatMoney,
  formatNumber,
  formatPct,
} from "@Rso/shared/lib/format";
import { downloadCsv } from "@Rso/shared/lib/csv";
import { Card } from "@Rso/shared/ui/Card/Card";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { HBarList } from "@Rso/shared/ui/HBarList/HBarList";
import { useTableSort } from "@Rso/shared/lib/useTableSort";
import { csvHeaders, csvName } from "@Rso/shared/lib/csvName";
import styles from "./SalesBlocks.module.css";

interface DepartmentsTurnoverProps {
  data: DepartmentsData | null;
  // null — периода ещё нет, выгрузка недоступна
  period: Period | null;
  vat: VatMode;
  // Состояние вместо данных: загрузка, ошибка, пусто
  fallback?: ReactNode;
  onOpen?: (row: DepartmentRow) => void;
}

const EMPTY: DepartmentRow[] = [];

// Оборот по отделам: бары + таблица с итогом (§ЗК 3.1)
export function DepartmentsTurnover({
  data,
  period,
  vat,
  fallback,
  onOpen,
}: DepartmentsTurnoverProps) {
  const { t } = useTranslation();

  const delta = (value: number | null | undefined) => {
    if (value === undefined)
      return <span className={styles.neutral}>{t("rso.sales.delta.new")}</span>;
    const text = formatDelta(value);
    return text ? <span className={styles[deltaTone(value)]}>{text}</span> : DASH;
  };

  const columns: DataTableColumn<DepartmentRow>[] = [
    {
      key: "name",
      label: t("rso.col.department"),
      grow: true,
      sortable: true,
      render: (r) => r.name ?? DASH,
    },
    {
      key: "turnover",
      label: t("rso.col.turnover"),
      align: "right",
      sortable: true,
      render: (r) => formatMoney(r.turnover),
    },
    {
      key: "share",
      label: t("rso.col.share"),
      align: "right",
      sortable: true,
      render: (r) => formatPct(r.share),
    },
    {
      key: "delta",
      label: t("rso.col.deltaPrev"),
      align: "right",
      sortable: true,
      render: (r) => delta(r.delta),
    },
    {
      key: "accounts",
      label: t("rso.col.accountCount"),
      align: "right",
      sortable: true,
      render: (r) => formatNumber(r.accounts),
    },
    {
      key: "avgCheck",
      label: t("rso.col.avgCheck"),
      align: "right",
      sortable: true,
      render: (r) => formatMoney(r.avgCheck),
    },
    {
      key: "hours",
      label: t("rso.col.normHours"),
      align: "right",
      sortable: true,
      render: (r) => formatHours(r.hours),
    },
    {
      key: "perHour",
      label: t("rso.col.turnoverPerHour"),
      align: "right",
      sortable: true,
      render: (r) => formatMoney(r.turnoverPerHour),
    },
  ];

  const table = useTableSort(
    data?.rows ?? EMPTY,
    {
      name: (r) => r.name,
      turnover: (r) => r.turnover,
      share: (r) => r.share,
      delta: (r) => r.delta,
      accounts: (r) => r.accounts,
      avgCheck: (r) => r.avgCheck,
      hours: (r) => r.hours,
      perHour: (r) => r.turnoverPerHour,
    },
    { key: "turnover", order: -1 },
  );

  const exportCsv = () => {
    if (!data || !period) return;
    const line = (r: Omit<DepartmentRow, "id" | "name">, name: string) => [
      name,
      formatCsvNumber(r.turnover),
      formatCsvNumber(r.share),
      r.delta === undefined ? t("rso.sales.delta.new") : formatCsvNumber(r.delta),
      formatCsvNumber(r.accounts),
      formatCsvNumber(r.avgCheck),
      formatCsvNumber(r.hours),
      formatCsvNumber(r.turnoverPerHour),
    ];
    downloadCsv(
      csvName("sales", "departments", period, vat),
      csvHeaders(columns, ["turnover", "avgCheck", "perHour"], t(`rso.vat.${vat}`)),
      [...table.rows.map((r) => line(r, r.name ?? "")), line(data.total, t("rso.drill.total"))],
    );
  };

  const card = (content: ReactNode) => (
    <Card
      title={t("rso.block.turnoverByDept.title")}
      subtitle={t("rso.block.turnoverByDept.subtitle")}
      actions={
        <button
          type="button"
          className={styles.actionButton}
          onClick={exportCsv}
          disabled={!data || !period || Boolean(fallback)}
        >
          {t("rso.drill.exportCsv")}
        </button>
      }
    >
      {content}
    </Card>
  );

  if (fallback || !data) return card(fallback);

  const { total } = data;
  const footer = (
    <tr>
      <td>{t("rso.drill.total")}</td>
      <td className={styles.num}>{formatMoney(total.turnover)}</td>
      <td className={styles.num}>{formatPct(total.share)}</td>
      <td className={styles.num}>{delta(total.delta)}</td>
      <td className={styles.num}>{formatNumber(total.accounts)}</td>
      <td className={styles.num}>{formatMoney(total.avgCheck)}</td>
      <td className={styles.num}>{formatHours(total.hours)}</td>
      <td className={styles.num}>{formatMoney(total.turnoverPerHour)}</td>
    </tr>
  );

  return card(
    <div className={styles.stack}>
      <HBarList
        items={data.rows.map((row) => ({
          key: String(row.id),
          label: row.name ?? DASH,
          value: row.turnover,
          caption: `${formatMoney(row.turnover)} · ${formatPct(row.share)}`,
        }))}
        onSelect={
          onOpen
            ? (key) => {
                const row = data.rows.find((item) => String(item.id) === key);
                if (row) onOpen(row);
              }
            : undefined
        }
      />
      <div className={styles.tableBleed}>
        <DataTable<DepartmentRow>
          columns={columns}
          rows={table.rows}
          getRowKey={(row) => String(row.id)}
          onRowClick={onOpen}
          footer={footer}
          sort={table.sort}
          onSort={table.onSort}
        />
      </div>
    </div>,
  );
}
