import { db } from './db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { 
  rts as rtsTable, districts as districtsTable, ctp as ctpTable, 
  measurements as measurementsTable, statisticalParams as statisticalParamsTable,
  recommendations as recommendationsTable, uploadedFiles as uploadedFilesTable,
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
    return await db.select().from(rtsTable);
  }

  async getRTSById(id: string): Promise<RTS | undefined> {
    const result = await db.select().from(rtsTable).where(eq(rtsTable.id, id));
    return result[0];
  }

  async createRTS(data: InsertRTS): Promise<RTS> {
    const result = await db.insert(rtsTable).values(data).returning();
    return result[0];
  }

  async getRTSWithStats(): Promise<RTSWithStats[]> {
    const rtsList = await this.getRTSList();
    const stats: RTSWithStats[] = [];

    for (const rts of rtsList) {
      const ctpList = await db.select().from(ctpTable).where(eq(ctpTable.rtsId, rts.id));
      
      let totalMakeupWater = 0;
      let criticalCount = 0;
      let warningCount = 0;
      let normalCount = 0;

      for (const ctp of ctpList) {
        const latestMeasurement = await db
          .select()
          .from(measurementsTable)
          .where(eq(measurementsTable.ctpId, ctp.id))
          .orderBy(desc(measurementsTable.date))
          .limit(1);

        if (latestMeasurement[0]) {
          totalMakeupWater += latestMeasurement[0].makeupWater;
          
          if (latestMeasurement[0].makeupWater > (ctp.ucl || 0)) {
            criticalCount++;
          } else if (latestMeasurement[0].makeupWater > (ctp.cl || 0)) {
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
    return await db.select().from(districtsTable).where(eq(districtsTable.rtsId, rtsId));
  }

  async createDistrict(data: InsertDistrict): Promise<District> {
    const result = await db.insert(districtsTable).values(data).returning();
    return result[0];
  }

  // CTP methods
  async getCTPList(filters?: { rtsId?: string; districtId?: string; status?: string }): Promise<CTPWithDetails[]> {
    let query = db.select().from(ctpTable).$dynamic();
    
    if (filters?.rtsId) {
      query = query.where(eq(ctpTable.rtsId, filters.rtsId));
    }
    if (filters?.districtId) {
      query = query.where(eq(ctpTable.districtId, filters.districtId));
    }

    const ctpList = await query;
    const result: CTPWithDetails[] = [];

    for (const ctp of ctpList) {
      const [rtsResult] = await db.select().from(rtsTable).where(eq(rtsTable.id, ctp.rtsId!));
      const [districtResult] = await db.select().from(districtsTable).where(eq(districtsTable.id, ctp.districtId!));
      
      const [latestMeasurement] = await db
        .select()
        .from(measurementsTable)
        .where(eq(measurementsTable.ctpId, ctp.id))
        .orderBy(desc(measurementsTable.date))
        .limit(1);

      const [statisticalParams] = await db
        .select()
        .from(statisticalParamsTable)
        .where(eq(statisticalParamsTable.ctpId, ctp.id))
        .orderBy(desc(statisticalParamsTable.calculatedAt))
        .limit(1);

      const recommendations = await db
        .select()
        .from(recommendationsTable)
        .where(eq(recommendationsTable.ctpId, ctp.id));

      if (rtsResult && districtResult) {
        result.push({
          ...ctp,
          rts: rtsResult,
          district: districtResult,
          latestMeasurement: latestMeasurement || undefined,
          statisticalParams: statisticalParams || undefined,
          recommendations: recommendations || [],
        });
      }
    }

    return result;
  }

  async getCTPById(id: string): Promise<CTPWithDetails | undefined> {
    const [ctp] = await db.select().from(ctpTable).where(eq(ctpTable.id, id));
    if (!ctp) return undefined;

    const [rtsResult] = await db.select().from(rtsTable).where(eq(rtsTable.id, ctp.rtsId!));
    const [districtResult] = await db.select().from(districtsTable).where(eq(districtsTable.id, ctp.districtId!));
    
    const [latestMeasurement] = await db
      .select()
      .from(measurementsTable)
      .where(eq(measurementsTable.ctpId, ctp.id))
      .orderBy(desc(measurementsTable.date))
      .limit(1);

    const [statisticalParams] = await db
      .select()
      .from(statisticalParamsTable)
      .where(eq(statisticalParamsTable.ctpId, ctp.id))
      .orderBy(desc(statisticalParamsTable.calculatedAt))
      .limit(1);

    const recommendations = await db
      .select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.ctpId, ctp.id));

    if (!rtsResult || !districtResult) return undefined;

    return {
      ...ctp,
      rts: rtsResult,
      district: districtResult,
      latestMeasurement: latestMeasurement || undefined,
      statisticalParams: statisticalParams || undefined,
      recommendations: recommendations || [],
    };
  }

  async createCTP(data: InsertCTP): Promise<CTP> {
    const result = await db.insert(ctpTable).values(data).returning();
    return result[0];
  }

  async updateCTPBoundaries(ctpId: string, boundaries: { ucl: number; cl: number; lcl: number }): Promise<void> {
    await db.update(ctpTable)
      .set(boundaries)
      .where(eq(ctpTable.id, ctpId));
  }

  // Measurements methods
  async getMeasurements(ctpId: string, startDate?: Date, endDate?: Date): Promise<Measurement[]> {
    let query = db.select().from(measurementsTable).where(eq(measurementsTable.ctpId, ctpId)).$dynamic();
    
    if (startDate) {
      query = query.where(gte(measurementsTable.date, startDate));
    }
    if (endDate) {
      query = query.where(lte(measurementsTable.date, endDate));
    }

    return await query.orderBy(measurementsTable.date);
  }

  async createMeasurement(data: InsertMeasurement): Promise<Measurement> {
    const result = await db.insert(measurementsTable).values(data).returning();
    return result[0];
  }

  async getLatestMeasurements(): Promise<Map<string, Measurement>> {
    const latest = new Map<string, Measurement>();
    
    const ctpList = await db.select().from(ctpTable);
    
    for (const ctp of ctpList) {
      const [measurement] = await db
        .select()
        .from(measurementsTable)
        .where(eq(measurementsTable.ctpId, ctp.id))
        .orderBy(desc(measurementsTable.date))
        .limit(1);
      
      if (measurement) {
        latest.set(ctp.id, measurement);
      }
    }

    return latest;
  }

  // Statistical methods
  async getStatisticalParams(ctpId: string): Promise<StatisticalParams | undefined> {
    const [result] = await db
      .select()
      .from(statisticalParamsTable)
      .where(eq(statisticalParamsTable.ctpId, ctpId))
      .orderBy(desc(statisticalParamsTable.calculatedAt))
      .limit(1);
    
    return result;
  }

  async updateStatisticalParams(data: InsertStatisticalParams): Promise<StatisticalParams> {
    const result = await db.insert(statisticalParamsTable).values(data).returning();
    return result[0];
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
    let query = db.select().from(recommendationsTable).$dynamic();
    
    if (filters?.ctpId) {
      query = query.where(eq(recommendationsTable.ctpId, filters.ctpId));
    }
    if (filters?.type) {
      query = query.where(eq(recommendationsTable.type, filters.type));
    }
    if (filters?.priority) {
      query = query.where(eq(recommendationsTable.priority, filters.priority));
    }
    if (filters?.status) {
      query = query.where(eq(recommendationsTable.status, filters.status));
    }

    return await query.orderBy(desc(recommendationsTable.createdAt));
  }

  async createRecommendation(data: InsertRecommendation): Promise<Recommendation> {
    const result = await db.insert(recommendationsTable).values(data).returning();
    return result[0];
  }

  async updateRecommendationStatus(id: string, status: string): Promise<void> {
    await db.update(recommendationsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(recommendationsTable.id, id));
  }

  // Trends and Analytics
  async getTrendData(period: 'day' | 'week' | 'month' | 'year', rtsId?: string): Promise<TrendData[]> {
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

    let query = db
      .select({
        date: sql<string>`DATE(${measurementsTable.date})`,
        value: sql<number>`SUM(${measurementsTable.makeupWater})`,
      })
      .from(measurementsTable)
      .where(gte(measurementsTable.date, startDate))
      .$dynamic();

    if (rtsId) {
      const ctpIds = await db
        .select({ id: ctpTable.id })
        .from(ctpTable)
        .where(eq(ctpTable.rtsId, rtsId));
      
      if (ctpIds.length > 0) {
        query = query.where(
          sql`${measurementsTable.ctpId} IN ${ctpIds.map(c => c.id)}`
        );
      }
    }

    const results = await query
      .groupBy(sql`DATE(${measurementsTable.date})`)
      .orderBy(sql`DATE(${measurementsTable.date})`);

    return results.map(r => ({
      date: r.date,
      value: Math.round(r.value),
      rtsId,
    }));
  }

  async getControlChartData(ctpId: string, period: number = 30): Promise<ControlChartData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);

    const measurements = await this.getMeasurements(ctpId, startDate, endDate);
    const [ctp] = await db.select().from(ctpTable).where(eq(ctpTable.id, ctpId));
    
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
    const result = await db.insert(uploadedFilesTable).values(data).returning();
    return result[0];
  }

  async getUploadHistory(): Promise<UploadedFile[]> {
    return await db.select().from(uploadedFilesTable).orderBy(desc(uploadedFilesTable.uploadedAt));
  }

  async updateFileStatus(id: string, status: string, recordsProcessed?: number, errors?: any[]): Promise<void> {
    await db.update(uploadedFilesTable)
      .set({ 
        status, 
        recordsProcessed: recordsProcessed ?? undefined,
        errors: errors ? JSON.stringify(errors) : undefined 
      })
      .where(eq(uploadedFilesTable.id, id));
  }
}
