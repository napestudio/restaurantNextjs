"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HourStat } from "@/actions/Statistics";

interface HoursChartProps {
  data: HourStat[];
}

export function HoursChart({ data }: HoursChartProps) {
  const maxOrders = Math.max(...data.map((d) => d.orders), 1);

  const formatted = data.map((d) => ({
    ...d,
    label: `${String(d.hour).padStart(2, "0")}:00`,
  }));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-800">
          Horas pico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={formatted}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: number | undefined) => [value ?? 0, "Órdenes"]}
              labelStyle={{ color: "#374151", fontWeight: 600 }}
              contentStyle={{
                borderRadius: 8,
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Bar dataKey="orders" radius={[3, 3, 0, 0]}>
              {formatted.map((entry, index) => {
                const intensity = entry.orders / maxOrders;
                const opacity = 0.3 + intensity * 0.7;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={`rgba(99, 102, 241, ${opacity})`}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
