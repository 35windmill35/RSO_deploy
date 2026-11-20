// Типы ответов API дашборда RSO — поля как в реальных ответах стенда
// (api-v2/Dashboard/DashboardRSO*, ноябрь 2026). Имена не переименовываем:
// так проще сверять с ответом сервера.

export type PeriodType = "M" | "Q" | "Y";

// PERIOD_KEY: M → YYYYMM (202603), Q → YYYY*10+квартал (20262), Y → YYYY (2026)
export interface Period {
  type: PeriodType;
  key: number;
}

// Режим НДС в интерфейсе; в полях API — суффиксы _NETTO / _BRUTTO
export type VatMode = "Netto" | "Brutto";

export interface PeriodKeyFields {
  PERIOD_TYPE: PeriodType;
  PERIOD_KEY: number;
}

// Денежная пара: Money<"REVENUE_TOTAL"> → { REVENUE_TOTAL_NETTO, REVENUE_TOTAL_BRUTTO }
export type Money<K extends string> = {
  [P in `${K}_NETTO` | `${K}_BRUTTO`]: number | null;
};

// ─── DashboardRSOPeriods → RSOPeriodList.data ─────────────────────────────

export type PeriodRow = PeriodKeyFields;

// ─── DashboardRSO.summary — 12 периодов того же типа, по убыванию; [0] — выбранный

export type SummaryRow = PeriodKeyFields &
  Money<
    | "REVENUE_TOTAL"
    | "EXPENSE_TOTAL"
    | "OPERATING_PROFIT"
    | "DISCOUNT_TOTAL"
    | "CASH_IN_TOTAL"
    | "CASH_OUT_TOTAL"
  > & {
    PLAN_MONEY: number | null;
    PLAN_SELLING: number | null;
    PLAN_GAIN: number | null;
    // Выручка / PLAN_MONEY × 100
    PLAN_MONEY_FACT_PCT: number | null;
    // Операционная прибыль / PLAN_GAIN × 100; null, если план 0
    PLAN_GAIN_FACT_PCT: number | null;
    DISCOUNT_AVG_PCT: number | null;
    PARTS_TO_WORK_RATIO_PCT: number | null;
    ACCOUNT_COUNT_TOTAL: number | null;
    NORM_HOUR_TOTAL: number | null;
  };

// ─── DashboardRSO.turnoverAndIncome — массив периодов, в каждом строки отделов

export type TurnoverIncomeRow = PeriodKeyFields &
  Money<"TURNOVER_TOTAL" | "INCOME_TOTAL"> & {
    DEPARTMENT_ID: number;
    DEPARTMENT_NAME: string | null;
    NORM_HOUR: number | null;
    ACCOUNT_COUNT: number | null;
    ROW_KIND: "D";
  };

// ─── DashboardRSO.cars — 20 строк ─────────────────────────────────────────

export type CarRow = PeriodKeyFields &
  Money<"TURNOVER_TOTAL" | "AVG_CHECK"> & {
    MARK_ID: number;
    MARK_NAME: string | null;
    MODEL_ID: number;
    // Может приходить с пробелами в конце
    MODEL_NAME: string | null;
    // 0 — год не определён
    CAR_YEAR: number;
    ACCOUNT_COUNT: number | null;
    DEPARTMENT_ID: number;
    DEPARTMENT_NAME: string | null;
  };

// ─── DashboardRSO.capacity — компания (DEPARTMENT_ID = -1) + отделы ────────

export interface CapacityRow extends PeriodKeyFields {
  AVAILABLE_HOURS: number | null;
  BOOKED_HOURS: number | null;
  SOLD_HOURS: number | null;
  // BOOKED_HOURS / AVAILABLE_HOURS × 100
  LOAD_PCT: number | null;
  STATION_COUNT: number | null;
  POST_COUNT: number | null;
  DEPARTMENT_ID: number;
  DEPARTMENT_NAME: string | null;
}

// ─── DashboardRSO.clientSegment / prevClientSegment ───────────────────────
// Строки сегментов по каждому отделу + итог по отделу (IS_TOTAL) + итог по
// компании (IS_TOTAL, DEPARTMENT_ID = -1). Пустой сегмент не приходит вовсе.
// Только брутто.

