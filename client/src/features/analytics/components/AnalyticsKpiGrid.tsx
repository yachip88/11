import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AnalyticsKpi } from "../types";

interface AnalyticsKpiGridProps {
  kpis: AnalyticsKpi[];
  isLoading?: boolean;
}

const statusPalette: Record<AnalyticsKpi["status"], string> = {
  ok: "text-green-600",
  warning: "text-amber-500",
  critical: "text-red-600",
};

export function AnalyticsKpiGrid({ kpis, isLoading }: AnalyticsKpiGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`kpi-skeleton-${index}`}>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              {kpi.label}
              <Badge variant="outline" className={cn("capitalize", statusPalette[kpi.status])}>
                {kpi.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="text-3xl font-semibold">
              {kpi.value}
              {kpi.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{kpi.unit}</span>}
            </div>
            {kpi.trendPercent !== undefined && (
              <p className={cn("text-sm", kpi.trendPercent >= 0 ? "text-green-600" : "text-red-600")}> 
                {kpi.trendPercent > 0 ? "+" : ""}
                {kpi.trendPercent}% к прошлому периоду
              </p>
            )}
            {kpi.description && (
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
