import type { AnalyticsSummary, TrendPoint } from "./types";

export const mockAnalyticsSummary: AnalyticsSummary = {
  updatedAt: new Date().toISOString(),
  kpis: [
    {
      id: "missing-data",
      label: "Нет данных > 3 дней",
      value: 17,
      unit: "участков",
      trendPercent: -4.5,
      status: "warning",
      description: "Количество узлов учёта без показаний за последние трое суток",
    },
    {
      id: "equipment-faults",
      label: "Неисправные приборы",
      value: 12,
      unit: "точек",
      trendPercent: 2.1,
      status: "critical",
      description: "Нулевые или недостоверные значения по одному из каналов",
    },
    {
      id: "mass-imbalance",
      label: "Небаланс по расходу",
      value: 5.2,
      unit: "%",
      trendPercent: -1.1,
      status: "warning",
      description: "Среднее отклонение между подачей и обраткой",
    },
    {
      id: "efficiency",
      label: "Эффект, млн ?",
      value: 42.6,
      unit: "?",
      trendPercent: 8.3,
      status: "ok",
      description: "Экономический эффект по итогам выбранного периода",
    },
  ],
  balance: {
    supply: 3125,
    return: 2971,
    imbalancePercent: 4.9,
    thresholdPercent: 4,
  },
  dataGaps: [
    { objectId: "rts-12", objectName: "ЦТП №12", missingDays: 5, lastMeasurement: "2025-10-22" },
    { objectId: "rts-17", objectName: "ИТП Жк Ласточка", missingDays: 4, lastMeasurement: "2025-10-23" },
    { objectId: "rts-02", objectName: "ЦТП №2", missingDays: 3, lastMeasurement: "2025-10-24" },
  ],
};

export const mockTrendSeries: TrendPoint[] = Array.from({ length: 14 }).map((_, idx) => {
  const date = new Date();
  date.setDate(date.getDate() - (13 - idx));
  const missingDataShare = 8 + Math.sin(idx / 3) * 2;
  const equipmentFaultShare = 4 + Math.cos(idx / 4);
  const massImbalanceShare = 5 + Math.sin(idx / 2) * 1.5;

  return {
    date: date.toISOString().slice(0, 10),
    missingDataShare: Number(missingDataShare.toFixed(1)),
    equipmentFaultShare: Number(equipmentFaultShare.toFixed(1)),
    massImbalanceShare: Number(massImbalanceShare.toFixed(1)),
  };
});
