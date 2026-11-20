import { makeAutoObservable } from "mobx";
import type { IDashboardDefinition, TClientType } from "./types/IDashboardDefinition";
import { getDashboardInit } from "./utils/getDashboard";

export class DashBoardStore {
  dashboard: IDashboardDefinition[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  getDashboard(clientType?: TClientType) {
    if (!this.dashboard.length) this.dashboard = getDashboardInit();
    if (!clientType) return this.dashboard;
    return this.dashboard.filter((item) => {
      if (clientType === "all" || item.clientType === "all") return true;
      return clientType === item.clientType;
    });
  }
}
