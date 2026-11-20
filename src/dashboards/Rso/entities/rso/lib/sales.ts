import type {
  AccountRow,
  CapacityRow,
  CarRow,
  DashboardRsoData,
  Period,
  StockRow,
  TurnoverIncomeRow,
  VatMode,
} from "../api/contract";
import { deltaPct, diff, finite, nettoFactor, pick, ratio } from "./money";
import { prevPeriod } from "./periodKey";
import { summaryOf } from "./summary";

// Расчёты вкладки «Продажи и виды услуг» из ответа DashboardRSO — чистые функции.
// Общие для блоков вкладки и панели детализации.

const sum = (values: readonly (number | null)[]) =>
  values.reduce<number>((acc, value) => acc + (value ?? 0), 0);

const pct = (value: number | null) => (value === null ? null : value * 100);

// ─── Оборот по отделам (turnoverAndIncome) ────────────────────────────────

export function turnoverGroup(
  data: DashboardRsoData | undefined | null,
  period: Period,
): TurnoverIncomeRow[] {
  return (
    data?.turnoverAndIncome?.find(
      (rows) => rows[0]?.PERIOD_TYPE === period.type && rows[0]?.PERIOD_KEY === period.key,
    ) ?? []
  );
}

export interface DepartmentRow {
  id: number;
  name: string | null;
  turnover: number | null;
  // Доля в обороте периода, %
  share: number | null;
  // Дельта оборота к прошлому периоду, %; undefined — отдела не было в прошлом периоде
  delta: number | null | undefined;
  accounts: number | null;
  avgCheck: number | null;
  hours: number | null;
  turnoverPerHour: number | null;
}

export interface DepartmentsData {
  rows: DepartmentRow[];
  total: Omit<DepartmentRow, "id" | "name">;
}

function departmentRow(
  row: Pick<TurnoverIncomeRow, "DEPARTMENT_ID" | "DEPARTMENT_NAME">,
  turnover: number | null,
  accounts: number | null,
  hours: number | null,
  total: number,
  previous: number | null | undefined,
): DepartmentRow {
  return {
    id: row.DEPARTMENT_ID,
    name: row.DEPARTMENT_NAME,
    turnover,
    share: pct(ratio(turnover, total)),
    delta: previous === undefined ? undefined : deltaPct(turnover, previous),
    accounts,
    avgCheck: ratio(turnover, accounts),
    hours,
    turnoverPerHour: hours ? ratio(turnover, hours) : null,
  };
}

// Отделы периода с дельтой к прошлому периоду из того же ответа (12 периодов)
export function departmentRows(
  data: DashboardRsoData | undefined | null,
  period: Period,
  vat: VatMode,
): DepartmentsData | null {
  const group = turnoverGroup(data, period);
  if (group.length === 0) return null;
  const prevGroup = turnoverGroup(data, prevPeriod(period));
  const hasPrev = prevGroup.length > 0;
  const total = sum(group.map((row) => pick(row, "TURNOVER_TOTAL", vat)));
  const prevTotal = hasPrev ? sum(prevGroup.map((row) => pick(row, "TURNOVER_TOTAL", vat))) : null;

  const rows = group
    .map((row) => {
      const prev = prevGroup.find((item) => item.DEPARTMENT_ID === row.DEPARTMENT_ID);
      const previous = !hasPrev ? null : prev ? pick(prev, "TURNOVER_TOTAL", vat) : undefined;
      return departmentRow(
        row,
        pick(row, "TURNOVER_TOTAL", vat),
        finite(row.ACCOUNT_COUNT),
        finite(row.NORM_HOUR),
        total,
        previous,
      );
    })
    .sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0));

  const accounts = sum(group.map((row) => finite(row.ACCOUNT_COUNT)));
  const hours = sum(group.map((row) => finite(row.NORM_HOUR)));
  return {
    rows,
    total: {
      turnover: total,
      share: 100,
      delta: deltaPct(total, prevTotal),
      accounts,
      avgCheck: ratio(total, accounts),
      hours,
      turnoverPerHour: hours ? ratio(total, hours) : null,
    },
  };
}

// ─── Динамика по отделам ──────────────────────────────────────────────────

export type TrendMeasure = "turnover" | "accounts" | "hours";

export interface DepartmentSeries {
  id: number;
  name: string | null;
}

