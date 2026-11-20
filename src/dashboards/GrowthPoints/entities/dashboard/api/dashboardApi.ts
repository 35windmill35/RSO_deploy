import { getAuthorized, type QueryParams } from "@/API/requests/httpClient";
import type { Period, PeriodRow, DashboardData, AccountListResult } from "../model/types";

// Период теперь передаётся один из трёх вариантов query-параметром — раньше
// был только PERIOD_YM в пути (/DashboardGrowingPoints/{PeriodYM}), с
// 16.08.2026 бэкенд принимает ровно один из PERIOD_YM / PERIOD_YEAR /
// PERIOD_YQ query-строкой (см. переписку с Бастион). period — объект
// { type: 'month'|'quarter'|'year', value }, см. periodsStore.selectedPeriod.
function periodParams(period: Period | null | undefined): QueryParams {
  if (!period) return {};
  if (period.type === "year") return { PERIOD_YEAR: period.value };
  if (period.type === "quarter") return { PERIOD_YQ: period.value };
  return { PERIOD_YM: period.value };
}

// GET /api-v2/Dashboard/DashboardGrowingPointsPeriods?DBIndex=...
// Реальный путь к данным (проверено на стенде, отличается от ТЗ):
// result.Response.DashboardGrowingPointPeriods.data — массив периодов.
export async function getPeriods(dbIndex: number): Promise<PeriodRow[]> {
  const { data } = await getAuthorized<{ DashboardGrowingPointPeriods?: { data?: PeriodRow[] } }>(
    "/api-v2/Dashboard/DashboardGrowingPointsPeriods",
    {
      params: {
        DBIndex: dbIndex,
        SortBy: "PERIOD_YM",
        SortOrder: 1,
      },
    },
  );

  return data?.DashboardGrowingPointPeriods?.data || [];
}

// GET /api-v2/Dashboard/DashboardGrowingPoints?DBIndex=...&PERIOD_YM=...
// Путь к данным: result.Response.DashboardGrowingPoints — объект с ключами
// run/kpi/kpiPrev/monthly/masters/mastersPrev/mechanics/marks/models/years.
export async function getDashboardData(
  period: Period,
  dbIndex: number,
): Promise<DashboardData | null> {
  const { data } = await getAuthorized<{ DashboardGrowingPoints?: DashboardData }>(
    "/api-v2/Dashboard/DashboardGrowingPoints",
    {
      params: { DBIndex: dbIndex, ...periodParams(period) },
    },
  );

  return data?.DashboardGrowingPoints || null;
}

export interface AccountListOptions {
  filterString?: string;
  filterParam?: Array<string | number>;
  sortBy?: string;
  sortOrder?: number;
  fields?: string;
}

export async function getAccountList(
  period: Period,
  dbIndex: number,
  options: AccountListOptions = {},
): Promise<AccountListResult> {
  const { filterString, filterParam, sortBy, sortOrder, fields } = options;

  const { data } = await getAuthorized<AccountListResult>(
    "/api-v2/Dashboard/AccountListDashboardGrowingPoints",
    {
      params: {
        DBIndex: dbIndex,
        ...periodParams(period),
        FilterString: filterString,
        ...(filterParam
          ? Object.fromEntries(filterParam.map((v, i) => [`FilterParam[${i}]`, v]))
          : {}),
        SortBy: sortBy,
        SortOrder: sortOrder,
        Fields: fields,
      },
    },
  );

  return data;
}
