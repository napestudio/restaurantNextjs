"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, ShoppingBag, DollarSign, Archive } from "lucide-react";
import type { KpiStats } from "@/actions/Statistics";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

interface KpiCardsProps {
  kpi: KpiStats;
}

export function KpiCards({ kpi }: KpiCardsProps) {
  const cards = [
    {
      label: "Ingresos totales",
      value: formatCurrency(kpi.totalRevenue),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Órdenes completadas",
      value: kpi.totalOrders.toLocaleString("es-AR"),
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Ticket promedio",
      value: formatCurrency(kpi.avgOrderValue),
      icon: TrendingUp,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Arqueos",
      value: kpi.totalSessions.toLocaleString("es-AR"),
      icon: Archive,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {card.value}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
