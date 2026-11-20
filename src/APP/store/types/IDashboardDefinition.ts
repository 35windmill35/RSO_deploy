export interface IDashboardDefinition {
  id: TDashboardId;
  title: string;
  description: string;
  to: string;
  accent: "amber" | "blue";
  summary: string;
  metrics: readonly string[];
  availability: TAvailability;
  clientType: TClientType;
}

export type TDashboardId = "growthPoints" | "roadAccidents" | "rso";
export type TAvailability = "available" | "unavailable" | "developed";
export type TClientType = "atp" | "sto" | "all";
