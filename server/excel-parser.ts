import * as XLSX from "xlsx";

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
    ctpName?: string;
    ctpCode?: string;
    ctpDisplayName?: string;
    address?: string;
    meterInfo?: string;
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
  private static normalizeString(value: any): string {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\s+/g, " ").trim();
  }

  private static normalizeHeaderValue(value: any): string {
    return this.normalizeString(value).toLowerCase().replace(/ё/g, "е");
  }

  private static isUnitsRow(row?: any[]): boolean {
    if (!row) return false;
    return row.some((cell) => {
      if (typeof cell !== "string") return false;
      const trimmed = cell.trim();
      if (!trimmed) return false;
      return /^[°%a-zа-яё\/]+$/i.test(trimmed) || trimmed.length <= 6;
    });
  }

  private static combineHeaderRows(
    primaryRow: any[],
    groupRow?: any[],
  ): string[] {
    const combined: string[] = [];
    const nameCount = new Map<string, number>();

    for (let i = 0; i < primaryRow.length; i++) {
      const primary = this.normalizeString(primaryRow[i]);
      const group = groupRow ? this.normalizeString(groupRow[i]) : "";

      let header = primary;
      if (!header && group) {
        header = group;
      } else if (
        group &&
        header &&
        !header.toLowerCase().includes(group.toLowerCase())
      ) {
        header = `${group} ${header}`.trim();
      }

      if (!header) {
        header = `column_${i}`;
      }

      const normalized = header.toLowerCase();
      const count = nameCount.get(normalized) ?? 0;
      nameCount.set(normalized, count + 1);

      if (count > 0) {
        combined.push(`${header} ${count + 1}`);
      } else {
        combined.push(header);
      }
    }

    return combined;
  }

  private static extractSheetMetadata(
    data: any[][],
    headerRowIndex: number,
  ): {
    ctpName?: string;
    ctpCode?: string;
    address?: string;
    meterInfo?: string;
  } {
    const metadata: {
      ctpName?: string;
      ctpCode?: string;
      address?: string;
      meterInfo?: string;
    } = {};
    const metaRows = data.slice(0, Math.max(0, headerRowIndex));

    for (const row of metaRows) {
      if (!Array.isArray(row)) continue;
      const cell = row.find(
        (value) => typeof value === "string" && value.trim() !== "",
      );
      if (!cell || typeof cell !== "string") continue;

      const text = cell.replace(/\t+/g, " ").trim();
      const lower = text.toLowerCase();

      if (lower.startsWith("потребитель")) {
        const value = text.split(":").slice(1).join(":").trim();
        if (value) {
          const normalized = this.normalizeCtpName(value);
          metadata.ctpName = normalized;
          const codeMatch = value.match(/цтп[-\s]*([а-яa-z0-9]+)/i);
          if (codeMatch) {
            metadata.ctpCode = codeMatch[1].toUpperCase();
          }
        }
      } else if (lower.startsWith("адрес")) {
        const value = text.split(":").slice(1).join(":").trim();
        if (value) {
          metadata.address = value.replace(/\s+/g, " ").trim();
        }
      } else if (lower.startsWith("тепловычислитель")) {
        const value = text.split(":").slice(1).join(":").trim();
        if (value) {
          metadata.meterInfo = value.replace(/\s+/g, " ").trim();
        }
      }
    }

    return metadata;
  }

  private static buildCtpDisplayName(meta: {
    ctpName?: string;
    address?: string;
  }): string | undefined {
    if (!meta.ctpName) return undefined;
    const parts = [meta.ctpName];
    if (meta.address) {
      parts.push(meta.address);
    }
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  private static normalizeCtpName(name: string): string {
    const cleaned = name.replace(/\t+/g, " ").replace(/\s+/g, " ").trim();
    return cleaned
      .replace(/цтп[-\s]*/i, "ЦТП ")
      .replace(/\s+/g, " ")
      .trim();
  }

  static async parseFile(
    buffer: Buffer,
    filename: string,
  ): Promise<ParsedExcelData[]> {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const parsedSheets: ParsedExcelData[] = [];
      const rtsNumber = this.extractRTSNumber(filename);
      const districtName = this.extractDistrictFromFilename(filename);

      console.log(
        `📄 Извлечено из имени файла: РТС="${rtsNumber}", Район="${districtName}"`,
      );

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: null,
        });

        if (jsonData.length === 0) continue;

        // Find the row with headers (look for row with "Дата" or multiple non-empty cells)
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i] as any[];
          const rowStr = row
            .map((cell) => String(cell || "").toLowerCase())
            .join(" ");

          // Look for typical header keywords
          if (
            rowStr.includes("дата") &&
            (rowStr.includes("время") ||
              rowStr.includes("подпит") ||
              rowStr.includes("разность"))
          ) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          console.warn(
            `⚠️ Не найдена строка с заголовками в листе ${sheetName}`,
          );
          continue;
        }

        console.log(
          `✅ Найдена строка заголовков на позиции ${headerRowIndex + 1}`,
        );

        const primaryHeaderRow = jsonData[headerRowIndex] as any[];
        const groupHeaderRow =
          headerRowIndex > 0
            ? (jsonData[headerRowIndex - 1] as any[])
            : undefined;
        const unitsRowCandidate = jsonData[headerRowIndex + 1] as
          | any[]
          | undefined;

        const headers = this.combineHeaderRows(
          primaryHeaderRow,
          groupHeaderRow,
        );
        const dataStartIndex =
          headerRowIndex + 1 + (this.isUnitsRow(unitsRowCandidate) ? 1 : 0);

        const rows = jsonData.slice(dataStartIndex).filter((row: any) => {
          return (
            Array.isArray(row) &&
            row.some((cell) => cell !== null && cell !== "")
          );
        }) as any[][];

        console.log(
          `📋 Найденные заголовки: ${headers.slice(0, 10).join(" | ")}`,
        );
        console.log(`📈 Загружено ${rows.length} строк данных`);

        const sheetMetadata = this.extractSheetMetadata(
          jsonData as any[][],
          headerRowIndex,
        );

        parsedSheets.push({
          sheetName,
          headers,
          rows,
          metadata: {
            fileType: filename.split(".").pop() || "unknown",
            source: filename,
            rtsNumber: rtsNumber,
            districtName: districtName,
            ctpName: sheetMetadata.ctpName,
            ctpCode: sheetMetadata.ctpCode,
            ctpDisplayName: this.buildCtpDisplayName(sheetMetadata),
            address: sheetMetadata.address,
            meterInfo: sheetMetadata.meterInfo,
          },
        });
      }

      return parsedSheets;
    } catch (error) {
      throw new Error(`Ошибка парсинга файла: ${error}`);
    }
  }

  static parseMeasurements(data: ParsedExcelData): CTEMeasurementData[] {
    const measurements: CTEMeasurementData[] = [];

    const headers = data.headers.map((h) => this.normalizeHeaderValue(h));

    // Try to find column indices with various possible names
    const ctpIndex = headers.findIndex(
      (h) =>
        h.includes("цтп") ||
        h.includes("наименование") ||
        h.includes("объект") ||
        h.includes("название") ||
        h.includes("name") ||
        h.includes("точка"),
    );
    const ctpCodeIndex = headers.findIndex(
      (h) => h.includes("код цтп") || h.includes("номер") || h.includes("код"),
    );
    const rtsIndex = headers.findIndex(
      (h) => h.includes("ртс") || h.includes("тэц") || h.includes("источник"),
    );
    const districtIndex = headers.findIndex(
      (h) => h.includes("район") || h.includes("микрорайон"),
    );
    let dateIndex = headers.findIndex(
      (h) => h.includes("дата") || h.includes("date"),
    );
    let timeIndex = headers.findIndex(
      (h) => h.includes("время") || h.includes("time"),
    );

    // Подпитка или разность масс
    let makeupIndex = headers.findIndex(
      (h) =>
        h.includes("подпит") || h.includes("makeup") || h.includes("подачи"),
    );
    let massDiffIndex = headers.findIndex(
      (h) => h.includes("разность масс") || h.includes("масс"),
    );

    let undermixIndex = headers.findIndex(
      (h) => h.includes("подмес") || h.includes("недомес"),
    );
    let flowIndex = headers.findIndex(
      (h) => h.includes("расход") || h.includes("g1") || h.includes("g-1"),
    );
    let tempIndex = headers.findIndex(
      (h) => h.includes("темпер") || h.includes("t1") || h.includes("t-1"),
    );
    let pressureIndex = headers.findIndex(
      (h) => h.includes("давлен") || h.includes("p1") || h.includes("p-1"),
    );

    if (dateIndex === -1) {
      const fallbackDate = headers.findIndex((h) => h.includes("дата"));
      if (fallbackDate !== -1) dateIndex = fallbackDate;
    }
    if (timeIndex === -1) {
      const fallbackTime = headers.findIndex((h) => h.includes("время"));
      if (fallbackTime !== -1) timeIndex = fallbackTime;
    }
    if (makeupIndex === -1) {
      const fallbackMakeup = headers.findIndex(
        (h) => h.includes("подпит") && h.includes("мас"),
      );
      if (fallbackMakeup !== -1) makeupIndex = fallbackMakeup;
    }
    if (massDiffIndex === -1) {
      const fallbackMassDiff = headers.findIndex(
        (h) =>
          (h.includes("разност") || h.includes("небаланс")) &&
          h.includes("мас"),
      );
      if (fallbackMassDiff !== -1) massDiffIndex = fallbackMassDiff;
    }
    if (undermixIndex === -1) {
      const fallbackUndermix = headers.findIndex((h) => h.includes("небаланс"));
      if (fallbackUndermix !== -1) undermixIndex = fallbackUndermix;
    }

    console.log(`🔍 Индексы колонок:`);
    console.log(`   ЦТП: ${ctpIndex}, Дата: ${dateIndex}, Время: ${timeIndex}`);
    console.log(`   Подпитка: ${makeupIndex}, Разность масс: ${massDiffIndex}`);

    if (dateIndex === -1) {
      throw new Error("Не найдена колонка с датой");
    }
    if (makeupIndex === -1 && massDiffIndex === -1) {
      throw new Error(
        "Не найдена колонка с данными подпитки или разности масс",
      );
    }

    // Извлекаем имя ЦТП из метаданных (из названия файла)
    const metadataCtpName =
      data.metadata?.ctpDisplayName || data.metadata?.ctpName;
    const metadataCtpCode = data.metadata?.ctpCode;
    const fileCtpName =
      metadataCtpName ||
      (data.metadata?.source
        ? this.extractCTPFromFilename(data.metadata.source)
        : undefined);
    const fileRtsNumber = data.metadata?.rtsNumber;
    const fileDistrictName = data.metadata?.districtName;

    console.log(
      `📄 Метаданные файла: ЦТП="${metadataCtpName ?? fileCtpName}", РТС="${fileRtsNumber}", Район="${fileDistrictName}"`,
    );

    let processedCount = 0;
    let skippedCount = 0;

    data.rows.forEach((row, index) => {
      try {
        const ctpName =
          ctpIndex !== -1 ? String(row[ctpIndex] || "").trim() : "";
        const ctpCode =
          ctpCodeIndex !== -1 ? String(row[ctpCodeIndex] || "").trim() : "";
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
          if (val === "-" || val === "—" || val === null || val === "") {
            if (massDiffIndex !== -1) {
              makeupValue = row[massDiffIndex];
              console.log(
                `  Строка ${index + 2}: Подпитка="-", взято из "Разность масс": ${makeupValue}`,
              );
            }
          } else {
            makeupValue = val;
          }
        } else if (massDiffIndex !== -1) {
          makeupValue = row[massDiffIndex];
        }

        if (
          makeupValue === null ||
          makeupValue === "" ||
          makeupValue === "-" ||
          makeupValue === "—"
        ) {
          skippedCount++;
          return;
        }

        let parsedDate: Date;
        if (dateValue instanceof Date) {
          parsedDate = dateValue;
        } else {
          parsedDate = new Date(dateValue);
          if (isNaN(parsedDate.getTime())) {
            console.warn(
              `⚠️ Строка ${index + 2}: некорректная дата "${dateValue}"`,
            );
            skippedCount++;
            return;
          }
        }

        // Если есть время, добавляем его к дате
        if (timeValue) {
          if (timeValue instanceof Date) {
            parsedDate.setHours(
              timeValue.getHours(),
              timeValue.getMinutes(),
              timeValue.getSeconds(),
            );
          } else if (typeof timeValue === "number") {
            // Excel time format (fraction of day)
            const hours = Math.floor(timeValue * 24);
            const minutes = Math.floor((timeValue * 24 * 60) % 60);
            parsedDate.setHours(hours, minutes, 0);
          }
        }

        const makeupWater = parseFloat(String(makeupValue).replace(",", "."));
        if (isNaN(makeupWater)) {
          console.warn(
            `⚠️ Строка ${index + 2}: некорректное значение подпитки "${makeupValue}"`,
          );
          skippedCount++;
          return;
        }

        // Используем имя ЦТП из файла, если не найдено в таблице
        const finalCtpName =
          ctpName ||
          metadataCtpName ||
          fileCtpName ||
          `ЦТП-${ctpCode || metadataCtpCode || "Unknown"}`;
        const finalRtsName = fileRtsNumber
          ? `РТС-${fileRtsNumber}`
          : rtsIndex !== -1
            ? String(row[rtsIndex] || "").trim()
            : undefined;
        const finalDistrictName =
          fileDistrictName ||
          (districtIndex !== -1
            ? String(row[districtIndex] || "").trim()
            : undefined);

        const measurement: CTEMeasurementData = {
          ctpName: finalCtpName,
          ctpCode: ctpCode || metadataCtpCode || undefined,
          rtsName: finalRtsName,
          districtName: finalDistrictName,
          date: parsedDate,
          makeupWater: Math.abs(makeupWater),
          undermix:
            undermixIndex !== -1
              ? parseFloat(String(row[undermixIndex] || "0").replace(",", "."))
              : undefined,
          flowG1:
            flowIndex !== -1
              ? parseFloat(String(row[flowIndex] || "").replace(",", "."))
              : undefined,
          temperature:
            tempIndex !== -1
              ? parseFloat(String(row[tempIndex] || "").replace(",", "."))
              : undefined,
          pressure:
            pressureIndex !== -1
              ? parseFloat(String(row[pressureIndex] || "").replace(",", "."))
              : undefined,
        };

        measurements.push(measurement);
        processedCount++;
      } catch (error) {
        console.warn(`⚠️ Ошибка обработки строки ${index + 2}:`, error);
        skippedCount++;
      }
    });

    console.log(
      `✅ Обработано ${processedCount} измерений, пропущено ${skippedCount} строк`,
    );

    return measurements;
  }

  static extractCTPFromFilename(filename: string): string | undefined {
    const lower = filename.toLowerCase();
    const marker = "цтп";
    const index = lower.indexOf(marker);
    if (index === -1) return undefined;

    const tail = filename.slice(index + marker.length).replace(/^[\s_-]+/, "");
    const stopIndex = tail.search(/[.,]/);
    const segment = (stopIndex !== -1 ? tail.slice(0, stopIndex) : tail).trim();
    if (!segment) return "ЦТП";

    return this.normalizeCtpName(`ЦТП ${segment}`);
  }

  static detectFileType(
    filename: string,
  ): "measurements" | "summary" | "model" | "unknown" {
    const name = filename.toLowerCase();

    if (name.includes("часовой архив")) {
      return "measurements";
    }

    if (
      name.includes("одпу") ||
      name.includes("показания") ||
      name.includes("архив")
    ) {
      return "measurements";
    } else if (name.includes("свод") || name.includes("ведомость")) {
      return "summary";
    } else if (name.includes("модель") || name.includes("model")) {
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
      if (!measurement.ctpName && !measurement.ctpCode) {
        errors.push(`Строка ${index + 1}: отсутствует название или код ЦТП`);
        return;
      }

      if (isNaN(measurement.makeupWater) || measurement.makeupWater < 0) {
        errors.push(`Строка ${index + 1}: некорректное значение подпитки`);
        return;
      }

      if (measurement.makeupWater > 1000) {
        errors.push(
          `Строка ${index + 1}: подозрительно высокое значение подпитки (${measurement.makeupWater} т/ч)`,
        );
      }

      valid.push(measurement);
    });

    return { valid, errors };
  }
}
