// Utility functions for parsing Excel files
// Note: In a real implementation, this would use libraries like xlsx or exceljs
// For now, this provides the interface and basic structure

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
  date: Date;
  makeupWater: number;
  undermix: number;
  flowG1?: number;
  temperature?: number;
  pressure?: number;
}

export interface RTSData {
  rtsCode: string;
  rtsName: string;
  measurements: CTEMeasurementData[];
}

export class ExcelParser {
  static async parseFile(file: File): Promise<ParsedExcelData[]> {
    // In a real implementation, this would use a library like xlsx
    // to parse the actual Excel file
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          // Mock parsing - in reality would parse the actual Excel structure
          const mockData: ParsedExcelData[] = [{
            sheetName: 'Sheet1',
            headers: ['ЦТП', 'РТС', 'Дата', 'Подпитка', 'Подмес'],
            rows: [
              ['ЦТП-125', 'РТС-1', '2025-01-29', '40.3', '5.2'],
              ['ЦТП-156', 'РТС-4', '2025-01-29', '45.8', '6.1'],
            ],
            metadata: {
              fileType: file.name.split('.').pop() || 'unknown',
              lastModified: new Date(file.lastModified),
              source: file.name,
            }
          }];
          
          resolve(mockData);
        } catch (error) {
          reject(new Error(`Ошибка парсинга файла: ${error}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Ошибка чтения файла'));
      };
      
      // For Excel files, we would use ArrayBuffer
      reader.readAsArrayBuffer(file);
    });
  }

  static parseMeasurements(data: ParsedExcelData): CTEMeasurementData[] {
    const measurements: CTEMeasurementData[] = [];
    
    // Find column indices
    const headers = data.headers.map(h => h.toLowerCase());
    const ctpIndex = headers.findIndex(h => h.includes('цтп'));
    const dateIndex = headers.findIndex(h => h.includes('дата'));
    const makeupIndex = headers.findIndex(h => h.includes('подпитка'));
    const undermixIndex = headers.findIndex(h => h.includes('подмес'));
    
    if (ctpIndex === -1 || dateIndex === -1 || makeupIndex === -1) {
      throw new Error('Не найдены необходимые колонки в файле');
    }
    
    data.rows.forEach((row, index) => {
      try {
        const measurement: CTEMeasurementData = {
          ctpName: String(row[ctpIndex]),
          date: new Date(row[dateIndex]),
          makeupWater: parseFloat(String(row[makeupIndex])),
          undermix: undermixIndex !== -1 ? parseFloat(String(row[undermixIndex])) : 0,
        };
        
        // Validate data
        if (!measurement.ctpName || isNaN(measurement.makeupWater)) {
          console.warn(`Пропущена строка ${index + 1}: некорректные данные`);
          return;
        }
        
        measurements.push(measurement);
      } catch (error) {
        console.warn(`Ошибка обработки строки ${index + 1}:`, error);
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
      if (!measurement.ctpName) {
        errors.push(`Строка ${index + 1}: отсутствует название ЦТП`);
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

export default ExcelParser;
