import * as XLSX from "xlsx";

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
  | "ctpName"
  | "ctpCode"
  | "rtsName"
  | "districtName"
  | "date"
  | "makeupWater"
  | "undermix"
  | "flowG1"
  | "temperature"
  | "pressure";

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
  ctpName: [
    "ctp",
    "ctpp",
    "teplovoy punkt",
    "heat point",
    "object",
    "name",
    "узел",
    "цтп",
    "тепловой пункт",
    "объект",
    "название",
  ],
  ctpCode: ["код", "номер", "№", "code", "id"],
  rtsName: ["ртс", "тэц", "source", "источник", "котельная", "теплосеть"],
  districtName: ["район", "микрорайон", "district", "участок"],
  date: ["дата", "period", "date"],
  makeupWater: ["подпит", "подпитка", "makeup", "make-up", "подпиточная"],
  undermix: ["подмес", "переток", "undermix", "imbalance"],
  flowG1: ["g1", "g-1", "расход", "flow", "расход g1"],
  temperature: ["температура", "temperature", "t1", "t-1"],
  pressure: ["давление", "pressure", "p1", "p-1"],
};

export class ExcelParser {
  static async parseFile(buffer: Buffer, filename: string): Promise<ParsedExcelData[]> {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const parsedSheets: ParsedExcelData[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        if (jsonData.length === 0) continue;

        const headers = (jsonData[0] as any[]).map((h) => String(h ?? "").trim());
        const rows = jsonData
          .slice(1)
          .filter((row: any) => Array.isArray(row) && row.some((cell) => cell !== null && cell !== "")) as any[][];

        parsedSheets.push({
          sheetName,
          headers,
          rows,
          metadata: {
            fileType: filename.split(".").pop() || "unknown",
            source: filename,
          },
        });
      }

      return parsedSheets;
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  private static normalizeHeader(header: string): string {
    return header
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ё/g, "е")
      .replace(/[^a-z0-9а-я\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  private static resolveMeasurementColumns(headers: string[]): {
    indexes: MeasurementColumnIndexes;
    errors: string[];
    warnings: string[];
  } {
    const normalizedHeaders = headers.map(ExcelParser.normalizeHeader);
    const condensedHeaders = normalizedHeaders.map((h) => h.replace(/\s+/g, ""));

    const findIndex = (patterns: string[]): number => {
      const normalizedPatterns = patterns.map((pattern) => ExcelParser.normalizeHeader(pattern).replace(/\s+/g, ""));
      return condensedHeaders.findIndex((header) => normalizedPatterns.some((pattern) => pattern && header.includes(pattern)));
    };

    const indexes: Partial<MeasurementColumnIndexes> = {};
    (Object.keys(COLUMN_PATTERNS) as MeasurementColumnKey[]).forEach((key) => {
      const index = findIndex(COLUMN_PATTERNS[key]);
      if (index !== -1) {
        indexes[key] = index;
      }
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    if (indexes.ctpName === undefined && indexes.ctpCode === undefined) {
      errors.push("Missing column with CTP name or code (e.g. 'ЦТП', 'Код')");
    }
    if (indexes.date === undefined) {
      errors.push("Missing column with a date (e.g. 'Дата')");
    }
    if (indexes.makeupWater === undefined) {
      errors.push("Missing column with makeup water (e.g. 'Подпитка')");
    }

    if (indexes.ctpName !== undefined && indexes.ctpCode === undefined) {
      warnings.push("CTP code column not found – using only the name to identify the point");
    }

    return { indexes: indexes as MeasurementColumnIndexes, errors, warnings };
  }

  private static parseDate(value: unknown): Date | undefined {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? undefined : value;
    }

    if (value === null || value === undefined || value === "") {
      return undefined;
    }

    const parsed = new Date(value as string);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private static parseNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }

    const normalized = String(value).replace(/[^0-9,.-]/g, "").replace(/,/g, ".");
    if (!normalized) {
      return undefined;
    }

    const result = Number(normalized);
    return Number.isFinite(result) ? result : undefined;
  }

  static parseMeasurements(data: ParsedExcelData): CTEMeasurementData[] {
    const { indexes, errors, warnings } = ExcelParser.resolveMeasurementColumns(data.headers);
    if (errors.length) {
      throw new Error(errors.join("; "));
    }

    if (warnings.length) {
      warnings.forEach((message) => console.warn(`Warning: ${message}`));
    }

    const measurements: CTEMeasurementData[] = [];

    data.rows.forEach((row, rowIdx) => {
      const humanRow = rowIdx + 2;

      const rawName = indexes.ctpName !== undefined ? String(row[indexes.ctpName] ?? "").trim() : "";
      const rawCode = indexes.ctpCode !== undefined ? String(row[indexes.ctpCode] ?? "").trim() : "";

      if (!rawName && !rawCode) {
        console.warn(`Row ${humanRow}: missing CTP name/code – skipped`);
        return;
      }

      const rawDate = indexes.date !== undefined ? row[indexes.date] : undefined;
      const parsedDate = ExcelParser.parseDate(rawDate);
      if (!parsedDate) {
        console.warn(`Row ${humanRow}: unable to parse date from "${rawDate}"`);
        return;
      }

      const rawMakeup = indexes.makeupWater !== undefined ? row[indexes.makeupWater] : undefined;
      const makeupWater = ExcelParser.parseNumber(rawMakeup);
      if (makeupWater === undefined) {
        console.warn(`Row ${humanRow}: unable to parse makeup water value from "${rawMakeup}"`);
        return;
      }

      const measurement: CTEMeasurementData = {
        ctpName: rawName || rawCode,
        ctpCode: rawCode || undefined,
        rtsName:
          indexes.rtsName !== undefined ? String(row[indexes.rtsName] ?? "").trim() || undefined : undefined,
        districtName:
          indexes.districtName !== undefined ? String(row[indexes.districtName] ?? "").trim() || undefined : undefined,
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

  static detectFileType(filename: string): "measurements" | "summary" | "model" | "unknown" {
    const name = filename.toLowerCase();

    if (name.includes("подпит") || name.includes("measurements")) {
      return "measurements";
    }
    if (name.includes("итог") || name.includes("summary")) {
      return "summary";
    }
    if (name.includes("model")) {
      return "model";
    }

    return "unknown";
  }

  static validateMeasurementData(data: CTEMeasurementData[]): {
    valid: CTEMeasurementData[];
    errors: string[];
  } {
    const valid: CTEMeasurementData[] = [];
    const errors: string[] = [];

    data.forEach((measurement, index) => {
      const rowLabel = `Row ${index + 1}`;

      if (!measurement.ctpName && !measurement.ctpCode) {
        errors.push(`${rowLabel}: missing CTP name or code`);
        return;
      }

      if (!(measurement.date instanceof Date) || Number.isNaN(measurement.date.getTime())) {
        errors.push(`${rowLabel}: invalid date`);
        return;
      }

      if (!Number.isFinite(measurement.makeupWater) || measurement.makeupWater < 0) {
        errors.push(`${rowLabel}: invalid makeup water value`);
        return;
      }

      if (measurement.makeupWater > 200) {
        errors.push(`${rowLabel}: makeup water exceeds expected limit (value ${measurement.makeupWater} т/ч)`);
      }

      const numericChecks: Array<[number | undefined, string]> = [
        [measurement.undermix, "undermix"],
        [measurement.flowG1, "flow G1"],
        [measurement.temperature, "temperature"],
        [measurement.pressure, "pressure"],
      ];

      for (const [value, label] of numericChecks) {
        if (value !== undefined && !Number.isFinite(value)) {
          errors.push(`${rowLabel}: invalid numeric value in column "${label}"`);
          return;
        }
      }

      valid.push(measurement);
    });

    return { valid, errors };
  }
}
