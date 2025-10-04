import * as XLSX from 'xlsx';
import { db } from './db.js';
import type { InsertCTP, InsertVyvod, InsertRTS, InsertDistrict, InsertMeasurement } from '@shared/schema';

interface ParsedCTP {
  name: string;
  code: string;
  fullName: string | null;
  city: string | null;
  address: string | null;
  yearBuilt: number | null;
  vyvodName: string | null;
  districtName: string | null;
  rtsCode: string | null;
  status: string | null;
  commentPTU: string | null;
  commentRTS: string | null;
  commentSKIPiA: string | null;
  av365G1: number | null;
  av365G2: number | null;
  min730: number | null;
  min365: number | null;
  min30: number | null;
  min7: number | null;
  percentFromG1: number | null;
  normativMinenergo: number | null;
  ucl: number | null;
  lcl: number | null;
  measurements: Array<{ date: Date; value: number }>;
}

export class ModelParser {
  private workbook: XLSX.WorkBook;
  
  constructor(buffer: Buffer) {
    this.workbook = XLSX.read(buffer, { type: 'buffer' });
  }

  /**
   * Парсит лист "data ЦТП" и извлекает все данные
   */
  async parseAndImport(): Promise<{ 
    ctpCount: number; 
    measurementCount: number; 
    vyvodCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      console.log('📊 Начало парсинга Model_2.5.20.xlsm...');
      
      // Проверяем наличие листа "data ЦТП"
      if (!this.workbook.SheetNames.includes('data ЦТП')) {
        throw new Error('Лист "data ЦТП" не найден в файле');
      }

      const dataSheet = this.workbook.Sheets['data ЦТП'];
      const dataArray = XLSX.utils.sheet_to_json(dataSheet, { header: 1, defval: null }) as any[][];

      console.log(`Найдено ${dataArray.length} строк в листе "data ЦТП"`);

      // Находим строку с заголовками (строка 3, индекс 2)
      const headerRow = dataArray[2];
      if (!headerRow) {
        throw new Error('Не найдена строка с заголовками');
      }

      // Маппинг колонок
      const columnMap = this.createColumnMap(headerRow);
      console.log('Найдены колонки:', Object.keys(columnMap).slice(0, 20).join(', '));

      // Извлекаем данные ЦТП (начиная со строки 4, индекс 3)
      const parsedCTPs: ParsedCTP[] = [];
      
      for (let i = 3; i < dataArray.length; i++) {
        const row = dataArray[i];
        if (!row || !row[columnMap.цтп]) continue; // Пропускаем пустые строки
        
        try {
          const parsed = this.parseCtpRow(row, columnMap, headerRow);
          if (parsed) {
            parsedCTPs.push(parsed);
          }
        } catch (err) {
          const error = `Ошибка в строке ${i + 1}: ${err instanceof Error ? err.message : String(err)}`;
          errors.push(error);
          console.warn(error);
        }
      }

      console.log(`✅ Распарсено ${parsedCTPs.length} ЦТП`);

      // Импортируем данные в БД
      const result = await this.importToDatabase(parsedCTPs);

      return {
        ...result,
        errors
      };

    } catch (err) {
      const error = `Критическая ошибка парсинга: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(error);
      console.error(error);
      throw err;
    }
  }

  /**
   * Создает маппинг колонок по заголовкам
   */
  private createColumnMap(headerRow: any[]): Record<string, number> {
    const map: Record<string, number> = {};
    
    headerRow.forEach((header, index) => {
      if (header !== null && header !== '') {
        const key = String(header).trim();
        // Сохраняем как есть и lowercase версию для case-insensitive поиска
        map[key] = index;
        map[key.toLowerCase()] = index;
      }
    });
    
    return map;
  }

  /**
   * Парсит одну строку ЦТП
   */
  private parseCtpRow(row: any[], columnMap: Record<string, number>, headerRow: any[]): ParsedCTP | null {
    // Пробуем разные варианты названия колонки (с заглавной и строчной)
    const ctpCode = this.cleanString(
      row[columnMap['ЦТП']] || row[columnMap['цтп']] || row[columnMap['Цтп']]
    );
    if (!ctpCode) return null;

    // Извлекаем основные данные
    const fullName = this.cleanString(row[columnMap['Полное наименование']]);
    const city = this.cleanString(row[columnMap['Город']]);
    const address = this.cleanString(row[columnMap['Адрес']]);
    const yearBuilt = this.parseNumber(row[columnMap['Год постройки']]);
    const vyvodName = this.cleanString(row[columnMap['Вывод']]);
    
    // Извлекаем номер РТС из столбца "Микрорайон отчет" (формат: "3-РТС" или "РТС-3")
    const microraionRaw = this.cleanString(row[columnMap['Микрорайон отчет']]);
    const rtsCode = this.extractRTSCode(microraionRaw);
    const districtName = microraionRaw; // Сохраняем полное значение как название района
    
    const status = this.cleanString(row[columnMap['Статус']]);
    const commentPTU = this.cleanString(row[columnMap['Комментарий ПТУ']]);
    const commentRTS = this.cleanString(row[columnMap['Комментарий РТС']]);
    const commentSKIPiA = this.cleanString(row[columnMap['Комментарий СКИПиА']]);

    // Расширенная статистика
    const av365G1 = this.parseNumber(row[columnMap['av 365 G1']]);
    const av365G2 = this.parseNumber(row[columnMap['av 365 G2']]);
    const min730 = this.parseNumber(row[columnMap['min 730']]);
    const min365 = this.parseNumber(row[columnMap['min 365']]);
    const min30 = this.parseNumber(row[columnMap['min 30']]);
    const min7 = this.parseNumber(row[columnMap['min 7']]);
    const percentFromG1 = this.parseNumber(row[columnMap['% от G1']]);
    const normativMinenergo = this.parseNumber(row[columnMap['Норматив подпитки Минэнерго 0,25% Vсети']]);

    // Контрольные границы
    const ucl = this.parseNumber(row[columnMap['max.stat.sign.sample']]);
    const lcl = this.parseNumber(row[columnMap['min.stat.sign.sample']]);

    // Извлекаем исторические измерения
    const measurements: Array<{ date: Date; value: number }> = [];
    
    // Колонки с датами начинаются после основных полей (примерно с колонки 40+)
    // Заголовки - это номера дат в формате Excel (45200, 45201 и т.д.)
    for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
      const header = headerRow[colIndex];
      
      // Проверяем, является ли заголовок числом (датой в формате Excel)
      if (typeof header === 'number' && header > 40000 && header < 50000) {
        const value = this.parseNumber(row[colIndex]);
        
        if (value !== null && value !== 0) {
          // Конвертируем Excel дату в JavaScript Date
          const date = this.excelDateToJSDate(header);
          measurements.push({ date, value });
        }
      }
    }

    return {
      name: ctpCode,
      code: ctpCode,
      fullName,
      city,
      address,
      yearBuilt,
      vyvodName,
      districtName,
      rtsCode,
      status,
      commentPTU,
      commentRTS,
      commentSKIPiA,
      av365G1,
      av365G2,
      min730,
      min365,
      min30,
      min7,
      percentFromG1,
      normativMinenergo,
      ucl,
      lcl,
      measurements
    };
  }

  /**
   * Импортирует распарсенные данные в БД
   */
  private async importToDatabase(parsedCTPs: ParsedCTP[]): Promise<{
    ctpCount: number;
    measurementCount: number;
    vyvodCount: number;
  }> {
    console.log('🗄️  Начало импорта в базу данных...');

    // 1. Собираем уникальные РТС
    const uniqueRTSCodes = new Set<string>();
    parsedCTPs.forEach(ctp => {
      if (ctp.rtsCode) uniqueRTSCodes.add(ctp.rtsCode);
    });

    console.log(`Найдено ${uniqueRTSCodes.size} уникальных РТС`);

    // Создаем или получаем РТС
    const rtsMap = new Map<string, string>(); // code -> id
    for (const rtsCode of Array.from(uniqueRTSCodes)) {
      const existing = await db.rTS.findUnique({ where: { code: rtsCode } });
      
      if (existing) {
        rtsMap.set(rtsCode, existing.id);
      } else {
        const created = await db.rTS.create({
          data: {
            name: `РТС-${rtsCode}`,  // Правильный формат названия: "РТС-3"
            code: rtsCode,           // Только номер: "3"
            location: 'Новосибирск'
          }
        });
        rtsMap.set(rtsCode, created.id);
        console.log(`✓ Создан РТС-${rtsCode}`);
      }
    }

    // 2. Собираем уникальные районы
    const uniqueDistricts = new Set<string>();
    parsedCTPs.forEach(ctp => {
      if (ctp.districtName) uniqueDistricts.add(ctp.districtName);
    });

    console.log(`Найдено ${uniqueDistricts.size} уникальных районов`);

    // Создаем или получаем районы
    const districtMap = new Map<string, string>(); // name -> id
    for (const districtName of Array.from(uniqueDistricts)) {
      const existing = await db.districts.findFirst({ where: { name: districtName } });
      
      if (existing) {
        districtMap.set(districtName, existing.id);
      } else {
        const created = await db.districts.create({
          data: {
            name: districtName,
            rtsId: null
          }
        });
        districtMap.set(districtName, created.id);
        console.log(`✓ Создан район: ${districtName}`);
      }
    }

    // 3. Собираем уникальные выводы
    const uniqueVyvods = new Set<string>();
    parsedCTPs.forEach(ctp => {
      if (ctp.vyvodName) uniqueVyvods.add(ctp.vyvodName);
    });

    console.log(`Найдено ${uniqueVyvods.size} уникальных выводов`);

    // Создаем или получаем выводы
    const vyvodMap = new Map<string, string>(); // name -> id
    for (const vyvodName of Array.from(uniqueVyvods)) {
      const vyvodCode = this.generateVyvodCode(vyvodName);
      const existing = await db.vyvod.findUnique({ where: { code: vyvodCode } });
      
      if (existing) {
        vyvodMap.set(vyvodName, existing.id);
      } else {
        const created = await db.vyvod.create({
          data: {
            name: vyvodName,
            code: vyvodCode
          }
        });
        vyvodMap.set(vyvodName, created.id);
        console.log(`✓ Создан вывод: ${vyvodName}`);
      }
    }

    // 4. Импортируем ЦТП батчами
    let ctpCount = 0;
    let measurementCount = 0;
    const batchSize = 50;

    for (let i = 0; i < parsedCTPs.length; i += batchSize) {
      const batch = parsedCTPs.slice(i, i + batchSize);
      
      for (const parsedCTP of batch) {
        try {
          // Проверяем, существует ли ЦТП
          const existing = await db.cTP.findUnique({ where: { code: parsedCTP.code } });
          
          const ctpData: any = {
            name: parsedCTP.name,
            code: parsedCTP.code,
            fullName: parsedCTP.fullName,
            city: parsedCTP.city,
            address: parsedCTP.address,
            yearBuilt: parsedCTP.yearBuilt,
            rtsId: parsedCTP.rtsCode ? rtsMap.get(parsedCTP.rtsCode) : null,
            districtId: parsedCTP.districtName ? districtMap.get(parsedCTP.districtName) : null,
            vyvodId: parsedCTP.vyvodName ? vyvodMap.get(parsedCTP.vyvodName) : null,
            status: parsedCTP.status,
            commentPTU: parsedCTP.commentPTU,
            commentRTS: parsedCTP.commentRTS,
            commentSKIPiA: parsedCTP.commentSKIPiA,
            av365G1: parsedCTP.av365G1,
            av365G2: parsedCTP.av365G2,
            min730: parsedCTP.min730,
            min365: parsedCTP.min365,
            min30: parsedCTP.min30,
            min7: parsedCTP.min7,
            percentFromG1: parsedCTP.percentFromG1,
            normativMinenergo: parsedCTP.normativMinenergo,
            ucl: parsedCTP.ucl,
            lcl: parsedCTP.lcl,
          };

          let ctp;
          if (existing) {
            // Обновляем существующую ЦТП
            ctp = await db.cTP.update({
              where: { id: existing.id },
              data: ctpData
            });
          } else {
            // Создаем новую ЦТП
            ctp = await db.cTP.create({
              data: ctpData
            });
          }

          ctpCount++;

          // Импортируем измерения батчами
          if (parsedCTP.measurements.length > 0) {
            const measurementBatchSize = 100;
            
            for (let j = 0; j < parsedCTP.measurements.length; j += measurementBatchSize) {
              const measurementBatch = parsedCTP.measurements.slice(j, j + measurementBatchSize);
              
              await db.measurements.createMany({
                data: measurementBatch.map(m => ({
                  ctpId: ctp.id,
                  date: m.date,
                  makeupWater: m.value,
                  undermix: 0,
                  flowG1: null,
                  temperature: null,
                  pressure: null
                }))
              });

              measurementCount += measurementBatch.length;
            }
          }

        } catch (err) {
          console.error(`Ошибка импорта ЦТП ${parsedCTP.code}:`, err);
        }
      }

      console.log(`Импортировано ${Math.min(i + batchSize, parsedCTPs.length)}/${parsedCTPs.length} ЦТП...`);
    }

    console.log(`✅ Импорт завершен: ${ctpCount} ЦТП, ${measurementCount} измерений, ${vyvodMap.size} выводов`);

    return {
      ctpCount,
      measurementCount,
      vyvodCount: vyvodMap.size
    };
  }

  /**
   * Очищает строку от null, undefined, "-"
   */
  private cleanString(value: any): string | null {
    if (value === null || value === undefined || value === '' || value === '-') {
      return null;
    }
    return String(value).trim();
  }

  /**
   * Парсит число из различных форматов
   */
  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '' || value === '-') {
      return null;
    }
    
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return isNaN(num) ? null : num;
  }

  /**
   * Конвертирует Excel дату в JavaScript Date
   */
  private excelDateToJSDate(excelDate: number): Date {
    // Excel даты считаются от 1 января 1900
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const excelEpoch = new Date(1899, 11, 30); // 30 декабря 1899
    return new Date(excelEpoch.getTime() + excelDate * millisecondsPerDay);
  }

  /**
   * Извлекает номер РТС из строки "Микрорайон отчет"
   * Примеры: "3-РТС" -> "3", "РТС-3" -> "3", "5 РТС" -> "5"
   */
  private extractRTSCode(microraionValue: string | null): string | null {
    if (!microraionValue) return null;
    
    // Ищем паттерны: "число-РТС", "РТС-число", "число РТС"
    const patterns = [
      /(\d+)\s*-?\s*РТС/i,  // "3-РТС" или "3 РТС"
      /РТС\s*-?\s*(\d+)/i   // "РТС-3" или "РТС 3"
    ];
    
    for (const pattern of patterns) {
      const match = microraionValue.match(pattern);
      if (match && match[1]) {
        return match[1]; // Возвращаем только номер (например, "3")
      }
    }
    
    return null;
  }

  /**
   * Генерирует код вывода из названия
   */
  private generateVyvodCode(name: string): string {
    // Убираем спецсимволы и оставляем только буквы, цифры, тире
    return name
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 100);
  }
}
