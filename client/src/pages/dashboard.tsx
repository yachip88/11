import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp, TriangleAlert, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RTSWithStats } from "@shared/schema";

interface DashboardSummary {
  currentMakeupWater: number;
  ctpRequiringAttention: number;
  ctpInNormal: number;
  outOfControlCount: number;
  rtsStats: RTSWithStats[];
}

export default function Dashboard() {
  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
  });

  const { data: yearlyChange } = useQuery<{ change: number }>({
    queryKey: ["/api/trends/overall-change/year"],
  });

  const { data: weeklyChange } = useQuery<{ change: number }>({
    queryKey: ["/api/trends/overall-change/week"],
  });

  const [trendPeriod, setTrendPeriod] = useState<
    "day" | "week" | "month" | "year"
  >("week");
  const periodOptions: {
    value: "day" | "week" | "month" | "year";
    label: string;
  }[] = [
    { value: "day", label: "День" },
    { value: "week", label: "Неделя" },
    { value: "month", label: "Месяц" },
    { value: "year", label: "Год" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ошибка загрузки данных дашборда</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div
              className="metric-value text-primary"
              data-testid="metric-makeup-water"
            >
              {summary.currentMakeupWater.toLocaleString()}
            </div>
            <div className="metric-label">Подпитка т/ч (текущая)</div>
            {yearlyChange && (
              <div
                className={cn(
                  "metric-change",
                  yearlyChange.change < 0
                    ? "positive"
                    : yearlyChange.change > 0
                      ? "negative"
                      : "",
                )}
              >
                {yearlyChange.change < 0 && (
                  <ArrowDown className="w-3 h-3 mr-1" />
                )}
                {yearlyChange.change > 0 && (
                  <ArrowUp className="w-3 h-3 mr-1" />
                )}
                {yearlyChange.change.toFixed(1)} т/ч к прошлому году
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div
              className="metric-value text-yellow-600"
              data-testid="metric-attention"
            >
              {summary.ctpRequiringAttention}
            </div>
            <div className="metric-label">ЦТП требующих внимания</div>
            <div className="metric-change negative">
              <TriangleAlert className="w-3 h-3 mr-1" />
              {summary.outOfControlCount} критических
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div
              className="metric-value text-green-600"
              data-testid="metric-normal"
            >
              {summary.ctpInNormal}%
            </div>
            <div className="metric-label">ЦТП в норме</div>
            {weeklyChange && (
              <div
                className={cn(
                  "metric-change",
                  weeklyChange.change < 0
                    ? "positive"
                    : weeklyChange.change > 0
                      ? "negative"
                      : "",
                )}
              >
                {weeklyChange.change < 0 && (
                  <ArrowDown className="w-3 h-3 mr-1" />
                )}
                {weeklyChange.change > 0 && (
                  <ArrowUp className="w-3 h-3 mr-1" />
                )}
                {Math.abs(weeklyChange.change).toFixed(1)} т/ч за неделю
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div
              className="metric-value text-red-600"
              data-testid="metric-out-of-control"
            >
              {summary.outOfControlCount}
            </div>
            <div className="metric-label">Выходы за границы</div>
            <div className="metric-change negative">
              <ArrowUp className="w-3 h-3 mr-1" />
              За последние сутки
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Динамика подпитки по Новосибирску</CardTitle>
              <CardDescription>Текущий период</CardDescription>
            </div>
            <div className="flex gap-2">
              {periodOptions.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={trendPeriod === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTrendPeriod(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <TrendChart period={trendPeriod} />
          </div>
        </CardContent>
      </Card>

      {/* Regional Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Правый берег</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <TrendChart period={trendPeriod} rtsFilter="right" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Левый берег</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <TrendChart period={trendPeriod} rtsFilter="left" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RTS Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Распределение по РТС</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="data-table" data-testid="table-rts-breakdown">
              <thead>
                <tr>
                  <th>РТС</th>
                  <th>Подпитка т/ч</th>
                  <th>Изменение за неделю</th>
                  <th>Изменение за год</th>
                  <th>% от общей</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totalAbsolute = summary.rtsStats.reduce(
                    (sum, rts) => sum + Math.abs(rts.totalMakeupWater),
                    0,
                  );

                  return summary.rtsStats.map((rts) => {
                    const percentage =
                      totalAbsolute > 0
                        ? (
                            (Math.abs(rts.totalMakeupWater) / totalAbsolute) *
                            100
                          ).toFixed(1)
                        : "0.0";
                    const status = rts.criticalCount > 0 ? "warning" : "normal";

                    return (
                      <RTSRow
                        key={rts.id}
                        rts={rts}
                        percentage={percentage}
                        status={status}
                      />
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RTSRow({
  rts,
  percentage,
  status,
}: {
  rts: RTSWithStats;
  percentage: string;
  status: "normal" | "warning" | "critical";
}) {
  const { data: weeklyChangeData } = useQuery<{ change: number }>({
    queryKey: [`/api/rts/${rts.id}/weekly-change`],
  });

  const weeklyChange = weeklyChangeData?.change || 0;

  return (
    <tr data-testid={`row-rts-${rts.id}`}>
      <td className="font-semibold">
        {rts.code} ({rts.name})
      </td>
      <td className="font-mono">{rts.totalMakeupWater.toFixed(1)}</td>
      <td
        className={cn(
          weeklyChange < 0
            ? "text-green-600"
            : weeklyChange > 0
              ? "text-red-600"
              : "text-muted-foreground",
        )}
      >
        {weeklyChange < 0 && <ArrowDown className="w-4 h-4 inline mr-1" />}
        {weeklyChange > 0 && <ArrowUp className="w-4 h-4 inline mr-1" />}
        {weeklyChange.toFixed(1)}
      </td>
      <td className="text-muted-foreground">-</td>
      <td>{percentage}%</td>
      <td>
        <StatusBadge status={status}>
          {status === "warning" ? "Внимание" : "Норма"}
        </StatusBadge>
      </td>
      <td>
        <Button
          variant="outline"
          size="sm"
          data-testid={`button-details-${rts.id}`}
        >
          <Eye className="w-4 h-4 mr-1" />
          Детали
        </Button>
      </td>
    </tr>
  );
}
