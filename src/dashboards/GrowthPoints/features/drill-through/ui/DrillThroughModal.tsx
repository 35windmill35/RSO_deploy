import { Modal } from "@GrowthPoints/shared/ui/Modal/Modal";
import { AsyncBoundary } from "@GrowthPoints/shared/ui/AsyncBoundary/AsyncBoundary";
import { DataTable, type DataTableColumn } from "@GrowthPoints/shared/ui/DataTable/DataTable";
import {
  formatCurrency,
  formatPercent,
  formatHours,
  formatMinutes,
  formatServiceTime,
  cleanName,
  formatShortName,
} from "@GrowthPoints/shared/lib/formatters";
import type { AccountRow } from "@GrowthPoints/entities/dashboard/model/types";
import i18n from "@/APP/i18n";
import { useTranslation } from "react-i18next";

// Модалка со списком ЗН (drill-through). Использовать вместе с
// useDrillThrough — см. пример в этом хуке.
//
// Структура ответа AccountListDashboardGrowingPoints подтверждена на
// реальном стенде 26.07.2026, уточнена 11.08.2026 (см. dashboardApi.js) —
// колонки заданы вручную с человекочитаемыми заголовками и форматированием
// через formatters.js.
const COLUMNS: DataTableColumn<AccountRow>[] = [
  { key: "ACCOUNT_CODE", header: i18n.t("growthPoints.column.accountCode") },
  { key: "DATE_END", header: i18n.t("growthPoints.column.dateEnd") },
  {
    key: "OWNER_NAME",
    header: i18n.t("growthPoints.column.client"),
    wrap: true,
    render: (r) => cleanName(r.OWNER_NAME) || "—",
  },
  {
    key: "MARK_NAME",
    header: i18n.t("growthPoints.column.markModel"),
    render: (r) =>
      [cleanName(r.MARK_NAME), cleanName(r.MODEL_NAME)].filter(Boolean).join(" / ") || "—",
  },
  {
    key: "MASTER_NAME",
    header: i18n.t("growthPoints.column.master"),
    render: (r) => formatShortName(r.MASTER_NAME) || "—",
  },
  {
    key: "MAIN_MECHANIC_NAME",
    header: i18n.t("growthPoints.column.mechanic"),
    render: (r) => formatShortName(r.MAIN_MECHANIC_NAME) || "—",
  },
  {
    key: "SUMMA",
    header: i18n.t("growthPoints.column.summa"),
    render: (r) => formatCurrency(r.SUMMA),
  },
  {
    key: "LABOR_TIME",
    header: i18n.t("growthPoints.column.normhour"),
    render: (r) => formatHours(r.LABOR_TIME),
  },
  {
    key: "SERVICE_TIME_TO_CALC",
    header: i18n.t("growthPoints.column.timeRepaer"),
    render: (r) => formatServiceTime(r.SERVICE_TIME_TO_CALC),
  },
  {
    key: "WASTED_TIME_MIN",
    header: i18n.t("growthPoints.column.wasted"),
    render: (r) => formatMinutes(r.WASTED_TIME_MIN),
  },
  {
    key: "ARTICLE_WORK_RATIO",
    header: i18n.t("growthPoints.column.articleRatio"),
    render: (r) => formatPercent(r.ARTICLE_WORK_RATIO),
  },
  {
    key: "T_FACTOR",
    header: i18n.t("growthPoints.column.tFactor"),
    render: (r) => formatPercent(r.T_FACTOR),
  },
  {
    key: "CARELESS_BILL",
    header: i18n.t("growthPoints.column.careless"),
    align: "center",
    render: (r) =>
      r.CARELESS_BILL ? (
        <span
          title={i18n.t("growthPoints.column.accountCloseError")}
          style={{ color: "var(--color-negative)", fontWeight: 700 }}
        >
          !
        </span>
      ) : (
        "—"
      ),
  },
];

interface DrillThroughModalProps {
  isOpen: boolean;
  title: string;
  accounts: AccountRow[];
  isLoading: boolean;
  error: string | null;
  close: () => void;
}

export function DrillThroughModal({
  isOpen,
  title,
  accounts,
  isLoading,
  error,
  close,
}: DrillThroughModalProps) {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onClose={close} title={title}>
      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && accounts.length === 0}
        emptyMessage={t("growthPoints.column.noAccountForMetka")}
      >
        <DataTable columns={COLUMNS} data={accounts} getRowKey={(row, i) => row.ACCOUNT_ID ?? i} />
      </AsyncBoundary>
    </Modal>
  );
}
