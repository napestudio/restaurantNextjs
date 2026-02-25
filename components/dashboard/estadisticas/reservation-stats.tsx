"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReservationStat } from "@/actions/Statistics";

interface ReservationStatsProps {
  data: ReservationStat[];
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Completada: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Confirmada: { bg: "bg-blue-50", text: "text-blue-700" },
  Sentada: { bg: "bg-indigo-50", text: "text-indigo-700" },
  Pendiente: { bg: "bg-amber-50", text: "text-amber-700" },
  Cancelada: { bg: "bg-red-50", text: "text-red-700" },
  "No se presentó": { bg: "bg-gray-50", text: "text-gray-600" },
};

export function ReservationStats({ data }: ReservationStatsProps) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const completed = data.find((d) => d.status === "Completada")?.count ?? 0;
  const noShow = data.find((d) => d.status === "No se presentó")?.count ?? 0;

  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : "—";
  const noShowRate = total > 0 ? ((noShow / total) * 100).toFixed(1) : "—";

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-800">
          Reservas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{completionRate}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Completadas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{noShowRate}%</p>
            <p className="text-xs text-gray-500 mt-0.5">No asistieron</p>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="space-y-2">
          {data.map((d) => {
            const style = STATUS_STYLES[d.status] ?? {
              bg: "bg-gray-50",
              text: "text-gray-600",
            };
            const pct = total > 0 ? ((d.count / total) * 100).toFixed(0) : "0";
            return (
              <div key={d.status} className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                  {d.status}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-current rounded-full"
                      style={{ width: `${pct}%`, color: "inherit" }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-6 text-right">
                    {d.count}
                  </span>
                </div>
              </div>
            );
          })}
          {data.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              Sin reservas para el período
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
