import { makeAutoObservable, observable, reaction, runInAction } from "mobx";
import type { AccountRow } from "../api/contract";
import { getAccountsMonth } from "../api/rsoApi";
import { rsoErrorMessage } from "../lib/errors";
import { accessStore } from "./accessStore";
import type { Resource } from "./dashboardCache";

// Сколько месяцев заказ-нарядов держать в памяти (LRU)
const CAPACITY = 24;
// Сколько месяцев грузить одновременно (ТЗ §10.2)
const MONTH_CONCURRENCY = 3;

interface Job {
  key: string;
  dbIndex: number;
  monthKey: number;
  token: number;
}

// Кэш заказ-нарядов по месяцам (DashboardRSOAccounts отдаёт только месяц).
// Общий для блоков вкладок и панели детализации: месяц, загруженный для блока,
// в панели открывается без запроса.
class AccountsCache {
  private entries = observable.map<string, Resource<AccountRow[]>>({}, { deep: false });
  // Версия запроса по ключу — ответ устаревшего запроса отбрасывается
  private tokens = new Map<string, number>();
  // Очередь загрузки и число месяцев в работе
  private queue: Job[] = [];
  private active = 0;

  constructor() {
    makeAutoObservable<AccountsCache, "entries" | "tokens" | "queue" | "active" | "pump">(this, {
      entries: false,
      tokens: false,
      queue: false,
      active: false,
      pump: false,
    });

    reaction(
      () => accessStore.allowedDbIndexes,
      () => this.clear(),
    );
  }

  get(dbIndex: number, monthKey: number): Resource<AccountRow[]> | undefined {
    return this.entries.get(`${dbIndex}:${monthKey}`);
  }

  // Загрузить, если месяца нет или прошлая попытка упала; force — заново поверх
  // показанных данных (они остаются на экране до ответа)
  ensure(dbIndex: number, monthKey: number, force = false): void {
    const key = `${dbIndex}:${monthKey}`;
    const existing = this.entries.get(key);
    if (existing?.status === "loading" || existing?.refreshing) return;
    if (!force && existing && existing.status !== "error") return;

    const token = (this.tokens.get(key) ?? 0) + 1;
    this.tokens.set(key, token);
    this.set(
      key,
      existing?.status === "ready"
        ? { ...existing, refreshing: true, error: undefined }
        : { status: "loading" },
    );
    this.queue.push({ key, dbIndex, monthKey, token });
    this.pump();
  }

  // «Обновить»: перезагрузить месяцы, которые уже лежат в кэше
  refresh(dbIndex: number, monthKeys: readonly number[]): void {
    monthKeys.forEach((monthKey) => {
      if (this.entries.has(`${dbIndex}:${monthKey}`)) this.ensure(dbIndex, monthKey, true);
    });
  }

  // Не больше MONTH_CONCURRENCY месяцев одновременно: месяц сам грузит страницы
  // по 3 параллельно, без общего лимита год дал бы до 36 запросов разом
  private pump(): void {
    while (this.active < MONTH_CONCURRENCY && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job || this.tokens.get(job.key) !== job.token) continue;
      this.active += 1;
      getAccountsMonth(job.dbIndex, job.monthKey)
        .then(
          (data) => {
            if (this.tokens.get(job.key) !== job.token) return;
            runInAction(() => this.set(job.key, { status: "ready", data }));
          },
          (error: unknown) => {
            if (this.tokens.get(job.key) !== job.token) return;
            const message = rsoErrorMessage(error);
            runInAction(() => {
              const current = this.entries.get(job.key);
              this.set(
                job.key,
                current?.data
                  ? { status: "ready", data: current.data, error: message }
                  : { status: "error", error: message },
              );
            });
          },
        )
        .finally(() => {
          this.active -= 1;
          this.pump();
        });
    }
  }

  clear(): void {
    this.queue = [];
    this.entries.clear();
    this.tokens.clear();
  }

  private set(key: string, resource: Resource<AccountRow[]>): void {
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

export const accountsCache = new AccountsCache();
