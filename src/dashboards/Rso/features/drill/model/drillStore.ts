import { makeAutoObservable, observableRef, reaction } from "mobx";
import type { AccountRow, Period, SummaryRow } from "@Rso/entities/rso/api/contract";
import { METRICS, type Metric } from "@Rso/entities/rso/lib/metrics";
import { childPeriods } from "@Rso/entities/rso/lib/periodKey";
import { summaryOf } from "@Rso/entities/rso/lib/summary";
import { accessStore } from "@Rso/entities/rso/model/accessStore";
import { accountsCache } from "@Rso/entities/rso/model/accountsCache";
import { dashboardCache, type Resource } from "@Rso/entities/rso/model/dashboardCache";
import { availableMonths } from "@Rso/entities/rso/model/periodMonths";
import { periodsStore } from "@Rso/entities/rso/model/periodsStore";
import { targetUsesAccounts, type DrillTarget } from "./targets";

// Уровень панели: что открыто (цель), период (год / квартал / месяц) или день
// месяца со списком ЗН. day = "all" — все ЗН месяца без разбивки по дням.
// Цель хранится в узле: переход «марка → модель» — новый уровень с историей.
export interface DrillNode {
  target: DrillTarget;
  period: Period;
  day?: string;
}

// Переход внутри той же цели: другой период или день
export type DrillStep = Omit<DrillNode, "target">;

// Drill-down (год → квартал → месяц → день) и drill-through (список ЗН) по
// показателям и срезам вкладок. Ответы DashboardRSO — из общего dashboardCache,
// заказ-наряды месяца — из общего accountsCache.
class DrillStore {
  isOpen = false;
  stack: DrillNode[] = [];

  constructor() {
    // Стек меняется только заменой массива, узлы не превращаются в observable:
    // цель узла сравнивается по ссылке
    makeAutoObservable(this, { stack: observableRef });

    reaction(
      () => accessStore.dbIndex,
      () => this.close(),
    );
  }

  // Цель текущего уровня
  get target(): DrillTarget | null {
    return this.node?.target ?? null;
  }

  // Метрика, если панель открыта по показателю
  get metric(): Metric | null {
    return this.target?.kind === "metric" ? METRICS[this.target.metricId] : null;
  }

  get node(): DrillNode | null {
    return this.stack.at(-1) ?? null;
  }

  open(target: DrillTarget, period: Period): void {
    if (accessStore.dbIndex === null) return;
    const node: DrillNode = { target, period };
    this.stack = [node];
    this.isOpen = true;
    this.prefetch(node);
  }

  // Уровнем ниже по той же цели
  push(step: DrillStep): void {
    const target = this.target;
    if (!target) return;
    const node: DrillNode = { target, ...step };
    this.stack = [...this.stack, node];
    this.prefetch(node);
  }

  // Новая цель за тот же период: «марка → модель», «склад целиком → склад»
  pushTarget(target: DrillTarget): void {
    const current = this.node;
    if (!current) return;
    const node: DrillNode = { target, period: current.period };
    this.stack = [...this.stack, node];
    this.prefetch(node);
  }

  // Переход по хлебным крошкам и кнопке «Назад»
  goTo(index: number): void {
    this.stack = this.stack.slice(0, index + 1);
  }

  close(): void {
    this.isOpen = false;
    this.stack = [];
  }

  // ─── Данные уровней ────────────────────────────────────────────────────

  dashboard(period: Period) {
    const dbIndex = accessStore.dbIndex;
    return dbIndex === null ? undefined : dashboardCache.get(dbIndex, period);
  }

  accountsOf(monthKey: number): Resource<AccountRow[]> | undefined {
    const dbIndex = accessStore.dbIndex;
    return dbIndex === null ? undefined : accountsCache.get(dbIndex, monthKey);
  }

  // Строка summary за период: из ответа за сам период или за более поздний того же уровня
  summaryRow(period: Period, source: Period = period): SummaryRow | undefined {
    return summaryOf(this.dashboard(source)?.data, period);
  }

  // Посчитанные дочерние периоды: год → кварталы, квартал → месяцы
  children(period: Period): Period[] {
    if (period.type === "M") return [];
    const type = period.type === "Y" ? "Q" : "M";
    const available = new Set(periodsStore.options(type).map((p) => p.key));
    return childPeriods(period).filter((child) => available.has(child.key));
  }

  // Последний посчитанный дочерний период: в его summary (12 периодов назад)
  // есть все дочерние строки — один запрос на уровень
  childrenSource(period: Period): Period | null {
    return this.children(period).at(-1) ?? null;
  }

  // Посчитанные месяцы периода (для среза по ЗН на уровне квартала и года)
  months(period: Period): Period[] {
    return availableMonths(period);
  }

  retryNode(): void {
    const node = this.node;
    if (node) this.prefetch(node);
  }

  private prefetch(node: DrillNode): void {
    const dbIndex = accessStore.dbIndex;
    if (dbIndex === null) return;
    // ensure повторяет только упавшие загрузки — готовые не трогает
    dashboardCache.ensure(dbIndex, node.period);
    const source = this.childrenSource(node.period);
    if (source) dashboardCache.ensure(dbIndex, source);
    const { target } = node;
    const needsAccounts =
      (target.kind === "metric" && METRICS[target.metricId].accounts) || targetUsesAccounts(target);
    if (node.period.type === "M" && needsAccounts) accountsCache.ensure(dbIndex, node.period.key);
    // Срез по типу ЗН или форме оплаты за квартал / год считается по месяцам
    if (
      node.period.type !== "M" &&
      (target.kind === "accountType" || target.kind === "paymentType")
    ) {
      this.months(node.period).forEach((month) => accountsCache.ensure(dbIndex, month.key));
    }
  }
}

export const drillStore = new DrillStore();
