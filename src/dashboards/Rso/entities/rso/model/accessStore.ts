import { makeAutoObservable, reaction, runInAction } from "mobx";
import { checkRight } from "@/API/requests/auth";
import { ApiError } from "@/API/requests/httpClient";
import store from "@/APP/store/root";
import { RSO_RIGHT_CODE, RSO_SKIP_RIGHTS_CHECK } from "@Rso/shared/config/api";

export interface FirmOption {
  dbIndex: number;
  name: string;
}

// Право на дашборд (RSO_RIGHT_CODE) проверяется в каждой базе пользователя (как в ДТП).
// Данные RSO агрегированные — базы не складываются, работаем с одной.
// Выбранная база — общая для приложения (store.auth.dbIndex, как в «Точках роста»).
class AccessStore {
  // null — права ещё не проверялись
  allowedDbIndexes: number[] | null = null;
  // Названия баз, где проверка упала с ошибкой
  rightsCheckErrors: string[] = [];

  private requestId = 0;

  constructor() {
    makeAutoObservable<AccessStore, "requestId">(this, { requestId: false });

    // Новая сессия или новый список баз (вход другим пользователем) — права заново
    reaction(
      () => (store.auth.isAuthenticated ? [store.auth.sessionId, store.auth.firms] : null),
      (session) => {
        this.reset();
        if (session) void this.check();
      },
      { fireImmediately: true },
    );
  }

  get hasAccess(): boolean {
    return (this.allowedDbIndexes?.length ?? 0) > 0;
  }

  // Ни одной базы с правом, но были ошибки — «не удалось проверить», а не «нет доступа»
  get checkFailed(): boolean {
    return (
      this.allowedDbIndexes !== null &&
      this.allowedDbIndexes.length === 0 &&
      this.rightsCheckErrors.length > 0
    );
  }

  // Рабочая база: выбранная в приложении, если на неё есть право, иначе первая разрешённая
  get dbIndex(): number | null {
    const allowed = this.allowedDbIndexes ?? [];
    return allowed.includes(store.auth.dbIndex) ? store.auth.dbIndex : (allowed[0] ?? null);
  }

  get firmOptions(): FirmOption[] {
    return (this.allowedDbIndexes ?? []).map((dbIndex) => ({ dbIndex, name: firmName(dbIndex) }));
  }

  setDbIndex(dbIndex: number): void {
    store.auth.setDbIndex(dbIndex);
  }

  async check(): Promise<void> {
    const dbIndexes = store.auth.firms.map((firm, index) =>
      Number.isInteger(firm.DBIndex) ? (firm.DBIndex as number) : index,
    );
    const requestId = ++this.requestId;

    // Баз нет — сразу «нет доступа», а не бесконечная проверка
    if (dbIndexes.length === 0 || RSO_SKIP_RIGHTS_CHECK) {
      if (RSO_SKIP_RIGHTS_CHECK) console.warn("[rso] rights check is disabled (dev)");
      this.allowedDbIndexes = dbIndexes;
      this.rightsCheckErrors = [];
      return;
    }

    const results = await Promise.allSettled(dbIndexes.map((dbIndex) => hasRight(dbIndex)));
    if (requestId !== this.requestId) return;

    runInAction(() => {
      const allowed: number[] = [];
      const errored: string[] = [];
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          if (result.value) allowed.push(dbIndexes[i]);
        } else {
          console.error("[rso] rights check failed", dbIndexes[i], result.reason);
          errored.push(firmName(dbIndexes[i]));
        }
      });
      this.allowedDbIndexes = allowed;
      this.rightsCheckErrors = errored;
    });
  }

  retry(): void {
    void this.check();
  }

  reset(): void {
    this.requestId += 1;
    this.allowedDbIndexes = null;
    this.rightsCheckErrors = [];
  }
}

// Статус 2 «нет прав» — это ответ «права нет», а не ошибка проверки
async function hasRight(dbIndex: number): Promise<boolean> {
  try {
    return await checkRight(dbIndex, RSO_RIGHT_CODE);
  } catch (error) {
    if (error instanceof ApiError && error.status === 2) return false;
    throw error;
  }
}

function firmName(dbIndex: number): string {
  const firm = store.auth.firms.find((item, index) => (item.DBIndex ?? index) === dbIndex);
  return firm?.FIRM_NAME?.trim() || firm?.FIRM_SHORT_NAME?.trim() || String(dbIndex);
}

export const accessStore = new AccessStore();
