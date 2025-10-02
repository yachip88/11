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

export class ExcelParser {
  static async parseFile(buffer: Buffer, filename: string): Promise<ParsedExcelData[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const parsedSheets: ParsedExcelData[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        if (jsonData.length === 0) continue;

        const headers = (jsonData[0] as any[]).map(h => String(h || '').trim());
        const rows = jsonData.slice(1).filter((row: any) => {
          return Array.isArray(row) && row.some(cell => cell !== null && cell !== '');
        }) as any[][];

        parsedSheets.push({
          sheetName,
          headers,
          rows,
          metadata: {
            fileType: filename.split('.').pop() || 'unknown',
            source: filename,
          }
        });
      }

      return parsedSheets;
    } catch (error) {
      throw new Error(`Ошибка парсинга файла: ${error}`);
    }
  }

  static parseMeasurements(data: ParsedExcelData): CTEMeasurementData[] {
    const measurements: CTEMeasurementData[] = [];
    
    const headers = data.headers.map(h => h.toLowerCase().trim());
    
    // Try to find column indices with various possible names
    const ctpIndex = headers.findIndex(h => 
      h.includes('цтп') || h.includes('наименование') || h.includes('объект')
    );
    const ctpCodeIndex = headers.findIndex(h => 
      h.includes('код цтп') || h.includes('номер')
    );
    const rtsIndex = headers.findIndex(h => 
      h.includes('ртс') || h.includes('тэц') || h.includes('источник')
    );
    const districtIndex = headers.findIndex(h => 
      h.includes('район') || h.includes('микрорайон')
    );
    const dateIndex = headers.findIndex(h => 
      h.includes('дата') || h.includes('date')
    );
    const makeupIndex = headers.findIndex(h => 
      h.includes('подпит') || h.includes('makeup') || h.includes('подачи')
    );
    const undermixIndex = headers.findIndex(h => 
      h.includes('подмес') || h.includes('недомес')
    );
    const flowIndex = headers.findIndex(h => 
      h.includes('расход') || h.includes('g1') || h.includes('g-1')
    );
    const tempIndex = headers.findIndex(h => 
      h.includes('темпер') || h.includes('t1') || h.includes('t-1')
    );
    const pressureIndex = headers.findIndex(h => 
      h.includes('давлен') || h.includes('p1') || h.includes('p-1')
    );

    if (ctpIndex === -1 && ctpCodeIndex === -1) {
      throw new Error('Не найдена колонка с названием или кодом ЦТП');
    }
    if (dateIndex === -1) {
      throw new Error('Не найдена колонка с датой');
    }
    if (makeupIndex === -1) {
      throw new Error('Не найдена колонка с данными подпитки');
    }

    data.rows.forEach((row, index) => {
      try {
        const ctpName = ctpIndex !== -1 ? String(row[ctpIndex] || '').trim() : '';
        const ctpCode = ctpCodeIndex !== -1 ? String(row[ctpCodeIndex] || '').trim() : '';
        const dateValue = row[dateIndex];
        const makeupValue = row[makeupIndex];

        if ((!ctpName && !ctpCode) || !dateValue || makeupValue === null || makeupValue === '') {
          return; // Skip empty rows
        }

        let parsedDate: Date;
        if (dateValue instanceof Date) {
          parsedDate = dateValue;
        } else {
          parsedDate = new Date(dateValue);
          if (isNaN(parsedDate.getTime())) {
            console.warn(`Строка ${index + 2}: некорректная дата "${dateValue}"`);
            return;
          }
        }

        const makeupWater = parseFloat(String(makeupValue).replace(',', '.'));
        if (isNaN(makeupWater)) {
          console.warn(`Строка ${index + 2}: некорректное значение подпитки "${makeupValue}"`);
          return;
        }

        const measurement: CTEMeasurementData = {
          ctpName: ctpName || `ЦТП-${ctpCode}`,
          ctpCode: ctpCode || undefined,
          rtsName: rtsIndex !== -1 ? String(row[rtsIndex] || '').trim() : undefined,
          districtName: districtIndex !== -1 ? String(row[districtIndex] || '').trim() : undefined,
          date: parsedDate,
          makeupWater: Math.abs(makeupWater),
          undermix: undermixIndex !== -1 ? parseFloat(String(row[undermixIndex] || '0').replace(',', '.')) : undefined,
          flowG1: flowIndex !== -1 ? parseFloat(String(row[flowIndex] || '').replace(',', '.')) : undefined,
          temperature: tempIndex !== -1 ? parseFloat(String(row[tempIndex] || '').replace(',', '.')) : undefined,
          pressure: pressureIndex !== -1 ? parseFloat(String(row[pressureIndex] || '').replace(',', '.')) : undefined,
        };

        measurements.push(measurement);
      } catch (error) {
        console.warn(`Ошибка обработки строки ${index + 2}:`, error);
      }
    });

    return measurements;
  }

  static detectFileType(filename: string): 'measurements' | 'summary' | 'model' | 'unknown' {
    const name = filename.toLowerCase();
    
    if (name.includes('одпу') || name.includes('показания')) {
      return 'measurements';
    } else if (name.includes('свод') || name.includes('ведомость')) {
      return 'summary';
    } else if (name.includes('модель') || name.includes('model')) {
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
      if (!measurement.ctpName && !measurement.ctpCode) {
        errors.push(`Строка ${index + 1}: отсутствует название или код ЦТП`);
        return;
      }
      
      if (isNaN(measurement.makeupWater) || measurement.makeupWater < 0) {
        errors.push(`Строка ${index + 1}: некорректное значение подпитки`);
        return;
      }
      
      if (measurement.makeupWater > 200) {
        errors.push(`Строка ${index + 1}: подозрительно высокое значение подпитки (${measurement.makeupWater} т/ч)`);
      }
      
      valid.push(measurement);
    });
    
    return { valid, errors };
  }
}
