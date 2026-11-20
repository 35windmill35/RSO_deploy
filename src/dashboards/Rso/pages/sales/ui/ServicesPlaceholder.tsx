import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@Rso/shared/ui/Card/Card";

// Карточка «Виды услуг», пока данных вкладки нет: загрузка, ошибка, нет периодов
export function ServicesPlaceholder({ fallback }: { fallback: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Card title={t("rso.block.services.title")} subtitle={t("rso.block.services.subtitle")}>
      {fallback}
    </Card>
  );
}
