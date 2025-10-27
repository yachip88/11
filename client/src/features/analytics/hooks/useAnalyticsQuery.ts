import { useQuery } from "@tanstack/react-query";
import { mockAnalyticsSummary, mockTrendSeries } from "../mock-data";
import type { AnalyticsFilters, AnalyticsResponse } from "../types";

async function fetchAnalytics(filters: AnalyticsFilters): Promise<AnalyticsResponse> {
  const params = new URLSearchParams();

  params.set("period", filters.period);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.rtsId) params.set("rtsId", filters.rtsId);
  if (filters.districtId) params.set("districtId", filters.districtId);

  const response = await fetch(`/api/analytics/summary?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Ќе удалось загрузить аналитические данные");
  }

  return (await response.json()) as AnalyticsResponse;
}

export function useAnalyticsQuery(filters: AnalyticsFilters) {
  return useQuery<AnalyticsResponse>({
    queryKey: ["analytics", filters],
    queryFn: () => fetchAnalytics(filters),
    placeholderData: { summary: mockAnalyticsSummary, trend: mockTrendSeries },
    staleTime: 60_000,
  });
}
