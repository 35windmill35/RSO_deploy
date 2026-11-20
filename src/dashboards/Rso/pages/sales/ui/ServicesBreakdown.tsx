import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
import type { AccountRow, Period, VatMode } from "@Rso/entities/rso/api/contract";
import { formatPeriodLabel } from "@Rso/entities/rso/lib/period";
import { groupAccounts, type AccountsSlice, type SliceRow } from "@Rso/entities/rso/lib/sales";
import { accountsCache } from "@Rso/entities/rso/model/accountsCache";
import { availableMonths } from "@Rso/entities/rso/model/periodMonths";
import { CHART_ANIMATION, CHART_COLOR, SERIES_COLORS } from "@Rso/shared/lib/chartTheme";
import { downloadCsv } from "@Rso/shared/lib/csv";
import { formatCsvNumber, formatMoney, formatNumber, formatPct } from "@Rso/shared/lib/format";
import { useInViewport } from "@Rso/shared/lib/useInViewport";
import { useTableSort } from "@Rso/shared/lib/useTableSort";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { Card } from "@Rso/shared/ui/Card/Card";
import { ChartTooltip } from "@Rso/shared/ui/chart/ChartTooltip";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { Segmented } from "@Rso/shared/ui/Segmented/Segmented";
import { csvHeaders, csvName } from "@Rso/shared/lib/csvName";
import styles from "./SalesBlocks.module.css";

// В кольце — топ по числу цветов рядов и «Прочие»
const TOP = SERIES_COLORS.length;
// Ключ строки «Прочие»: у вида услуги такого названия быть не может
const OTHERS_KEY = "__others__";

interface ServicesBreakdownProps {
  dbIndex: number;
  period: Period;
  vat: VatMode;
  // Выручка периода из summary — для сверки с оборотом по ЗН
  revenue: number | null;
  onOpen?: (slice: AccountsSlice, name: string | null) => void;
}

