import { ApiRightsStore } from "./ApiRightsStore";
import { AuthStore } from "./AuthStore";
import { DashBoardStore } from "./DashBoardStore";
import { ErrorStore } from "./ErrorStore";
import { ThemeStore } from "./ThemeStore";
import { ZVarStore } from "./ZVarStore";

export class Store {
  auth: AuthStore;
  error: ErrorStore;
  dashboard: DashBoardStore;
  zvar: ZVarStore;
  theme: ThemeStore;
  apiRights: ApiRightsStore;

  constructor() {
    this.auth = new AuthStore(this);
    this.error = new ErrorStore();
    this.dashboard = new DashBoardStore();
    this.zvar = new ZVarStore();
    this.theme = new ThemeStore();
    this.apiRights = new ApiRightsStore();
  }
}

const store = new Store();
export default store;
