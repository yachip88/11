import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const factorsData = [
  { name: "Гидроиспытания", value: 35, color: "#dc2626" },
  { name: "Аварийные заявки", value: 28, color: "#f59e0b" },
  { name: "Нормальная эксплуатация", value: 20, color: "#10b981" },
  { name: "Сезонные факторы", value: 12, color: "#3b82f6" },
  { name: "Прочее", value: 5, color: "#6b7280" },
];

export function FactorsChart() {
  const formatTooltip = (value: number, name: string) => {
    return [`${value}%`, name];
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={factorsData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {factorsData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={formatTooltip}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
        />
        <Legend
          verticalAlign="middle"
          align="right"
          layout="vertical"
          iconType="rect"
          wrapperStyle={{ paddingLeft: "20px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
