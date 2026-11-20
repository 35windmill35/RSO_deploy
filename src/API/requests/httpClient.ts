import { API_URL } from "@/APP/clients";
import i18n from "@/APP/i18n";
import store from "@/APP/store/root";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message?: string, data?: unknown) {
    super(message || `API error, status=${status}`);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type QueryParamPrimitive = string | number | boolean;

type QueryParamValue =
  | QueryParamPrimitive
  | null
  | undefined
  | Record<string, QueryParamPrimitive | null | undefined>;

export type QueryParams = Record<string, QueryParamValue>;

function buildUrl(path: string, params: QueryParams = {}): string {
  const url = new URL(path, API_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        if (nestedValue !== undefined && nestedValue !== null) {
          url.searchParams.set(`${key}[${nestedKey}]`, String(nestedValue));
        }
      });
      return;
    }
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

export interface ApiResult<T = unknown> {
  data: T;
  sessionId?: string;
  remaining?: number;
}

async function parseResponse<T = unknown>(response: Response): Promise<ApiResult<T>> {
  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}`);
  }
  const body = await response.json();
  const { Status, Message, Response: data } = body.result || {};
  if (Status !== 0) throw new ApiError(Status, Message, data);

  return {
    data,
    sessionId: body.SESSIONID,
    remaining: body.remaining,
  };
}

interface AuthorizedOptions {
  params?: QueryParams;
  signal?: AbortSignal;
}

export async function getAuthorized<T = unknown>(
  path: string,
  { params, signal }: AuthorizedOptions = {},
): Promise<ApiResult<T>> {
  const sessionId = store.auth.sessionId;
  if (!sessionId) {
    throw new ApiError(401, i18n.t("growthPoints.noAuth"));
  }
  try {
    const response = await fetch(buildUrl(path, params), {
      headers: {
        Authorization: `Bearer ${sessionId}`,
      },
    });
    return parseResponse<T>(response);
  } catch (err) {
    throw err;
  }
}
