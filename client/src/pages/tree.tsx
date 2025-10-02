import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TreeNode } from "@/components/tree/tree-node";
import { cn } from "@/lib/utils";
import type { RTSWithStats, CTPWithDetails } from "@shared/schema";

const treeTabs = [
  { key: 'short', label: 'Горизонт: Сутки - Неделя' },
  { key: 'long', label: 'Горизонт: Неделя - Год' },
];

export default function Tree() {
  const [activeTab, setActiveTab] = useState<string>('short');

  const { data: rtsStats, isLoading: loadingRTS } = useQuery<RTSWithStats[]>({
    queryKey: ['/api/rts/stats'],
  });

  const { data: ctpList, isLoading: loadingCTP } = useQuery<CTPWithDetails[]>({
    queryKey: ['/api/ctp'],
  });

  const { data: weeklyChange } = useQuery<{ change: number }>({
    queryKey: ['/api/trends/overall-change/week'],
  });

  if (loadingRTS || loadingCTP) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-muted animate-pulse rounded-lg" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!rtsStats || !ctpList) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ошибка загрузки данных дерева подпитки</p>
      </div>
    );
  }

  const totalMakeupWater = rtsStats.reduce((sum, rts) => sum + rts.totalMakeupWater, 0);
  const totalWeeklyChange = weeklyChange?.change || 0;

  // Group CTP by RTS
  const ctpByRTS = ctpList.reduce((acc, ctp) => {
    if (!acc[ctp.rtsId!]) {
      acc[ctp.rtsId!] = [];
    }
    acc[ctp.rtsId!].push(ctp);
    return acc;
  }, {} as Record<string, CTPWithDetails[]>);

  // Group CTP by district within each RTS
  const ctpByDistrict = (rtsId: string) => {
    const rtsCTPs = ctpByRTS[rtsId] || [];
    return rtsCTPs.reduce((acc, ctp) => {
      if (!acc[ctp.districtId!]) {
        acc[ctp.districtId!] = [];
      }
      acc[ctp.districtId!].push(ctp);
      return acc;
    }, {} as Record<string, CTPWithDetails[]>);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Дерево подпитки ЦТП с рекомендациями</h3>
        <p className="text-muted-foreground text-sm">
          Иерархическая структура подпитки по РТС, микрорайонам и ЦТП
        </p>
      </div>

      {/* Tab Container */}
      <div className="tab-container">
        {treeTabs.map((tab) => (
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

      {/* Tree Structure */}
      <Card>
        <CardContent className="p-6">
          {/* Root Node - Новосибирск */}
          <TreeNode
            id="novosibirsk"
            icon="city"
            name="Новосибирск"
            makeupWater={totalMakeupWater}
            weeklyChange={totalWeeklyChange}
            status="normal"
            isRoot
            data-testid="tree-root"
          >
            {/* RTS Level */}
            {rtsStats.map((rts) => {
              const rtsCTPs = ctpByRTS[rts.id] || [];
              const rtsStatus = rts.criticalCount > 0 ? 'warning' : 'normal';
              const districts = ctpByDistrict(rts.id);

              return (
                <RTSTreeNode
                  key={rts.id}
                  rts={rts}
                  rtsCTPs={rtsCTPs}
                  rtsStatus={rtsStatus}
                  districts={districts}
                />
              );
            })}
          </TreeNode>
        </CardContent>
      </Card>
    </div>
  );
}

function RTSTreeNode({ 
  rts, 
  rtsCTPs, 
  rtsStatus, 
  districts 
}: { 
  rts: RTSWithStats; 
  rtsCTPs: CTPWithDetails[]; 
  rtsStatus: 'normal' | 'warning' | 'critical'; 
  districts: Record<string, CTPWithDetails[]>;
}) {
  const { data: rtsChange } = useQuery<{ change: number }>({
    queryKey: [`/api/rts/${rts.id}/weekly-change`],
  });

  return (
    <TreeNode
      id={rts.id}
      icon="building"
      name={`${rts.code} (${rts.name})`}
      makeupWater={rts.totalMakeupWater}
      weeklyChange={rtsChange?.change}
      status={rtsStatus}
      data-testid={`tree-rts-${rts.id}`}
    >
      {/* District Level */}
      {Object.entries(districts).map(([districtId, districtCTPs]) => {
        if (districtCTPs.length === 0) return null;
        
        const district = districtCTPs[0].district;
        const districtMakeupWater = districtCTPs.reduce(
          (sum, ctp) => sum + (ctp.latestMeasurement?.makeupWater || 0), 0
        );
        const hasWarning = districtCTPs.some(ctp => 
          ctp.recommendations.some(r => r.priority === 'warning' || r.priority === 'critical')
        );

        return (
          <TreeNode
            key={districtId}
            id={districtId}
            icon="map"
            name={`${district.name} микрорайон`}
            makeupWater={districtMakeupWater}
            status={hasWarning ? 'warning' : 'normal'}
            data-testid={`tree-district-${districtId}`}
          >
            {/* CTP Level */}
            {districtCTPs.map((ctp) => (
              <CTPTreeNode key={ctp.id} ctp={ctp} />
            ))}
          </TreeNode>
        );
      })}
    </TreeNode>
  );
}

function CTPTreeNode({ ctp }: { ctp: CTPWithDetails }) {
  const { data: ctpChange } = useQuery<{ change: number }>({
    queryKey: [`/api/ctp/${ctp.id}/weekly-change`],
  });

  const measurement = ctp.latestMeasurement;
  
  let status: 'normal' | 'warning' | 'critical' = 'normal';
  let actionType: string | undefined;

  const criticalRec = ctp.recommendations.find(r => r.priority === 'critical');
  const warningRec = ctp.recommendations.find(r => r.priority === 'warning');

  if (criticalRec) {
    status = 'critical';
    actionType = criticalRec.type === 'inspection' ? 'Инспекция утечек' : 'Проверка приборов';
  } else if (warningRec) {
    status = 'warning';
    actionType = 'Мониторинг';
  }

  return (
    <TreeNode
      id={ctp.id}
      icon="thermometer"
      name={ctp.name}
      makeupWater={measurement?.makeupWater || 0}
      weeklyChange={ctpChange?.change}
      status={status}
      actionType={actionType}
      isLeaf
      data-testid={`tree-ctp-${ctp.id}`}
    />
  );
}
