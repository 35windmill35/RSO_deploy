import { makeAutoObservable, runInAction } from "mobx";
import { makePersistable } from "mobx-persist-store";
import { DB_GUID, LOGIN, PASSWORD } from "../clients";
import type { TAuthPages } from "./types/TAuthPages";
import { regularClearNumber } from "./utils/regularExpression";
import {
  changeClientPasswordAPI,
  getLoginParamsApi,
  loginAPI,
  logoutAPI,
  registerByPhoneAPI,
  registerConfirmCodeAPI,
} from "@/API/requests/auth";
import type { IResponseRegisterAPI } from "@/API/types/IResponseRegisterAPI";
import type { IResponseConfirmAPI } from "@/API/types/IResponseConfirmAPI";
import type { IResponseAPI } from "@/API/types/IResponseAPI";
import type { IFirmInfo } from "./types/IFirmInfo";
import type { Store } from "./root";

export class AuthStore {
  password: string = "";
  phone: string = "";
  dbGuid: string = "";
  sessionId: string | undefined;
  timeLeft: number = 0;
  attemptsLeft: number = 0;
  page: TAuthPages = "Login";
  isLoading: boolean = false;
  error: string | null = null;
  dbIndex = 0;
  firms: IFirmInfo[] = [];
  logoutUrl: string | null = null;
  store: Store;

  constructor(store: Store) {
    makeAutoObservable(this, { store: false }, { autoBind: true });
    makePersistable(this, {
      name: "AuthStoreDashboard",
      storage: window.sessionStorage,
      properties: ["sessionId", "dbGuid", "password", "phone", "firms", "logoutUrl"],
    });
    this.store = store;
  }

  reset() {
    const isDev = import.meta.env.MODE === "development";
    this.phone = isDev ? LOGIN : "";
    this.password = isDev ? PASSWORD : "";
    this.sessionId = undefined;
    this.timeLeft = 0;
    this.attemptsLeft = 0;
    this.isLoading = false;
    this.error = null;
    this.logoutUrl = null;
  }

  get isAuthenticated(): boolean {
    const hasFirms = this.firms.length > 0;
    return Boolean(this.sessionId) && hasFirms;
  }

  get currentFirm(): IFirmInfo | null {
    return this.firms[this.dbIndex] || null;
  }

  getFirmName(dbIndex: number): string {
    const result = this.firms[dbIndex] || null;
    return result?.FIRM_SHORT_NAME || "-";
  }

  setLogoutUrl(value: string | null) {
    this.logoutUrl = value;
  }

  setDbIndex(index: number): void {
    this.dbIndex = index;
  }

  readDbGuid() {
    let result = "";
    const browserUrl = document.location.search;
    var searchParams = new URLSearchParams(browserUrl);
    let dbGuid = searchParams.get("DB_GUID");
    if (dbGuid) result = dbGuid;
    else {
      if (this.dbGuid) return;
      if (import.meta.env.DEV && DB_GUID) result = DB_GUID;
    }
    this.dbGuid = result;
  }

  setPage(value: TAuthPages) {
    this.page = value;
  }

  setSessionId(value?: string) {
    this.sessionId = value;
  }

  setPassword(value: string) {
    this.password = value;
  }

  setPhone(value: string) {
    const phoneValid = regularClearNumber(value);
    this.phone = phoneValid;
  }

  setError(value: string | null) {
    this.error = value;
  }

  async login(phone: string, password: string) {
    const phoneValid = regularClearNumber(phone);
    runInAction(() => (this.isLoading = true));
    const result = await loginAPI(phoneValid, password, this.dbGuid);
    runInAction(() => (this.isLoading = false));
    if (!result?.SESSIONID || result.result?.Status !== 0) return false;
    runInAction(() => {
      this.setPhone(phoneValid);
      this.password = password;
    });
    await this.afterLogin(result);
    return true;
  }

  async registration(phone: string) {
    const phoneValid = regularClearNumber(phone);
    runInAction(() => (this.isLoading = true));
    const loginResult = await registerByPhoneAPI(phoneValid, this.dbGuid);
    runInAction(() => (this.isLoading = false));
    this.setPhone(phone);
    if (loginResult?.result.Status === 0) {
      const value = loginResult.result.Response as IResponseRegisterAPI;
      runInAction(() => {
        this.attemptsLeft = value.AttemptsLeft;
        this.timeLeft = value.TimeLeft;
      });
    }
    return loginResult?.result.Status === 0;
  }

  async registrationConfirm(code: string) {
    const phoneValid = regularClearNumber(this.phone);
    runInAction(() => (this.isLoading = true));
    const confirm = await registerConfirmCodeAPI(phoneValid, code);
    if (confirm?.result.Status === 0) {
      const param = confirm.result.Response as IResponseConfirmAPI;
      this.setPassword(param.Password);
      const result = await loginAPI(phoneValid, param.Password, this.dbGuid);
      if (result?.result?.Status === 0 && result.SESSIONID) {
        runInAction(() => (this.error = null));
        await this.afterLogin(result);
      } else this.setSessionId();
    }
    runInAction(() => (this.isLoading = false));
    return confirm;
  }

  async changePassword(password: string) {
    runInAction(() => (this.isLoading = true));
    const response = await changeClientPasswordAPI(password);
    runInAction(() => (this.isLoading = false));
    if (response?.result.Status === 0) this.setPassword(password);
    else this.setSessionId();
    return response?.result.Status === 0;
  }

  async checkSessionId(sessionId?: string | null): Promise<boolean> {
    if (!sessionId || sessionId.length < 60 || sessionId.length > 70) return false;
    runInAction(() => {
      this.sessionId = sessionId;
    });
    const response = await getLoginParamsApi(false, false);
    if (response?.result.Status !== 0) {
      runInAction(() => this.reset());
      return false;
    }
    response.SESSIONID = sessionId;
    await this.afterLogin(response);
    return true;
  }

  async afterLogin(value: IResponseAPI) {
    this.setSessionId(value.SESSIONID);
    await this.store.zvar.getZVars();
    await this.store.apiRights.getAllRight();
    const data = (value.result.Response as IFirmInfo[]) ?? [];
    const firms = data?.map((item, index) => ({ ...item, DBIndex: index }));
    runInAction(() => {
      this.dbIndex = 0;
      this.firms = firms ?? [];
    });
  }

  async logout() {
    const redirectUrl = this.logoutUrl;
    try {
      await logoutAPI();
    } finally {
      this.reset();
    }
    if (redirectUrl) {
      const targetUrl = new URL(redirectUrl);
      if (targetUrl.origin === window.location.origin) window.location.replace(redirectUrl);
    }
  }
}
