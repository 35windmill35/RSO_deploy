import { makeAutoObservable, observable, reaction, runInAction } from "mobx";
import type { DashboardRsoData, Period } from "../api/contract";
import { getDashboard } from "../api/rsoApi";
import { rsoErrorMessage } from "../lib/errors";
import { prevPeriod } from "../lib/periodKey";
import { accessStore } from "./accessStore";
import { periodsStore } from "./periodsStore";

// Ресурс загрузки. refreshing — идёт перезагрузка поверх уже показанных данных
// («Обновить»); error при status = ready — обновление не удалось, данные прежние.
export interface Resource<T> {
  status: "loading" | "ready" | "error";
  data?: T;
  error?: string;
  refreshing?: boolean;
}

// Сколько ответов DashboardRSO держать в памяти (LRU)
const CAPACITY = 24;

export function dashboardKey(dbIndex: number, period: Period): string {
  return `${dbIndex}:${period.type}:${period.key}`;
}

// С каким периодом бэкенд сравнивает prev*-разделы. Календарный прошлый период,
// если он посчитан; иначе — сам период: prev-разделы не придут, и дельты сегментов
// не покажутся. Так все дельты на экране относятся к одному прошлому периоду.
export function prevPeriodKeyFor(period: Period): number {
  const prev = prevPeriod(period).key;
  return periodsStore.options(period.type).some((option) => option.key === prev)
    ? prev
    : period.key;
}

// Единый кэш ответов DashboardRSO: им пользуются и экраны, и панель детализации,
// поэтому после «Обновить» цифры везде одинаковые
class DashboardCache {
  private entries = observable.map<string, Resource<DashboardRsoData>>({}, { deep: false });
  // Версия запроса по ключу — ответ устаревшего запроса отбрасывается
  private tokens = new Map<string, number>();

  constructor() {
    makeAutoObservable<DashboardCache, "entries" | "tokens">(this, {
      entries: false,
      tokens: false,
    });

    // Другая сессия или другой набор баз — кэш прошлой сессии не нужен
    reaction(
      () => accessStore.allowedDbIndexes,
      () => this.clear(),
    );
  }

  get(dbIndex: number, period: Period): Resource<DashboardRsoData> | undefined {
    return this.entries.get(dashboardKey(dbIndex, period));
  }

  // Загрузить, если ответа нет или прошлая попытка упала. force — перезагрузить
  // поверх готового ответа, не убирая его с экрана.
  ensure(dbIndex: number, period: Period, force = false): void {
    const key = dashboardKey(dbIndex, period);
    const existing = this.entries.get(key);
    if (existing?.status === "loading" || existing?.refreshing) return;
    if (!force && existing && existing.status !== "error") return;

    const token = (this.tokens.get(key) ?? 0) + 1;
    this.tokens.set(key, token);
    if (existing?.status === "ready") {
      this.set(key, { ...existing, refreshing: true, error: undefined });
    } else {
      this.set(key, { status: "loading" });
    }

    getDashboard(dbIndex, period, prevPeriodKeyFor(period)).then(
      (data) => {
        if (this.tokens.get(key) !== token) return;
        runInAction(() => this.set(key, { status: "ready", data }));
      },
      (error: unknown) => {
        if (this.tokens.get(key) !== token) return;
        const message = rsoErrorMessage(error);
        runInAction(() => {
          const current = this.entries.get(key);
          this.set(
            key,
            current?.data
              ? { status: "ready", data: current.data, error: message }
              : { status: "error", error: message },
          );
        });
      },
    );
  }

  clear(): void {
    this.entries.clear();
    this.tokens.clear();
  }

  private set(key: string, resource: Resource<DashboardRsoData>): void {
    this.entries.delete(key);
    this.entries.set(key, resource);
    while (this.entries.size > CAPACITY) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined || oldest === key) break;
      this.entries.delete(oldest);
      this.tokens.delete(oldest);
    }
  }
}

export const dashboardCache = new DashboardCache();
