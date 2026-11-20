import type { Locale } from "date-fns";
import type { TLanguageAll } from "./TLanguageAll";

type TLanguageLocales = { [K in keyof TLanguageAll]?: Locale };

export type { TLanguageLocales };
