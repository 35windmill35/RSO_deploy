import { makeAutoObservable, reaction } from "mobx";
import { makePersistable } from "mobx-persist-store";
import store from "@/APP/store/root";
import type { Period, PeriodType, VatMode } from "../api/contract";
import { lastClosedPeriod } from "../lib/periodKey";
import { periodsStore } from "./periodsStore";

// Фильтры сайдбара. Выбранное значение хранится отдельно для каждого уровня —
// при переключении Месяц ↔ Квартал выбор не теряется.
class FiltersStore {
  periodType: PeriodType = "M";
  selectedKeys: Record<PeriodType, number | null> = { M: null, Q: null, Y: null };
  vat: VatMode = "Brutto";

  constructor() {
    makeAutoObservable(this);
    makePersistable(this, {
      name: "RsoFiltersStoreDashboard",
      storage: window.localStorage,
      properties: ["periodType", "vat"],
    });

    // Выход — выбранные периоды прошлого пользователя не переносим
    reaction(
      () => store.auth.isAuthenticated,
      (isAuthenticated) => {
        if (!isAuthenticated) this.selectedKeys = { M: null, Q: null, Y: null };
      },
    );
  }

  // Периоды уровня, посчитанные на бэкенде (DashboardRSOPeriods), от новых к старым
  get periodOptions(): Period[] {
    return periodsStore.options(this.periodType);
  }

  // Выбранный период. По умолчанию — последний закрытый (как в «Точках роста»):
  // текущий месяц обычно неполный, и его KPI выглядят провальными. Если закрытых
  // периодов на бэкенде нет — самый свежий. null — периодов нет вовсе.
  get period(): Period | null {
    const options = this.periodOptions;
    const key = this.selectedKeys[this.periodType];
    const selected = options.find((option) => option.key === key);
    if (selected) return selected;
    const lastClosed = lastClosedPeriod(this.periodType, new Date()).key;
    return options.find((option) => option.key <= lastClosed) ?? options[0] ?? null;
  }

  setPeriodType(type: PeriodType): void {
    this.periodType = type;
  }

  setPeriodKey(key: number): void {
    this.selectedKeys[this.periodType] = key;
  }

  setVat(vat: VatMode): void {
    this.vat = vat;
  }
}

export const filtersStore = new FiltersStore();