export interface DepartmentTrend {
  series: DepartmentSeries[];
  // По возрастанию периода; values[departmentId] — значение отдела
  points: { key: number; values: Record<number, number | null>; total: number }[];
}

export function trendValue(row: TurnoverIncomeRow, measure: TrendMeasure, vat: VatMode) {
  if (measure === "accounts") return finite(row.ACCOUNT_COUNT);
  if (measure === "hours") return finite(row.NORM_HOUR);
  return pick(row, "TURNOVER_TOTAL", vat);
}

export function departmentTrend(
  data: DashboardRsoData | undefined | null,
  period: Period,
  vat: VatMode,
  measure: TrendMeasure,
): DepartmentTrend {
  const groups = [...(data?.turnoverAndIncome ?? [])]
    .filter((rows) => rows.length > 0 && rows[0].PERIOD_TYPE === period.type)
    .sort((a, b) => a[0].PERIOD_KEY - b[0].PERIOD_KEY);

  // Порядок серий — по обороту выбранного периода, затем по общему обороту
  const weight = new Map<number, { name: string | null; current: number; all: number }>();
  groups.forEach((rows) =>
    rows.forEach((row) => {
      const item = weight.get(row.DEPARTMENT_ID) ?? {
        name: row.DEPARTMENT_NAME,
        current: 0,
        all: 0,
      };
      const turnover = pick(row, "TURNOVER_TOTAL", vat) ?? 0;
      item.all += turnover;
      if (row.PERIOD_KEY === period.key) item.current += turnover;
      weight.set(row.DEPARTMENT_ID, item);
    }),
  );
  const series = Array.from(weight.entries())
    .sort(([, a], [, b]) => b.current - a.current || b.all - a.all)
    .map(([id, item]) => ({ id, name: item.name }));

  const points = groups.map((rows) => {
    const values: Record<number, number | null> = {};
    rows.forEach((row) => {
      values[row.DEPARTMENT_ID] = trendValue(row, measure, vat);
    });
    return {
      key: rows[0].PERIOD_KEY,
      values,
      total: sum(Object.values(values)),
    };
  });
  return { series, points };
}

// ─── Структура оборота: запчасти / работы / прочее (clientSegment) ────────

export type StructurePart = "parts" | "work" | "other";

export interface StructureRow {
  id: number;
  name: string | null;
  parts: number;
  work: number;
  other: number;
  total: number;
}

export interface TurnoverStructure {
  company: StructureRow | null;
  departments: StructureRow[];
  // Запчасти к работам, % — из summary
  ratio: number | null;
}

// clientSegment приходит только с НДС: для «без НДС» пересчёт оценочный (nettoFactor)
export function turnoverStructure(
  data: DashboardRsoData | undefined | null,
  period: Period,
  vat: VatMode,
): TurnoverStructure {
  const summary = summaryOf(data, period);
  const factor = nettoFactor(summary, vat);
  const rows = (data?.clientSegment ?? []).filter((row) => row.IS_TOTAL);
  const toStructure = (row: (typeof rows)[number]): StructureRow => {
    const parts = (finite(row.TURNOVER_PARTS_BRUTTO) ?? 0) * factor;
    const work = (finite(row.TURNOVER_WORK_BRUTTO) ?? 0) * factor;
    const total = (finite(row.TURNOVER_TOTAL_BRUTTO) ?? 0) * factor;
    const other = total - parts - work;
    return {
      id: row.DEPARTMENT_ID,
      name: row.DEPARTMENT_NAME,
      parts,
      work,
      // Остаток меньше рубля — округление, не отдельный сегмент
      other: other >= 1 ? other : 0,
      total,
    };
  };
  const companyRow = rows.find((row) => row.DEPARTMENT_ID === -1);
  return {
    company: companyRow ? toStructure(companyRow) : null,
    departments: rows
      .filter((row) => row.DEPARTMENT_ID !== -1)
      .map(toStructure)
      .sort((a, b) => b.total - a.total),
    ratio: summary ? finite(summary.PARTS_TO_WORK_RATIO_PCT) : null,
  };
}

