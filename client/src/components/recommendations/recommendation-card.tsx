import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ClipboardCheck, BarChart3, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Recommendation } from "@shared/schema";

interface RecommendationCardProps {
  recommendation: Recommendation;
  mockData?: {
    currentMakeupWater?: number;
    ucl?: number;
    lcl?: number;
    cl?: number;
    flowG1?: number;
    excess?: number;
    distanceToLimit?: number;
    duration?: string;
    trend?: string;
  };
}

export function RecommendationCard({ recommendation, mockData }: RecommendationCardProps) {
  const [isAccepted, setIsAccepted] = useState(false);
  const { toast } = useToast();

  const handleAccept = () => {
    setIsAccepted(true);
    toast({
      title: "Рекомендация принята в работу",
      description: `${recommendation.title} добавлена в план работ`,
    });
  };

  const handleShowAnalytics = () => {
    toast({
      title: "Аналитика",
      description: "Подробная аналитика будет открыта в отдельном окне",
    });
  };

  const handleShowHistory = () => {
    toast({
      title: "История",
      description: "История изменений параметров ЦТП",
    });
  };

  const getCardClass = () => {
    switch (recommendation.priority) {
      case 'critical': return 'recommendation-card meter-check border-l-red-500';
      case 'warning': return 'recommendation-card inspection border-l-yellow-500';
      default: return 'recommendation-card normal border-l-green-500';
    }
  };

  const getStatusInfo = () => {
    switch (recommendation.priority) {
      case 'critical': return { status: 'critical' as const, label: 'Критично' };
      case 'warning': return { status: 'warning' as const, label: 'Внимание' };
      default: return { status: 'normal' as const, label: 'Норма' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Card className={getCardClass()}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h5 className="font-semibold mb-1">{recommendation.title}</h5>
            <div className="text-sm text-muted-foreground">{recommendation.description}</div>
          </div>
          <StatusBadge status={statusInfo.status}>
            {statusInfo.label}
          </StatusBadge>
        </div>

        {/* Parameters Display */}
        {mockData && (
          <div className="bg-muted p-4 rounded mb-3">
            <div className="grid grid-cols-4 gap-4 text-sm">
              {mockData.currentMakeupWater && (
                <div>
                  <div className="text-muted-foreground">Текущая подпитка</div>
                  <div className={cn(
                    "font-semibold font-mono",
                    recommendation.priority === 'critical' ? 'text-red-600' : 
                    recommendation.priority === 'warning' ? 'text-yellow-600' : 'text-foreground'
                  )}>
                    {mockData.currentMakeupWater} т/ч
                  </div>
                </div>
              )}
              
              {mockData.ucl && (
                <div>
                  <div className="text-muted-foreground">UCL</div>
                  <div className="font-semibold font-mono">{mockData.ucl} т/ч</div>
                </div>
              )}
              
              {mockData.excess && (
                <div>
                  <div className="text-muted-foreground">Превышение</div>
                  <div className="font-semibold text-red-600">
                    +{mockData.excess} т/ч ({((mockData.excess / mockData.ucl!) * 100).toFixed(1)}%)
                  </div>
                </div>
              )}
              
              {mockData.flowG1 && (
                <div>
                  <div className="text-muted-foreground">Расход G1</div>
                  <div className="font-semibold font-mono">{mockData.flowG1} т/ч</div>
                </div>
              )}
              
              {mockData.distanceToLimit && (
                <div>
                  <div className="text-muted-foreground">До границы</div>
                  <div className="font-semibold text-yellow-600">+{mockData.distanceToLimit} т/ч</div>
                </div>
              )}
              
              {mockData.trend && (
                <div>
                  <div className="text-muted-foreground">Тренд</div>
                  <div className="font-semibold text-red-600">↑ {mockData.trend}</div>
                </div>
              )}
              
              {mockData.duration && (
                <div>
                  <div className="text-muted-foreground">Длительность</div>
                  <div className="font-semibold">{mockData.duration}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="text-sm mb-3">
          <strong>Рекомендации:</strong>
          <ul className="mt-2 ml-6 space-y-1 leading-relaxed">
            {Array.isArray(recommendation.actions) ? 
              recommendation.actions.map((action, index) => (
                <li key={index} className="list-disc">{action}</li>
              )) :
              typeof recommendation.actions === 'string' ? 
                <li className="list-disc">{recommendation.actions}</li> : null
            }
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleAccept}
            disabled={isAccepted}
            data-testid={`button-accept-${recommendation.id}`}
          >
            <ClipboardCheck className="w-4 h-4 mr-2" />
            {isAccepted ? 'Принято в работу' : 'Принять в работу'}
          </Button>
          <Button variant="outline" onClick={handleShowAnalytics}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Подробная аналитика
          </Button>
          <Button variant="outline" onClick={handleShowHistory}>
            <History className="w-4 h-4 mr-2" />
            История
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
