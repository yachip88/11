import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp, TriangleAlert, Eye } from "lucide-react";
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
    queryKey: ['/api/dashboard/summary'],
  });

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
            <div className="metric-value text-primary" data-testid="metric-makeup-water">
              {summary.currentMakeupWater.toLocaleString()}
            </div>
            <div className="metric-label">Подпитка т/ч (текущая)</div>
            <div className="metric-change positive">
              <ArrowDown className="w-3 h-3 mr-1" />
              -71 т/ч к прошлому году
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="metric-value text-yellow-600" data-testid="metric-attention">
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
            <div className="metric-value text-green-600" data-testid="metric-normal">
              {summary.ctpInNormal}%
            </div>
            <div className="metric-label">ЦТП в норме</div>
            <div className="metric-change positive">
              <ArrowUp className="w-3 h-3 mr-1" />
              +5% за неделю
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="metric-value text-red-600" data-testid="metric-out-of-control">
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
              <Button variant="outline" size="sm">День</Button>
              <Button variant="default" size="sm">Неделя</Button>
              <Button variant="outline" size="sm">Месяц</Button>
              <Button variant="outline" size="sm">Год</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <TrendChart period="week" />
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
              <TrendChart period="week" rtsFilter="right" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Левый берег</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <TrendChart period="week" rtsFilter="left" />
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
                {summary.rtsStats.map((rts) => {
                  const percentage = ((rts.totalMakeupWater / summary.currentMakeupWater) * 100).toFixed(1);
                  const weeklyChange = -12.5; // TODO: Calculate from actual data
                  const yearlyChange = 45.8; // TODO: Calculate from actual data
                  const status = rts.criticalCount > 0 ? 'warning' : 'normal';
                  
                  return (
                    <tr key={rts.id} data-testid={`row-rts-${rts.id}`}>
                      <td className="font-semibold">{rts.code} ({rts.name})</td>
                      <td className="font-mono">{rts.totalMakeupWater.toFixed(1)}</td>
                      <td className="text-green-600">
                        <ArrowDown className="w-4 h-4 inline mr-1" />
                        {Math.abs(weeklyChange)}
                      </td>
                      <td className="text-red-600">
                        <ArrowUp className="w-4 h-4 inline mr-1" />
                        +{yearlyChange}
                      </td>
                      <td>{percentage}%</td>
                      <td>
                        <StatusBadge status={status}>
                          {status === 'warning' ? 'Внимание' : 'Норма'}
                        </StatusBadge>
                      </td>
                      <td>
                        <Button variant="outline" size="sm" data-testid={`button-details-${rts.id}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          Детали
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