// Оборот запчастей и работ по компании за период ответа (clientSegment или prev*)
export function partsAndWork(
  rows: DashboardRsoData["clientSegment"],
  factor: number,
): { parts: number | null; work: number | null } {
  const company = rows?.find((row) => row.IS_TOTAL && row.DEPARTMENT_ID === -1);
  if (!company) return { parts: null, work: null };
  const scale = (value: number | null) => (value === null ? null : value * factor);
  return {
    parts: scale(finite(company.TURNOVER_PARTS_BRUTTO)),
    work: scale(finite(company.TURNOVER_WORK_BRUTTO)),
  };
}

// ─── Загрузка ремзоны (capacity) ──────────────────────────────────────────

export interface CapacityView {
  departmentId: number;
  name: string | null;
  available: number | null;
  booked: number | null;
  sold: number | null;
  // Записано к доступному, % — из API
  loadPct: number | null;
  // Продано к доступному, %
  soldPct: number | null;
  posts: number | null;
  stations: number | null;
}

export function capacityView(row: CapacityRow | undefined): CapacityView | null {
  if (!row) return null;
  const available = finite(row.AVAILABLE_HOURS);
  const sold = finite(row.SOLD_HOURS);
  return {
    departmentId: row.DEPARTMENT_ID,
    name: row.DEPARTMENT_NAME,
    available,
    booked: finite(row.BOOKED_HOURS),
    sold,
    loadPct: finite(row.LOAD_PCT),
    soldPct: available ? pct(ratio(sold, available)) : null,
    posts: finite(row.POST_COUNT),
    stations: finite(row.STATION_COUNT),
  };
}

// Строка ремзоны по отделу. Пока бэкенд отдаёт для отдела другой ID, чем в
// остальных разделах, при промахе по ID ищем по названию
export function capacityRow(
  data: DashboardRsoData | undefined | null,
  departmentId: number,
  name?: string | null,
): CapacityRow | undefined {
  const rows = data?.capacity ?? [];
  return (
    rows.find((row) => row.DEPARTMENT_ID === departmentId) ??
    (departmentId !== -1 && name ? rows.find((row) => row.DEPARTMENT_NAME === name) : undefined)
  );
}

// Отделы в селекторе ремзоны. Если отдел один и совпадает с компанией — выбирать нечего
export function capacityDepartments(data: DashboardRsoData | undefined | null): CapacityRow[] {
  const rows = data?.capacity ?? [];
  const company = rows.find((row) => row.DEPARTMENT_ID === -1);
  const departments = rows.filter((row) => row.DEPARTMENT_ID !== -1);
  const same = (a: CapacityRow, b: CapacityRow) =>
    a.AVAILABLE_HOURS === b.AVAILABLE_HOURS &&
    a.BOOKED_HOURS === b.BOOKED_HOURS &&
    a.SOLD_HOURS === b.SOLD_HOURS;
  if (departments.length === 1 && company && same(departments[0], company)) return [];
  return departments;
}

// ─── Автомобили (cars) ────────────────────────────────────────────────────

export interface CarLine {
  key: string;
  markId: number;
  markName: string | null;
  modelId: number;
  modelName: string | null;
  carYear: number;
  // Отделы всех склеенных строк — без повторов и пустых
  departmentNames: string[];
  accounts: number;
  turnover: number;
  avgCheck: number | null;
  // Доля в выручке периода, %
  revenueShare: number | null;
}

export interface MarkLine {
  markId: number;
  markName: string | null;
  models: number;
  accounts: number;
  turnover: number;
  avgCheck: number | null;
  revenueShare: number | null;
}

export interface CarsData {
  models: CarLine[];
  marks: MarkLine[];
  // Сколько ЗН и какую долю выручки покрывают строки cars
  coverage: { accounts: number; totalAccounts: number | null; revenueShare: number | null };
  // Хоть в одной строке год выпуска определён
  hasYears: boolean;
}

