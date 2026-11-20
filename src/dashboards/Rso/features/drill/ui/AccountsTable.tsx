import { useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import type { AccountRow, Period } from "@Rso/entities/rso/api/contract";
import { pick } from "@Rso/entities/rso/lib/money";
import { formatPeriodLabel } from "@Rso/entities/rso/lib/period";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { downloadCsv } from "@Rso/shared/lib/csv";
import {
  DASH,
  formatCsvNumber,
  formatDate,
  formatMoney,
  formatNumber,
} from "@Rso/shared/lib/format";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import {
  EMPTY_FILTERS,
  accountsTotals,
  distinctValues,
  filterAccounts,
  sortAccounts,
  type AccountFilters,
  type AccountSortKey,
} from "../model/accountsData";
import styles from "./DrillDrawer.module.css";

const PAGE_SIZE = 50;

interface AccountsTableProps {
  rows: AccountRow[];
  period: Period;
  // YYYY-MM-DD или "all"
  day: string;
  // Фильтр, выбранный заранее (срез, с которого открыли панель); его можно снять
  preset?: Partial<AccountFilters>;
}

// Drill-through: список заказ-нарядов. Фильтры, поиск и сортировка — на клиенте
// (серверный FilterString по текстовым полям на стенде падает, см. ТЗ)
export const AccountsTable = observer(function AccountsTable({
  rows,
  period,
  day,
  preset,
}: AccountsTableProps) {
  const { t } = useTranslation();
  const vat = filtersStore.vat;
  const [filters, setFilters] = useState<AccountFilters>(() => ({ ...EMPTY_FILTERS, ...preset }));
  const [sort, setSort] = useState<{ key: AccountSortKey; order: 1 | -1 }>({
    key: "DATE_EVENT",
    order: -1,
  });
  const [page, setPage] = useState(0);

  const options = useMemo(
    () => ({
      department: distinctValues(rows, "DEPARTMENT_NAME"),
      accountType: distinctValues(rows, "ACCOUNT_TYPE_NAME"),
      paymentType: distinctValues(rows, "PAYMENT_TYPE_NAME"),
    }),
    [rows],
  );

  const visible = useMemo(
    () => sortAccounts(filterAccounts(rows, filters), sort.key, sort.order, vat),
    [rows, filters, sort, vat],
  );
  const totals = accountsTotals(visible, vat);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = visible.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const updateFilter = (patch: Partial<AccountFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(0);
  };

  const handleSort = (key: string) => {
    const sortKey = key as AccountSortKey;
    setSort((current) =>
      current.key === sortKey
        ? { key: sortKey, order: current.order === 1 ? -1 : 1 }
        : { key: sortKey, order: sortKey === "TURNOVER" ? -1 : 1 },
    );
  };

  const turnoverLabel = `${t("rso.col.turnover")}, ${t(`rso.vat.${vat}`).toLowerCase()}`;
  const columns: DataTableColumn<AccountRow>[] = [
    {
      key: "ACCOUNT_CODE",
      label: t("rso.drill.accountCode"),
      sortable: true,
      render: (row) => row.ACCOUNT_CODE ?? DASH,
    },
    {
      key: "DATE_EVENT",
      label: t("rso.drill.dateClosed"),
      sortable: true,
      render: (row) => formatDate(row.DATE_EVENT),
    },
    {
      key: "DEPARTMENT_NAME",
      label: t("rso.col.department"),
      sortable: true,
      render: (row) => row.DEPARTMENT_NAME ?? DASH,
    },
    {
      key: "ACCOUNT_TYPE_NAME",
      label: t("rso.drill.accountType"),
      sortable: true,
      grow: true,
      render: (row) => row.ACCOUNT_TYPE_NAME ?? DASH,
    },
    {
      key: "PAYMENT_TYPE_NAME",
      label: t("rso.drill.paymentType"),
      sortable: true,
      render: (row) => row.PAYMENT_TYPE_NAME ?? DASH,
    },
    {
      key: "TURNOVER",
      label: turnoverLabel,
      align: "right",
      sortable: true,
      render: (row) => formatMoney(pick(row, "TURNOVER_TOTAL", vat)),
    },
  ];

  const exportCsv = () => {
    // Имя файла: период или день + режим НДС, чтобы выгрузки не путались
    const suffix = day === "all" ? String(period.key) : day;
    downloadCsv(
      `rso_zn_${suffix}_${vat.toLowerCase()}.csv`,
      columns.map((column) => column.label),
      visible.map((row) => [
        row.ACCOUNT_CODE ?? "",
        formatDate(row.DATE_EVENT),
        row.DEPARTMENT_NAME ?? "",
        row.ACCOUNT_TYPE_NAME ?? "",
        row.PAYMENT_TYPE_NAME ?? "",
        formatCsvNumber(pick(row, "TURNOVER_TOTAL", vat)),
      ]),
    );
  };

  const select = (
    value: string,
    list: string[],
    allLabel: string,
    onChange: (value: string) => void,
  ) => (
    <select
      className={styles.control}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={allLabel}
    >
      <option value="">{allLabel}</option>
      {list.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>
          {t("rso.drill.accountsTitle", { period: formatPeriodLabel(period) })}
        </h3>
        <button
          type="button"
          className={styles.linkButton}
          onClick={exportCsv}
          disabled={visible.length === 0}
        >
          {t("rso.drill.exportCsv")}
        </button>
      </div>

      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.control}
          placeholder={t("rso.drill.searchPlaceholder")}
          value={filters.search}
          onChange={(event) => updateFilter({ search: event.target.value })}
        />
        {select(filters.department, options.department, t("rso.drill.allDepartments"), (v) =>
          updateFilter({ department: v }),
        )}
        {select(filters.accountType, options.accountType, t("rso.drill.allAccountTypes"), (v) =>
          updateFilter({ accountType: v }),
        )}
        {select(filters.paymentType, options.paymentType, t("rso.drill.allPaymentTypes"), (v) =>
          updateFilter({ paymentType: v }),
        )}
      </div>

      <DataTable<AccountRow>
        columns={columns}
        rows={pageRows}
        getRowKey={(row) => String(row.ACCOUNT_ID)}
        emptyText={t("rso.drill.noAccounts")}
        sort={sort}
        onSort={handleSort}
        footer={
          visible.length > 0 ? (
            <tr>
              <td colSpan={columns.length - 1}>
                {t("rso.drill.totalAccounts", { count: formatNumber(totals.count) })}
              </td>
              <td className={styles.totalCell}>{formatMoney(totals.turnover)}</td>
            </tr>
          ) : undefined
        }
      />

      {pageCount > 1 && (
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.linkButton}
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            ←
          </button>
          <span>{t("rso.drill.page", { page: currentPage + 1, total: pageCount })}</span>
          <button
            type="button"
            className={styles.linkButton}
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            →
          </button>
        </div>
      )}
      <p className={styles.footnote}>{t("rso.drill.turnoverHint")}</p>
    </section>
  );
});
