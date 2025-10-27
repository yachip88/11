import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrendPoint } from "../types";

interface AnomalyBreakdownChartProps {
  data: TrendPoint[];
  isLoading?: boolean;
}

function PercentBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex-1 bg-muted h-2 rounded">
      <div
        className="h-2 rounded"
        style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function AnomalyBreakdownChart({ data, isLoading }: AnomalyBreakdownChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Динамика категорий неисправностей</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={`trend-skeleton-${index}`} className="h-6 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const recent = data.slice(-7);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Динамика категорий неисправностей</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recent.map((point) => (
          <div key={point.date} className="space-y-1">
            <p className="text-xs text-muted-foreground">{point.date}</p>
            <div className="flex items-center gap-3">
              <span className="w-28 text-xs">Нет данных</span>
              <PercentBar value={point.missingDataShare} color="#f97316" />
              <span className="w-10 text-right text-sm font-medium">{point.missingDataShare}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-28 text-xs">Неисправности</span>
              <PercentBar value={point.equipmentFaultShare} color="#ef4444" />
              <span className="w-10 text-right text-sm font-medium">{point.equipmentFaultShare}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-28 text-xs">Небаланс</span>
              <PercentBar value={point.massImbalanceShare} color="#0ea5e9" />
              <span className="w-10 text-right text-sm font-medium">{point.massImbalanceShare}%</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