// Строки с одной маркой, моделью и годом склеиваются: бэкенд отдаёт их несколькими
export function carsData(
  data: DashboardRsoData | undefined | null,
  period: Period,
  vat: VatMode,
): CarsData | null {
  const rows = data?.cars ?? [];
  if (rows.length === 0) return null;
  const summary = summaryOf(data, period);
  const revenue = summary ? pick(summary, "REVENUE_TOTAL", vat) : null;
  const share = (value: number) => pct(ratio(value, revenue));

  const merged = new Map<
    string,
    { row: CarRow; accounts: number; turnover: number; departments: Set<string> }
  >();
  rows.forEach((row) => {
    const key = `${row.MARK_ID}:${row.MODEL_ID}:${row.CAR_YEAR}`;
    const item = merged.get(key) ?? { row, accounts: 0, turnover: 0, departments: new Set() };
    item.accounts += finite(row.ACCOUNT_COUNT) ?? 0;
    item.turnover += pick(row, "TURNOVER_TOTAL", vat) ?? 0;
    if (row.DEPARTMENT_NAME) item.departments.add(row.DEPARTMENT_NAME);
    merged.set(key, item);
  });
  const models: CarLine[] = Array.from(merged.entries())
    .map(([key, { row, accounts, turnover, departments }]) => ({
      key,
      markId: row.MARK_ID,
      markName: row.MARK_NAME,
      modelId: row.MODEL_ID,
      modelName: row.MODEL_NAME,
      carYear: row.CAR_YEAR,
      departmentNames: Array.from(departments),
      accounts,
      turnover,
      avgCheck: ratio(turnover, accounts),
      revenueShare: share(turnover),
    }))
    .sort((a, b) => b.turnover - a.turnover);

  const byMark = new Map<number, MarkLine>();
  models.forEach((model) => {
    const mark = byMark.get(model.markId) ?? {
      markId: model.markId,
      markName: model.markName,
      models: 0,
      accounts: 0,
      turnover: 0,
      avgCheck: null,
      revenueShare: null,
    };
    mark.models += 1;
    mark.accounts += model.accounts;
    mark.turnover += model.turnover;
    byMark.set(model.markId, mark);
  });
  const marks = Array.from(byMark.values())
    .map((mark) => ({
      ...mark,
      avgCheck: ratio(mark.turnover, mark.accounts),
      revenueShare: share(mark.turnover),
    }))
    .sort((a, b) => b.turnover - a.turnover);

  const turnover = sum(models.map((model) => model.turnover));
  return {
    models,
    marks,
    coverage: {
      accounts: sum(models.map((model) => model.accounts)),
      totalAccounts: summary ? finite(summary.ACCOUNT_COUNT_TOTAL) : null,
      revenueShare: share(turnover),
    },
    hasYears: models.some((model) => model.carYear > 0),
  };
}

// ─── Склад (stockG, stockW) — только с НДС ────────────────────────────────

export interface StockTotals {
  stockBegin: number;
  stockEnd: number;
  delivery: number;
  returnToSupplier: number;
  returnFromClient: number;
  shipmentSale: number;
  shipmentCost: number;
  profit: number;
  // Прибыль к себестоимости отгрузок, %
  markupPct: number | null;
  // Себестоимость отгрузок к среднему остатку, %
  turnoverPct: number | null;
  // Номенклатура — по группам: на нескольких складах позиция считается несколько раз
  items: number | null;
  itemsDelta: number | null;
}

// Итог по набору строк склада (видимые строки таблицы, все склады). Наценка и
// оборачиваемость считаются по суммам, а не средним строк. Номенклатура — только
// если строки — товарные группы
export function stockRowsTotals(
  rows: readonly StockRow[],
  itemsRows: readonly StockRow[] | null = null,
): StockTotals | null {
  if (rows.length === 0) return null;
  const total = (field: keyof StockRow) => sum(rows.map((row) => finite(row[field])));
  const stockBegin = total("STOCK_BEGIN_BRUTTO");
  const stockEnd = total("STOCK_END_BRUTTO");
  const shipmentCost = total("SHIPMENT_COST_BRUTTO");
  const profit = total("PROFIT_BRUTTO");
  const average = (stockBegin + stockEnd) / 2;
  const hasItems = itemsRows !== null && itemsRows.length > 0;
  return {
    stockBegin,
    stockEnd,
    delivery: total("DELIVERY_SUM_BRUTTO"),
    returnToSupplier: total("RETURN_TO_SUPPLIER_BRUTTO"),
    returnFromClient: total("RETURN_FROM_CLIENT_BRUTTO"),
    shipmentSale: total("SHIPMENT_SALE_BRUTTO"),
    shipmentCost,
    profit,
    markupPct: shipmentCost ? pct(ratio(profit, shipmentCost)) : null,
    turnoverPct: average ? pct(ratio(shipmentCost, average)) : null,
    items: hasItems ? sum(itemsRows.map((row) => finite(row.ITEMS_COUNT_END))) : null,
    itemsDelta: hasItems ? sum(itemsRows.map((row) => finite(row.ITEMS_COUNT_DELTA))) : null,
  };
}

