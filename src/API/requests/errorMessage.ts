import i18n from "@/APP/i18n";
import { ApiError } from "./httpClient";
import { getServerError } from "@/API/utils/getServerError";

const RAW_HTTP_MESSAGE = /^HTTP \d+$/;

export interface ErrorMessageOptions {
  fallback?: string;
  statusMessages?: Record<number, string>;
}

export function getErrorMessage(err: unknown, options: ErrorMessageOptions = {}): string {
  const { fallback = i18n.t("error.unknown"), statusMessages = {} } = options;
  if (!err) return fallback;
  if (err instanceof TypeError) {
    return i18n.t("err.internet.off");
  }
  const status = err instanceof ApiError ? err.status : (err as { status?: number })?.status;
  const statusMessage = i18n.t(getServerError(status));
  if (status && statusMessages[status]) return statusMessages[status];
  if (status && statusMessage) return statusMessage;
  const message = (err as { message?: string })?.message;
  if (message && !RAW_HTTP_MESSAGE.test(message)) return message;
  return fallback;
}
