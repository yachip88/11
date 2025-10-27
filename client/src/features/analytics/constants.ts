import type { AnalyticsFilters, PeriodPreset } from "./types";

export interface PeriodOption {
  label: string;
  value: PeriodPreset;
  description: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "День", value: "day", description: "Детальный анализ последних 24 часов" },
  { label: "Неделя", value: "week", description: "Средние значения и тренды по неделе" },
  { label: "Месяц", value: "month", description: "Сводка среднего месяца и пиков" },
  { label: "Год", value: "year", description: "Годовая ретроспектива и экономический эффект" },
];

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  period: "week",
  startDate: null,
  endDate: null,
  rtsId: null,
  districtId: null,
};