// Виды услуг (типы ЗН) и формы оплаты по списку заказ-нарядов (DashboardRSOAccounts).
// ЗН отдаются только помесячно: месяц и квартал грузятся, когда блок виден, год — по кнопке.
export const ServicesBreakdown = observer(function ServicesBreakdown({
  dbIndex,
  period,
  vat,
  revenue,
  onOpen,
}: ServicesBreakdownProps) {
  const { t } = useTranslation();
  const { ref, seen } = useInViewport<HTMLDivElement>();
  const [slice, setSlice] = useState<AccountsSlice>("accountType");
  // Год — 12 месяцев запросов, только по явному действию. Компонент
  // пересоздаётся при смене периода (key на странице), флаг сбрасывается сам
  const [yearRequested, setYearRequested] = useState(false);

  const months = availableMonths(period);
  const monthKeys = months.map((month) => month.key).join(",");
  const shouldLoad = seen && (period.type !== "Y" || yearRequested);

  useEffect(() => {
    if (!shouldLoad || !monthKeys) return;
    monthKeys.split(",").forEach((key) => accountsCache.ensure(dbIndex, Number(key)));
  }, [shouldLoad, monthKeys, dbIndex]);

  const resources = months.map((month) => ({
    month,
    resource: accountsCache.get(dbIndex, month.key),
  }));
  const done = resources.filter(({ resource }) => resource?.status === "ready");
  const failed = resources.filter(({ resource }) => resource?.status === "error");
  const loading = resources.some(({ resource }) => !resource || resource.status === "loading");

  // Группировка — один проход по ЗН (до нескольких тысяч за год), без мемоизации
  const rows: AccountRow[] = done.flatMap(({ resource }) => resource?.data ?? []);
  const lines = groupAccounts(rows, slice, vat);
  const accountsTurnover = lines.reduce((sum, line) => sum + line.turnover, 0);

  const nameOf = (line: SliceRow) => line.name ?? t("rso.sales.services.unknown");

  const columns: DataTableColumn<SliceRow>[] = [
    {
      key: "name",
      label: t(
        slice === "accountType" ? "rso.sales.services.byType" : "rso.sales.services.byPayment",
      ),
      grow: true,
      sortable: true,
      render: nameOf,
    },
    {
      key: "accounts",
      label: t("rso.col.accountCount"),
      align: "right",
      sortable: true,
      render: (line) => formatNumber(line.accounts),
    },
    {
      key: "turnover",
      label: t("rso.col.turnover"),
      align: "right",
      sortable: true,
      render: (line) => formatMoney(line.turnover),
    },
    {
      key: "share",
      label: t("rso.col.share"),
      align: "right",
      sortable: true,
      render: (line) => formatPct(line.share),
    },
    {
      key: "avgCheck",
      label: t("rso.col.avgCheck"),
      align: "right",
      sortable: true,
      render: (line) => formatMoney(line.avgCheck),
    },
  ];
  const table = useTableSort(
    lines,
    {
      name: (line) => line.name,
      accounts: (line) => line.accounts,
      turnover: (line) => line.turnover,
      share: (line) => line.share,
      avgCheck: (line) => line.avgCheck,
    },
    { key: "turnover", order: -1 },
  );

  const exportCsv = () =>
    downloadCsv(
      csvName("sales", slice === "accountType" ? "services" : "payments", period, vat),
      csvHeaders(columns, ["turnover", "avgCheck"], t(`rso.vat.${vat}`)),
      table.rows.map((line) => [
        nameOf(line),
        formatCsvNumber(line.accounts),
        formatCsvNumber(line.turnover),
        formatCsvNumber(line.share),
        formatCsvNumber(line.avgCheck),
      ]),
    );

  const retry = () => failed.forEach(({ month }) => accountsCache.ensure(dbIndex, month.key));

  let content;
  if (months.length === 0) {
    content = <BlockState kind="empty" />;
  } else if (period.type === "Y" && !yearRequested) {
    content = (
      <div className={styles.loadYear}>
        <span>{t("rso.sales.services.yearHint")}</span>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => setYearRequested(true)}
        >
          {t("rso.sales.services.loadYear", { count: months.length })}
        </button>
      </div>
    );
  } else if (loading) {
    content = (
      <BlockState
        kind="loading"
        message={
          months.length > 1
            ? t("rso.sales.services.progress", { done: done.length, total: months.length })
            : undefined
        }
      />
    );
  } else if (done.length === 0) {
    content = <BlockState kind="error" message={failed[0]?.resource?.error} onRetry={retry} />;
  } else {
    const top = lines.slice(0, TOP);
    const restTurnover = lines.slice(TOP).reduce((sum, line) => sum + line.turnover, 0);
    const pie = [
      ...top.map((line, index) => ({
        key: line.name ?? "",
        name: nameOf(line),
        value: line.turnover,
        color: SERIES_COLORS[index],
      })),
      ...(restTurnover > 0
        ? [
            {
              key: OTHERS_KEY,
              name: t("rso.sales.services.others", { count: lines.length - TOP }),
              value: restTurnover,
              color: CHART_COLOR.neutral,
            },
          ]
        : []),
    ];
    const open = (key: string) => {
      if (!onOpen || key === OTHERS_KEY) return;
      onOpen(slice, key || null);
    };

    content = (
      <div className={styles.stack}>
        {failed.length > 0 && (
          <div className={styles.notice} role="alert">
            <span>
              {t("rso.sales.services.partialError", {
                months: failed.map(({ month }) => formatPeriodLabel(month)).join(", "),
              })}
            </span>
            <button type="button" className={styles.actionButton} onClick={retry}>
              {t("rso.block.retry")}
            </button>
          </div>
        )}
        <div className={styles.donutLayout}>
          <div className={styles.donut}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="92%"
                  paddingAngle={1.5}
                  stroke="none"
                  onClick={(entry: { payload?: unknown }) =>
                    open((entry.payload as { key: string } | undefined)?.key ?? OTHERS_KEY)
                  }
                  {...CHART_ANIMATION}
                >
                  {pie.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={(props) => <ChartTooltip {...props} valueFormatter={formatMoney} />}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.donutCenter}>
              <span className={styles.donutValue}>{formatMoney(accountsTurnover)}</span>
              <span className={styles.donutCaption}>
                {t("rso.sales.services.center", { count: rows.length })}
              </span>
            </div>
          </div>
          <ul className={styles.sliceList}>
            {pie.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className={styles.sliceItem}
                  disabled={!onOpen || item.key === OTHERS_KEY}
                  onClick={() => open(item.key)}
                >
                  <span className={styles.swatch} style={{ background: item.color }} />
                  <span className={styles.sliceName} title={item.name}>
                    {item.name}
                  </span>
                  <span className={styles.sliceValue}>{formatMoney(item.value)}</span>
                  <span className={styles.sliceShare}>
                    {formatPct(accountsTurnover > 0 ? (item.value / accountsTurnover) * 100 : null)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.tableBleed}>
          <DataTable<SliceRow>
            columns={columns}
            rows={table.rows}
            getRowKey={(line) => line.name ?? ""}
            onRowClick={onOpen ? (line) => onOpen(slice, line.name) : undefined}
            sort={table.sort}
            onSort={table.onSort}
          />
        </div>
        <p className={styles.footnote}>
          {t("rso.sales.services.total", {
            accounts: formatMoney(accountsTurnover),
            revenue: formatMoney(revenue),
          })}
        </p>
        {revenue !== null &&
          revenue > 0 &&
          Math.abs(accountsTurnover - revenue) / revenue > 0.01 &&
          failed.length === 0 && <p className={styles.footnote}>{t("rso.drill.turnoverHint")}</p>}
      </div>
    );
  }

  return (
    <div ref={ref} className={styles.fill}>
      <Card
        title={t("rso.block.services.title")}
        subtitle={t("rso.block.services.subtitle")}
        actions={
          <div className={styles.actions}>
            <Segmented<AccountsSlice>
              tone="card"
              label={t("rso.block.services.title")}
              value={slice}
              options={[
                { value: "accountType", label: t("rso.sales.services.byType") },
                { value: "paymentType", label: t("rso.sales.services.byPayment") },
              ]}
              onChange={setSlice}
            />
            <button
              type="button"
              className={styles.actionButton}
              onClick={exportCsv}
              disabled={lines.length === 0}
            >
              {t("rso.drill.exportCsv")}
            </button>
          </div>
        }
      >
        {content}
      </Card>
    </div>
  );
});
