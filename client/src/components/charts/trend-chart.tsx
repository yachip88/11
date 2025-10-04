import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrendData } from "@shared/schema";

interface TrendChartProps {
  period: 'day' | 'week' | 'month' | 'year';
  rtsId?: string;
  rtsFilter?: string;
  ctpId?: string;
}

export function TrendChart({ period, rtsId, rtsFilter, ctpId }: TrendChartProps) {
  const { data: trendData, isLoading } = useQuery<TrendData[]>({
    queryKey: ['/api/trends', period, rtsId, rtsFilter, ctpId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (rtsId) params.set('rtsId', rtsId);
      if (rtsFilter) params.set('rtsFilter', rtsFilter);
      if (ctpId) params.set('ctpId', ctpId);
      
      const queryString = params.toString();
      const url = `/api/trends/${period}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch trend data');
      return response.json();
    },
  });

  if (isLoading) {
    return <Skeleton className="h-full w-full" />;
  }

  if (!trendData || trendData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Данные не найдены
      </div>
    );
  }

  const chartData = trendData.map(item => ({
    date: new Date(item.date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    }),
    value: item.value,
  }));

  const values = chartData.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = Math.abs(maxValue - minValue) * 0.1 || 10;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          domain={[minValue - padding, maxValue + padding]}
          tickFormatter={(value) => value.toFixed(0)}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          formatter={(value: number) => [`${value.toFixed(1)} т/ч`, 'Подпитка']}
        />
        <Legend 
          verticalAlign="top" 
          height={36}
          formatter={() => 'Подпитка (т/ч)'}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          name="Подпитка"
          stroke="#2563eb" 
          strokeWidth={3}
          dot={{ r: 5, fill: '#2563eb' }}
          activeDot={{ r: 7, fill: '#1d4ed8' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
