import { makeAutoObservable, runInAction } from "mobx";
import { makePersistable } from "mobx-persist-store";
import { getZVar } from "./utils/getZVar";
import { ATP, type IATPZVarAPI } from "@/API/types/zvar/IATPZVarAPI";
import type { TClientType } from "./types/IDashboardDefinition";

export class ZVarStore {
  [ATP]: boolean = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    makePersistable(this, {
      name: "ZVarStoreDashboard",
      storage: window.sessionStorage,
      properties: [ATP],
    });
  }

  reset() {
    this[ATP] = false;
  }

  get clientType(): TClientType {
    if (this[ATP] === true) return "atp";
    return "sto";
  }

  async getZVars() {
    const [atp] = await Promise.all([getZVar<IATPZVarAPI>(ATP)]);
    runInAction(() => {
      this[ATP] = atp === "1" ? true : false;
    });
  }
}
