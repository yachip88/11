import { DbStorage } from "../../../db-storage";
import type { AnalyticsPayload, AnalyticsQueryParams } from "../types";

export class AnalyticsService {
  constructor(private readonly storage = new DbStorage()) {}

  async getSummary(filters: AnalyticsQueryParams): Promise<AnalyticsPayload> {
    // TODO: заменить генератор на реальные MSSQL-запросы.
    const baseline = await this.storage.getRTSWithStats().catch(() => []);
    const totalMakeup = baseline.reduce((sum, item: any) => sum + (item.totalMakeupWater ?? 0), 0);
    const updatedAt = new Date();

    const summary = {
      updatedAt,
      kpis: [
        {
          id: "missing-data",
          label: "Нет данных > 3 дней",
          value: Math.max(Math.round(baseline.length * 0.12), 3),
          unit: "участков",
          trendPercent: filters.period === "week" ? -3.2 : -1.1,
          status: "warning" as const,
        },
        {
          id: "equipment-faults",
          label: "Неисправности",
          value: Math.max(Math.round(baseline.length * 0.08), 2),
          unit: "точек",
          trendPercent: 1.4,
          status: "critical" as const,
        },
        {
          id: "mass-imbalance",
          label: "Небаланс расхода",
          value: 4.7,
          unit: "%",
          trendPercent: -0.8,
          status: "warning" as const,
        },
        {
          id: "efficiency",
          label: "Экономический эффект",
          value: Number(((totalMakeup / 1000) * 0.62).toFixed(1)),
          unit: "млн ?",
          trendPercent: 6.4,
          status: "ok" as const,
        },
      ],
      balance: {
        supply: Number((totalMakeup || 3200).toFixed(0)),
        return: Number(((totalMakeup || 3200) * 0.95).toFixed(0)),
        imbalancePercent: 4.9,
        thresholdPercent: 4,
      },
      dataGaps: baseline.slice(0, 5).map((item: any, index: number) => ({
        objectId: item.id ?? `rts-${index}`,
        objectName: item.name ?? `Узел учёта №${index + 1}`,
        missingDays: 3 + ((index + 1) % 3),
        lastMeasurement: new Date(Date.now() - (index + 2) * 86_400_000),
      })),
    };

    const trend = Array.from({ length: 14 }).map((_, index) => {
      const date = new Date(updatedAt);
      date.setDate(date.getDate() - (13 - index));
      return {
        date,
        missingDataShare: 8 + Math.sin(index / 3) * 2,
        equipmentFaultShare: 5 + Math.cos(index / 5),
        massImbalanceShare: 4 + Math.sin(index / 4) * 1.5,
      };
    });

    return { summary, trend };
  }
}
