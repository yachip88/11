import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { DataGapInsight } from "../types";

interface DataAvailabilityWidgetProps {
  data: DataGapInsight[];
  isLoading?: boolean;
}

export function DataAvailabilityWidget({ data, isLoading }: DataAvailabilityWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Отсутствие показаний более 3 дней</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`gap-skeleton-${index}`} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Объект</TableHead>
                <TableHead className="text-right">Дней без данных</TableHead>
                <TableHead className="text-right">Последняя отправка</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((gap) => (
                <TableRow key={gap.objectId}>
                  <TableCell>{gap.objectName}</TableCell>
                  <TableCell className="text-right font-medium">{gap.missingDays}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{gap.lastMeasurement}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
