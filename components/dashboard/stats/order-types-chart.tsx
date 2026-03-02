"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrderTypeStat } from "@/actions/Statistics";

const COLORS = ["#6366f1", "#10b981", "#f59e0b"];

interface OrderTypesChartProps {
  data: OrderTypeStat[];
}

export function OrderTypesChart({ data }: OrderTypesChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-800">
          Tipo de órdenes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 || total === 0 ? (
          <div className="h-55 flex items-center justify-center text-gray-400 text-sm">
            Sin datos para el período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="count"
                nameKey="type"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | undefined) => {
                  const v = value ?? 0;
                  return [
                    `${v} (${((v / total) * 100).toFixed(1)}%)`,
                    "Órdenes",
                  ];
                }}
                contentStyle={{
                  borderRadius: 8,
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-gray-600">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