// Итог по компании: деньги — сумма складов (совпадает с суммой групп),
// номенклатура — сумма групп
export function stockTotals(data: DashboardRsoData | undefined | null): StockTotals | null {
  const warehouses = data?.stockW ?? [];
  const groups = data?.stockG ?? [];
  return stockRowsTotals(warehouses.length > 0 ? warehouses : groups, groups);
}

// Строка без остатков, движения и номенклатуры — в списках не показывается
export function isEmptyStockRow(row: StockRow): boolean {
  const fields: (keyof StockRow)[] = [
    "STOCK_BEGIN_BRUTTO",
    "STOCK_END_BRUTTO",
    "DELIVERY_SUM_BRUTTO",
    "RETURN_TO_SUPPLIER_BRUTTO",
    "RETURN_FROM_CLIENT_BRUTTO",
    "SHIPMENT_SALE_BRUTTO",
    "ITEMS_COUNT_END",
  ];
  return fields.every((field) => !finite(row[field]));
}

export interface MovementStep {
  id: "begin" | "delivery" | "returnToSupplier" | "returnFromClient" | "shipmentCost" | "end";
  sign: "=" | "+" | "-";
  value: number | null;
}

// Каскад движения склада или группы: начало + поставки − возврат поставщику
// + возврат от клиентов − отгрузки по себестоимости = конец
export function stockMovement(row: StockRow): { steps: MovementStep[]; mismatch: number | null } {
  const begin = finite(row.STOCK_BEGIN_BRUTTO);
  const delivery = finite(row.DELIVERY_SUM_BRUTTO);
  const toSupplier = finite(row.RETURN_TO_SUPPLIER_BRUTTO);
  const fromClient = finite(row.RETURN_FROM_CLIENT_BRUTTO);
  const cost = finite(row.SHIPMENT_COST_BRUTTO);
  const end = finite(row.STOCK_END_BRUTTO);
  const expected =
    (begin ?? 0) + (delivery ?? 0) - (toSupplier ?? 0) + (fromClient ?? 0) - (cost ?? 0);
  const mismatch = diff(end, expected);
  return {
    steps: [
      { id: "begin", sign: "=", value: begin },
      { id: "delivery", sign: "+", value: delivery },
      { id: "returnToSupplier", sign: "-", value: toSupplier },
      { id: "returnFromClient", sign: "+", value: fromClient },
      { id: "shipmentCost", sign: "-", value: cost },
      { id: "end", sign: "=", value: end },
    ],
    mismatch: mismatch !== null && Math.abs(mismatch) > 1 ? mismatch : null,
  };
}

// ─── Виды услуг и формы оплаты (DashboardRSOAccounts) ─────────────────────

export type AccountsSlice = "accountType" | "paymentType";

export interface SliceRow {
  // null — значение не указано в ЗН
  name: string | null;
  accounts: number;
  turnover: number;
  share: number | null;
  avgCheck: number | null;
}

export function sliceValue(row: AccountRow, slice: AccountsSlice): string | null {
  const value = slice === "accountType" ? row.ACCOUNT_TYPE_NAME : row.PAYMENT_TYPE_NAME;
  return value?.trim() || null;
}

export function groupAccounts(
  rows: readonly AccountRow[],
  slice: AccountsSlice,
  vat: VatMode,
): SliceRow[] {
  const groups = new Map<string, { name: string | null; accounts: number; turnover: number }>();
  rows.forEach((row) => {
    const name = sliceValue(row, slice);
    const key = name ?? "";
    const item = groups.get(key) ?? { name, accounts: 0, turnover: 0 };
    item.accounts += 1;
    item.turnover += pick(row, "TURNOVER_TOTAL", vat) ?? 0;
    groups.set(key, item);
  });
  const total = sum(Array.from(groups.values()).map((item) => item.turnover));
  return Array.from(groups.values())
    .map((item) => ({
      ...item,
      share: pct(ratio(item.turnover, total)),
      avgCheck: ratio(item.turnover, item.accounts),
    }))
    .sort((a, b) => b.turnover - a.turnover);
}
