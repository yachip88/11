import * as XLSX from 'xlsx';

export interface ParsedExcelData {
  sheetName: string;
  headers: string[];
  rows: any[][];
  metadata?: {
    fileType: string;
    lastModified?: Date;
    source?: string;
    rtsNumber?: string;
    districtName?: string;
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
  static extractRTSNumber(filename: string): string | undefined {
    const match = filename.match(/(\d+)-РТС/i);
    return match ? match[1] : undefined;
  }

  static extractDistrictFromFilename(filename: string): string | undefined {
    // Формат: "..., 3-РТС, Кировский, ..."
    // Ищем паттерн: число-РТС, затем название района после запятой
    const match = filename.match(/\d+-РТС,\s*([^,]+)/i);
    return match ? match[1].trim() : undefined;
  }

  static async parseFile(buffer: Buffer, filename: string): Promise<ParsedExcelData[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const parsedSheets: ParsedExcelData[] = [];
      const rtsNumber = this.extractRTSNumber(filename);
      const districtName = this.extractDistrictFromFilename(filename);

      console.log(`📄 Извлечено из имени файла: РТС="${rtsNumber}", Район="${districtName}"`);

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        if (jsonData.length === 0) continue;

        // Find the row with headers (look for row with "Дата" or multiple non-empty cells)
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i] as any[];
          const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ');
          
          // Look for typical header keywords
          if (rowStr.includes('дата') && (rowStr.includes('время') || rowStr.includes('подпит') || rowStr.includes('разность'))) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          console.warn(`⚠️ Не найдена строка с заголовками в листе ${sheetName}`);
          continue;
        }

        console.log(`✅ Найдена строка заголовков на позиции ${headerRowIndex + 1}`);

        const headers = (jsonData[headerRowIndex] as any[]).map(h => String(h || '').trim());
        const rows = jsonData.slice(headerRowIndex + 1).filter((row: any) => {
          return Array.isArray(row) && row.some(cell => cell !== null && cell !== '');
        }) as any[][];

        console.log(`📋 Заголовки: ${headers.slice(0, 10).join(' | ')}`);
        console.log(`📊 Найдено ${rows.length} строк данных`);

