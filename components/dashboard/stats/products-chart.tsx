"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import type { TopProduct } from "@/actions/Statistics";

interface ProductsChartProps {
  data: TopProduct[];
}

export function ProductsChart({ data }: ProductsChartProps) {
  const truncate = (name: string, max = 22) =>
    name.length > max ? name.slice(0, max) + "…" : name;

  const formatted = data.map((d) => ({
    ...d,
    shortName: truncate(d.name),
  }));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-800">
          Top 10 productos más vendidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {formatted.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            Sin datos para el período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={formatted}
              layout="vertical"
              margin={{ top: 4, right: 60, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                tick={{ fontSize: 11, fill: "#374151" }}
                tickLine={false}
                axisLine={false}
                width={140}
              />
              <Tooltip
                formatter={(value: number | undefined, name: string | undefined) => {
                  const v = value ?? 0;
                  return [
                    name === "units" ? `${v} uds.` : formatCurrency(v, { maximumFractionDigits: 0 }),
                    name === "units" ? "Unidades" : "Ingresos",
                  ];
                }}
                labelFormatter={(label) => {
                  const item = formatted.find((d) => d.shortName === label);
                  return item ? item.name : label;
                }}
                contentStyle={{
                  borderRadius: 8,
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Bar dataKey="units" fill="#f59e0b" radius={[0, 3, 3, 0]} label={{ position: "right", fontSize: 11, fill: "#6b7280" }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
