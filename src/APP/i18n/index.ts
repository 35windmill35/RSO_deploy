import i18n from "i18next";
import Backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import type { II18nInitOption } from "./types/II18nInitOption";
import { BASENAME, LANGUAGE_DEFAULT, LOCALES } from "@/APP/clients";

const isDev = import.meta.env.MODE === "development";
const appVersion = import.meta.env.VITE_APP_VERSION ?? "dev";

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    interpolation: { escapeValue: false },
    fallbackLng: LANGUAGE_DEFAULT,
    supportedLngs: LOCALES,
    detection: {
      order: ["localStorage"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    debug: false,
    backend: {
      loadPath: `${isDev ? "" : BASENAME}/locales/{{lng}}/translation.json`,
      // В разработке — новая версия на каждый запуск, иначе браузер держит
      // старый translation.json из кэша и новые ключи показываются как есть
      queryStringParams: {
        v: isDev ? String(Date.now()) : appVersion,
      },
    },
  } as II18nInitOption);
export default i18n;
