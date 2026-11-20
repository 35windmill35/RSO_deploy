import { ApiError, getAuthorized } from "@/API/requests/httpClient";
import { mapWithConcurrencyLimit } from "@Rso/shared/lib/concurrency";
import type { AccountRow, DashboardRsoData, Period, PeriodRow, PeriodType } from "./contract";
import { normalizeAccount, normalizeDashboard } from "./normalize";

interface ListResponse<T> {
  data?: T[];
  totalRecords?: number;
}

function isPeriodType(value: unknown): value is PeriodType {
  return value === "M" || value === "Q" || value === "Y";
}

// GET /api-v2/Dashboard/DashboardRSOPeriods?DBIndex=…
// Ответ: result.Response.RSOPeriodList.data — все периоды M/Q/Y одним списком
export async function getPeriods(dbIndex: number, signal?: AbortSignal): Promise<PeriodRow[]> {
  const { data } = await getAuthorized<{ RSOPeriodList?: ListResponse<PeriodRow> }>(
    "/api-v2/Dashboard/DashboardRSOPeriods",
    { params: { DBIndex: dbIndex }, signal },
  );
  const rows = data?.RSOPeriodList?.data;
  if (!Array.isArray(rows))
    throw new ApiError(-1, "DashboardRSOPeriods: unexpected response", data);
  return rows.filter((row) => isPeriodType(row?.PERIOD_TYPE) && Number.isInteger(row?.PERIOD_KEY));
}

// GET /api-v2/Dashboard/DashboardRSO?DBIndex=…&PERIOD_TYPE=…&PERIOD_KEY=…&PREV_PERIOD_KEY=…
// PREV_PERIOD_KEY — с каким периодом сравнивать prev*-разделы. Равный PERIOD_KEY
// отключает их; без параметра бэкенд сам ищет предыдущий посчитанный.
// Ответ: result.Response.DashboardRSO — все разделы дашборда сразу.
export async function getDashboard(
  dbIndex: number,
  period: Period,
  prevPeriodKey: number,
  signal?: AbortSignal,
): Promise<DashboardRsoData> {
  const { data } = await getAuthorized<{ DashboardRSO?: DashboardRsoData }>(
    "/api-v2/Dashboard/DashboardRSO",
    {
      params: {
        DBIndex: dbIndex,
        PERIOD_TYPE: period.type,
        PERIOD_KEY: period.key,
        PREV_PERIOD_KEY: prevPeriodKey,
      },
      signal,
    },
  );
  const dashboard = data?.DashboardRSO;
  if (!dashboard || typeof dashboard !== "object") {
    throw new ApiError(-1, "DashboardRSO: unexpected response", data);
  }
  return normalizeDashboard(dashboard);
}

// Строк на странице DashboardRSOAccounts — фиксировано бэкендом (select top 200)
const ACCOUNTS_PAGE_SIZE = 200;
// Предохранитель: 50 страниц = 10 000 ЗН за месяц
const ACCOUNTS_MAX_PAGES = 50;
const ACCOUNTS_CONCURRENCY = 3;

interface AccountsPage {
  rows: AccountRow[];
  totalRecords: number | null;
}

// Ответ лежит в ключе RSOPeriodList (как у списка периодов, object = DashRSOAccounts) —
// сверено с реальным ответом стенда
async function fetchAccountsPage(
  dbIndex: number,
  monthKey: number,
  offset: number,
  signal?: AbortSignal,
): Promise<AccountsPage> {
  const { data } = await getAuthorized<{ RSOPeriodList?: ListResponse<AccountRow> }>(
    "/api-v2/Dashboard/DashboardRSOAccounts",
    {
      params: {
        DBIndex: dbIndex,
        PERIOD_TYPE: "M",
        PERIOD_KEY: monthKey,
        OFFSET: offset > 0 ? offset : undefined,
        // Постоянный порядок строк: без него страницы по OFFSET пересекаются
        // и часть заказ-нарядов не попадает ни на одну страницу
        SortBy: "ACCOUNT_ID",
        SortOrder: 0,
      },
      signal,
    },
  );
  const list = data?.RSOPeriodList;
  if (!list || !Array.isArray(list.data)) {
    throw new ApiError(-1, "DashboardRSOAccounts: unexpected response", data);
  }
  const total = Number(list.totalRecords);
  return {
    rows: list.data.map(normalizeAccount),
    totalRecords: Number.isFinite(total) && total >= 0 ? total : null,
  };
}

// GET /api-v2/Dashboard/DashboardRSOAccounts — только месяц, страницы по 200 строк
// через OFFSET. Первая страница даёт totalRecords, остальные грузятся по 3 параллельно.
// Если totalRecords нет — страницы по одной, пока не придёт неполная.
export async function getAccountsMonth(
  dbIndex: number,
  monthKey: number,
  signal?: AbortSignal,
): Promise<AccountRow[]> {
  const first = await fetchAccountsPage(dbIndex, monthKey, 0, signal);
  const pages: AccountRow[][] = [first.rows];

  if (first.totalRecords !== null) {
    const offsets: number[] = [];
    for (
      let offset = ACCOUNTS_PAGE_SIZE;
      offset < first.totalRecords;
      offset += ACCOUNTS_PAGE_SIZE
    ) {
      offsets.push(offset);
    }
    if (offsets.length >= ACCOUNTS_MAX_PAGES) offsets.length = ACCOUNTS_MAX_PAGES - 1;
    const results = await mapWithConcurrencyLimit(offsets, ACCOUNTS_CONCURRENCY, (offset) =>
      fetchAccountsPage(dbIndex, monthKey, offset, signal),
    );
    results.forEach((result) => {
      if (result.status === "rejected") throw result.reason;
      pages.push(result.value.rows);
    });
  } else {
    let last = first.rows.length;
    let offset = last;
    while (last >= ACCOUNTS_PAGE_SIZE) {
      if (pages.length >= ACCOUNTS_MAX_PAGES) break;
      const page = await fetchAccountsPage(dbIndex, monthKey, offset, signal);
      pages.push(page.rows);
      last = page.rows.length;
      offset += last;
    }
  }

  // Соседние страницы могут пересекаться — дубли по ACCOUNT_ID отбрасываем
  const seen = new Set<number>();
  const rows: AccountRow[] = [];
  pages.flat().forEach((row) => {
    if (seen.has(row.ACCOUNT_ID)) return;
    seen.add(row.ACCOUNT_ID);
    rows.push(row);
  });

  // Расхождение с totalRecords видно разработчику, пользователю не показывается
  if (import.meta.env.DEV && first.totalRecords !== null && rows.length !== first.totalRecords) {
    // received — сколько строк пришло всего, duplicates — сколько из них повторы:
    // received = totalRecords при duplicates > 0 значит, что страницы пересекаются
    const received = pages.reduce((sum, page) => sum + page.length, 0);
    console.warn("[rso] DashboardRSOAccounts: rows differ from totalRecords", {
      monthKey,
      totalRecords: first.totalRecords,
      received,
      unique: rows.length,
      duplicates: received - rows.length,
      pages: pages.map((page) => page.length),
    });
  }
  return rows;
}
