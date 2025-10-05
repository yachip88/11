import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FactorsChart } from "@/components/charts/factors-chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { RTSWithStats } from "@shared/schema";

export default function Analytics() {
  const { data: rtsStats, isLoading } = useQuery<RTSWithStats[]>({
    queryKey: ["/api/rts/stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalMakeupWater =
    rtsStats?.reduce((sum, rts) => sum + rts.totalMakeupWater, 0) || 2750;

  // Economic calculations based on the document
  const yearlyReduction = 71.0; // t/h reduction year-over-year
  const costPerTon = 600; // approximate cost per ton/hour annually in rubles
  const yearlySavings = (yearlyReduction * 24 * 365 * costPerTon) / 1000000; // in millions
  const electricitySavings = (yearlyReduction * 24 * 365 * 120) / 1000000; // approximate kWh saved in millions
  const waterSavings = yearlyReduction * 24 * 365 * 1; // approximate m³ saved in thousands
  const totalEconomicEffect = yearlySavings * 1.2; // including all factors

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">
          Сводная аналитическая панель
        </h3>
        <p className="text-muted-foreground text-sm">
          Ключевая аналитика и статистика по подпитке теплосетей Новосибирска
        </p>
      </div>

      {/* Economic Impact Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Динамика снижения подпитки</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <div className="flex justify-between py-2 border-b border-border">
              <span>За сутки (к предыдущим суткам)</span>
              <span
                className="font-semibold text-green-600"
                data-testid="daily-change"
              >
                -18.5 т/ч
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span>За неделю (к предыдущей неделе)</span>
              <span
                className="font-semibold text-green-600"
                data-testid="weekly-change"
              >
                -48.9 т/ч
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span>За месяц (к предыдущему месяцу)</span>
              <span
                className="font-semibold text-green-600"
                data-testid="monthly-change"
              >
                -125.3 т/ч
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-semibold">
                За год (к аналогичному периоду)
              </span>
              <span
                className="font-bold text-green-600"
                data-testid="yearly-change"
              >
                -{yearlyReduction} т/ч
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Экономический эффект</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <div className="flex justify-between py-2 border-b border-border">
              <span>Снижение затрат за год</span>
              <span
                className="font-semibold text-green-600"
                data-testid="cost-savings"
              >
                ~{yearlySavings.toFixed(1)} млн ₽
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span>Экономия электроэнергии</span>
              <span className="font-semibold" data-testid="electricity-savings">
                ~{electricitySavings.toFixed(1)} млн кВт⋅ч/год
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span>Снижение потерь воды</span>
              <span className="font-semibold" data-testid="water-savings">
                ~{(waterSavings / 1000).toFixed(0)} тыс. м³/год
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-semibold">Суммарный эффект</span>
              <span
                className="font-bold text-green-600"
                data-testid="total-effect"
              >
                ~{totalEconomicEffect.toFixed(1)} млн ₽/год
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Factors Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Распределение подпитки по факторам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[450px]" data-testid="factors-chart">
            <FactorsChart />
          </div>
        </CardContent>
      </Card>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Контрольный коридор (средний)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <div className="flex justify-between py-2 border-b border-border">
              <span>Правый берег</span>
              <span
                className="font-semibold font-mono"
                data-testid="right-bank-corridor"
              >
                +3.6…-4.3 т/ч
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span>Левый берег</span>
              <span
                className="font-semibold font-mono"
                data-testid="left-bank-corridor"
              >
                +4.1…-4.8 т/ч
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Охват приборами учета</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <div className="flex justify-between py-2 border-b border-border">
              <span>ЦТП с рабочими приборами</span>
              <span className="font-semibold" data-testid="working-meters">
                347 из 412 (84.2%)
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span>Требуют восстановления</span>
              <span
                className="font-semibold text-yellow-600"
                data-testid="broken-meters"
              >
                65 (15.8%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Текущее состояние системы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div
                className="metric-value text-primary"
                data-testid="current-makeup"
              >
                {totalMakeupWater.toFixed(0)}
              </div>
              <div className="metric-label">Текущая подпитка т/ч</div>
              <p className="text-xs text-muted-foreground mt-2">
                Снижение на{" "}
                {((yearlyReduction / totalMakeupWater) * 100).toFixed(1)}% год к
                году
              </p>
            </div>

            <div>
              <div
                className="metric-value text-green-600"
                data-testid="efficiency-improvement"
              >
                {(
                  (yearlyReduction / (totalMakeupWater + yearlyReduction)) *
                  100
                ).toFixed(1)}
                %
              </div>
              <div className="metric-label">Повышение эффективности</div>
              <p className="text-xs text-muted-foreground mt-2">
                За счет оптимизации подпитки
              </p>
            </div>

            <div>
              <div
                className="metric-value text-blue-600"
                data-testid="system-reliability"
              >
                92.3%
              </div>
              <div className="metric-label">Надежность системы</div>
              <p className="text-xs text-muted-foreground mt-2">
                Процент времени стабильной работы
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
