import type { ReactNode } from "react";
import { Skeleton } from "@GrowthPoints/shared/ui/Skeleton/Skeleton";
import { EmptyState } from "@GrowthPoints/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@GrowthPoints/shared/ui/ErrorState/ErrorState";

interface AsyncBoundaryProps {
  isLoading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  skeleton?: ReactNode;
  emptyMessage?: string;
  children?: ReactNode;
}

// Склеивает три обязательных состояния из ТЗ §5 (loading/empty/error) в
// одном месте, чтобы не дублировать if/if/if на каждом экране.
//
// Пример:
// <AsyncBoundary
//   isLoading={dashboardStore.isLoading}
//   error={dashboardStore.error}
//   isEmpty={dashboardStore.mastersFiltered.length === 0}
//   onRetry={() => periodsStore.load(authStore.dbIndex)}
// >
//   <MastersTable data={dashboardStore.mastersFiltered} />
// </AsyncBoundary>
export function AsyncBoundary({
  isLoading,
  error,
  isEmpty,
  onRetry,
  skeleton,
  emptyMessage,
  children,
}: AsyncBoundaryProps): ReactNode {
  if (isLoading) return skeleton ?? <Skeleton height={120} count={2} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (isEmpty) return <EmptyState message={emptyMessage} />;

  return children;
}
