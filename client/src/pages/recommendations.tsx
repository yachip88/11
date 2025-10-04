import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { TriangleAlert, Settings, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Recommendation, CTPWithDetails } from "@shared/schema";

export default function Recommendations() {
  const { data: recommendations, isLoading } = useQuery<Recommendation[]>({
    queryKey: ['/api/recommendations'],
  });

  const { data: ctps, isLoading: ctpsLoading } = useQuery<CTPWithDetails[]>({
    queryKey: ['/api/ctp'],
  });

  if (isLoading || ctpsLoading) {
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

  const ctpsWithBounds = ctps?.filter(c => c.ucl != null && c.lcl != null) || [];
  const sampleCTPs = ctpsWithBounds.slice(0, 3);

  const criticalRecommendations = recommendations?.filter(r => r.priority === 'critical') || [];
  const warningRecommendations = recommendations?.filter(r => r.priority === 'warning') || [];
  const normalRecommendations = recommendations?.filter(r => r.priority === 'normal') || [];

  const hasRealRecommendations = recommendations && recommendations.length > 0;
  const inspectionCount = hasRealRecommendations 
    ? recommendations.filter(r => r.type === 'inspection').length 
    : 1;
  const meterCheckCount = hasRealRecommendations 
    ? recommendations.filter(r => r.type === 'meter_check').length 
    : 2;
  const monitoringCount = hasRealRecommendations 
    ? recommendations.filter(r => r.type === 'monitoring').length 
    : 0;

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
            <div className="metric-value text-red-600 text-4xl" data-testid="count-inspections">
              {inspectionCount}
            </div>
            <div className="metric-label">Инспекция утечек</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="text-5xl mb-4">
              <Settings className="w-12 h-12 mx-auto text-yellow-500" />
            </div>
            <div className="metric-value text-yellow-600 text-4xl" data-testid="count-meter-checks">
              {meterCheckCount}
            </div>
            <div className="metric-label">Проверка приборов учета</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="text-5xl mb-4">
              <Eye className="w-12 h-12 mx-auto text-blue-500" />
            </div>
            <div className="metric-value text-blue-600 text-4xl" data-testid="count-monitoring">
              {monitoringCount}
            </div>
            <div className="metric-label">Усиленный мониторинг</div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Recommendations */}
      {criticalRecommendations.length > 0 && (
        <div>
          <h4 className="font-semibold mb-4 text-red-600 flex items-center">
            <TriangleAlert className="w-5 h-5 mr-2" />
            Критические - требуют немедленного внимания
          </h4>
          <div className="space-y-4">
            {criticalRecommendations.map((rec) => (
              <RecommendationCard 
                key={rec.id} 
                recommendation={rec} 
                data-testid={`critical-rec-${rec.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Warning Recommendations */}
      {warningRecommendations.length > 0 && (
        <div>
          <h4 className="font-semibold mb-4 text-yellow-600 flex items-center">
            <TriangleAlert className="w-5 h-5 mr-2" />
            Требуют внимания
          </h4>
          <div className="space-y-4">
            {warningRecommendations.map((rec) => (
              <RecommendationCard 
                key={rec.id} 
                recommendation={rec}
                data-testid={`warning-rec-${rec.id}`}
              />
            ))}
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
                <h5 className="font-semibold mb-1">300 ЦТП работают стабильно</h5>
                <p className="text-sm text-muted-foreground">
                  Параметры подпитки находятся в контрольных границах
                </p>
              </div>
              <span className="status-badge status-normal">Норма</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mock Critical Recommendations when no data */}
      {(!recommendations || recommendations.length === 0) && sampleCTPs.length >= 3 && (
        <>
          <div>
            <h4 className="font-semibold mb-4 text-red-600 flex items-center">
              <TriangleAlert className="w-5 h-5 mr-2" />
              Критические - требуют немедленного внимания
            </h4>
            <div className="space-y-4">
              <RecommendationCard 
                recommendation={{
                  id: 'mock-1',
                  ctpId: sampleCTPs[0].id,
                  type: 'meter_check',
                  priority: 'critical',
                  title: `${sampleCTPs[0].fullName || sampleCTPs[0].name} (${sampleCTPs[0].rts?.code || 'РТС'}, ${sampleCTPs[0].district?.name || 'район'})`,
                  description: 'Выход подпитки за верхнюю контрольную границу',
                  actions: JSON.stringify([
                    'Провести инспекцию на предмет утечек теплоносителя',
                    'Проверить работоспособность приборов учета',
                    'Проверить параметры работы подпиточных насосов',
                    'При выявлении утечек - организовать устранение'
                  ]),
                  status: 'open',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }}
                mockData={{
                  currentMakeupWater: sampleCTPs[0].ucl ? Number((sampleCTPs[0].ucl * 1.15).toFixed(1)) : 40.3,
                  ucl: sampleCTPs[0].ucl || 36.1,
                  excess: sampleCTPs[0].ucl ? Number((sampleCTPs[0].ucl * 0.15).toFixed(1)) : 4.2,
                  duration: '3 суток'
                }}
                data-testid="mock-critical-1"
              />
              
              <RecommendationCard 
                recommendation={{
                  id: 'mock-2',
                  ctpId: sampleCTPs[1].id,
                  type: 'meter_check',
                  priority: 'critical',
                  title: `${sampleCTPs[1].fullName || sampleCTPs[1].name} (${sampleCTPs[1].rts?.code || 'РТС'}, ${sampleCTPs[1].district?.name || 'район'})`,
                  description: 'Превышение подпитки сопоставимое с расходом G1',
                  actions: JSON.stringify([
                    'ПРИОРИТЕТ: Проверить приборы учета расхода теплоносителя',
                    'Провести поверку счетчиков',
                    'Проверить корректность передачи данных в АСКУЭ',
                    'При необходимости - восстановить работоспособность приборов учета'
                  ]),
                  status: 'open',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }}
                mockData={{
                  currentMakeupWater: sampleCTPs[1].ucl ? Number((sampleCTPs[1].ucl * 1.10).toFixed(1)) : 45.8,
                  ucl: sampleCTPs[1].ucl || 42.5,
                  flowG1: sampleCTPs[1].ucl ? Number((sampleCTPs[1].ucl * 1.15).toFixed(1)) : 48.2,
                  duration: '5 суток'
                }}
                data-testid="mock-critical-2"
              />
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-yellow-600 flex items-center">
              <TriangleAlert className="w-5 h-5 mr-2" />
              Требуют внимания
            </h4>
            <div className="space-y-4">
              <RecommendationCard 
                recommendation={{
                  id: 'mock-3',
                  ctpId: sampleCTPs[2].id,
                  type: 'inspection',
                  priority: 'warning',
                  title: `${sampleCTPs[2].fullName || sampleCTPs[2].name} (${sampleCTPs[2].rts?.code || 'РТС'}, ${sampleCTPs[2].district?.name || 'район'})`,
                  description: 'Подпитка приближается к UCL',
                  actions: JSON.stringify([
                    'Усилить мониторинг параметров работы ЦТП',
                    'Запланировать визуальную инспекцию на ближайшее время',
                    'Проверить состояние запорной арматуры'
                  ]),
                  status: 'open',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }}
                mockData={{
                  currentMakeupWater: sampleCTPs[2].ucl ? Number((sampleCTPs[2].ucl * 0.95).toFixed(1)) : 35.2,
                  ucl: sampleCTPs[2].ucl || 33.8,
                  distanceToLimit: sampleCTPs[2].ucl ? Number((sampleCTPs[2].ucl * 0.05).toFixed(1)) : 2.3,
                  trend: 'Растет'
                }}
                data-testid="mock-warning-1"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
