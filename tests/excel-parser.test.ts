import assert from "node:assert";
import { ExcelParser, type ParsedExcelData } from "../server/excel-parser";

function runHappyPathTest() {
  const dataset: ParsedExcelData = {
    sheetName: "Данные",
    headers: [
      "ЦТП",
      "Код",
      "РТС",
      "Район",
      "Дата",
      "Подпитка т/ч",
      "Подмес",
      "Расход G1",
      "Температура",
      "Давление",
    ],
    rows: [
      ["ЦТП-101", "101", "РТС-1", "Левый", "2025-01-05", "42,5", "-1,5", "120", "75", "5.2"],
      ["ЦТП-102", "102", "РТС-1", "Левый", new Date("2025-01-06"), 39.1, null, null, null, null],
    ],
  };

  const measurements = ExcelParser.parseMeasurements(dataset);
  assert.strictEqual(measurements.length, 2, "expected two measurements");

  const first = measurements[0];
  assert.strictEqual(first.ctpName, "ЦТП-101");
  assert.strictEqual(first.ctpCode, "101");
  assert.strictEqual(first.rtsName, "РТС-1");
  assert.strictEqual(first.districtName, "Левый");
  assert.strictEqual(first.makeupWater, 42.5);
  assert.strictEqual(first.undermix, -1.5);
  assert.strictEqual(first.flowG1, 120);
  assert.strictEqual(first.temperature, 75);
  assert.strictEqual(first.pressure, 5.2);
  assert(first.date instanceof Date);

  const second = measurements[1];
  assert.strictEqual(second.makeupWater, 39.1);
  assert.strictEqual(second.undermix, undefined);
}

function runNegativeTests() {
  const missingColumns: ParsedExcelData = {
    sheetName: "Sheet1",
    headers: ["ЦТП", "Подпитка"],
    rows: [["ЦТП-1", 12]],
  };

  assert.throws(
    () => ExcelParser.parseMeasurements(missingColumns),
    /Missing column with a date/,"should fail when required columns are missing",
  );

  const badRow: ParsedExcelData = {
    sheetName: "Sheet1",
    headers: ["ЦТП", "Дата", "Подпитка"],
    rows: [["ЦТП-1", "not-a-date", "abc"], ["", "2025-01-05", 12]],
  };

  const measurements = ExcelParser.parseMeasurements(badRow);
  assert.strictEqual(measurements.length, 0, "invalid rows should be skipped");
}

runHappyPathTest();
runNegativeTests();

console.log("ExcelParser tests passed");
