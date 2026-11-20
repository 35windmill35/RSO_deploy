import type { AxiosRequestConfig } from "axios";

interface IRequestParams {
  errorServerReport: boolean;
  errorApiReport: boolean;
  config?: AxiosRequestConfig;
  queryParams?: string;
  requestName: string;
  subscribe?: boolean;
  offset?: number;
  limit?: number;
}

export type { IRequestParams };
