// Код права пользователя на дашборд (SpecialRequests/UserRight/<код>?DBIndex=…)
export const RSO_RIGHT_CODE = "Dashboard_Summary_Report";

// Пропуск проверки права — только в dev-режиме и только по явной переменной
// окружения VITE_RSO_SKIP_RIGHTS_CHECK=true. В прод-сборке всегда false.
export const RSO_SKIP_RIGHTS_CHECK =
  import.meta.env.DEV && import.meta.env.VITE_RSO_SKIP_RIGHTS_CHECK === "true";
