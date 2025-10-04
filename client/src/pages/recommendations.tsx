import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TriangleAlert, Settings, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { CTPWithDetails } from "@shared/schema";

export default function Recommendations() {
  const { data: ctps, isLoading } = useQuery<CTPWithDetails[]>({
    queryKey: ['/api/ctp'],
  });

  const { data: summary } = useQuery<{
    currentMakeupWater: number;
    ctpRequiringAttention: number;
    ctpInNormal: number;
    ctpInNormalCount: number;
    outOfControlCount: number;
  }>({
    queryKey: ['/api/dashboard/summary'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-12 mb-4 rounded-full" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getCtpStatus = (ctp: CTPWithDetails): string => {
    const measurement = ctp.latestMeasurement;
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    
    if (!measurement || new Date(measurement.date) < threeDaysAgo) {
      return 'critical';
    }

    if (ctp.ucl != null && ctp.cl != null && ctp.ucl > 0) {
      const excessMultiplier = measurement.makeupWater / ctp.ucl;
      
      if (excessMultiplier >= 5) {
        return 'critical';
      } else if (measurement.makeupWater > ctp.ucl) {
        return 'warning';
      }
    }
    
    return 'normal';
  };

  const criticalCTPs = ctps?.filter(ctp => getCtpStatus(ctp) === 'critical') || [];
  const warningCTPs = ctps?.filter(ctp => getCtpStatus(ctp) === 'warning') || [];

  const criticalCount = summary?.outOfControlCount || 0;
  const warningCount = (summary?.ctpRequiringAttention || 0) - criticalCount;
  const normalCount = summary?.ctpInNormalCount || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Автоматические рекомендации по ЦТП</h3>
        <p className="text-muted-foreground text-sm">
          Рекомендации формируются на основе статистического анализа и контрольных карт Шухарта
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <CardContent className="p-6">
            <div className="text-5xl mb-4">
              <TriangleAlert className="w-12 h-12 mx-auto text-red-500" />
            </div>
            <div className="metric-value text-red-600 text-4xl" data-testid="count-critical">
              {criticalCount}
            </div>
            <div className="metric-label">Критичные ЦТП</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="text-5xl mb-4">
              <Settings className="w-12 h-12 mx-auto text-yellow-500" />
            </div>
            <div className="metric-value text-yellow-600 text-4xl" data-testid="count-warning">
              {warningCount}
            </div>
            <div className="metric-label">Требуют внимания</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="text-5xl mb-4">
              <Eye className="w-12 h-12 mx-auto text-blue-500" />
            </div>
            <div className="metric-value text-blue-600 text-4xl" data-testid="count-normal">
              {normalCount}
            </div>
            <div className="metric-label">В норме</div>
          </CardContent>
        </Card>
      </div>

      {/* Critical CTPs */}
      {criticalCTPs.length > 0 && (
        <div>
          <h4 className="font-semibold mb-4 text-red-600 flex items-center">
            <TriangleAlert className="w-5 h-5 mr-2" />
            Критические - требуют немедленного внимания
          </h4>
          <div className="space-y-3">
            {criticalCTPs.map((ctp) => {
              const measurement = ctp.latestMeasurement;
              const isStale = !measurement || new Date(measurement.date) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
              
              return (
                <Card key={ctp.id} className="border-l-4 border-l-red-500" data-testid={`critical-ctp-${ctp.id}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-semibold">{ctp.fullName || ctp.name}</h5>
                        <p className="text-sm text-muted-foreground">
                          {ctp.rts?.code || '—'} • {ctp.district?.name || '—'}
                        </p>
                        {isStale ? (
                          <p className="text-sm text-red-600 mt-2">
                            ⚠ Нет свежих данных (старше 3 суток)
                          </p>
                        ) : measurement && ctp.ucl && measurement.makeupWater >= 5 * ctp.ucl ? (
                          <p className="text-sm text-red-600 mt-2">
                            ⚠ Критичное превышение UCL ({(measurement.makeupWater / ctp.ucl).toFixed(1)}x)
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        {measurement && (
                          <>
                            <div className="font-semibold text-red-600">{measurement.makeupWater.toFixed(1)} т/ч</div>
                            {ctp.ucl && <div className="text-sm text-muted-foreground">UCL: {ctp.ucl.toFixed(1)}</div>}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Warning CTPs */}
      {warningCTPs.length > 0 && (
        <div>
          <h4 className="font-semibold mb-4 text-yellow-600 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Требуют внимания
          </h4>
          <div className="space-y-3">
            {warningCTPs.map((ctp) => {
              const measurement = ctp.latestMeasurement;
              
              return (
                <Card key={ctp.id} className="border-l-4 border-l-yellow-500" data-testid={`warning-ctp-${ctp.id}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-semibold">{ctp.fullName || ctp.name}</h5>
                        <p className="text-sm text-muted-foreground">
                          {ctp.rts?.code || '—'} • {ctp.district?.name || '—'}
                        </p>
                        {measurement && ctp.ucl && (
                          <p className="text-sm text-yellow-600 mt-2">
                            ⚠ Превышение UCL на {((measurement.makeupWater - ctp.ucl) / ctp.ucl * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {measurement && (
                          <>
                            <div className="font-semibold text-yellow-600">{measurement.makeupWater.toFixed(1)} т/ч</div>
                            {ctp.ucl && <div className="text-sm text-muted-foreground">UCL: {ctp.ucl.toFixed(1)}</div>}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Normal Status */}
      <div>
        <h4 className="font-semibold mb-4 text-green-600 flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          Работают в пределах нормы
        </h4>
        <Card className="recommendation-card normal">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h5 className="font-semibold mb-1" data-testid="text-normal-count">
                  {summary?.ctpInNormalCount || 0} ЦТП работают стабильно
                </h5>
                <p className="text-sm text-muted-foreground">
                  Параметры подпитки находятся в контрольных границах
                </p>
              </div>
              <span className="status-badge status-normal">Норма</span>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
