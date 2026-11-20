import type { AxiosRequestConfig } from "axios";
import { getLoginQuery } from "../config/create";
import type { IResponseAPI } from "../types/IResponseAPI";
import { base64Password, requestGet, requestLogin } from "../utils/common";
import { getAuthorized } from "./httpClient";

/**
 * Авторизация пользователя в приложении
 */
export const loginAPI = async (
  login: string,
  password: string,
  dbGuid: string | null,
  errorApiReport: boolean = true,
  errorServerReport: boolean = true,
): Promise<IResponseAPI | null> => {
  if (!dbGuid) return null;
  const url = `api-v2/auth/loginAppUser?${getLoginQuery()}`;
  const config: AxiosRequestConfig = {
    auth: { username: login, password },
    headers: { Params: JSON.stringify({ DB_GUID: dbGuid }) },
  };
  const response = await requestLogin(url, {
    errorApiReport,
    errorServerReport,
    config,
    requestName: `loginAPI (${url})`,
  });
  return response;
};

/**
 * Регистрация по номеру телефона
 */
export const registerByPhoneAPI = async (
  phone: string,
  dbGuid: string | null,
  errorApiReport: boolean = true,
  errorServerReport: boolean = true,
) => {
  const config: AxiosRequestConfig = {
    auth: { username: phone, password: "Register!" },
    headers: { Params: JSON.stringify({ DB_GUID: dbGuid }) },
  };
  const url = `api-v2/auth/registerByPhone?${getLoginQuery()}`;
  const response = await requestLogin(url, {
    errorApiReport,
    errorServerReport,
    config,
    requestName: `registerByPhoneAPI (${url})`,
  });
  return response;
};

/**
 * Отправка кода подтверждения
 */
export const registerConfirmCodeAPI = async (
  phone: string,
  code: string,
  errorApiReport: boolean = true,
  errorServerReport: boolean = true,
): Promise<IResponseAPI | null> => {
  const url = `api-v2/auth/confirmCode?${getLoginQuery()}`;
  const config: AxiosRequestConfig = { auth: { username: phone, password: code } };
  const response = await requestLogin(url, {
    errorApiReport,
    errorServerReport,
    config,
    requestName: `registerByPhoneAPI (${url})`,
  });
  return response;
};

/**
 * Смена пароля пользователя
 */
export const changeClientPasswordAPI = async (
  password: string,
  errorApiReport: boolean = true,
  errorServerReport: boolean = true,
): Promise<IResponseAPI | null> => {
  const base64 = base64Password(password);
  const url = `api-v2/auth/changePassword/${base64}`;
  const response = await requestGet(url, {
    errorApiReport,
    errorServerReport,
    requestName: `changeClientPasswordAPI (${url})`,
  });
  return response;
};

/**
 * Выход пользователя из приложения
 */
export const logoutAPI = async (
  errorApiReport: boolean = true,
  errorServerReport: boolean = true,
): Promise<IResponseAPI | null> => {
  const url = `api-v2/auth/logout`;
  const response = await requestGet(url, {
    errorApiReport,
    errorServerReport,
    requestName: `logoutAPI (${url})`,
  });
  return response;
};

/*
 * Получение информации о зарегестрированном пользователе
 */
export const getLoginParamsApi = async (
  errorApiReport: boolean = true,
  errorServerReport: boolean = true,
) => {
  const url = "api-v2/auth/me";
  const response = await requestGet(url, {
    errorApiReport,
    errorServerReport,
    requestName: `getLoginParamsApi (${url})`,
  });
  return response;
};

/**
 * Проверка прав пользователя
 */

export const checkRight = async (
  dbIndex: number,
  rightCode: string,
  signal?: AbortSignal,
): Promise<boolean> => {
  const { data } = await getAuthorized<Record<string, boolean>>(
    `/api-v2/SpecialRequests/UserRight/${rightCode}`,
    { params: { DBIndex: dbIndex }, signal },
  );

  return Boolean(data?.[rightCode]);
};
