import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Period, VatMode } from "@Rso/entities/rso/api/contract";
import type { ExpenseLine } from "@Rso/features/drill/model/breakdowns";
import { downloadCsv } from "@Rso/shared/lib/csv";
import { csvHeaders, csvName } from "@Rso/shared/lib/csvName";
import { DASH, formatCsvNumber, formatMoney, formatPct } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { Card } from "@Rso/shared/ui/Card/Card";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { HBarList } from "@Rso/shared/ui/HBarList/HBarList";
import styles from "./StaffBlocks.module.css";

interface ExpensesStructureProps {
  // Статьи расходов со строкой «Прочие расходы» (expenseLines)
  lines: ExpenseLine[] | null;
  period: Period | null;
  vat: VatMode;
  fallback?: ReactNode;
  // Клик по категории или статье — drill метрики «Расходы» (там таблица статей)
  onOpen?: () => void;
}

const OTHER = "other";

// Структура расходов: категории барами, статьи таблицей (ТЗ §12)
export function ExpensesStructure({
  lines,
  period,
  vat,
  fallback,
  onOpen,
}: ExpensesStructureProps) {
  const { t } = useTranslation();

  const categoryName = (category: string | null) =>
    category === null
      ? t("rso.drill.otherExpenses")
      : t(`rso.expenseCategory.${category}`, { defaultValue: category });
  const total = lines?.reduce((sum, line) => sum + (line.amount ?? 0), 0) ?? 0;
  const share = (amount: number | null) =>
    amount !== null && total ? (amount / total) * 100 : null;

  const columns: DataTableColumn<ExpenseLine>[] = [
    {
      key: "category",
      label: t("rso.drill.category"),
      render: (line) => categoryName(line.category),
    },
    {
      key: "article",
      label: t("rso.drill.article"),
      grow: true,
      render: (line) => line.article ?? DASH,
    },
    {
      key: "department",
      label: t("rso.col.department"),
      render: (line) => line.department ?? DASH,
    },
    {
      key: "amount",
      label: t("rso.drill.amount"),
      align: "right",
      render: (line) => formatMoney(line.amount),
    },
    {
      key: "share",
      label: t("rso.col.share"),
      align: "right",
      render: (line) => formatPct(share(line.amount)),
    },
  ];

  const exportCsv = () => {
    if (!lines || !period) return;
    downloadCsv(
      csvName("staff", "expenses", period, vat),
      csvHeaders(columns, ["amount"], t(`rso.vat.${vat}`)),
      [
        ...lines.map((line) => [
          categoryName(line.category),
          line.article ?? "",
          line.department ?? "",
          formatCsvNumber(line.amount),
          formatCsvNumber(share(line.amount)),
        ]),
        [t("rso.drill.total"), "", "", formatCsvNumber(total), formatCsvNumber(total ? 100 : null)],
      ],
    );
  };

  const card = (content: ReactNode) => (
    <Card
      title={t("rso.block.expenses.title")}
      subtitle={t("rso.block.expenses.subtitle")}
      actions={
        <button
          type="button"
          className={styles.actionButton}
          onClick={exportCsv}
          disabled={!lines || lines.length === 0 || !period || Boolean(fallback)}
        >
          {t("rso.drill.exportCsv")}
        </button>
      }
    >
      {content}
    </Card>
  );

  if (fallback || !lines) return card(fallback);
  if (lines.length === 0)
    return card(<BlockState kind="empty" message={t("rso.drill.noExpenses")} />);

  // Категории по сумме ↓, «Прочие расходы» — последней, нейтральным цветом
  const categories = new Map<string, number>();
  lines.forEach((line) => {
    const key = line.category ?? OTHER;
    categories.set(key, (categories.get(key) ?? 0) + (line.amount ?? 0));
  });
  const bars = [...categories.entries()].sort((a, b) =>
    a[0] === OTHER ? 1 : b[0] === OTHER ? -1 : b[1] - a[1],
  );

  const footer = (
    <tr>
      <td colSpan={3}>{t("rso.drill.total")}</td>
      <td className={styles.num}>{formatMoney(total)}</td>
      <td className={styles.num}>{formatPct(total ? 100 : null)}</td>
    </tr>
  );

  return card(
    <div className={styles.stack}>
      <HBarList
        items={bars.map(([key, amount]) => ({
          key,
          label: categoryName(key === OTHER ? null : key),
          value: amount,
          caption: `${formatMoney(amount)} · ${formatPct(share(amount))}`,
          color: key === OTHER ? "var(--rso-neutral)" : undefined,
          negative: amount < 0,
        }))}
        onSelect={onOpen ? () => onOpen() : undefined}
      />
      <div className={styles.tableBleed}>
        <DataTable<ExpenseLine>
          columns={columns}
          rows={lines}
          getRowKey={(line) => line.key}
          onRowClick={onOpen ? () => onOpen() : undefined}
          footer={footer}
        />
      </div>
    </div>,
  );
}
