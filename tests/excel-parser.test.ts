import assert from "node:assert";
import { ExcelParser, type ParsedExcelData } from "../server/excel-parser";

function runModernFormatTest() {
  const dataset: ParsedExcelData = {
    sheetName: "Часовой архив",
    headers: [
      "Потребитель",
      "Адрес",
      "Тепловычислитель",
      "Дата",
      "Подпитка",
      "Разность масс",
      "Подмес",
    ],
    rows: [
      [
        "ЦТП К04",
        "ул. Зорге, 129",
        "СПТ944 (ТВ1)",
        "2025-04-01 00:00",
        "-",
        "12,4",
        "-1,2",
      ],
      [
        "ЦТП К04",
        "ул. Зорге, 129",
        "СПТ944 (ТВ1)",
        new Date("2025-04-01T01:00:00"),
        "10,5",
        "10,5",
        null,
      ],
    ],
    metadata: {
      fileType: "xlsx",
      source: "ЦТП К04 Зорге,129, СПТ944 (ТВ1), 13607, 3-РТС, Часовой архив",
      inferredRts: "3-РТС",
    },
  };

  const measurements = ExcelParser.parseMeasurements(dataset);
  assert.strictEqual(measurements.length, 2, "expected two measurements");

  const first = measurements[0];
  assert.strictEqual(first.ctpName, "ЦТП К04");
  assert.strictEqual(first.address, "ул. Зорге, 129");
  assert.strictEqual(first.heatMeter, "СПТ944 (ТВ1)");
  assert.strictEqual(first.makeupWater, 12.4);
  assert.strictEqual(first.undermix, -1.2);
  assert.strictEqual(first.rtsName, "3-РТС");

  const second = measurements[1];
  assert.strictEqual(second.makeupWater, 10.5);
  assert.strictEqual(second.undermix, undefined);
}

function runMissingColumnTest() {
  const missingColumns: ParsedExcelData = {
    sheetName: "Sheet1",
    headers: ["Потребитель", "Подпитка"],
    rows: [["ЦТП-1", 12]],
  };

  assert.throws(
    () => ExcelParser.parseMeasurements(missingColumns),
    /Missing column with a date/,
    "should fail when required columns are missing",
  );
}

function runInvalidRowTest() {
  const badRows: ParsedExcelData = {
    sheetName: "Sheet1",
    headers: ["Потребитель", "Дата", "Подпитка"],
    rows: [
      ["ЦТП-1", "not-a-date", "abc"],
      ["", "2025-01-05", 12],
    ],
  };

  const measurements = ExcelParser.parseMeasurements(badRows);
  assert.strictEqual(measurements.length, 0, "invalid rows should be skipped");
}

runModernFormatTest();
runMissingColumnTest();
runInvalidRowTest();

console.log("ExcelParser tests passed");
