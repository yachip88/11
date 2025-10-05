import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TreeNode } from "@/components/tree/tree-node";
import { cn } from "@/lib/utils";
import type { RTSWithStats, CTPWithDetails } from "@shared/schema";

type Severity = "normal" | "warning" | "critical";

const severityRank: Record<Severity, number> = {
  normal: 0,
  warning: 1,
  critical: 2,
};

const mergeSeverity = (current: Severity, next: Severity): Severity =>
  severityRank[next] > severityRank[current] ? next : current;

const computeMeasurementSeverity = (ctp: CTPWithDetails): Severity => {
  const measurement = ctp.latestMeasurement;
  if (!measurement) return "normal";

  const value = measurement.makeupWater;

  if (ctp.ucl != null && value > ctp.ucl) {
    return "critical";
  }

  if (ctp.lcl != null && value < ctp.lcl) {
    return "warning";
  }

  if (ctp.cl != null && value > ctp.cl) {
    return "warning";
  }

  return "normal";
};

const computeBaseSeverity = (ctp: CTPWithDetails): Severity => {
  let severity = computeMeasurementSeverity(ctp);

  if (
    severity !== "critical" &&
    ctp.recommendations.some((r) => r.priority === "critical")
  ) {
    severity = "critical";
  } else if (
    severity === "normal" &&
    ctp.recommendations.some((r) => r.priority === "warning")
  ) {
    severity = "warning";
  }

  return severity;
};

const treeTabs = [
  { key: "short", label: "Горизонт: Сутки - Неделя" },
  { key: "long", label: "Горизонт: Неделя - Год" },
];

export default function Tree() {
  const [activeTab, setActiveTab] = useState<string>("short");

  const { data: rtsStats, isLoading: loadingRTS } = useQuery<RTSWithStats[]>({
    queryKey: ["/api/rts/stats"],
  });

  const { data: ctpList, isLoading: loadingCTP } = useQuery<CTPWithDetails[]>({
    queryKey: ["/api/ctp"],
  });

  const { data: weeklyChange } = useQuery<{ change: number }>({
    queryKey: ["/api/trends/overall-change/week"],
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
        <p className="text-muted-foreground">
          Ошибка загрузки данных дерева подпитки
        </p>
      </div>
    );
  }

  const totalMakeupWater = rtsStats.reduce(
    (sum, rts) => sum + rts.totalMakeupWater,
    0,
  );
  const totalWeeklyChange = weeklyChange?.change || 0;

  const overallStatus = ctpList.reduce<Severity>(
    (acc, ctp) => mergeSeverity(acc, computeBaseSeverity(ctp)),
    "normal",
  );

  // Group CTP by RTS
  const ctpByRTS = ctpList.reduce(
    (acc, ctp) => {
      if (!ctp.rtsId) {
        return acc;
      }
      if (!acc[ctp.rtsId]) {
        acc[ctp.rtsId] = [];
      }
      acc[ctp.rtsId].push(ctp);
      return acc;
    },
    {} as Record<string, CTPWithDetails[]>,
  );

  // Group CTP by district within each RTS
  const ctpByDistrict = (rtsId: string) => {
    const rtsCTPs = ctpByRTS[rtsId] || [];
    return rtsCTPs.reduce(
      (acc, ctp) => {
        if (!ctp.districtId) {
          return acc;
        }
        if (!acc[ctp.districtId]) {
          acc[ctp.districtId] = [];
        }
        acc[ctp.districtId].push(ctp);
        return acc;
      },
      {} as Record<string, CTPWithDetails[]>,
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">
          Дерево подпитки ЦТП с рекомендациями
        </h3>
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
            status={overallStatus}
            isRoot
            data-testid="tree-root"
          >
            {/* RTS Level */}
            {rtsStats.map((rts) => {
              const rtsCTPs = ctpByRTS[rts.id] || [];
              const rtsStatus = rtsCTPs.reduce<Severity>(
                (acc, ctp) => mergeSeverity(acc, computeBaseSeverity(ctp)),
                "normal",
              );
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
  districts,
}: {
  rts: RTSWithStats;
  rtsCTPs: CTPWithDetails[];
  rtsStatus: "normal" | "warning" | "critical";
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

        const districtInfo = districtCTPs[0].district;
        const districtName = districtInfo?.name ?? "Без района";
        const districtMakeupWater = districtCTPs.reduce(
          (sum, ctp) => sum + (ctp.latestMeasurement?.makeupWater || 0),
          0,
        );
        const districtSeverity = districtCTPs.reduce<Severity>(
          (acc, ctp) => mergeSeverity(acc, computeBaseSeverity(ctp)),
          "normal",
        );

        return (
          <TreeNode
            key={districtId}
            id={districtId}
            icon="map"
            name={`${districtName} микрорайон`}
            makeupWater={districtMakeupWater}
            status={districtSeverity}
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

  const baseSeverity = computeBaseSeverity(ctp);
  let status: Severity = baseSeverity;
  let actionType: string | undefined;

  const measurementValue = measurement?.makeupWater ?? null;
  const aboveUpperLimit =
    measurementValue !== null &&
    ctp.ucl !== null &&
    ctp.ucl !== undefined &&
    measurementValue > ctp.ucl;
  const belowLowerLimit =
    measurementValue !== null &&
    ctp.lcl !== null &&
    ctp.lcl !== undefined &&
    measurementValue < ctp.lcl;
  const aboveCenterLine =
    measurementValue !== null &&
    ctp.cl !== null &&
    ctp.cl !== undefined &&
    measurementValue > ctp.cl;

  if (aboveUpperLimit) {
    status = "critical";
    actionType = "Превышен верхний предел UCL";
  } else if (belowLowerLimit) {
    status = status === "critical" ? status : "warning";
    actionType = "Ниже нижней границы LCL";
  } else if (aboveCenterLine) {
    if (status !== "critical") {
      status = "warning";
    }
    actionType = "Превышена контрольная линия CL";
  }

  if (!actionType) {
    if (
      status === "critical" &&
      ctp.recommendations.some((r) => r.priority === "critical")
    ) {
      actionType = "Критическая рекомендация";
    } else if (
      status === "warning" &&
      ctp.recommendations.some((r) => r.priority === "warning")
    ) {
      actionType = "Есть предупреждающая рекомендация";
    }
  }

  const trendChange = ctpChange?.change ?? null;
  if (
    status !== "critical" &&
    trendChange !== null &&
    trendChange > 0 &&
    measurementValue !== null
  ) {
    status = "warning";
    if (!actionType) {
      actionType = "Подпитка растет";
    }
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
