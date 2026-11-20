import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Period, VatMode } from "@Rso/entities/rso/api/contract";
import type { CarLine, CarsData, MarkLine } from "@Rso/entities/rso/lib/sales";
import { downloadCsv } from "@Rso/shared/lib/csv";
import {
  DASH,
  formatCsvNumber,
  formatMoney,
  formatNumber,
  formatPct,
} from "@Rso/shared/lib/format";
import { useCollapsedRows } from "@Rso/shared/lib/useCollapsedRows";
import { useTableSort } from "@Rso/shared/lib/useTableSort";
import { Card } from "@Rso/shared/ui/Card/Card";
import { Collapsible } from "@Rso/shared/ui/Collapsible/Collapsible";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { HBarList } from "@Rso/shared/ui/HBarList/HBarList";
import { Segmented } from "@Rso/shared/ui/Segmented/Segmented";
import { csvHeaders, csvName } from "@Rso/shared/lib/csvName";
import styles from "./SalesBlocks.module.css";

// Баров над таблицей — топ-10, остальное в таблице
const TOP_BARS = 10;
// Таблица свёрнута до первых строк, остальное — по «Показать все»
const PREVIEW_ROWS = 5;

type CarsView = "models" | "marks";

interface TopCarsProps {
  data: CarsData | null;
  // null — периода ещё нет, выгрузка недоступна
  period: Period | null;
  vat: VatMode;
  fallback?: ReactNode;
  onOpenMark?: (mark: MarkLine) => void;
  onOpenModel?: (model: CarLine) => void;
}

const EMPTY_MODELS: CarLine[] = [];
const EMPTY_MARKS: MarkLine[] = [];

