import { AxiosError } from "axios";
import type { AxiosRequestConfig } from "axios";
import type { IRequestParams } from "../types/IRequestParams";
import type { IResponseAPI } from "../types/IResponseAPI";
import { api, getLoginQuery } from "../config/create";
import type { IPaginationConfig } from "../types/IPaginationConfig";
import type { TPaginationResult } from "../types/IPaginationResult";
import type { IDataResponseAPI } from "../types/IDataResponseAPI";
import { getApiError } from "./getApiError";
import { getServerError } from "./getServerError";
import i18n from "@/APP/i18n";
import store from "@/APP/store/root";

const requestLogin = async (url: string, params: IRequestParams): Promise<IResponseAPI | null> => {
  try {
    const response = await api.get<IResponseAPI>(url, params.config);
    if (response?.data?.result?.Status !== 0) {
      const error = new AxiosError(undefined, undefined, undefined, undefined, response);
      store.auth.setError(errorAnalyses(error, true, true));
    }
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) store.auth.setError(errorAnalyses(error, true, true));
    return null;
  }
};

const requestGet = async (
  url: string,
  {
    errorApiReport,
    errorServerReport,
    requestName,
    config,
    queryParams,
    offset,
    limit,
  }: IRequestParams,
  relogin: boolean = true,
): Promise<IResponseAPI | null> => {
  try {
    if (!store.auth.sessionId) return null;
    let urlRequest = `${url}?SESSIONID=${store.auth.sessionId}&Total=1`;
    if (queryParams) urlRequest += `&${queryParams}`;
    if (offset) urlRequest += `&Offset=${offset}`;
    if (limit) urlRequest += `&Limit=${limit}`;
    const response = await api.get<IResponseAPI>(urlRequest, config);
    if (response?.data?.result?.Status !== 0) {
      const error = new AxiosError(undefined, undefined, undefined, undefined, response);
      store.error.setMessage(errorAnalyses(error, errorApiReport, errorServerReport));
    }
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.status === 401 && store.auth.sessionId && relogin) {
        const isRelogin = await reLogin();
        if (isRelogin)
          requestGet(
            url,
            { errorApiReport, errorServerReport, requestName, config, queryParams },
            false,
          );
      } else store.error.setMessage(errorAnalyses(error, errorApiReport, errorServerReport));
    }
    return null;
  }
};

const requestPost = async <T>(
  url: string,
  { errorApiReport, errorServerReport, config, queryParams }: IRequestParams,
  body?: T,
): Promise<IResponseAPI | null> => {
  try {
    if (!store.auth.sessionId) return null;
    let urlRequest = `${url}?SESSIONID=${store.auth.sessionId}`;
    if (queryParams) urlRequest += `&${queryParams}`;
    const response = await api.post<IResponseAPI>(urlRequest, body, config);
    if (response?.data?.result?.Status !== 0) {
      const error = new AxiosError(undefined, undefined, undefined, undefined, response);
      store.error.setMessage(errorAnalyses(error, errorApiReport, errorServerReport));
    }
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError)
      store.error.setMessage(errorAnalyses(error, errorApiReport, errorServerReport));
    return null;
  }
};

const getPagination = async <T>(
  url: string,
  label: string,
  {
    errorApiReport,
    errorServerReport,
    requestName,
    config,
    queryParams = "",
    subscribe,
  }: IRequestParams,
  { offset = 0, limit }: IPaginationConfig,
): Promise<TPaginationResult<T>> => {
  let result: TPaginationResult<T> = null;
  let newQueryParams = `${queryParams}&Offset=${offset}`;
  const data = await requestGet(url, {
    errorApiReport,
    errorServerReport,
    requestName,
    config,
    queryParams: newQueryParams,
  });
  if (data === null || data?.result?.Status !== 0) return result;
  const item = (data?.result?.Response as Record<string, IDataResponseAPI>)?.[label];
  if (!item) result;
  let total: number = limit ? limit : item.totalRecords;
  if (item.totalRecords < total) total = item.totalRecords;
  if (item.totalRecords === undefined) total = item.data?.length;
  if (!total || total < 0) result;
  const objectList: T[] = new Array(total);
  const subsriptions: string[] = [];
  item.data.forEach((el: object, i: number) => (objectList[i] = el as T));
  if (subscribe && item.subscription) subsriptions.push(item.subscription);
  if (total > item.data.length) {
    const lengthPart = item.data.length;
    const count = Math.ceil((total - offset) / lengthPart);
    const allPromises: Promise<IResponseAPI | null>[] = [];
    for (let i = 1; i < count; i++) {
      newQueryParams = queryParams + `&Offset=${lengthPart * i + offset}`;
      allPromises.push(
        requestGet(url, {
          errorApiReport: false,
          errorServerReport: false,
          requestName,
          config,
          queryParams: newQueryParams,
        }),
      );
    }
    const response = await Promise.all(allPromises);
    if (response?.length) {
      response.forEach((part, index) => {
        const sectionItems = (part?.result?.Response as Record<string, IDataResponseAPI>)?.[label];
        if (sectionItems.data?.length) {
          sectionItems.data.forEach((el: object, i: number) => {
            objectList[(index + 1) * lengthPart + i] = el as T;
          });
        }
        if (subscribe && sectionItems.subscription) subsriptions.push(sectionItems.subscription);
      });
    }
  }
  const items = objectList.length > total ? objectList.slice(0, total) : objectList;
  result = { items, subsriptions: subscribe ? subsriptions : undefined };
  return result;
};

const reLogin = async (): Promise<boolean> => {
  try {
    const url = `api-v2/auth/login?${getLoginQuery()}`;
    const login = store.auth.phone;
    const password = store.auth.password;
    const config: AxiosRequestConfig = {
      auth: { username: login, password },
    };
    const response = await requestLogin(url, {
      errorApiReport: false,
      errorServerReport: true,
      config,
      requestName: "loginAPI (api-v2/auth/login)",
    });
    if (!response?.SESSIONID) {
      store.auth.logout();
      return false;
    } else {
      store.auth.setSessionId(response.SESSIONID);
      return true;
    }
  } catch {}
  return false;
};

const errorAnalyses = (
  error: AxiosError,
  errorApiReport: boolean,
  errorServerReport: boolean,
): string | null => {
  const response = error?.response?.data as IResponseAPI;
  if (!errorApiReport && !errorServerReport) return null;
  if (response?.result?.Status) {
    if (response.result.Status === 1) resetAuth();
    if (!errorApiReport) return null;
    if (response.result.Status === -2) return response.result.Message;
    else return i18n.t(getApiError(response.result.Status));
  } else {
    if (!errorServerReport) return null;
    if (error?.response?.status) {
      if (error.response.status === 401) resetAuth();
      return i18n.t(getServerError(error.response?.status));
    } else {
      if (error?.code === "ERR_NETWORK") return i18n.t("err.internet.off");
      else return i18n.t("error");
    }
  }
};

const resetAuth = () => {
  store.auth.reset();
};

const base64Password = (password: string): string => {
  const bytes = new TextEncoder().encode(password);
  const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binaryString);
};

export { requestLogin, requestGet, requestPost, getPagination, reLogin, base64Password };
