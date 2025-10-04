import { type RTS, type InsertRTS, type District, type InsertDistrict, type CTP, type InsertCTP, 
         type Measurement, type InsertMeasurement, type StatisticalParams, type InsertStatisticalParams,
         type Recommendation, type InsertRecommendation, type UploadedFile, type InsertUploadedFile,
         type CTPWithDetails, type RTSWithStats, type TrendData, type ControlChartData } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // RTS methods
  getRTSList(): Promise<RTS[]>;
  getRTSById(id: string): Promise<RTS | undefined>;
  createRTS(rts: InsertRTS): Promise<RTS>;
  getRTSWithStats(): Promise<RTSWithStats[]>;

  // District methods
  getDistrictsByRTS(rtsId: string): Promise<District[]>;
  createDistrict(district: InsertDistrict): Promise<District>;

  // CTP methods
  getCTPList(filters?: { rtsId?: string; districtId?: string; status?: string }): Promise<CTPWithDetails[]>;
  getCTPById(id: string): Promise<CTPWithDetails | undefined>;
  createCTP(ctp: InsertCTP): Promise<CTP>;
  updateCTPBoundaries(ctpId: string, boundaries: { ucl: number; cl: number; lcl: number }): Promise<void>;

  // Measurements methods
  getMeasurements(ctpId: string, startDate?: Date, endDate?: Date): Promise<Measurement[]>;
  createMeasurement(measurement: InsertMeasurement): Promise<Measurement>;
  getLatestMeasurements(): Promise<Map<string, Measurement>>;

  // Statistical methods
  getStatisticalParams(ctpId: string): Promise<StatisticalParams | undefined>;
  updateStatisticalParams(params: InsertStatisticalParams): Promise<StatisticalParams>;
  calculateControlBoundaries(ctpId: string): Promise<{ ucl: number; cl: number; lcl: number }>;

  // Recommendations methods
  getRecommendations(filters?: { ctpId?: string; type?: string; priority?: string; status?: string }): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendationStatus(id: string, status: string): Promise<void>;

  // Trends and Analytics
  getTrendData(period: 'day' | 'week' | 'month' | 'year', rtsId?: string, rtsFilter?: string): Promise<TrendData[]>;
  getControlChartData(ctpId: string, period: number): Promise<ControlChartData[]>;

  // File upload
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  getUploadHistory(): Promise<UploadedFile[]>;
  updateFileStatus(id: string, status: string, recordsProcessed?: number, errors?: any[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private rtsData: Map<string, RTS> = new Map();
  private districtsData: Map<string, District> = new Map();
  private ctpData: Map<string, CTP> = new Map();
  private measurementsData: Map<string, Measurement> = new Map();
  private statisticalParamsData: Map<string, StatisticalParams> = new Map();
  private recommendationsData: Map<string, Recommendation> = new Map();
  private uploadedFilesData: Map<string, UploadedFile> = new Map();

  constructor() {
    this.initializeTestData();
  }

  private initializeTestData(): void {
    // Initialize with sample data structure based on the documents
    const rts1: RTS = {
      id: "rts-1",
      name: "ТЭЦ-5",
      code: "РТС-1",
      location: "Правый берег",
      createdAt: new Date(),
    };

    const rts2: RTS = {
      id: "rts-2",
      name: "ТЭЦ-3",
      code: "РТС-2",
      location: "Левый берег",
      createdAt: new Date(),
    };

    const rts3: RTS = {
      id: "rts-3",
      name: "ТЭЦ-2",
      code: "РТС-3",
      location: "Правый берег",
      createdAt: new Date(),
    };

    const rts4: RTS = {
      id: "rts-4",
      name: "ТЭЦ-4",
      code: "РТС-4",
      location: "Левый берег",
      createdAt: new Date(),
    };

    const rts5: RTS = {
      id: "rts-5",
      name: "КРК",
      code: "РТС-5",
      location: "Правый берег",
      createdAt: new Date(),
    };

    [rts1, rts2, rts3, rts4, rts5].forEach(rts => this.rtsData.set(rts.id, rts));

    // Districts
    const districts = [
      { id: "district-1", name: "Ленинский", rtsId: "rts-1", createdAt: new Date() },
      { id: "district-2", name: "Советский", rtsId: "rts-2", createdAt: new Date() },
      { id: "district-3", name: "Кировский", rtsId: "rts-4", createdAt: new Date() },
    ];
    districts.forEach(district => this.districtsData.set(district.id, district));

    // Sample CTPs with control boundaries
    const ctps: CTP[] = [
      {
        id: "ctp-125",
        name: "ЦТП-125",
        code: "125",
        rtsId: "rts-1",
        districtId: "district-1",
        ucl: 36.1,
        cl: 32.5,
        lcl: 28.2,
        hasMeter: true,
        meterStatus: "working",
        createdAt: new Date(),
      },
      {
        id: "ctp-156",
        name: "ЦТП-156",
        code: "156",
        rtsId: "rts-4",
        districtId: "district-3",
        ucl: 42.5,
        cl: 38.2,
        lcl: 33.5,
        hasMeter: true,
        meterStatus: "working",
        createdAt: new Date(),
      },
      {
        id: "ctp-234",
        name: "ЦТП-234",
        code: "234",
        rtsId: "rts-2",
        districtId: "district-2",
        ucl: 24.8,
        cl: 21.2,
        lcl: 17.9,
        hasMeter: true,
        meterStatus: "working",
        createdAt: new Date(),
      },
    ];
    ctps.forEach(ctp => this.ctpData.set(ctp.id, ctp));
  }

  async getRTSList(): Promise<RTS[]> {
    return Array.from(this.rtsData.values());
  }

  async getRTSById(id: string): Promise<RTS | undefined> {
    return this.rtsData.get(id);
  }

  async createRTS(rts: InsertRTS): Promise<RTS> {
    const id = randomUUID();
    const newRTS: RTS = { ...rts, id, createdAt: new Date() };
    this.rtsData.set(id, newRTS);
    return newRTS;
  }

  async getRTSWithStats(): Promise<RTSWithStats[]> {
    const rtsList = await this.getRTSList();
    const stats: RTSWithStats[] = [];

    for (const rts of rtsList) {
      const ctpList = Array.from(this.ctpData.values()).filter(ctp => ctp.rtsId === rts.id);
      const latestMeasurements = await this.getLatestMeasurements();
      
      let totalMakeupWater = 0;
      let criticalCount = 0;
      let warningCount = 0;
      let normalCount = 0;

      for (const ctp of ctpList) {
        const measurement = latestMeasurements.get(ctp.id);
        if (measurement) {
          totalMakeupWater += measurement.makeupWater;
          
          if (measurement.makeupWater > (ctp.ucl || 0)) {
            criticalCount++;
          } else if (measurement.makeupWater > (ctp.cl || 0)) {
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

  async getDistrictsByRTS(rtsId: string): Promise<District[]> {
    return Array.from(this.districtsData.values()).filter(district => district.rtsId === rtsId);
  }

  async createDistrict(district: InsertDistrict): Promise<District> {
    const id = randomUUID();
    const newDistrict: District = { 
      ...district, 
      id, 
      rtsId: district.rtsId ?? null,
      createdAt: new Date() 
    };
    this.districtsData.set(id, newDistrict);
    return newDistrict;
  }

  async getCTPList(filters?: { rtsId?: string; districtId?: string; status?: string }): Promise<CTPWithDetails[]> {
    let ctpList = Array.from(this.ctpData.values());

    if (filters?.rtsId) {
      ctpList = ctpList.filter(ctp => ctp.rtsId === filters.rtsId);
    }
    if (filters?.districtId) {
      ctpList = ctpList.filter(ctp => ctp.districtId === filters.districtId);
    }

    const latestMeasurements = await this.getLatestMeasurements();
    
    const result: CTPWithDetails[] = [];
    for (const ctp of ctpList) {
      const rts = this.rtsData.get(ctp.rtsId!);
      const district = this.districtsData.get(ctp.districtId!);
      const latestMeasurement = latestMeasurements.get(ctp.id);
      const statisticalParams = this.statisticalParamsData.get(ctp.id);
      const recommendations = Array.from(this.recommendationsData.values())
        .filter(rec => rec.ctpId === ctp.id);

      if (rts && district) {
        result.push({
          ...ctp,
          rts,
          district,
          latestMeasurement,
          statisticalParams,
          recommendations,
        });
      }
    }

    return result;
  }

  async getCTPById(id: string): Promise<CTPWithDetails | undefined> {
    const ctp = this.ctpData.get(id);
    if (!ctp) return undefined;

    const rts = this.rtsData.get(ctp.rtsId!);
    const district = this.districtsData.get(ctp.districtId!);
    const latestMeasurements = await this.getLatestMeasurements();
    const latestMeasurement = latestMeasurements.get(ctp.id);
    const statisticalParams = this.statisticalParamsData.get(ctp.id);
    const recommendations = Array.from(this.recommendationsData.values())
      .filter(rec => rec.ctpId === ctp.id);

    if (rts && district) {
      return {
        ...ctp,
        rts,
        district,
        latestMeasurement,
        statisticalParams,
        recommendations,
      };
    }

    return undefined;
  }

  async createCTP(ctp: InsertCTP): Promise<CTP> {
    const id = randomUUID();
    const newCTP: CTP = { 
      ...ctp, 
      id, 
      rtsId: ctp.rtsId ?? null,
      districtId: ctp.districtId ?? null,
      ucl: ctp.ucl ?? null,
      cl: ctp.cl ?? null,
      lcl: ctp.lcl ?? null,
      hasMeter: ctp.hasMeter ?? null,
      meterStatus: ctp.meterStatus ?? null,
      createdAt: new Date() 
    };
    this.ctpData.set(id, newCTP);
    return newCTP;
  }

  async updateCTPBoundaries(ctpId: string, boundaries: { ucl: number; cl: number; lcl: number }): Promise<void> {
    const ctp = this.ctpData.get(ctpId);
    if (ctp) {
      this.ctpData.set(ctpId, { ...ctp, ...boundaries });
    }
  }

  async getMeasurements(ctpId: string, startDate?: Date, endDate?: Date): Promise<Measurement[]> {
    let measurements = Array.from(this.measurementsData.values())
      .filter(measurement => measurement.ctpId === ctpId);

    if (startDate) {
      measurements = measurements.filter(m => m.date >= startDate);
    }
    if (endDate) {
      measurements = measurements.filter(m => m.date <= endDate);
    }

    return measurements.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async createMeasurement(measurement: InsertMeasurement): Promise<Measurement> {
    const id = randomUUID();
    const newMeasurement: Measurement = { 
      ...measurement, 
      id, 
      undermix: measurement.undermix ?? null,
      flowG1: measurement.flowG1 ?? null,
      temperature: measurement.temperature ?? null,
      pressure: measurement.pressure ?? null,
      createdAt: new Date() 
    };
    this.measurementsData.set(id, newMeasurement);
    return newMeasurement;
  }

  async getLatestMeasurements(): Promise<Map<string, Measurement>> {
    const latest = new Map<string, Measurement>();
    
    const measurementsArray = Array.from(this.measurementsData.values());
    for (const measurement of measurementsArray) {
      const current = latest.get(measurement.ctpId);
      if (!current || measurement.date > current.date) {
        latest.set(measurement.ctpId, measurement);
      }
    }

    return latest;
  }

  async getStatisticalParams(ctpId: string): Promise<StatisticalParams | undefined> {
    return Array.from(this.statisticalParamsData.values())
      .find(params => params.ctpId === ctpId);
  }

  async updateStatisticalParams(params: InsertStatisticalParams): Promise<StatisticalParams> {
    const existing = Array.from(this.statisticalParamsData.values())
      .find(p => p.ctpId === params.ctpId);
    
    if (existing) {
      const updated = { ...existing, ...params, calculatedAt: new Date() };
      this.statisticalParamsData.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const newParams: StatisticalParams = { ...params, id, calculatedAt: new Date() };
      this.statisticalParamsData.set(id, newParams);
      return newParams;
    }
  }

  async calculateControlBoundaries(ctpId: string): Promise<{ ucl: number; cl: number; lcl: number }> {
    const measurements = await this.getMeasurements(ctpId);
    
    if (measurements.length < 10) {
      throw new Error("Недостаточно данных для расчета контрольных границ");
    }

    const values = measurements.map(m => m.makeupWater);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    const stdDev = Math.sqrt(variance);

    // Shewhart control chart with 3-sigma limits
    const ucl = mean + 3 * stdDev;
    const lcl = Math.max(0, mean - 3 * stdDev); // Ensure LCL is not negative
    
    return { ucl, cl: mean, lcl };
  }

  async getRecommendations(filters?: { ctpId?: string; type?: string; priority?: string; status?: string }): Promise<Recommendation[]> {
    let recommendations = Array.from(this.recommendationsData.values());

    if (filters?.ctpId) {
      recommendations = recommendations.filter(rec => rec.ctpId === filters.ctpId);
    }
    if (filters?.type) {
      recommendations = recommendations.filter(rec => rec.type === filters.type);
    }
    if (filters?.priority) {
      recommendations = recommendations.filter(rec => rec.priority === filters.priority);
    }
    if (filters?.status) {
      recommendations = recommendations.filter(rec => rec.status === filters.status);
    }

    return recommendations.sort((a, b) => {
      const aTime = a.createdAt?.getTime() ?? 0;
      const bTime = b.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    });
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const id = randomUUID();
    const newRecommendation: Recommendation = { 
      ...recommendation, 
      id, 
      status: recommendation.status ?? null,
      actions: recommendation.actions ?? null,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.recommendationsData.set(id, newRecommendation);
    return newRecommendation;
  }

  async updateRecommendationStatus(id: string, status: string): Promise<void> {
    const recommendation = this.recommendationsData.get(id);
    if (recommendation) {
      this.recommendationsData.set(id, { ...recommendation, status, updatedAt: new Date() });
    }
  }

  async getTrendData(period: 'day' | 'week' | 'month' | 'year', rtsId?: string, rtsFilter?: string): Promise<TrendData[]> {
    // Generate trend data based on period
    const now = new Date();
    const data: TrendData[] = [];
    let days = 7;

    switch (period) {
      case 'day':
        days = 1;
        break;
      case 'week':
        days = 7;
        break;
      case 'month':
        days = 30;
        break;
      case 'year':
        days = 365;
        break;
    }

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Simulate trend data - in real implementation, this would query actual measurements
      const baseValue = 2750;
      const variation = (Math.random() - 0.5) * 200;
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(baseValue + variation),
        rtsId,
      });
    }

    return data;
  }

  async getControlChartData(ctpId: string, period: number): Promise<ControlChartData[]> {
    const measurements = await this.getMeasurements(ctpId);
    const ctp = this.ctpData.get(ctpId);
    
    if (!ctp) return [];

    const ucl = ctp.ucl || 0;
    const cl = ctp.cl || 0;
    const lcl = ctp.lcl || 0;

    return measurements.slice(-period).map(measurement => {
      const isAboveUCL = measurement.makeupWater > ucl;
      const isBelowLCL = measurement.makeupWater < lcl;
      
      return {
        date: measurement.date.toISOString().split('T')[0],
        value: measurement.makeupWater,
        ucl,
        cl,
        lcl,
        isOutOfControl: isAboveUCL || isBelowLCL,
        controlType: isAboveUCL ? 'upper' : isBelowLCL ? 'lower' : 'normal',
      };
    });
  }

  async createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const id = randomUUID();
    const newFile: UploadedFile = { 
      ...file, 
      id, 
      status: file.status ?? null,
      recordsProcessed: file.recordsProcessed ?? null,
      errors: file.errors ?? null,
      uploadedAt: new Date() 
    };
    this.uploadedFilesData.set(id, newFile);
    return newFile;
  }

  async getUploadHistory(): Promise<UploadedFile[]> {
    return Array.from(this.uploadedFilesData.values())
      .sort((a, b) => {
        const aTime = a.uploadedAt?.getTime() ?? 0;
        const bTime = b.uploadedAt?.getTime() ?? 0;
        return bTime - aTime;
      });
  }

  async updateFileStatus(id: string, status: string, recordsProcessed?: number, errors?: any[]): Promise<void> {
    const file = this.uploadedFilesData.get(id);
    if (file) {
      this.uploadedFilesData.set(id, { 
        ...file, 
        status, 
        recordsProcessed: recordsProcessed || file.recordsProcessed,
        errors: errors || file.errors 
      });
    }
  }
}

export const storage = new MemStorage();
