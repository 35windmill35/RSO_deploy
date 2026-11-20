import { makeAutoObservable, observableRef, reaction, runInAction } from "mobx";
import { getAccidentStat } from "../api/accidentApi";
import type { AccidentRow, FirmSnapshot, IncompleteFirm, LoadStatus, RejectedFirm } from "./types";
import { mapWithConcurrencyLimit } from "@Accidents/shared/lib/concurrencyLimit";
import { setCurrencyCode } from "@Accidents/shared/lib/formatters";
import { describeRejects, firmDbIndex } from "./utils";
import { checkRight } from "@/API/requests/auth";
import { ACCIDENTS_RIGHT_CODE } from "@/dashboards/Accidents/shared/config/api";
import store from "@/APP/store/root";

const DATA_LOAD_CONCURRENCY = 5;

class AccidentsStore {
  rows: AccidentRow[] = [];
  status: LoadStatus = "idle";
  // Перезагрузка поверх показанных данных
  isRefreshing = false;

  loadedCount = 0;
  totalCount = 0;

  failedFirms: string[] = [];

  // Меньше строк, чем в totalRecords
  incompleteFirms: IncompleteFirm[] = [];

  rejectedFirms: RejectedFirm[] = [];

  // Не ответили при обновлении — показаны данные прошлой загрузки
  staleFirms: { name: string; loadedAt: Date }[] = [];
  isCheckingRights = false;

  // null — права ещё не проверялись
  allowedDbIndexes: number[] | null = null;

  // Базы, где проверка права упала с ошибкой
  rightsCheckErrors: string[] = [];
  // Последние удачные данные по каждой базе
  private snapshots = new Map<number, FirmSnapshot>();

  loadedAt: Date | null = null;

  // Защита от гонок: результат устаревшей загрузки отбрасывается
  private abortController: AbortController | null = null;
  private rightsAbort: AbortController | null = null;

  constructor() {
    makeAutoObservable<AccidentsStore, "snapshots">(this, {
      rows: observableRef,
      snapshots: false,
    });

    // Первая загрузка — как только подтверждена хотя бы одна база
    reaction(
      () => this.hasAccidentsAccess,
      (hasAccess) => {
        if (hasAccess && this.status === "idle") void this.load();
      },
      { fireImmediately: true },
    );

    reaction(
      () => store.auth.isAuthenticated,
      () => this.reset(),
    );

    reaction(
      () => store.auth.isAuthenticated,
      (hasAccess) => {
        if (hasAccess && this.status === "idle") void this.checkAccidentsAccess();
      },
      { fireImmediately: true },
    );
  }

  get hasAccidentsAccess(): boolean {
    return (this.allowedDbIndexes?.length ?? 0) > 0;
  }

  get isInitialLoad(): boolean {
    return this.status === "idle" || this.status === "loading";
  }

  get isBusy(): boolean {
    return this.status === "loading" || this.isRefreshing;
  }

  get hasPartialFailure(): boolean {
    return this.status === "ready" && this.failedFirms.length > 0;
  }

  // Ни одной базы с правом и есть ошибки — «не удалось проверить», а не «нет доступа»
  get rightsCheckFailed(): boolean {
    return (
      this.allowedDbIndexes !== null &&
      this.allowedDbIndexes.length === 0 &&
      this.rightsCheckErrors.length > 0
    );
  }

  get currencyCodes(): string[] {
    const codes = new Set<string>();
    this.rows.forEach((row) => {
      const code = row.CURRENCY_CODE?.trim();
      if (code) codes.add(code);
    });
    return Array.from(codes).sort();
  }

  get hasMixedCurrencies(): boolean {
    return this.currencyCodes.length > 1;
  }

