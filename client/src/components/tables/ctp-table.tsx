import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CTPWithDetails } from "@shared/schema";

interface CTPTableProps {
  data: CTPWithDetails[];
  onRowClick?: (ctp: CTPWithDetails) => void;
}

export function CTPTable({ data, onRowClick }: CTPTableProps) {
  const getStatusInfo = (ctp: CTPWithDetails) => {
    const measurement = ctp.latestMeasurement;
    if (!measurement) return { status: 'normal', label: 'Нет данных' };

    const criticalRec = ctp.recommendations.find(r => r.priority === 'critical');
    const warningRec = ctp.recommendations.find(r => r.priority === 'warning');

    if (criticalRec) {
      return { status: 'critical', label: 'Критично' };
    } else if (warningRec) {
      return { status: 'warning', label: 'Внимание' };
    } else {
      return { status: 'normal', label: 'Норма' };
    }
  };

  const getDeviation = (ctp: CTPWithDetails) => {
    const measurement = ctp.latestMeasurement;
    if (!measurement || !ctp.cl) return '—';

    const deviation = measurement.makeupWater - ctp.cl;
    const sign = deviation > 0 ? '+' : '';
    return `${sign}${deviation.toFixed(1)}`;
  };

  const getRowBackgroundClass = (ctp: CTPWithDetails) => {
    const measurement = ctp.latestMeasurement;
    if (!measurement) return '';

    const isAboveUCL = ctp.ucl && measurement.makeupWater > ctp.ucl;
    const isBelowLCL = ctp.lcl && measurement.makeupWater < ctp.lcl;
    const hasUndermix = measurement.undermix !== null && measurement.undermix < -2;

    if (isAboveUCL) return 'bg-red-50 dark:bg-red-950/20';
    if (isBelowLCL || hasUndermix) return 'bg-blue-50 dark:bg-blue-950/20';
    return '';
  };

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>ЦТП</th>
            <th>РТС</th>
            <th>Микрорайон</th>
            <th>Подпитка т/ч</th>
            <th>Подмес т/ч</th>
            <th>UCL</th>
            <th>CL</th>
            <th>LCL</th>
            <th>Отклонение</th>
            <th>Статус</th>
            <th>Рекомендация</th>
          </tr>
        </thead>
        <tbody>
          {data.map((ctp) => {
            const measurement = ctp.latestMeasurement;
            const statusInfo = getStatusInfo(ctp);
            const deviation = getDeviation(ctp);
            const rowClass = getRowBackgroundClass(ctp);

            return (
              <tr 
                key={ctp.id} 
                className={cn(rowClass, onRowClick && "cursor-pointer hover:bg-muted/50")}
                onClick={() => onRowClick?.(ctp)}
                data-testid={`ctp-row-${ctp.id}`}
              >
                <td className="font-semibold">{ctp.name}</td>
                <td>{ctp.rts?.code || '—'}</td>
                <td>{ctp.district?.name || '—'}</td>
                <td className={cn(
                  "font-mono",
                  statusInfo.status === 'critical' && "font-bold text-red-600",
                  statusInfo.status === 'warning' && "font-semibold text-yellow-600"
                )}>
                  {measurement?.makeupWater.toFixed(1) || '—'}
                </td>
                <td className={cn(
                  "font-mono",
                  measurement && measurement.undermix !== null && measurement.undermix < -2 && "font-bold text-blue-600"
                )}>
                  {measurement?.undermix?.toFixed(1) || '—'}
                </td>
                <td className="font-mono">{ctp.ucl?.toFixed(1) || '—'}</td>
                <td className="font-mono">{ctp.cl?.toFixed(1) || '—'}</td>
                <td className="font-mono">{ctp.lcl?.toFixed(1) || '—'}</td>
                <td className={cn(
                  "font-semibold",
                  statusInfo.status === 'critical' && "text-red-600",
                  statusInfo.status === 'warning' && "text-yellow-600",
                  statusInfo.status === 'normal' && "text-green-600"
                )}>
                  {deviation}
                </td>
                <td>
                  <StatusBadge 
                    status={statusInfo.status as 'normal' | 'warning' | 'critical'}
                  >
                    {statusInfo.label}
                  </StatusBadge>
                </td>
                <td>
                  {ctp.recommendations.length > 0 ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle recommendation action
                      }}
                      data-testid={`recommendation-${ctp.id}`}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {ctp.recommendations[0].type === 'inspection' ? 'Инспекция' :
                       ctp.recommendations[0].type === 'meter_check' ? 'Проверка' : 'Мониторинг'}
                    </Button>
                  ) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
