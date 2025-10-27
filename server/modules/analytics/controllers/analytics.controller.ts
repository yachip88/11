import type { Request, Response } from "express";
import { analyticsFiltersSchema } from "../dto/analytics.dto";
import { AnalyticsService } from "../services/analytics.service";

export class AnalyticsController {
  constructor(private readonly service = new AnalyticsService()) {}

  summary = async (req: Request, res: Response) => {
    const parseResult = analyticsFiltersSchema.safeParse({
      period: req.query.period,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      rtsId: req.query.rtsId,
      districtId: req.query.districtId,
    });

    if (!parseResult.success) {
      return res.status(400).json({ message: "Некорректные параметры", issues: parseResult.error.flatten() });
    }

    try {
      const data = await this.service.getSummary(parseResult.data);
      res.json({
        summary: {
          ...data.summary,
          updatedAt: data.summary.updatedAt.toISOString(),
          dataGaps: data.summary.dataGaps.map((gap) => ({
            ...gap,
            lastMeasurement: gap.lastMeasurement?.toISOString() ?? null,
          })),
        },
        trend: data.trend.map((point) => ({
          ...point,
          date: point.date.toISOString(),
        })),
      });
    } catch (error) {
      res.status(500).json({ message: "Не удалось получить аналитическую сводку", error });
    }
  };
}
