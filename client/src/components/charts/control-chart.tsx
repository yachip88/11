import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ControlChartData } from "@shared/schema";

interface ControlChartProps {
  data: ControlChartData[];
}

export function ControlChart({ data }: ControlChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Данные для контрольной карты не найдены
      </div>
    );
  }

  const formatTooltip = (value: any, name: string) => {
    if (typeof value === "number") {
      return [`${value.toFixed(2)} т/ч`, name];
    }
    return [value, name];
  };

  const formatLabel = (label: string) => {
    return new Date(label).toLocaleDateString("ru-RU");
  };

  // Get the control limits from the first data point
  const ucl = data[0]?.ucl || 0;
  const cl = data[0]?.cl || 0;
  const lcl = data[0]?.lcl || 0;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
            })
          }
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          domain={["auto", "auto"]}
          tickFormatter={(value) =>
            typeof value === "number" ? value.toFixed(1) : value
          }
        />
        <Tooltip
          formatter={formatTooltip}
          labelFormatter={formatLabel}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
        />
        <Legend />

        {/* Control Lines */}
        <ReferenceLine
          y={ucl}
          stroke="#dc2626"
          strokeDasharray="5 5"
          strokeWidth={2}
          label={{ value: "UCL", position: "right" }}
        />
        <ReferenceLine
          y={cl}
          stroke="#16a34a"
          strokeDasharray="5 5"
          strokeWidth={2}
          label={{ value: "CL", position: "right" }}
        />
        <ReferenceLine
          y={lcl}
          stroke="#2563eb"
          strokeDasharray="5 5"
          strokeWidth={2}
          label={{ value: "LCL", position: "right" }}
        />

        {/* Data Line */}
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={(props: any) => {
            const isOutOfControl = data[props.index]?.isOutOfControl;
            const controlType = data[props.index]?.controlType;
            const key = `dot-${props.index}`;

            if (isOutOfControl) {
              return (
                <circle
                  key={key}
                  cx={props.cx}
                  cy={props.cy}
                  r={5}
                  fill={
                    controlType === "upper"
                      ? "#dc2626"
                      : controlType === "lower"
                        ? "#2563eb"
                        : "#16a34a"
                  }
                  stroke="#fff"
                  strokeWidth={2}
                />
              );
            }
            return (
              <circle
                key={key}
                cx={props.cx}
                cy={props.cy}
                r={3}
                fill="hsl(var(--primary))"
              />
            );
          }}
          activeDot={{
            r: 6,
            stroke: "hsl(var(--primary))",
            strokeWidth: 2,
            fill: "#fff",
          }}
          name="Подпитка"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
