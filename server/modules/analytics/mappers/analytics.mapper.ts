import type { AnalyticsSeriesPoint, DataGapInsight } from "../types";

export class AnalyticsMapper {
  static toDataGap(row: any): DataGapInsight {
    return {
      objectId: String(row.site_id ?? row.id ?? "unknown"),
      objectName: row.site_name ?? row.name ?? "Неизвестный узел",
      missingDays: Number(row.missing_days ?? 0),
      lastMeasurement: row.last_measurement ? new Date(row.last_measurement) : null,
    };
  }

  static toSeriesPoint(row: any): AnalyticsSeriesPoint {
    return {
      date: new Date(row.date ?? row.measurement_date ?? Date.now()),
      missingDataShare: Number(row.missing_share ?? row.missingDataShare ?? 0),
      equipmentFaultShare: Number(row.fault_share ?? row.equipmentFaultShare ?? 0),
      massImbalanceShare: Number(row.imbalance_share ?? row.massImbalanceShare ?? 0),
    };
  }
}
