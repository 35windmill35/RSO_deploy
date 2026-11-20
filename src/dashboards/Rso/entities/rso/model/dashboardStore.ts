import { makeAutoObservable, reaction } from "mobx";
import type { DashboardRsoData, Period } from "../api/contract";
import { prevPeriod } from "../lib/periodKey";
import { accessStore } from "./accessStore";
import { accountsCache } from "./accountsCache";
import { dashboardCache, dashboardKey } from "./dashboardCache";
import { filtersStore } from "./filtersStore";
import { availableMonths } from "./periodMonths";
import { hasPrevPeriod } from "./prevDashboard";

type LoadStatus = "idle" | "loading" | "ready" | "error";

// Данные DashboardRSO за выбранные базу и период — один запрос на все вкладки.
// Сам ответ живёт в dashboardCache; здесь — только «какой ответ сейчас на экране».
class DashboardStore {
  constructor() {
    makeAutoObservable(this);

    reaction(
      () => {
        const target = this.target;
        return target ? dashboardKey(target.dbIndex, target.period) : null;
      },
      () => this.load(),
      { fireImmediately: true },
    );
  }

  private get target(): { dbIndex: number; period: Period } | null {
    const dbIndex = accessStore.dbIndex;
    const period = filtersStore.period;
    return dbIndex !== null && period !== null ? { dbIndex, period } : null;
  }

  private get resource() {
    const target = this.target;
    return target ? dashboardCache.get(target.dbIndex, target.period) : undefined;
  }

  get data(): DashboardRsoData | null {
    return this.resource?.data ?? null;
  }

  get status(): LoadStatus {
    if (!this.target) return "idle";
    // Записи ещё нет — загрузка вот-вот начнётся
    return this.resource?.status ?? "loading";
  }

  get error(): string | null {
    return this.resource?.error ?? null;
  }

  get isLoading(): boolean {
    return this.status === "loading";
  }

  get isRefreshing(): boolean {
    return this.resource?.refreshing ?? false;
  }

  load(): void {
    const target = this.target;
    if (target) dashboardCache.ensure(target.dbIndex, target.period);
  }

  // «Обновить»: перезагрузка поверх показанных данных. Вместе с ответом за период
  // обновляются уже загруженные заказ-наряды его месяцев и ответ за прошлый период
  // (по нему считаются дельты склада и ремзоны) — если они есть в кэше
  reload(): void {
    const target = this.target;
    if (!target) return;
    const { dbIndex, period } = target;
    dashboardCache.ensure(dbIndex, period, true);
    accountsCache.refresh(
      dbIndex,
      availableMonths(period).map((month) => month.key),
    );
    const before = prevPeriod(period);
    if (hasPrevPeriod(period) && dashboardCache.get(dbIndex, before)) {
      dashboardCache.ensure(dbIndex, before, true);
    }
  }
}

export const dashboardStore = new DashboardStore();
