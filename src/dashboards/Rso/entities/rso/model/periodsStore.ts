import { makeAutoObservable, observableRef, reaction, runInAction } from "mobx";
import type { Period, PeriodRow, PeriodType } from "../api/contract";
import { getPeriods } from "../api/rsoApi";
import { rsoErrorMessage } from "../lib/errors";
import { accessStore } from "./accessStore";

type LoadStatus = "idle" | "loading" | "ready" | "error";

// Посчитанные периоды выбранной базы (DashboardRSOPeriods)
class PeriodsStore {
  rows: PeriodRow[] = [];
  status: LoadStatus = "idle";
  error: string | null = null;

  private requestId = 0;

  constructor() {
    makeAutoObservable<PeriodsStore, "requestId">(this, {
      rows: observableRef,
      requestId: false,
    });

    reaction(
      () => accessStore.dbIndex,
      (dbIndex) => {
        if (dbIndex === null) this.reset();
        else void this.load(dbIndex);
      },
      { fireImmediately: true },
    );
  }

  // Периоды уровня — от новых к старым
  options(type: PeriodType): Period[] {
    return this.rows
      .filter((row) => row.PERIOD_TYPE === type)
      .map((row) => ({ type, key: row.PERIOD_KEY }))
      .sort((a, b) => b.key - a.key);
  }

  async load(dbIndex: number): Promise<void> {
    const requestId = ++this.requestId;
    this.status = "loading";
    this.error = null;
    try {
      const rows = await getPeriods(dbIndex);
      if (requestId !== this.requestId) return;
      runInAction(() => {
        this.rows = rows;
        this.status = "ready";
      });
    } catch (error) {
      if (requestId !== this.requestId) return;
      runInAction(() => {
        this.status = "error";
        this.error = rsoErrorMessage(error);
      });
    }
  }

  retry(): void {
    const dbIndex = accessStore.dbIndex;
    if (dbIndex !== null) void this.load(dbIndex);
  }

  reset(): void {
    this.requestId += 1;
    this.rows = [];
    this.status = "idle";
    this.error = null;
  }
}

export const periodsStore = new PeriodsStore();
