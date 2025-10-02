// Statistical analysis utilities for Shewhart control charts

export interface StatisticalResult {
  mean: number;
  standardDeviation: number;
  variance: number;
  ucl: number; // Upper Control Limit
  cl: number;  // Central Line
  lcl: number; // Lower Control Limit
  sampleSize: number;
}

export interface ControlPoint {
  value: number;
  date: Date;
  isOutOfControl: boolean;
  controlType: 'normal' | 'upper' | 'lower';
}

export class StatisticalAnalysis {
  /**
   * Calculate basic statistics for a dataset
   */
  static calculateBasicStats(data: number[]): {
    mean: number;
    standardDeviation: number;
    variance: number;
    min: number;
    max: number;
  } {
    if (data.length === 0) {
      throw new Error('Нет данных для расчета статистики');
    }

    const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
    const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (data.length - 1);
    const standardDeviation = Math.sqrt(variance);
    const min = Math.min(...data);
    const max = Math.max(...data);

    return {
      mean,
      standardDeviation,
      variance,
      min,
      max,
    };
  }

  /**
   * Calculate Shewhart control chart boundaries
   * Uses 3-sigma limits as specified in the documents
   */
  static calculateControlBoundaries(data: number[], confidence: number = 3): StatisticalResult {
    if (data.length < 10) {
      throw new Error('Недостаточно данных для расчета контрольных границ (минимум 10 точек)');
    }

    const stats = this.calculateBasicStats(data);
    
    // Shewhart control limits using 3-sigma rule
    const ucl = stats.mean + confidence * stats.standardDeviation;
    const lcl = Math.max(0, stats.mean - confidence * stats.standardDeviation); // Ensure LCL is not negative
    
    return {
      mean: stats.mean,
      standardDeviation: stats.standardDeviation,
      variance: stats.variance,
      ucl,
      cl: stats.mean,
      lcl,
      sampleSize: data.length,
    };
  }

  /**
   * Identify points that are out of control
   */
  static identifyOutOfControlPoints(
    data: { value: number; date: Date }[],
    controlLimits: { ucl: number; cl: number; lcl: number }
  ): ControlPoint[] {
    return data.map(point => {
      let isOutOfControl = false;
      let controlType: 'normal' | 'upper' | 'lower' = 'normal';

      if (point.value > controlLimits.ucl) {
        isOutOfControl = true;
        controlType = 'upper';
      } else if (point.value < controlLimits.lcl) {
        isOutOfControl = true;
        controlType = 'lower';
      }

      return {
        value: point.value,
        date: point.date,
        isOutOfControl,
        controlType,
      };
    });
  }

  /**
   * Calculate trend indicators
   */
  static calculateTrend(data: number[], windowSize: number = 7): {
    slope: number;
    direction: 'increasing' | 'decreasing' | 'stable';
    strength: number; // 0-1, how strong the trend is
  } {
    if (data.length < windowSize) {
      return { slope: 0, direction: 'stable', strength: 0 };
    }

    // Use the last windowSize points for trend calculation
    const recentData = data.slice(-windowSize);
    const n = recentData.length;
    
    // Calculate linear regression slope
    const xValues = Array.from({ length: n }, (_, i) => i);
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = recentData.reduce((sum, y) => sum + y, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (recentData[i] - yMean);
      denominator += Math.pow(xValues[i] - xMean, 2);
    }
    
    const slope = denominator === 0 ? 0 : numerator / denominator;
    
    // Determine direction and strength
    const absSlope = Math.abs(slope);
    const strength = Math.min(absSlope / (yMean * 0.1), 1); // Normalize strength
    
    let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (absSlope > yMean * 0.01) { // Threshold for significant trend
      direction = slope > 0 ? 'increasing' : 'decreasing';
    }
    
    return { slope, direction, strength };
  }

