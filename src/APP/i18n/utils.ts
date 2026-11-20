import type { TLanguageСode } from "@/APP/i18n/types/TLanguageСode";
import { LOCALES } from "../clients";

const isLanguageSupport = (lang: string): boolean => {
  return LOCALES.includes(lang as TLanguageСode);
};

export { isLanguageSupport };
