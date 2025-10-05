import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/charts/trend-chart";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const trendTabs = [
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "year", label: "Год" },
];

interface TrendChange {
  ctpId: string;
  ctpName: string;
  change: number;
  changePercent: number;
}

interface RTSTrendChange {
  rtsId: string;
  rtsName: string;
  change: number;
  changePercent: number;
}

export default function Trends() {
  const [activeTab, setActiveTab] = useState<string>("week");

  const { data: changes, isLoading: changesLoading } = useQuery<{
    increases: TrendChange[];
    decreases: TrendChange[];
  }>({
    queryKey: [`/api/trends/${activeTab}/changes`],
    enabled: !!activeTab,
  });

  const { data: rtsStats, isLoading: rtsLoading } = useQuery<RTSTrendChange[]>({
    queryKey: [`/api/trends/${activeTab}/rts-stats`],
    enabled: !!activeTab,
  });

  const formatValue = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)} т/ч`;
  };

  const isLoading = changesLoading || rtsLoading;

  return (
    <div className="space-y-6">
      {/* Tab Container */}
      <div className="tab-container">
        {trendTabs.map((tab) => (
          <div
            key={tab.key}
            className={cn("tab", activeTab === tab.key && "active")}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            Тренды ЦТП «{trendTabs.find((t) => t.key === activeTab)?.label}» в
            т/ч
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[450px]" data-testid="trends-chart">
            <TrendChart period={activeTab as "week" | "month" | "year"} />
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Increase */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Топ рост подпитки
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : changes?.increases && changes.increases.length > 0 ? (
              changes.increases.map((item, index) => (
                <div
                  key={item.ctpId}
                  className="flex justify-between py-2 border-b border-border last:border-0"
                  data-testid={`increase-${index}`}
                >
                  <span>{item.ctpName}</span>
                  <span className="font-semibold text-red-600">
                    {formatValue(item.change)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Нет данных</p>
            )}
          </CardContent>
        </Card>

        {/* Top Decrease */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Топ снижение подпитки
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : changes?.decreases && changes.decreases.length > 0 ? (
              changes.decreases.map((item, index) => (
                <div
                  key={item.ctpId}
                  className="flex justify-between py-2 border-b border-border last:border-0"
                  data-testid={`decrease-${index}`}
                >
                  <span>{item.ctpName}</span>
                  <span className="font-semibold text-green-600">
                    {formatValue(item.change)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Нет данных</p>
            )}
          </CardContent>
        </Card>

        {/* RTS Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Статистика по РТС
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : rtsStats && rtsStats.length > 0 ? (
              rtsStats.map((item, index) => (
                <div
                  key={item.rtsId}
                  className="flex justify-between py-2 border-b border-border last:border-0"
                  data-testid={`rts-stat-${index}`}
                >
                  <span>{item.rtsName}</span>
                  <span
                    className={cn(
                      "font-semibold",
                      item.change >= 0 ? "text-red-600" : "text-green-600",
                    )}
                  >
                    {formatValue(item.change)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Нет данных</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
