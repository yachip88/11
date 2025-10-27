import { z } from "zod";

export const analyticsFiltersSchema = z.object({
  period: z.enum(["day", "week", "month", "year"]).default("week"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  rtsId: z.string().optional(),
  districtId: z.string().optional(),
});

export type AnalyticsFiltersDTO = z.infer<typeof analyticsFiltersSchema>;

export const analyticsResponseSchema = z.object({
  summary: z.object({
    updatedAt: z.string(),
    kpis: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        value: z.number(),
        unit: z.string().optional(),
        trendPercent: z.number().optional(),
        status: z.enum(["ok", "warning", "critical"]),
      })
    ),
    balance: z.object({
      supply: z.number(),
      return: z.number(),
      imbalancePercent: z.number(),
      thresholdPercent: z.number(),
    }),
    dataGaps: z.array(
      z.object({
        objectId: z.string(),
        objectName: z.string(),
        missingDays: z.number(),
        lastMeasurement: z.string().nullable(),
      })
    ),
  }),
  trend: z.array(
    z.object({
      date: z.string(),
      missingDataShare: z.number(),
      equipmentFaultShare: z.number(),
      massImbalanceShare: z.number(),
    })
  ),
});

export type AnalyticsResponseDTO = z.infer<typeof analyticsResponseSchema>;
