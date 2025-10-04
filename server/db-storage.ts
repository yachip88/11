import { db } from './db';
import { 
  type RTS, type InsertRTS, type District, type InsertDistrict, 
  type CTP, type InsertCTP, type Measurement, type InsertMeasurement,
  type StatisticalParams, type InsertStatisticalParams,
  type Recommendation, type InsertRecommendation, 
  type UploadedFile, type InsertUploadedFile,
  type CTPWithDetails, type RTSWithStats, type TrendData, type ControlChartData
} from '@shared/schema';
import { type IStorage } from './storage';

export class DbStorage implements IStorage {
  // RTS methods
  async getRTSList(): Promise<RTS[]> {
    return await db.rTS.findMany();
  }

  async getRTSById(id: string): Promise<RTS | undefined> {
    const result = await db.rTS.findUnique({
      where: { id }
    });
    return result || undefined;
  }

  async createRTS(data: InsertRTS): Promise<RTS> {
    return await db.rTS.create({
      data
    });
  }

  async getRTSWithStats(): Promise<RTSWithStats[]> {
    const rtsList = await this.getRTSList();
    const stats: RTSWithStats[] = [];

    for (const rts of rtsList) {
      const ctpList = await db.cTP.findMany({
        where: { rtsId: rts.id },
        include: {
          measurements: {
            orderBy: { date: 'desc' },
            take: 1
          }
        }
      });
      
      let totalMakeupWater = 0;
      let criticalCount = 0;
      let warningCount = 0;
      let normalCount = 0;

      for (const ctp of ctpList) {
        const latestMeasurement = ctp.measurements[0];

        if (latestMeasurement) {
          totalMakeupWater += latestMeasurement.makeupWater;
          
          if (latestMeasurement.makeupWater > (ctp.ucl || 0)) {
            criticalCount++;
          } else if (latestMeasurement.makeupWater > (ctp.cl || 0)) {
            warningCount++;
          } else {
            normalCount++;
          }
        }
      }

      stats.push({
        ...rts,
        totalMakeupWater,
        ctpCount: ctpList.length,
        criticalCount,
        warningCount,
        normalCount,
      });
    }

    return stats;
  }

  // District methods
  async getDistrictsByRTS(rtsId: string): Promise<District[]> {
    return await db.districts.findMany({
      where: { rtsId }
    });
  }

  async createDistrict(data: InsertDistrict): Promise<District> {
    return await db.districts.create({
      data
    });
  }

  // CTP methods
  async getCTPList(filters?: { rtsId?: string; districtId?: string; status?: string }): Promise<CTPWithDetails[]> {
    const where: any = {};
    
    if (filters?.rtsId) {
      where.rtsId = filters.rtsId;
    }
    if (filters?.districtId) {
      where.districtId = filters.districtId;
    }

    const ctpList = await db.cTP.findMany({
      where,
      include: {
        rts: true,
        district: true,
        measurements: {
          orderBy: { date: 'desc' },
          take: 1
        },
        statisticalParams: {
          orderBy: { calculatedAt: 'desc' },
          take: 1
        },
        recommendations: true
      }
    });

    return ctpList.map((ctp: any) => ({
      ...ctp,
      rts: ctp.rts!,
      district: ctp.district!,
      latestMeasurement: ctp.measurements[0],
      statisticalParams: ctp.statisticalParams[0],
      recommendations: ctp.recommendations
    }));
  }

  async getCTPById(id: string): Promise<CTPWithDetails | undefined> {
    const ctp = await db.cTP.findUnique({
      where: { id },
      include: {
        rts: true,
        district: true,
        measurements: {
          orderBy: { date: 'desc' },
          take: 1
        },
        statisticalParams: {
          orderBy: { calculatedAt: 'desc' },
          take: 1
        },
        recommendations: true
      }
    });

    if (!ctp || !ctp.rts || !ctp.district) return undefined;

    return {
      ...ctp,
      rts: ctp.rts,
      district: ctp.district,
      latestMeasurement: ctp.measurements[0],
      statisticalParams: ctp.statisticalParams[0],
      recommendations: ctp.recommendations
    };
  }

  async createCTP(data: InsertCTP): Promise<CTP> {
    return await db.cTP.create({
      data
    });
  }

  async updateCTPBoundaries(ctpId: string, boundaries: { ucl: number; cl: number; lcl: number }): Promise<void> {
    await db.cTP.update({
      where: { id: ctpId },
      data: boundaries
    });
  }