export interface ClientSegmentRow extends PeriodKeyFields {
  IS_TOTAL: boolean;
  IS_PRIMARY: boolean;
  SEGMENT: string | null;
  ACCOUNT_COUNT: number | null;
  NORM_HOUR_TOTAL: number | null;
  AVG_NORM_HOUR_PER_ACCOUNT: number | null;
  TURNOVER_PARTS_BRUTTO: number | null;
  TURNOVER_WORK_BRUTTO: number | null;
  TURNOVER_TOTAL_BRUTTO: number | null;
  AVG_CHECK_BRUTTO: number | null;
  DISCOUNT_TOTAL_BRUTTO: number | null;
  DISCOUNT_AVG_PCT: number | null;
  PARTS_TO_WORK_RATIO_PCT: number | null;
  DEPARTMENT_ID: number;
  DEPARTMENT_NAME: string | null;
}

// ─── DashboardRSO.payroll / prevPayroll ───────────────────────────────────
// ВАЖНО: итог по компании — только строка IS_TOTAL. Сотрудник без отдела
// повторяется во всех отделах, сумма строк больше итога.

export interface PayrollRow extends PeriodKeyFields {
  IS_TOTAL: boolean;
  DEPARTMENT_ID: number;
  DEPARTMENT_NAME: string | null;
  USER_PCOMMON_ID: number;
  EMPLOYEE_ID: number | null;
  EMPLOYEE_NAME: string | null;
  EMPLOYEE_POSITION_ID: number;
  EMPLOYEE_POSITION_NAME: string | null;
  IS_NOT_HIRED: boolean | null;
  WAGE_SUMMA: number | null;
}

// ─── DashboardRSO.stockG (товарные группы) / stockW (склады) ──────────────
// Только брутто. Строки «компания целиком» нет — итог считается суммой.

export interface StockRow extends PeriodKeyFields {
  GROUP_ID: number;
  // Может приходить с пробелами в конце
  GROUP_NAME: string | null;
  WAREHOUSE_ID: number;
  WAREHOUSE_NAME: string | null;
  STOCK_BEGIN_BRUTTO: number | null;
  STOCK_END_BRUTTO: number | null;
  DELIVERY_SUM_BRUTTO: number | null;
  RETURN_TO_SUPPLIER_BRUTTO: number | null;
  RETURN_FROM_CLIENT_BRUTTO: number | null;
  SHIPMENT_COST_BRUTTO: number | null;
  SHIPMENT_SALE_BRUTTO: number | null;
  PROFIT_BRUTTO: number | null;
  MARKUP_PCT: number | null;
  TURNOVER_PCT: number | null;
  ITEMS_COUNT_END: number | null;
  ITEMS_COUNT_DELTA: number | null;
}

// ─── DashboardRSO.expenses — ключа нет, если расходов за период нет ───────

export type ExpenseCategory =
  "WARRANTY" | "WRITEOFF" | "RETURN_FROM_CLIENT" | "OPERATING" | "INTERNAL_OUTLAY";

export type ExpenseRow = PeriodKeyFields &
  Money<"AMOUNT"> & {
    CATEGORY: ExpenseCategory;
    ARTICLE_ID: number;
    ARTICLE_NAME: string | null;
    DEPARTMENT_ID: number;
    DEPARTMENT_NAME: string | null;
  };

// ─── Ответ DashboardRSO целиком. Пустые разделы приходят без ключа ────────

export interface DashboardRsoData {
  summary?: SummaryRow[];
  turnoverAndIncome?: TurnoverIncomeRow[][];
  cars?: CarRow[];
  capacity?: CapacityRow[];
  clientSegment?: ClientSegmentRow[];
  prevClientSegment?: ClientSegmentRow[];
  payroll?: PayrollRow[];
  prevPayroll?: PayrollRow[];
  stockG?: StockRow[];
  stockW?: StockRow[];
  expenses?: ExpenseRow[];
}

// ─── DashboardRSOAccounts — только месяц, страницы по 200 строк (OFFSET) ──

export type AccountRow = PeriodKeyFields &
  Money<"TURNOVER_TOTAL"> & {
    ACCOUNT_ID: number;
    ACCOUNT_CODE: string | null;
    // Дата закрытия ЗН, YYYY-MM-DD
    DATE_EVENT: string;
    DEPARTMENT_NAME: string | null;
    ACCOUNT_TYPE_NAME: string | null;
    PAYMENT_TYPE_NAME: string | null;
  };
