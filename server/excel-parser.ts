import * as XLSX from 'xlsx';

export interface ParsedExcelData {
  sheetName: string;
  headers: string[];
  rows: any[][];
  metadata?: {
    fileType: string;
    lastModified?: Date;
    source?: string;
  };
}

export interface CTEMeasurementData {
  ctpName: string;
  ctpCode?: string;
  rtsName?: string;
  districtName?: string;
  date: Date;
  makeupWater: number;
  undermix?: number;
  flowG1?: number;
  temperature?: number;
  pressure?: number;
}

type MeasurementColumnKey =
  | 'ctpName'
  | 'ctpCode'
  | 'rtsName'
  | 'districtName'
  | 'date'
  | 'makeupWater'
  | 'undermix'
  | 'flowG1'
  | 'temperature'
  | 'pressure';

interface MeasurementColumnIndexes {
  ctpName?: number;
  ctpCode?: number;
  rtsName?: number;
  districtName?: number;
  date: number;
  makeupWater: number;
  undermix?: number;
  flowG1?: number;
  temperature?: number;
  pressure?: number;
}

const COLUMN_PATTERNS: Record<MeasurementColumnKey, string[]> = {
  ctpName: ['С†С‚Рї', 'ctРї', 'РѕР±СЉРµРєС‚', 'РЅР°Р·РІР°РЅРёРµ', 'СѓР·РµР»'],
  ctpCode: ['РєРѕРґ', 'РЅРѕРјРµСЂ', 'в„–', 'id'],
  rtsName: ['СЂС‚СЃ', 'РєРѕС‚РµР»СЊРЅР°СЏ', 'С‚СЌС†', 'С‚РµРїР»РѕСЃРµС‚СЊ'],
  districtName: ['СЂР°Р№РѕРЅ', 'РјРёРєСЂРѕСЂР°Р№РѕРЅ', 'СѓС‡Р°СЃС‚РѕРє'],
  date: ['РґР°С‚Р°', 'period', 'date'],
  makeupWater: ['РїРѕРґРїРёС‚', 'makeup', 'РїРѕРґРїРёС‚РѕС‡РЅР°СЏ', 'РїРѕРґРїРёС‚РєР°'],
  undermix: ['РїРѕРґРјРµСЃ', 'undermix', 'РїРµСЂРµС‚РѕРє'],
  flowG1: ['g1', 'g-1', 'СЂР°СЃС…РѕРґ Рі1', 'СЂР°СЃС…РѕРґ С‚РµРїР»РѕРЅРѕСЃРёС‚РµР»СЏ'],
  temperature: ['С‚РµРјРїРµСЂР°С‚СѓСЂР°', 't1', 't-1'],
  pressure: ['РґР°РІР»РµРЅРёРµ', 'p1', 'p-1'],
};

