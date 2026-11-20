interface II18nInitOption {
  interpolation: { escapeValue: boolean };
  fallbackLng: string;
  detection?: object;
  supportedLngs?: string[];
  lng: string;
  debug: boolean;
  backend: {
    loadPath: string;
    queryStringParams: { v: string };
  };
}

export type { II18nInitOption };
