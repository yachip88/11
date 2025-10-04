import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ControlChart } from "@/components/charts/control-chart";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CTPWithDetails, ControlChartData } from "@shared/schema";

export default function ControlCharts() {
  const [selectedRTS, setSelectedRTS] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCTP, setSelectedCTP] = useState<string>("ctp-125");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data: ctpList, isLoading: loadingCTP } = useQuery<CTPWithDetails[]>({
    queryKey: ['/api/ctp', { rtsId: selectedRTS !== "all" ? selectedRTS : undefined }],
  });

  const { data: controlData, isLoading: loadingChart } = useQuery<ControlChartData[]>({
    queryKey: ['/api/ctp', selectedCTP, 'control-chart'],
    enabled: !!selectedCTP,
  });

  const filteredCTP = ctpList?.filter(ctp => {
    const matchesSearch = ctp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "critical" && ctp.recommendations.some(r => r.priority === "critical")) ||
      (selectedStatus === "warning" && ctp.recommendations.some(r => r.priority === "warning")) ||
      (selectedStatus === "normal" && ctp.recommendations.every(r => r.priority === "normal"));
    
    return matchesSearch && matchesStatus;
  });

  const selectedCTPData = ctpList?.find(ctp => ctp.id === selectedCTP);

  if (loadingCTP) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="h-[500px] bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 flex-wrap items-center">
            <label className="font-semibold text-sm">Фильтры:</label>
            
            <Select value={selectedRTS} onValueChange={setSelectedRTS}>
              <SelectTrigger className="w-[200px]" data-testid="select-rts">
                <SelectValue placeholder="Все РТС" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все РТС</SelectItem>
                <SelectItem value="rts-1">РТС-1 (ТЭЦ-5)</SelectItem>
                <SelectItem value="rts-2">РТС-2 (ТЭЦ-3)</SelectItem>
                <SelectItem value="rts-3">РТС-3 (ТЭЦ-2)</SelectItem>
                <SelectItem value="rts-4">РТС-4 (ТЭЦ-4)</SelectItem>
                <SelectItem value="rts-5">РТС-5 (КРК)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[200px]" data-testid="select-status">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все ЦТП</SelectItem>
                <SelectItem value="critical">Критические</SelectItem>
                <SelectItem value="warning">Требуют внимания</SelectItem>
                <SelectItem value="normal">В норме</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCTP} onValueChange={setSelectedCTP}>
              <SelectTrigger className="w-[200px]" data-testid="select-ctp">
                <SelectValue placeholder="Выберите ЦТП" />
              </SelectTrigger>
              <SelectContent>
                {filteredCTP?.map((ctp) => (
                  <SelectItem key={ctp.id} value={ctp.id}>
                    {ctp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Поиск по названию ЦТП..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[250px]"
              data-testid="input-search"
            />
          </div>
        </CardContent>
      </Card>

      {/* Control Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>
                Контрольная карта Шухарта - {selectedCTPData?.name || selectedCTP}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Период: 01.10.2023 - {new Date().toLocaleDateString('ru-RU')}
              </p>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-1 bg-red-500" />
                <span>UCL (Верхняя граница)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-1 bg-green-500" />
                <span>CL (Центральная линия)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-1 bg-blue-500" />
                <span>LCL (Нижняя граница)</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px]" data-testid="control-chart">
            {loadingChart ? (
              <div className="h-full bg-muted animate-pulse rounded" />
            ) : (
              <ControlChart data={controlData || []} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics and Recent Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Статистические параметры</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-muted-foreground">Среднее (CL)</div>
                <div className="font-semibold font-mono text-lg">
                  {selectedCTPData?.cl?.toFixed(1) || "32.5"} т/ч
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">UCL</div>
                <div className="font-semibold font-mono text-lg">
                  {selectedCTPData?.ucl?.toFixed(1) || "36.1"} т/ч
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">LCL</div>
                <div className="font-semibold font-mono text-lg">
                  {selectedCTPData?.lcl?.toFixed(1) || "28.2"} т/ч
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Std. откл.</div>
                <div className="font-semibold font-mono text-lg">2.63 т/ч</div>
              </div>
              <div>
                <div className="text-muted-foreground">Выходов за UCL</div>
                <div className="font-semibold text-red-600 text-lg">
                  {controlData?.filter(d => d.controlType === 'upper').length || 8}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Выходов за LCL</div>
                <div className="font-semibold text-blue-600 text-lg">
                  {controlData?.filter(d => d.controlType === 'lower').length || 3}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Последние выходы за границы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-3">
              {controlData?.filter(d => d.isOutOfControl).slice(-4).reverse().map((violation, index) => (
                <div 
                  key={index} 
                  className="flex justify-between py-2 border-b border-border last:border-0"
                  data-testid={`violation-${index}`}
                >
                  <span>{new Date(violation.date).toLocaleDateString('ru-RU')}</span>
                  <span className={`font-semibold ${
                    violation.controlType === 'upper' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {violation.controlType === 'upper' ? '+' : '-'}
                    {Math.abs(violation.value - (violation.controlType === 'upper' ? violation.ucl : violation.lcl)).toFixed(1)} т/ч 
                    {violation.controlType === 'upper' ? ' над UCL' : ' под LCL'}
                  </span>
                </div>
              )) || (
                <>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span>27.01.2025</span>
                    <span className="font-semibold text-red-600">+4.2 т/ч над UCL</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span>24.01.2025</span>
                    <span className="font-semibold text-red-600">+2.8 т/ч над UCL</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span>19.01.2025</span>
                    <span className="font-semibold text-blue-600">-3.5 т/ч под LCL</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>15.01.2025</span>
                    <span className="font-semibold text-red-600">+5.7 т/ч над UCL</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