export class ExcelParser {
  static async parseFile(buffer: Buffer, filename: string): Promise<ParsedExcelData[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const parsedSheets: ParsedExcelData[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        if (jsonData.length === 0) continue;

        const headers = (jsonData[0] as any[]).map(h => String(h ?? '').trim());
        const rows = jsonData.slice(1).filter((row: any) => Array.isArray(row) && row.some(cell => cell !== null && cell !== '')) as any[][];

        parsedSheets.push({
          sheetName,
          headers,
          rows,
          metadata: {
            fileType: filename.split('.').pop() || 'unknown',
            source: filename,
          },
        });
      }

      return parsedSheets;
    } catch (error) {
      throw new Error(`РћС€РёР±РєР° С‡С‚РµРЅРёСЏ С„Р°Р№Р»Р°: ${error}`);
    }
  }

  private static normalizeHeader(header: string): string {
    return header
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/С‘/g, 'Рµ')
      .replace(/[^a-z0-9Р°-СЏ\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private static resolveMeasurementColumns(headers: string[]): { indexes: MeasurementColumnIndexes; errors: string[]; warnings: string[] } {
    const normalizedHeaders = headers.map(ExcelParser.normalizeHeader);
    const condensedHeaders = normalizedHeaders.map(h => h.replace(/\s+/g, ''));

    const findIndex = (patterns: string[]): number => {
      const normalizedPatterns = patterns.map(pattern => ExcelParser.normalizeHeader(pattern).replace(/\s+/g, ''));
      return condensedHeaders.findIndex(header => normalizedPatterns.some(pattern => pattern && header.includes(pattern)));
    };

    const indexes: Partial<MeasurementColumnIndexes> = {};
    (Object.keys(COLUMN_PATTERNS) as MeasurementColumnKey[]).forEach(key => {
      const index = findIndex(COLUMN_PATTERNS[key]);
      if (index !== -1) {
        indexes[key] = index;
      }
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    if (indexes.ctpName === undefined && indexes.ctpCode === undefined) {
      errors.push('РќРµ РЅР°Р№РґРµРЅ СЃС‚РѕР»Р±РµС† СЃ РЅР°Р·РІР°РЅРёРµРј РёР»Рё РєРѕРґРѕРј Р¦РўРџ (РЅР°РїСЂРёРјРµСЂ, "Р¦РўРџ", "РљРѕРґ")');
    }
    if (indexes.date === undefined) {
      errors.push('РќРµ РЅР°Р№РґРµРЅ СЃС‚РѕР»Р±РµС† СЃ РґР°С‚РѕР№ ("Р”Р°С‚Р°")');
    }
    if (indexes.makeupWater === undefined) {
      errors.push('РќРµ РЅР°Р№РґРµРЅ СЃС‚РѕР»Р±РµС† СЃ РїРѕРґРїРёС‚РєРѕР№ ("РџРѕРґРїРёС‚РєР°", "Makeup")');
    }

    if (indexes.ctpName !== undefined && indexes.ctpCode === undefined) {
      warnings.push('РќРµ РЅР°Р№РґРµРЅ РѕС‚РґРµР»СЊРЅС‹Р№ СЃС‚РѕР»Р±РµС† СЃ РєРѕРґРѕРј Р¦РўРџ вЂ” Р±СѓРґРµС‚ РёСЃРїРѕР»СЊР·РѕРІР°РЅРѕ С‚РѕР»СЊРєРѕ РЅР°Р·РІР°РЅРёРµ');
    }

    return { indexes: indexes as MeasurementColumnIndexes, errors, warnings };
  }

  private static parseDate(value: unknown): Date | undefined {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? undefined : value;
    }

    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = new Date(value as string);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private static parseNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const normalized = String(value).replace(/[^0-9,.-]/g, '').replace(',', '.');
    if (!normalized) {
      return undefined;
    }

    const result = Number(normalized);
    return Number.isFinite(result) ? result : undefined;
  }

  static parseMeasurements(data: ParsedExcelData): CTEMeasurementData[] {
    const { indexes, errors, warnings } = ExcelParser.resolveMeasurementColumns(data.headers);
    if (errors.length) {
      throw new Error(errors.join('; '));
    }

    if (warnings.length) {
      warnings.forEach(message => console.warn(`Предупреждение: ${message}`));
    }

    const measurements: CTEMeasurementData[] = [];

    data.rows.forEach((row, rowIdx) => {
      const humanRow = rowIdx + 2; // +1 for header, +1 for 1-based numbering

      const rawName = indexes.ctpName !== undefined ? String(row[indexes.ctpName] ?? '').trim() : '';
      const rawCode = indexes.ctpCode !== undefined ? String(row[indexes.ctpCode] ?? '').trim() : '';

      if (!rawName && !rawCode) {
        console.warn(`РЎС‚СЂРѕРєР° ${humanRow}: РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚ РЅР°Р·РІР°РЅРёРµ РёР»Рё РєРѕРґ Р¦РўРџ вЂ” СЃС‚СЂРѕРєР° РїСЂРѕРїСѓС‰РµРЅР°`);
        return;
      }

      const rawDate = indexes.date !== undefined ? row[indexes.date] : undefined;
      const parsedDate = ExcelParser.parseDate(rawDate);
      if (!parsedDate) {
        console.warn(`РЎС‚СЂРѕРєР° ${humanRow}: РЅРµ СѓРґР°Р»РѕСЃСЊ СЂР°Р·РѕР±СЂР°С‚СЊ РґР°С‚Сѓ РёР· Р·РЅР°С‡РµРЅРёСЏ "${rawDate}"`);
        return;
      }

      const rawMakeup = indexes.makeupWater !== undefined ? row[indexes.makeupWater] : undefined;
      const makeupWater = ExcelParser.parseNumber(rawMakeup);
      if (makeupWater === undefined) {
        console.warn(`РЎС‚СЂРѕРєР° ${humanRow}: РЅРµ СѓРґР°Р»РѕСЃСЊ СЂР°Р·РѕР±СЂР°С‚СЊ Р·РЅР°С‡РµРЅРёРµ РїРѕРґРїРёС‚РєРё РёР· "${rawMakeup}"`);
        return;
      }

      const measurement: CTEMeasurementData = {
        ctpName: rawName || rawCode,
        ctpCode: rawCode || undefined,
        rtsName: indexes.rtsName !== undefined ? String(row[indexes.rtsName] ?? '').trim() || undefined : undefined,
        districtName: indexes.districtName !== undefined ? String(row[indexes.districtName] ?? '').trim() || undefined : undefined,
        date: parsedDate,
        makeupWater: Math.abs(makeupWater),
      };

      const undermix = indexes.undermix !== undefined ? ExcelParser.parseNumber(row[indexes.undermix]) : undefined;
      if (undermix !== undefined) {
        measurement.undermix = undermix;
      }

      const flowG1 = indexes.flowG1 !== undefined ? ExcelParser.parseNumber(row[indexes.flowG1]) : undefined;
      if (flowG1 !== undefined) {
        measurement.flowG1 = flowG1;
      }

      const temperature = indexes.temperature !== undefined ? ExcelParser.parseNumber(row[indexes.temperature]) : undefined;
      if (temperature !== undefined) {
        measurement.temperature = temperature;
      }

      const pressure = indexes.pressure !== undefined ? ExcelParser.parseNumber(row[indexes.pressure]) : undefined;
      if (pressure !== undefined) {
        measurement.pressure = pressure;
      }

      measurements.push(measurement);
    });

    return measurements;
  }

  static detectFileType(filename: string): 'measurements' | 'summary' | 'model' | 'unknown' {
    const name = filename.toLowerCase();

    if (name.includes('РїРѕРґРїРёС‚') || name.includes('measurements')) {
      return 'measurements';
    }
    if (name.includes('РёС‚РѕРі') || name.includes('summary')) {
      return 'summary';
    }
    if (name.includes('model')) {
      return 'model';
    }

    return 'unknown';
  }

  static validateMeasurementData(data: CTEMeasurementData[]): {
    valid: CTEMeasurementData[];
    errors: string[];
  } {
    const valid: CTEMeasurementData[] = [];
    const errors: string[] = [];

    data.forEach((measurement, index) => {
      const rowLabel = `РЎС‚СЂРѕРєР° ${index + 1}`;

      if (!measurement.ctpName && !measurement.ctpCode) {
        errors.push(`${rowLabel}: РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚ РЅР°Р·РІР°РЅРёРµ РёР»Рё РєРѕРґ Р¦РўРџ`);
        return;
      }

      if (!(measurement.date instanceof Date) || Number.isNaN(measurement.date.getTime())) {
        errors.push(`${rowLabel}: РЅРµРєРѕСЂСЂРµРєС‚РЅР°СЏ РґР°С‚Р°`);
        return;
      }

      if (!Number.isFinite(measurement.makeupWater) || measurement.makeupWater < 0) {
        errors.push(`${rowLabel}: РЅРµРєРѕСЂСЂРµРєС‚РЅРѕРµ Р·РЅР°С‡РµРЅРёРµ РїРѕРґРїРёС‚РєРё`);
        return;
      }

      if (measurement.makeupWater > 200) {
        errors.push(`${rowLabel}: РїРѕРґРїРёС‚РєР° РїСЂРµРІС‹С€Р°РµС‚ СЂР°Р·СѓРјРЅС‹Р№ РїСЂРµРґРµР» (>${measurement.makeupWater} С‚/С‡)`);
      }

      const numericChecks: Array<[number | undefined, string]> = [
        [measurement.undermix, 'РїРѕРґРјРµСЃ'],
        [measurement.flowG1, 'СЂР°СЃС…РѕРґ G1'],
        [measurement.temperature, 'С‚РµРјРїРµСЂР°С‚СѓСЂР°'],
        [measurement.pressure, 'РґР°РІР»РµРЅРёРµ'],
      ];

      for (const [value, label] of numericChecks) {
        if (value !== undefined && !Number.isFinite(value)) {
          errors.push(`${rowLabel}: РЅРµРєРѕСЂСЂРµРєС‚РЅРѕРµ С‡РёСЃР»РѕРІРѕРµ Р·РЅР°С‡РµРЅРёРµ РІ РєРѕР»РѕРЅРєРµ "${label}"`);
          return;
        }
      }

      valid.push(measurement);
    });

    return { valid, errors };
  }
}
