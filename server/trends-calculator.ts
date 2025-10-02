import { type IStorage } from './storage';

export interface TrendChange {
  ctpId: string;
  ctpName: string;
  change: number;
  changePercent: number;
}

export interface RTSTrendChange {
  rtsId: string;
  rtsName: string;
  change: number;
  changePercent: number;
}

export class TrendsCalculator {
  constructor(private storage: IStorage) {}

  async calculateCTPWeeklyChange(ctpId: string): Promise<number> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    
    const previousStart = new Date(startDate);
    previousStart.setDate(previousStart.getDate() - 7);

    const currentWeek = await this.storage.getMeasurements(ctpId, startDate, endDate);
    const previousWeek = await this.storage.getMeasurements(ctpId, previousStart, startDate);

    if (currentWeek.length === 0 || previousWeek.length === 0) {
      return 0;
    }

    const currentAvg = currentWeek.reduce((sum, m) => sum + m.makeupWater, 0) / currentWeek.length;
    const previousAvg = previousWeek.reduce((sum, m) => sum + m.makeupWater, 0) / previousWeek.length;

    return currentAvg - previousAvg;
  }

  async calculateRTSWeeklyChange(rtsId: string): Promise<number> {
    const ctpList = await this.storage.getCTPList({ rtsId });
    let totalChange = 0;

    for (const ctp of ctpList) {
      const change = await this.calculateCTPWeeklyChange(ctp.id);
      totalChange += change;
    }

    return totalChange;
  }

  async calculateOverallChange(period: 'week' | 'month' | 'year'): Promise<number> {
    const ctpList = await this.storage.getCTPList();
    let currentTotal = 0;
    let previousTotal = 0;
    let currentCount = 0;
    let previousCount = 0;

    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    const previousStart = new Date(startDate);
    switch (period) {
      case 'week':
        previousStart.setDate(previousStart.getDate() - 7);
        break;
      case 'month':
        previousStart.setMonth(previousStart.getMonth() - 1);
        break;
      case 'year':
        previousStart.setFullYear(previousStart.getFullYear() - 1);
        break;
    }

    for (const ctp of ctpList) {
      const currentPeriod = await this.storage.getMeasurements(ctp.id, startDate, endDate);
      const previousPeriod = await this.storage.getMeasurements(ctp.id, previousStart, startDate);

      if (currentPeriod.length > 0) {
        currentTotal += currentPeriod.reduce((sum, m) => sum + m.makeupWater, 0);
        currentCount += currentPeriod.length;
      }

      if (previousPeriod.length > 0) {
        previousTotal += previousPeriod.reduce((sum, m) => sum + m.makeupWater, 0);
        previousCount += previousPeriod.length;
      }
    }

    if (currentCount === 0 || previousCount === 0) {
      return 0;
    }

    const currentAvg = currentTotal / currentCount;
    const previousAvg = previousTotal / previousCount;

    return currentAvg - previousAvg;
  }

  async getTopChanges(period: 'week' | 'month' | 'year', limit: number = 3): Promise<{
    increases: TrendChange[];
    decreases: TrendChange[];
  }> {
    const ctpList = await this.storage.getCTPList();
    const changes: TrendChange[] = [];

    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    const previousStart = new Date(startDate);
    switch (period) {
      case 'week':
        previousStart.setDate(previousStart.getDate() - 7);
        break;
      case 'month':
        previousStart.setMonth(previousStart.getMonth() - 1);
        break;
      case 'year':
        previousStart.setFullYear(previousStart.getFullYear() - 1);
        break;
    }

    for (const ctp of ctpList) {
      const currentPeriod = await this.storage.getMeasurements(ctp.id, startDate, endDate);
      const previousPeriod = await this.storage.getMeasurements(ctp.id, previousStart, startDate);

      if (currentPeriod.length > 0 && previousPeriod.length > 0) {
        const currentAvg = currentPeriod.reduce((sum, m) => sum + m.makeupWater, 0) / currentPeriod.length;
        const previousAvg = previousPeriod.reduce((sum, m) => sum + m.makeupWater, 0) / previousPeriod.length;
        const change = currentAvg - previousAvg;
        const changePercent = previousAvg > 0 ? (change / previousAvg) * 100 : 0;

        changes.push({
          ctpId: ctp.id,
          ctpName: ctp.name,
          change,
          changePercent,
        });
      }
    }

    changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    const increases = changes.filter(c => c.change > 0).slice(0, limit);
    const decreases = changes.filter(c => c.change < 0).slice(0, limit);

    return { increases, decreases };
  }

  async getRTSStats(period: 'week' | 'month' | 'year'): Promise<RTSTrendChange[]> {
    const rtsList = await this.storage.getRTSList();
    const stats: RTSTrendChange[] = [];

    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    const previousStart = new Date(startDate);
    switch (period) {
      case 'week':
        previousStart.setDate(previousStart.getDate() - 7);
        break;
      case 'month':
        previousStart.setMonth(previousStart.getMonth() - 1);
        break;
      case 'year':
        previousStart.setFullYear(previousStart.getFullYear() - 1);
        break;
    }

    for (const rts of rtsList) {
      const ctpList = await this.storage.getCTPList({ rtsId: rts.id });
      let currentTotal = 0;
      let previousTotal = 0;
      let currentCount = 0;
      let previousCount = 0;

      for (const ctp of ctpList) {
        const currentPeriod = await this.storage.getMeasurements(ctp.id, startDate, endDate);
        const previousPeriod = await this.storage.getMeasurements(ctp.id, previousStart, startDate);

        if (currentPeriod.length > 0) {
          currentTotal += currentPeriod.reduce((sum, m) => sum + m.makeupWater, 0);
          currentCount += currentPeriod.length;
        }

        if (previousPeriod.length > 0) {
          previousTotal += previousPeriod.reduce((sum, m) => sum + m.makeupWater, 0);
          previousCount += previousPeriod.length;
        }
      }

      if (currentCount > 0 && previousCount > 0) {
        const currentAvg = currentTotal / currentCount;
        const previousAvg = previousTotal / previousCount;
        const change = currentAvg - previousAvg;
        const changePercent = previousAvg > 0 ? (change / previousAvg) * 100 : 0;

        stats.push({
          rtsId: rts.id,
          rtsName: `${rts.code} (${rts.name})`,
          change,
          changePercent,
        });
      }
    }

    stats.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return stats;
  }
}
