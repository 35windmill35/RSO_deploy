import type { ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import type { AccountRow, DashboardRsoData, Period } from "@Rso/entities/rso/api/contract";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { drillStore } from "../../model/drillStore";

interface DashboardGateProps {
  period: Period;
  children: (data: DashboardRsoData) => ReactNode;
}

// Ответ DashboardRSO за период уровня: загрузка, ошибка с повтором или содержимое
export const DashboardGate = observer(function DashboardGate({
  period,
  children,
}: DashboardGateProps) {
  const resource = drillStore.dashboard(period);
  if (!resource || resource.status === "loading") return <BlockState kind="loading" />;
  if (resource.status === "error" || !resource.data) {
    return (
      <BlockState kind="error" message={resource.error} onRetry={() => drillStore.retryNode()} />
    );
  }
  return <>{children(resource.data)}</>;
});

interface AccountsGateProps {
  period: Period;
  children: (rows: AccountRow[]) => ReactNode;
}

// Заказ-наряды месяца уровня: загрузка, ошибка с повтором или содержимое
export const AccountsGate = observer(function AccountsGate({
  period,
  children,
}: AccountsGateProps) {
  const { t } = useTranslation();
  const resource = drillStore.accountsOf(period.key);
  if (!resource || resource.status === "loading") {
    return <BlockState kind="loading" message={t("rso.drill.loadingAccounts")} />;
  }
  if (resource.status === "error" || !resource.data) {
    return (
      <BlockState kind="error" message={resource.error} onRetry={() => drillStore.retryNode()} />
    );
  }
  return <>{children(resource.data)}</>;
});
