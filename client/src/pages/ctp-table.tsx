import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import type { CTPWithDetails } from "@shared/schema";

export default function CTPTable() {
  const [selectedRTS, setSelectedRTS] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Load RTS list
  const { data: rtsList } = useQuery<
    { id: string; name: string; code: string }[]
  >({
    queryKey: ["/api/rts"],
  });

  const { data: ctpList, isLoading } = useQuery<CTPWithDetails[]>({
    queryKey: ["/api/ctp", selectedRTS],
    queryFn: async () => {
      const url =
        selectedRTS === "all" ? "/api/ctp" : `/api/ctp?rtsId=${selectedRTS}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch CTP list");
      return res.json();
    },
  });

  const getCtpStatus = (ctp: CTPWithDetails): string => {
    const measurement = ctp.latestMeasurement;
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    if (!measurement || new Date(measurement.date) < threeDaysAgo) {
      return "critical";
    }

    if (ctp.ucl != null && ctp.cl != null && ctp.ucl > 0) {
      const excessMultiplier = measurement.makeupWater / ctp.ucl;

      if (excessMultiplier >= 5) {
        return "critical";
      } else if (measurement.makeupWater > ctp.ucl) {
        return "warning";
      }
    }

    return "normal";
  };

  const filteredCTP =
    ctpList?.filter((ctp) => {
      const ctpStatus = getCtpStatus(ctp);
      const matchesStatus =
        selectedStatus === "all" || ctpStatus === selectedStatus;
      const matchesDistrict =
        selectedDistrict === "all" || ctp.districtId === selectedDistrict;

      return matchesStatus && matchesDistrict;
    }) || [];

  const totalPages = Math.ceil(filteredCTP.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCTP = filteredCTP.slice(startIndex, startIndex + itemsPerPage);

  const getStatusInfo = (ctp: CTPWithDetails) => {
    const measurement = ctp.latestMeasurement;
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    if (!measurement || new Date(measurement.date) < threeDaysAgo) {
      return { status: "critical", label: "Нет данных" };
    }

    if (ctp.ucl != null && ctp.cl != null && ctp.ucl > 0) {
      const excessMultiplier = measurement.makeupWater / ctp.ucl;

      if (excessMultiplier >= 5) {
        return { status: "critical", label: "Критично" };
      } else if (measurement.makeupWater > ctp.ucl) {
        return { status: "warning", label: "Внимание" };
      } else {
        return { status: "normal", label: "Норма" };
      }
    }

    return { status: "normal", label: "Норма" };
  };

  const getDeviation = (ctp: CTPWithDetails) => {
    const measurement = ctp.latestMeasurement;
    if (!measurement || !ctp.cl) return "—";

    const deviation = measurement.makeupWater - ctp.cl;
    const sign = deviation > 0 ? "+" : "";
    return `${sign}${deviation.toFixed(1)}`;
  };

  const getRowBackgroundClass = (ctp: CTPWithDetails) => {
    const measurement = ctp.latestMeasurement;
    if (!measurement) return "";

    const isAboveUCL = ctp.ucl && measurement.makeupWater > ctp.ucl;
    const isBelowLCL = ctp.lcl && measurement.makeupWater < ctp.lcl;
    const hasUndermix =
      measurement.undermix !== null && measurement.undermix < -2;

    if (isAboveUCL) return "bg-red-50 dark:bg-red-950/20";
    if (isBelowLCL || hasUndermix) return "bg-blue-50 dark:bg-blue-950/20";
    return "";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
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
              <SelectTrigger
                className="w-[200px]"
                data-testid="select-rts-filter"
              >
                <SelectValue placeholder="Все РТС" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все РТС</SelectItem>
                {rtsList?.map((rts) => (
                  <SelectItem key={rts.id} value={rts.id}>
                    {rts.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger
                className="w-[150px]"
                data-testid="select-status-filter"
              >
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="critical">Критические</SelectItem>
                <SelectItem value="warning">Требуют внимания</SelectItem>
                <SelectItem value="normal">В норме</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedDistrict}
              onValueChange={setSelectedDistrict}
            >
              <SelectTrigger
                className="w-[150px]"
                data-testid="select-district-filter"
              >
                <SelectValue placeholder="Все микрорайоны" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все микрорайоны</SelectItem>
                <SelectItem value="district-1">Ленинский</SelectItem>
                <SelectItem value="district-2">Советский</SelectItem>
                <SelectItem value="district-3">Кировский</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
              data-testid="input-date"
            />

            <Button data-testid="button-apply-filters">Применить</Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Посуточные параметры ЦТП -{" "}
              {new Date(selectedDate).toLocaleDateString("ru-RU")}
            </CardTitle>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
                <span>Выход подпитки</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
                <span>Выход подмеса</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table" data-testid="table-ctp-data">
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
                {paginatedCTP.map((ctp) => {
                  const measurement = ctp.latestMeasurement;
                  const statusInfo = getStatusInfo(ctp);
                  const deviation = getDeviation(ctp);
                  const rowClass = getRowBackgroundClass(ctp);

                  return (
                    <tr
                      key={ctp.id}
                      className={rowClass}
                      data-testid={`row-ctp-${ctp.id}`}
                    >
                      <td className="font-semibold">
                        {ctp.fullName || ctp.name}
                      </td>
                      <td>{ctp.rts?.code || "—"}</td>
                      <td>{ctp.district?.name || "—"}</td>
                      <td
                        className={`font-mono ${
                          statusInfo.status === "critical"
                            ? "font-bold text-red-600"
                            : statusInfo.status === "warning"
                              ? "font-semibold text-yellow-600"
                              : ""
                        }`}
                      >
                        {measurement ? measurement.makeupWater.toFixed(1) : "—"}
                      </td>
                      <td
                        className={`font-mono ${
                          measurement &&
                          measurement.undermix !== null &&
                          measurement.undermix < -2
                            ? "font-bold text-blue-600"
                            : ""
                        }`}
                      >
                        {measurement?.undermix?.toFixed(1) || "—"}
                      </td>
                      <td className="font-mono">
                        {ctp.ucl?.toFixed(1) || "—"}
                      </td>
                      <td className="font-mono">{ctp.cl?.toFixed(1) || "—"}</td>
                      <td className="font-mono">
                        {ctp.lcl?.toFixed(1) || "—"}
                      </td>
                      <td
                        className={`font-semibold ${
                          statusInfo.status === "critical"
                            ? "text-red-600"
                            : statusInfo.status === "warning"
                              ? "text-yellow-600"
                              : "text-green-600"
                        }`}
                      >
                        {deviation}
                      </td>
                      <td>
                        <StatusBadge
                          status={
                            statusInfo.status as
                              | "normal"
                              | "warning"
                              | "critical"
                          }
                        >
                          {statusInfo.label}
                        </StatusBadge>
                      </td>
                      <td>
                        {ctp.recommendations.length > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-recommendation-${ctp.id}`}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            {ctp.recommendations[0].type === "inspection"
                              ? "Инспекция"
                              : ctp.recommendations[0].type === "meter_check"
                                ? "Проверка"
                                : "Мониторинг"}
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-border flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Показано {startIndex + 1}-
              {Math.min(startIndex + itemsPerPage, filteredCTP.length)} из{" "}
              {filteredCTP.length} ЦТП
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад
              </Button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                  }
                  if (currentPage > totalPages - 3) {
                    pageNum = totalPages - 4 + i;
                  }
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    data-testid={`button-page-${pageNum}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Вперед
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