  async load(): Promise<void> {
    const dbIndexes = this.allowedDbIndexes ?? [];
    if (dbIndexes.length === 0) return;

    this.abortController?.abort();
    const abort = new AbortController();
    this.abortController = abort;

    const hasData = this.status === "ready";
    if (hasData) {
      this.isRefreshing = true;
    } else {
      this.status = "loading";
    }
    this.loadedCount = 0;
    this.totalCount = dbIndexes.length;

    const results = await mapWithConcurrencyLimit(
      dbIndexes,
      DATA_LOAD_CONCURRENCY,
      async (dbIndex) => {
        const result = await getAccidentStat(dbIndex, abort.signal);
        return {
          ...result,
          rows: result.rows.map((row): AccidentRow => ({ ...row, DB_INDEX: dbIndex })),
        };
      },
    );

    if (abort.signal.aborted) return;

    runInAction(() => {
      const failed: string[] = [];
      const stale: { name: string; loadedAt: Date }[] = [];
      const incomplete: IncompleteFirm[] = [];
      const rejected: RejectedFirm[] = [];
      const now = new Date();

      results.forEach((result, i) => {
        const dbIndex = dbIndexes[i];
        const name = store.auth.getFirmName(dbIndex);
        if (result.status === "fulfilled") {
          const {
            rows,
            totalRecords,
            isComplete,
            rejected: rejectedCount,
            rejectReasons,
          } = result.value;
          this.snapshots.set(dbIndex, { rows, loadedAt: now });
          if (!isComplete && totalRecords !== null) {
            incomplete.push({ name, received: rows.length, totalRecords });
          }
          if (rejectedCount > 0) {
            rejected.push({ name, count: rejectedCount, details: describeRejects(rejectReasons) });
          }
        } else {
          failed.push(name);
          const previous = this.snapshots.get(dbIndex);
          if (previous) stale.push({ name, loadedAt: previous.loadedAt });
        }
      });

      this.abortController = null;
      this.isRefreshing = false;
      this.failedFirms = failed;
      this.staleFirms = stale;

      if (failed.length === dbIndexes.length && !hasData) {
        this.rows = [];
        this.status = "failed";
        return;
      }

      const merged: AccidentRow[] = [];
      dbIndexes.forEach((dbIndex) => {
        const snapshot = this.snapshots.get(dbIndex);
        if (snapshot) merged.push(...snapshot.rows);
      });

      this.rows = merged;
      this.incompleteFirms = incomplete;
      this.rejectedFirms = rejected;
      if (failed.length < dbIndexes.length) this.loadedAt = now;
      this.status = "ready";
      setCurrencyCode(this.currencyCodes.length === 1 ? this.currencyCodes[0] : null);
    });
  }

  reload(): void {
    void this.load();
  }

  async checkAccidentsAccess(): Promise<void> {
    if (store.auth.firms.length === 0) return;

    this.rightsAbort?.abort();
    const abort = new AbortController();
    this.rightsAbort = abort;
    this.isCheckingRights = true;

    const dbIndexes = store.auth.firms.map((firm, index) => firmDbIndex(firm, index));
    const results = await mapWithConcurrencyLimit(dbIndexes, DATA_LOAD_CONCURRENCY, (dbIndex) =>
      checkRight(dbIndex, ACCIDENTS_RIGHT_CODE, abort.signal),
    );

    if (abort.signal.aborted) return;

    runInAction(() => {
      const allowed: number[] = [];
      const errored: string[] = [];

      results.forEach((result, i) => {
        const dbIndex = dbIndexes[i];
        if (result.status === "fulfilled") {
          if (result.value) allowed.push(dbIndex);
        } else {
          errored.push(store.auth.getFirmName(dbIndex));
        }
      });

      this.allowedDbIndexes = allowed;
      this.rightsCheckErrors = errored;
      this.isCheckingRights = false;
      this.rightsAbort = null;
    });
  }

  // Если часть баз не прошла проверку права — сначала права, затем данные
  async retry(): Promise<void> {
    if (this.rightsCheckErrors.length > 0) {
      await this.checkAccidentsAccess();
      if (!this.hasAccidentsAccess) return;
      // Загрузку уже запустила реакция
      if (this.status === "loading") return;
    }
    await this.load();
  }

  reset(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.rows = [];
    this.status = "idle";
    this.isRefreshing = false;
    this.loadedCount = 0;
    this.totalCount = 0;
    this.failedFirms = [];
    this.incompleteFirms = [];
    this.rejectedFirms = [];
    this.staleFirms = [];
    this.snapshots.clear();
    this.loadedAt = null;
    setCurrencyCode(null);
  }
}

export const accidentsStore = new AccidentsStore();
