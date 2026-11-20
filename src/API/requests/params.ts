import type { IResponseAPI } from "../types/IResponseAPI";
import { requestGet } from "../utils/common";

/*
 * Получение переменных ZVAR
 */
const getZVarApi = async (
  zvar: string,
  queryParams?: string,
  errorApiReport: boolean = true,
  errorServerReport: boolean = true,
): Promise<IResponseAPI | null> => {
  const url = `api-v2/SpecialRequests/VarEnv/${zvar}`;
  const response = await requestGet(url, {
    errorApiReport,
    errorServerReport,
    requestName: `getZVarApi (${url})`,
    queryParams,
  });
  return response;
};

/*
 * Получение переменных из подраздела DefValues
 */
const getDefValuesApi = async (
  value: string,
  queryParams?: string,
  errorApiReport: boolean = true,
  errorServerReport: boolean = true,
): Promise<IResponseAPI | null> => {
  const url = `api-v2/SpecialRequests/DefValues/${value}`;
  const response = await requestGet(url, {
    errorApiReport,
    errorServerReport,
    requestName: `getDefValuesApi (${url})`,
    queryParams,
  });
  return response;
};

/*
 * Получение прав пользователя
 */
const getUserRightApi = async (
  right: string,
  queryParams?: string,
  errorApiReport: boolean = true,
  errorServerReport: boolean = true,
): Promise<IResponseAPI | null> => {
  const url = `api-v2/SpecialRequests/UserRight/${right}`;
  const response = await requestGet(url, {
    errorApiReport,
    errorServerReport,
    requestName: `getUserRightApi (${url})`,
    queryParams,
  });
  return response;
};

/*
 * Установка языка (locale) для ответов сервера
 */
const setLocaleApi = async (
  value: number,
  queryParams?: string,
  errorApiReport: boolean = true,
  errorServerReport: boolean = true,
): Promise<IResponseAPI | null> => {
  const url = `api-v2/auth/SetLocale/${value}`;
  const response = await requestGet(url, {
    errorApiReport,
    errorServerReport,
    requestName: `setLocaleApi (api-v2/auth/SetLocale/${value})`,
    queryParams,
  });
  return response;
};

export { getZVarApi, getDefValuesApi, getUserRightApi, setLocaleApi };
