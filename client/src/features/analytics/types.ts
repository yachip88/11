export type PeriodPreset = "day" | "week" | "month" | "year";

export interface AnalyticsFilters {
  period: PeriodPreset;
  startDate?: string | null;
  endDate?: string | null;
  rtsId?: string | null;
  districtId?: string | null;
}

export interface AnalyticsKpi {
  id: "missing-data" | "equipment-faults" | "mass-imbalance" | "efficiency";
  label: string;
  value: number;
  unit?: string;
  trendPercent?: number;
  status: "ok" | "warning" | "critical";
  description?: string;
}

export interface FlowBalanceInsight {
  supply: number;
  return: number;
  imbalancePercent: number;
  thresholdPercent: number;
}

export interface DataGapInsight {
  objectId: string;
  objectName: string;
  missingDays: number;
  lastMeasurement: string;
}

export interface TrendPoint {
  date: string;
  missingDataShare: number;
  equipmentFaultShare: number;
  massImbalanceShare: number;
}

export interface AnalyticsSummary {
  kpis: AnalyticsKpi[];
  balance: FlowBalanceInsight;
  dataGaps: DataGapInsight[];
  updatedAt: string;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  trend: TrendPoint[];
}
