import { ru } from "date-fns/locale";
import type { TLanguageСode } from "@/APP/i18n/types/TLanguageСode";
import type { TLanguageLocales } from "@/APP/i18n/types/TLanguageLocales";

// Подпуть сайта без конечного «/»: на GitHub Pages — "/RSO_deploy", локально — "".
// Относительный base ("./" при VITE_BASE_URL='') подпутём не считается
const BASE_URL = import.meta.env.BASE_URL;
export const BASENAME_CLIENT = BASE_URL.startsWith("/") ? BASE_URL.replace(/\/$/, "") : "";
export const API_URL_CLIENT = "https://api-t3.basgroup.ru/";
export const LOCALES_CLIENT: TLanguageСode[] = ["ru"];
export const LOCALES_LIST_CLIENT: TLanguageLocales = { ru };
export const LANGUAGE_DEFAULT_CLIENT: TLanguageСode = "ru";
export const DB_GUID_CLIENT = "";
export const LOGIN_CLIENT = "";
export const PASSWORD_CLIENT = "";
