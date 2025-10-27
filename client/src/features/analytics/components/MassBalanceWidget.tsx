import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { FlowBalanceInsight } from "../types";

interface MassBalanceWidgetProps {
  balance: FlowBalanceInsight;
  isLoading?: boolean;
}

export function MassBalanceWidget({ balance, isLoading }: MassBalanceWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Небаланс масс</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const delta = Math.abs(balance.imbalancePercent);
  const threshold = Math.max(balance.thresholdPercent, 0.1);
  const progressValue = Math.min((delta / threshold) * 100, 130);
  const status = delta > threshold ? "text-red-600" : "text-green-600";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Небаланс масс</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Расход подачи</p>
            <p className="text-2xl font-semibold">{balance.supply.toLocaleString()} т/ч</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Расход обратки</p>
            <p className="text-2xl font-semibold">{balance.return.toLocaleString()} т/ч</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-2 text-muted-foreground">
            <span>Текущее отклонение</span>
            <span>Порог {balance.thresholdPercent}%</span>
          </div>
          <Progress value={Math.min(progressValue, 100)} />
          <p className={`text-sm mt-2 font-medium ${status}`}>
            {delta}% (порог {balance.thresholdPercent}%)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
