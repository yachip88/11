import { Badge } from "@/components/ui/badge";
import { AnalyticsKpiGrid } from "./AnalyticsKpiGrid";
import { MassBalanceWidget } from "./MassBalanceWidget";
import { DataAvailabilityWidget } from "./DataAvailabilityWidget";
import { AnomalyBreakdownChart } from "./AnomalyBreakdownChart";
import { PeriodSelector } from "./PeriodSelector";
import { useAnalyticsFilters } from "../hooks/useAnalyticsFilters";
import { useAnalyticsQuery } from "../hooks/useAnalyticsQuery";
import { mockAnalyticsSummary, mockTrendSeries } from "../mock-data";

export function AnalyticsOverview() {
  const { filters, setPeriod } = useAnalyticsFilters();
  const { data, isLoading, isFetching } = useAnalyticsQuery(filters);

  const summary = data?.summary ?? mockAnalyticsSummary;
  const trend = data?.trend ?? mockTrendSeries;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground tracking-wide">Взлёт СП4 · Аналитика</p>
          <h2 className="text-2xl font-semibold mt-1">Суточный анализ теплоносителя</h2>
          <p className="text-sm text-muted-foreground">
            Категоризация неисправностей: отсутствие данных, сбои приборов, небаланс расхода и экономический эффект.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Обновлено: {new Date(summary.updatedAt).toLocaleString()}</p>
            {isFetching && <p className="text-blue-600">Обновляем данные...</p>}
          </div>
          <PeriodSelector value={filters.period} onChange={setPeriod} />
        </div>
      </div>

      <AnalyticsKpiGrid kpis={summary.kpis} isLoading={isLoading} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <MassBalanceWidget balance={summary.balance} isLoading={isLoading} />
          <AnomalyBreakdownChart data={trend} isLoading={isLoading} />
        </div>
        <div className="space-y-4">
          <DataAvailabilityWidget data={summary.dataGaps} isLoading={isLoading} />
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Статус системы</span>
              <Badge variant="secondary">MS SQL</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Сводка формируется из агрегатов MS SQL Взлёт СП4 (ритм выгрузки — каждые 24 часа).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