// Топ моделей и марок по обороту (§ЗК 3.4). Строки cars — не весь автопарк,
// поэтому под таблицей всегда видно покрытие
export function TopCars({ data, period, vat, fallback, onOpenMark, onOpenModel }: TopCarsProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<CarsView>("models");

  const modelName = (line: CarLine) =>
    [line.markName, line.modelName].filter(Boolean).join(" ") || DASH;
  const year = (value: number) => (value > 0 ? String(value) : t("rso.sales.cars.yearUnknown"));

  const modelColumns: DataTableColumn<CarLine>[] = [
    { key: "mark", label: t("rso.col.mark"), sortable: true, render: (l) => l.markName ?? DASH },
    {
      key: "model",
      label: t("rso.col.model"),
      grow: true,
      sortable: true,
      render: (l) => l.modelName ?? DASH,
    },
    ...(data?.hasYears
      ? [
          {
            key: "year",
            label: t("rso.col.year"),
            sortable: true,
            render: (l: CarLine) => year(l.carYear),
          },
        ]
      : []),
    {
      key: "accounts",
      label: t("rso.col.visits"),
      align: "right",
      sortable: true,
      render: (l) => formatNumber(l.accounts),
    },
    {
      key: "turnover",
      label: t("rso.col.turnover"),
      align: "right",
      sortable: true,
      render: (l) => formatMoney(l.turnover),
    },
    {
      key: "avgCheck",
      label: t("rso.col.avgCheck"),
      align: "right",
      sortable: true,
      render: (l) => formatMoney(l.avgCheck),
    },
    {
      key: "share",
      label: t("rso.col.revenueShare"),
      align: "right",
      sortable: true,
      render: (l) => formatPct(l.revenueShare),
    },
  ];

  const markColumns: DataTableColumn<MarkLine>[] = [
    {
      key: "mark",
      label: t("rso.col.mark"),
      grow: true,
      sortable: true,
      render: (l) => l.markName ?? DASH,
    },
    {
      key: "models",
      label: t("rso.col.models"),
      align: "right",
      sortable: true,
      render: (l) => formatNumber(l.models),
    },
    {
      key: "accounts",
      label: t("rso.col.visits"),
      align: "right",
      sortable: true,
      render: (l) => formatNumber(l.accounts),
    },
    {
      key: "turnover",
      label: t("rso.col.turnover"),
      align: "right",
      sortable: true,
      render: (l) => formatMoney(l.turnover),
    },
    {
      key: "avgCheck",
      label: t("rso.col.avgCheck"),
      align: "right",
      sortable: true,
      render: (l) => formatMoney(l.avgCheck),
    },
    {
      key: "share",
      label: t("rso.col.revenueShare"),
      align: "right",
      sortable: true,
      render: (l) => formatPct(l.revenueShare),
    },
  ];

  const models = useTableSort(
    data?.models ?? EMPTY_MODELS,
    {
      mark: (l) => l.markName,
      model: (l) => l.modelName,
      year: (l) => l.carYear,
      accounts: (l) => l.accounts,
      turnover: (l) => l.turnover,
      avgCheck: (l) => l.avgCheck,
      share: (l) => l.revenueShare,
    },
    { key: "turnover", order: -1 },
  );
  const marks = useTableSort(
    data?.marks ?? EMPTY_MARKS,
    {
      mark: (l) => l.markName,
      models: (l) => l.models,
      accounts: (l) => l.accounts,
      turnover: (l) => l.turnover,
      avgCheck: (l) => l.avgCheck,
      share: (l) => l.revenueShare,
    },
    { key: "turnover", order: -1 },
  );
  const modelRows = useCollapsedRows(models.rows, PREVIEW_ROWS);
  const markRows = useCollapsedRows(marks.rows, PREVIEW_ROWS);
  const collapse = view === "models" ? modelRows : markRows;

  const exportCsv = () => {
    if (!period) return;
    if (view === "models") {
      downloadCsv(
        csvName("sales", "cars", period, vat),
        csvHeaders(modelColumns, ["turnover", "avgCheck"], t(`rso.vat.${vat}`)),
        models.rows.map((l) => [
          l.markName ?? "",
          l.modelName ?? "",
          ...(data?.hasYears ? [year(l.carYear)] : []),
          formatCsvNumber(l.accounts),
          formatCsvNumber(l.turnover),
          formatCsvNumber(l.avgCheck),
          formatCsvNumber(l.revenueShare),
        ]),
      );
    } else {
      downloadCsv(
        csvName("sales", "marks", period, vat),
        csvHeaders(markColumns, ["turnover", "avgCheck"], t(`rso.vat.${vat}`)),
        marks.rows.map((l) => [
          l.markName ?? "",
          formatCsvNumber(l.models),
          formatCsvNumber(l.accounts),
          formatCsvNumber(l.turnover),
          formatCsvNumber(l.avgCheck),
          formatCsvNumber(l.revenueShare),
        ]),
      );
    }
  };

  const card = (content: ReactNode) => (
    <Card
      title={t("rso.block.topCars.title")}
      subtitle={t("rso.block.topCars.subtitle")}
      actions={
        <div className={styles.actions}>
          <Segmented<CarsView>
            tone="card"
            label={t("rso.block.topCars.title")}
            value={view}
            options={[
              { value: "models", label: t("rso.sales.cars.models") },
              { value: "marks", label: t("rso.sales.cars.marks") },
            ]}
            onChange={setView}
          />
          <button
            type="button"
            className={styles.actionButton}
            onClick={exportCsv}
            disabled={!data || !period || Boolean(fallback)}
          >
            {t("rso.drill.exportCsv")}
          </button>
        </div>
      }
    >
      {content}
    </Card>
  );

  if (fallback || !data) return card(fallback);

  const bars =
    view === "models"
      ? data.models.slice(0, TOP_BARS).map((l) => ({
          key: l.key,
          label: modelName(l),
          value: l.turnover,
          caption: `${formatMoney(l.turnover)} · ${formatNumber(l.accounts)} ${t("rso.unit.visitsShort")}`,
        }))
      : data.marks.slice(0, TOP_BARS).map((l) => ({
          key: String(l.markId),
          label: l.markName ?? DASH,
          value: l.turnover,
          caption: `${formatMoney(l.turnover)} · ${formatNumber(l.accounts)} ${t("rso.unit.visitsShort")}`,
        }));

  const select = (key: string) => {
    if (view === "models") {
      const line = data.models.find((item) => item.key === key);
      if (line) onOpenModel?.(line);
    } else {
      const line = data.marks.find((item) => String(item.markId) === key);
      if (line) onOpenMark?.(line);
    }
  };

  return card(
    <div className={styles.stack}>
      <HBarList items={bars} onSelect={select} />
      <div className={styles.tableBleed}>
        <Collapsible
          collapsed={collapse.collapsed}
          collapsible={collapse.collapsible}
          total={collapse.total}
          onToggle={collapse.toggle}
        >
          {view === "models" ? (
            <DataTable<CarLine>
              columns={modelColumns}
              rows={modelRows.rows}
              getRowKey={(l) => l.key}
              onRowClick={onOpenModel}
              sort={models.sort}
              onSort={models.onSort}
            />
          ) : (
            <DataTable<MarkLine>
              columns={markColumns}
              rows={markRows.rows}
              getRowKey={(l) => String(l.markId)}
              onRowClick={onOpenMark}
              sort={marks.sort}
              onSort={marks.onSort}
            />
          )}
        </Collapsible>
      </div>
      <p className={styles.footnote}>
        {t("rso.sales.cars.coverage", {
          count: data.models.length,
          accounts: formatNumber(data.coverage.accounts),
          total: formatNumber(data.coverage.totalAccounts),
          share: formatPct(data.coverage.revenueShare),
        })}
      </p>
    </div>,
  );
}