  /**
   * Detect patterns in control chart data
   * Implements Western Electric rules for process control
   */
  static detectPatterns(points: ControlPoint[], controlLimits: StatisticalResult): {
    hasPattern: boolean;
    patterns: string[];
  } {
    const patterns: string[] = [];
    
    // Rule 1: One point beyond 3 sigma
    const beyondThreeSigma = points.filter(p => p.isOutOfControl);
    if (beyondThreeSigma.length > 0) {
      patterns.push(`${beyondThreeSigma.length} точек за пределами 3σ`);
    }
    
    // Rule 2: Seven consecutive points on same side of centerline
    let consecutiveAbove = 0;
    let consecutiveBelow = 0;
    let maxConsecutiveAbove = 0;
    let maxConsecutiveBelow = 0;
    
    points.forEach(point => {
      if (point.value > controlLimits.cl) {
        consecutiveAbove++;
        consecutiveBelow = 0;
        maxConsecutiveAbove = Math.max(maxConsecutiveAbove, consecutiveAbove);
      } else if (point.value < controlLimits.cl) {
        consecutiveBelow++;
        consecutiveAbove = 0;
        maxConsecutiveBelow = Math.max(maxConsecutiveBelow, consecutiveBelow);
      } else {
        consecutiveAbove = 0;
        consecutiveBelow = 0;
      }
    });
    
    if (maxConsecutiveAbove >= 7) {
      patterns.push(`${maxConsecutiveAbove} последовательных точек выше центральной линии`);
    }
    if (maxConsecutiveBelow >= 7) {
      patterns.push(`${maxConsecutiveBelow} последовательных точек ниже центральной линии`);
    }
    
    // Rule 3: Six consecutive increasing or decreasing points
    let increasingStreak = 0;
    let decreasingStreak = 0;
    let maxIncreasing = 0;
    let maxDecreasing = 0;
    
    for (let i = 1; i < points.length; i++) {
      if (points[i].value > points[i-1].value) {
        increasingStreak++;
        decreasingStreak = 0;
        maxIncreasing = Math.max(maxIncreasing, increasingStreak);
      } else if (points[i].value < points[i-1].value) {
        decreasingStreak++;
        increasingStreak = 0;
        maxDecreasing = Math.max(maxDecreasing, decreasingStreak);
      } else {
        increasingStreak = 0;
        decreasingStreak = 0;
      }
    }
    
    if (maxIncreasing >= 6) {
      patterns.push(`${maxIncreasing + 1} последовательных возрастающих точек`);
    }
    if (maxDecreasing >= 6) {
      patterns.push(`${maxDecreasing + 1} последовательных убывающих точек`);
    }
    
    return {
      hasPattern: patterns.length > 0,
      patterns,
    };
  }

  /**
   * Calculate process capability indices
   */
  static calculateProcessCapability(
    data: number[],
    specLimits: { upperSpec: number; lowerSpec: number }
  ): {
    cp: number; // Process Capability
    cpk: number; // Process Capability Index
    isCapable: boolean;
  } {
    const stats = this.calculateBasicStats(data);
    
    const cp = (specLimits.upperSpec - specLimits.lowerSpec) / (6 * stats.standardDeviation);
    
    const cpkUpper = (specLimits.upperSpec - stats.mean) / (3 * stats.standardDeviation);
    const cpkLower = (stats.mean - specLimits.lowerSpec) / (3 * stats.standardDeviation);
    const cpk = Math.min(cpkUpper, cpkLower);
    
    const isCapable = cpk >= 1.33; // Industry standard for capable process
    
    return { cp, cpk, isCapable };
  }

  /**
   * Generate recommendations based on statistical analysis
   */
  static generateRecommendations(
    points: ControlPoint[],
    controlLimits: StatisticalResult,
    patterns: { hasPattern: boolean; patterns: string[] }
  ): {
    priority: 'critical' | 'warning' | 'normal';
    type: 'inspection' | 'meter_check' | 'monitoring';
    actions: string[];
  }[] {
    const recommendations: any[] = [];
    
    // Check for critical out-of-control points
    const criticalPoints = points.filter(p => p.isOutOfControl);
    if (criticalPoints.length > 0) {
      const exceedsUCL = criticalPoints.some(p => p.controlType === 'upper');
      const belowLCL = criticalPoints.some(p => p.controlType === 'lower');
      
      if (exceedsUCL) {
        recommendations.push({
          priority: 'critical',
          type: 'inspection',
          actions: [
            'Провести инспекцию на предмет утечек теплоносителя',
            'Проверить работоспособность приборов учета',
            'Проверить параметры работы подпиточных насосов',
          ],
        });
      }
      
      if (belowLCL) {
        recommendations.push({
          priority: 'critical',
          type: 'meter_check',
          actions: [
            'Проверить корректность показаний приборов учета',
            'Провести поверку счетчиков',
            'Проверить настройки системы автоматического регулирования',
          ],
        });
      }
    }
    
    // Check for patterns that indicate process instability
    if (patterns.hasPattern) {
      recommendations.push({
        priority: 'warning',
        type: 'monitoring',
        actions: [
          'Усилить мониторинг параметров работы ЦТП',
          'Проанализировать причины нестабильности процесса',
          'Рассмотреть необходимость корректировки контрольных границ',
        ],
      });
    }
    
    return recommendations;
  }
}

export default StatisticalAnalysis;
