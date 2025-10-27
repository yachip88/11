import { useCallback, useState } from "react";
import { DEFAULT_ANALYTICS_FILTERS } from "../constants";
import type { AnalyticsFilters, PeriodPreset } from "../types";

interface UseAnalyticsFiltersResult {
  filters: AnalyticsFilters;
  setPeriod: (period: PeriodPreset) => void;
  setDateRange: (start?: string | null, end?: string | null) => void;
  setLocation: (rtsId?: string | null, districtId?: string | null) => void;
  reset: () => void;
}

export function useAnalyticsFilters(): UseAnalyticsFiltersResult {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_ANALYTICS_FILTERS);

  const setPeriod = useCallback((period: PeriodPreset) => {
    setFilters((prev) => ({ ...prev, period }));
  }, []);

  const setDateRange = useCallback((start?: string | null, end?: string | null) => {
    setFilters((prev) => ({ ...prev, startDate: start ?? null, endDate: end ?? null }));
  }, []);

  const setLocation = useCallback((rtsId?: string | null, districtId?: string | null) => {
    setFilters((prev) => ({ ...prev, rtsId: rtsId ?? null, districtId: districtId ?? null }));
  }, []);

  const reset = useCallback(() => setFilters(DEFAULT_ANALYTICS_FILTERS), []);

  return {
    filters,
    setPeriod,
    setDateRange,
    setLocation,
    reset,
  };
}
