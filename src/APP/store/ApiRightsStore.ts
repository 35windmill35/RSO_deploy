import { makeAutoObservable, runInAction } from "mobx";
import { makePersistable } from "mobx-persist-store";

export class ApiRightsStore {
  aiAvailable: boolean | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    makePersistable(this, {
      name: "ApiRightsStoreDashboard",
      storage: window.sessionStorage,
      properties: ["aiAvailable"],
    });
  }
  reset() {
    this.aiAvailable = null;
  }

  get canUseAI(): boolean {
    return this.aiAvailable ?? false;
  }

  async getAllRight() {
    await Promise.all([]);
  }
}
