import type { IDashboardDefinition } from "../types/IDashboardDefinition";

export const getDashboardInit = (): IDashboardDefinition[] => {
  const result: IDashboardDefinition[] = [
    {
      id: "growthPoints",
      title: "Точки роста",
      description:
        "Выявляйте резервы производительности и сравнивайте результаты мастеров, механиков, марок и моделей.",
      to: "/growth-points",
      accent: "amber",
      summary: "Сравнение показателей",
      metrics: ["Оборот", "ЗН", "Средний чек", "Т-фактор", "Аккуратность"],
      availability: "available",
      clientType: "sto",
    },
    {
      id: "roadAccidents",
      title: "Статистика по ДТП",
      description:
        "Контролируйте происшествия, их причины, динамику, распределение по транспорту и тяжесть последствий.",
      to: "/road-accidents",
      accent: "blue",
      summary: "Контроль безопасности",
      metrics: ["Количество ДТП", "Причины", "Транспорт", "Периоды", "Последствия"],
      availability: "available",
      clientType: "atp",
    },
    {
      id: "rso",
      title: "Расширенный сводный отчёт",
      description:
        "Выручка, прибыль, загрузка ремзоны, склад и ФОТ сервиса с динамикой к прошлому периоду.",
      to: "/rso",
      accent: "blue",
      summary: "Финансы и продуктивность СТО",
      metrics: ["Выручка", "Прибыль", "Загрузка ремзоны", "Склад", "ФОТ"],
      availability: "available",
      clientType: "sto",
    },
  ];
  return result;
};
