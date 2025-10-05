import { describe, it, expect } from "vitest";
import { ExcelParser, type ParsedExcelData } from "../server/excel-parser";

describe("ExcelParser", () => {
  it("parses modern daily format", () => {
    const dataset: ParsedExcelData = {
      sheetName: "Суточный архив",
      headers: [
        "Название",
        "Адрес",
        "Тепловычислитель",
        "Дата",
        "Подпитка",
        "Разность масс",
        "Недомес",
      ],
      rows: [
        [
          "ЦТП К04",
          "ул. Зорге, 129",
          "СПТ944 (ТВ1)",
          "2025-04-01",
          "12,4",
          "12,4",
          "-1,2",
        ],
        [
          "ЦТП К04",
          "ул. Зорге, 129",
          "СПТ944 (ТВ1)",
          "2025-04-02",
          "10,5",
          "10,5",
          null,
        ],
      ],
      metadata: {
        fileType: "xlsx",
        source: "ЦТП К04 Зорге,129, СПТ944 (ТВ1), 13607, 3-РТС, Кировский",
        ctpName: "ЦТП К04",
        ctpCode: "К04",
        ctpDisplayName: "ЦТП К04",
        address: "ул. Зорге, 129",
        meterInfo: "СПТ944 (ТВ1)",
        rtsNumber: "3",
        districtName: "Кировский",
      },
    };

    const measurements = ExcelParser.parseMeasurements(dataset);
    expect(measurements.length).toBe(2);

    const first = measurements[0];
    expect(first.ctpName).toBe("ЦТП К04");
    expect(first.ctpCode).toBe("К04");
    expect(first.makeupWater).toBe(12.4);
    expect(first.undermix).toBe(-1.2);
    expect(first.rtsName).toBe("РТС-3");
    expect(first.districtName).toBe("Кировский");

    const second = measurements[1];
    expect(second.makeupWater).toBe(10.5);
    expect(second.undermix).toBe(0);
  });

  it("fails when required columns are missing", () => {
    const missingColumns: ParsedExcelData = {
      sheetName: "Sheet1",
      headers: ["Название", "Подпитка"],
      rows: [["ЦТП-1", 12]],
    };

    expect(() => ExcelParser.parseMeasurements(missingColumns)).toThrowError(
      /Не найдена колонка с датой/,
    );
  });

  it("skips invalid rows", () => {
    const badRows: ParsedExcelData = {
      sheetName: "Sheet1",
      headers: ["Название", "Дата", "Подпитка"],
      rows: [
        ["ЦТП-1", "not-a-date", "abc"],
        ["", "2025-01-05", 12],
      ],
    };

    const measurements = ExcelParser.parseMeasurements(badRows);
    expect(measurements.length).toBe(1);
  });
});
