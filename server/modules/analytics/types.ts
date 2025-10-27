export type PeriodPreset = "day" | "week" | "month" | "year";

export interface AnalyticsQueryParams {
  period: PeriodPreset;
  startDate?: string;
  endDate?: string;
  rtsId?: string;
  districtId?: string;
}

export interface AnalyticsMetric {
  id: string;
  label: string;
  value: number;
  unit?: string;
  trendPercent?: number;
  status: "ok" | "warning" | "critical";
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
  lastMeasurement: Date | null;
}

export interface AnalyticsSummary {
  updatedAt: Date;
  kpis: AnalyticsMetric[];
  balance: FlowBalanceInsight;
  dataGaps: DataGapInsight[];
}

export interface AnalyticsSeriesPoint {
  date: Date;
  missingDataShare: number;
  equipmentFaultShare: number;
  massImbalanceShare: number;
}

export interface AnalyticsPayload {
  summary: AnalyticsSummary;
  trend: AnalyticsSeriesPoint[];
}