        parsedSheets.push({
          sheetName,
          headers,
          rows,
          metadata: {
            fileType: filename.split('.').pop() || 'unknown',
            source: filename,
            rtsNumber: rtsNumber,
            districtName: districtName,
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
      h.includes('цтп') || h.includes('наименование') || h.includes('объект') || 
      h.includes('название') || h.includes('name') || h.includes('точка')
    );
    const ctpCodeIndex = headers.findIndex(h => 
      h.includes('код цтп') || h.includes('номер') || h.includes('код')
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
    const timeIndex = headers.findIndex(h => 
      h.includes('время') || h.includes('time')
    );
    
    // Подпитка или разность масс
    const makeupIndex = headers.findIndex(h => 
      h.includes('подпит') || h.includes('makeup') || h.includes('подачи')
    );
    const massDiffIndex = headers.findIndex(h => 
      h.includes('разность масс') || h.includes('масс')
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

    console.log(`🔍 Индексы колонок:`);
    console.log(`   ЦТП: ${ctpIndex}, Дата: ${dateIndex}, Время: ${timeIndex}`);
    console.log(`   Подпитка: ${makeupIndex}, Разность масс: ${massDiffIndex}`);

    if (dateIndex === -1) {
      throw new Error('Не найдена колонка с датой');
    }
    if (makeupIndex === -1 && massDiffIndex === -1) {
      throw new Error('Не найдена колонка с данными подпитки или разности масс');
    }

    // Извлекаем имя ЦТП из метаданных (из названия файла)
    const fileCtpName = data.metadata?.source ? this.extractCTPFromFilename(data.metadata.source) : undefined;
    const fileRtsNumber = data.metadata?.rtsNumber;
    const fileDistrictName = data.metadata?.districtName;

    console.log(`📄 Из имени файла: ЦТП="${fileCtpName}", РТС="${fileRtsNumber}", Район="${fileDistrictName}"`);

    let processedCount = 0;
    let skippedCount = 0;

    data.rows.forEach((row, index) => {
      try {
        const ctpName = ctpIndex !== -1 ? String(row[ctpIndex] || '').trim() : '';
        const ctpCode = ctpCodeIndex !== -1 ? String(row[ctpCodeIndex] || '').trim() : '';
        const dateValue = row[dateIndex];
        const timeValue = timeIndex !== -1 ? row[timeIndex] : null;

        // Если в строке нет даты, пропускаем
        if (!dateValue) {
          skippedCount++;
          return;
        }

        // Определяем значение подпитки
        let makeupValue = null;
        if (makeupIndex !== -1) {
          const val = row[makeupIndex];
          // Если в столбце подпитки стоит "-", берем из разности масс
          if (val === '-' || val === '—' || val === null || val === '') {
            if (massDiffIndex !== -1) {
              makeupValue = row[massDiffIndex];
              console.log(`  Строка ${index + 2}: Подпитка="-", взято из "Разность масс": ${makeupValue}`);
            }
          } else {
            makeupValue = val;
          }
        } else if (massDiffIndex !== -1) {
          makeupValue = row[massDiffIndex];
        }

        if (makeupValue === null || makeupValue === '' || makeupValue === '-' || makeupValue === '—') {
          skippedCount++;
          return;
        }

        let parsedDate: Date;
        if (dateValue instanceof Date) {
          parsedDate = dateValue;
        } else {
          parsedDate = new Date(dateValue);
          if (isNaN(parsedDate.getTime())) {
            console.warn(`⚠️ Строка ${index + 2}: некорректная дата "${dateValue}"`);
            skippedCount++;
            return;
          }
        }

        // Если есть время, добавляем его к дате
        if (timeValue) {
          if (timeValue instanceof Date) {
            parsedDate.setHours(timeValue.getHours(), timeValue.getMinutes(), timeValue.getSeconds());
          } else if (typeof timeValue === 'number') {
            // Excel time format (fraction of day)
            const hours = Math.floor(timeValue * 24);
            const minutes = Math.floor((timeValue * 24 * 60) % 60);
            parsedDate.setHours(hours, minutes, 0);
          }
        }

        const makeupWater = parseFloat(String(makeupValue).replace(',', '.'));
        if (isNaN(makeupWater)) {
          console.warn(`⚠️ Строка ${index + 2}: некорректное значение подпитки "${makeupValue}"`);
          skippedCount++;
          return;
        }

        // Используем имя ЦТП из файла, если не найдено в таблице
        const finalCtpName = ctpName || fileCtpName || `ЦТП-${ctpCode || 'Unknown'}`;
        const finalRtsName = fileRtsNumber ? `РТС-${fileRtsNumber}` : (rtsIndex !== -1 ? String(row[rtsIndex] || '').trim() : undefined);
        const finalDistrictName = fileDistrictName || (districtIndex !== -1 ? String(row[districtIndex] || '').trim() : undefined);

        const measurement: CTEMeasurementData = {
          ctpName: finalCtpName,
          ctpCode: ctpCode || undefined,
          rtsName: finalRtsName,
          districtName: finalDistrictName,
          date: parsedDate,
          makeupWater: Math.abs(makeupWater),
          undermix: undermixIndex !== -1 ? parseFloat(String(row[undermixIndex] || '0').replace(',', '.')) : undefined,
          flowG1: flowIndex !== -1 ? parseFloat(String(row[flowIndex] || '').replace(',', '.')) : undefined,
          temperature: tempIndex !== -1 ? parseFloat(String(row[tempIndex] || '').replace(',', '.')) : undefined,
          pressure: pressureIndex !== -1 ? parseFloat(String(row[pressureIndex] || '').replace(',', '.')) : undefined,
        };

        measurements.push(measurement);
        processedCount++;
      } catch (error) {
        console.warn(`⚠️ Ошибка обработки строки ${index + 2}:`, error);
        skippedCount++;
      }
    });

    console.log(`✅ Обработано ${processedCount} измерений, пропущено ${skippedCount} строк`);

    return measurements;
  }

  static extractCTPFromFilename(filename: string): string | undefined {
    // Ищем паттерн типа "ЦТП К04" или "ЦТП-104"
    const match = filename.match(/ЦТП[\s-]?([КкAa]?\d+)/i);
    return match ? `ЦТП ${match[1]}` : undefined;
  }

  static detectFileType(filename: string): 'measurements' | 'summary' | 'model' | 'unknown' {
    const name = filename.toLowerCase();
    
    if (name.includes('одпу') || name.includes('показания') || name.includes('архив')) {
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
      
      if (measurement.makeupWater > 1000) {
        errors.push(`Строка ${index + 1}: подозрительно высокое значение подпитки (${measurement.makeupWater} т/ч)`);
      }
      
      valid.push(measurement);
    });
    
    return { valid, errors };
  }
}