  // Measurements methods
  async getMeasurements(ctpId: string, startDate?: Date, endDate?: Date): Promise<Measurement[]> {
    const where: any = { ctpId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return await db.measurements.findMany({
      where,
      orderBy: { date: 'asc' }
    });
  }

  async createMeasurement(data: InsertMeasurement): Promise<Measurement> {
    return await db.measurements.create({
      data
    });
  }

  async getLatestMeasurements(): Promise<Map<string, Measurement>> {
    const latest = new Map<string, Measurement>();
    
    const ctpList = await db.cTP.findMany({
      include: {
        measurements: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });
    
    for (const ctp of ctpList) {
      if (ctp.measurements[0]) {
        latest.set(ctp.id, ctp.measurements[0]);
      }
    }

    return latest;
  }

  // Statistical methods
  async getStatisticalParams(ctpId: string): Promise<StatisticalParams | undefined> {
    const result = await db.statisticalParams.findFirst({
      where: { ctpId },
      orderBy: { calculatedAt: 'desc' }
    });
    
    return result || undefined;
  }

  async updateStatisticalParams(data: InsertStatisticalParams): Promise<StatisticalParams> {
    return await db.statisticalParams.create({
      data
    });
  }

  async calculateControlBoundaries(ctpId: string): Promise<{ ucl: number; cl: number; lcl: number }> {
    const measurements = await this.getMeasurements(ctpId);
    
    if (measurements.length === 0) {
      return { ucl: 0, cl: 0, lcl: 0 };
    }

    const values = measurements.map(m => m.makeupWater);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const ucl = mean + (3 * stdDev);
    const lcl = Math.max(0, mean - (3 * stdDev));

    return { ucl, cl: mean, lcl };
  }

  // Recommendations methods
  async getRecommendations(filters?: { ctpId?: string; type?: string; priority?: string; status?: string }): Promise<Recommendation[]> {
    const where: any = {};
    
    if (filters?.ctpId) where.ctpId = filters.ctpId;
    if (filters?.type) where.type = filters.type;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.status) where.status = filters.status;

    return await db.recommendations.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async createRecommendation(data: InsertRecommendation): Promise<Recommendation> {
    return await db.recommendations.create({
      data
    });
  }

  async updateRecommendationStatus(id: string, status: string): Promise<void> {
    await db.recommendations.update({
      where: { id },
      data: { status, updatedAt: new Date() }
    });
  }

  // Trends and Analytics
  async getTrendData(period: 'day' | 'week' | 'month' | 'year', rtsId?: string, rtsFilter?: string): Promise<TrendData[]> {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    let ctpIds: string[] | undefined;
    
    if (rtsFilter) {
      const locationMap: Record<string, string> = {
        'right': 'Правый берег',
        'left': 'Левый берег'
      };
      
      const location = locationMap[rtsFilter];
      
      if (location) {
        const rtsList = await db.rTS.findMany({
          where: { location },
          select: { id: true }
        });
        
        const rtsIds = rtsList.map((r: { id: string }) => r.id);
        
        if (rtsIds.length > 0) {
          const ctps = await db.cTP.findMany({
            where: { rtsId: { in: rtsIds } },
            select: { id: true }
          });
          ctpIds = ctps.map((c: { id: string }) => c.id);
        }
      }
    } else if (rtsId) {
      const ctps = await db.cTP.findMany({
        where: { rtsId },
        select: { id: true }
      });
      ctpIds = ctps.map((c: { id: string }) => c.id);
    }

    const where: any = {
      date: { gte: startDate }
    };
    
    if (ctpIds && ctpIds.length > 0) {
      where.ctpId = { in: ctpIds };
    }

    const measurements = await db.measurements.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    // Group by date and sum makeup water
    const grouped = new Map<string, number>();
    
    for (const m of measurements) {
      const dateKey = m.date.toISOString().split('T')[0];
      const current = grouped.get(dateKey) || 0;
      grouped.set(dateKey, current + m.makeupWater);
    }

    return Array.from(grouped.entries()).map(([date, value]) => ({
      date,
      value: Math.round(value),
      rtsId,
    }));
  }

  async getControlChartData(ctpId: string, period: number = 30): Promise<ControlChartData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);

    const measurements = await this.getMeasurements(ctpId, startDate, endDate);
    const ctp = await db.cTP.findUnique({
      where: { id: ctpId }
    });
    
    if (!ctp) return [];

    return measurements.map(m => {
      const isAboveUCL = ctp.ucl !== null && m.makeupWater > ctp.ucl;
      const isBelowLCL = ctp.lcl !== null && m.makeupWater < ctp.lcl;
      
      return {
        date: m.date.toISOString().split('T')[0],
        value: m.makeupWater,
        ucl: ctp.ucl || 0,
        cl: ctp.cl || 0,
        lcl: ctp.lcl || 0,
        isOutOfControl: !!(isAboveUCL || isBelowLCL),
        controlType: isAboveUCL ? 'upper' as const : isBelowLCL ? 'lower' as const : 'normal' as const,
      };
    });
  }

  // File upload
  async createUploadedFile(data: InsertUploadedFile): Promise<UploadedFile> {
    return await db.uploadedFiles.create({
      data
    });
  }

  async getUploadHistory(): Promise<UploadedFile[]> {
    return await db.uploadedFiles.findMany({
      orderBy: { uploadedAt: 'desc' }
    });
  }

  async updateFileStatus(id: string, status: string, recordsProcessed?: number, errors?: any[]): Promise<void> {
    await db.uploadedFiles.update({
      where: { id },
      data: { 
        status, 
        recordsProcessed: recordsProcessed ?? undefined,
        errors: errors ? JSON.stringify(errors) : undefined 
      }
    });
  }
}
