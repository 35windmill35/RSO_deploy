import i18n from "@/APP/i18n";
import { ApiError } from "@/API/requests/httpClient";
import { getServerError } from "@/API/utils/getServerError";

const MAX_USER_MESSAGE = 200;

// Текст ошибки для пользователя. Сырой Message сервера наружу не отдаём:
// в нём бывают адрес SQL-сервера, имя базы и текст запроса — только в консоль.
export function rsoErrorMessage(error: unknown): string {
  if (error instanceof TypeError) return i18n.t("err.internet.off");

  if (error instanceof ApiError) {
    const { status, message } = error;
    // HTTP-ошибка (fetch вернул не 2xx)
    if (status >= 300) {
      if (status === 401) return i18n.t("rso.error.session");
      const key = getServerError(status);
      if (key !== "error") return i18n.t(key);
    }
    // Статусы API (§«Статус и ошибки» документации)
    if (status === 1 || status === 5) return i18n.t("rso.error.session");
    if (status === 2) return i18n.t("rso.error.noRights");
    // −4 информация, −3 предупреждение — тексты для пользователя
    if ((status === -4 || status === -3) && message) return message.slice(0, MAX_USER_MESSAGE);
  }

  console.error("[rso] API error", error);
  return i18n.t("rso.error.load");
}
