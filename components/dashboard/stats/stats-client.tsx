"use client";

import { useState, useTransition } from "react";
import { subDays, subMonths, subYears, startOfDay, endOfDay } from "date-fns";
import { getAllStats } from "@/actions/Statistics";
import type { AllStats } from "@/actions/Statistics";
import { KpiCards } from "./kpi-cards";
import { RevenueChart } from "./revenue-chart";
import { HoursChart } from "./hours-chart";
import { ProductsChart } from "./products-chart";
import { OrderTypesChart } from "./order-types-chart";
import { PaymentChart } from "./payment-chart";
import { ReservationStats } from "./reservation-stats";

type Period = "today" | "7d" | "30d" | "3m" | "1y";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "3m", label: "3 meses" },
  { key: "1y", label: "1 año" },
];

function getDateRange(period: Period): { from: Date; to: Date } {
  const to = endOfDay(new Date());
  switch (period) {
    case "today":
      return { from: startOfDay(new Date()), to };
    case "7d":
      return { from: subDays(to, 7), to };
    case "30d":
      return { from: subDays(to, 30), to };
    case "3m":
      return { from: subMonths(to, 3), to };
    case "1y":
      return { from: subYears(to, 1), to };
  }
}

interface StatsClientProps {
  branchId: string;
  initialStats: AllStats;
  initialFrom: string;
  initialTo: string;
}

export function StatsClient({ branchId, initialStats }: StatsClientProps) {
  const [period, setPeriod] = useState<Period>("30d");
  const [stats, setStats] = useState<AllStats>(initialStats);
  const [isPending, startTransition] = useTransition();

  function handlePeriodChange(next: Period) {
    if (next === period) return;
    setPeriod(next);
    const { from, to } = getDateRange(next);
    startTransition(async () => {
      const fresh = await getAllStats(branchId, from, to);
      setStats(fresh);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Resumen de rendimiento del local
          </p>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm self-start sm:self-auto">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePeriodChange(key)}
              disabled={isPending}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === key
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              } disabled:opacity-50`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading overlay */}
      <div
        className={`transition-opacity ${isPending ? "opacity-50 pointer-events-none" : "opacity-100"}`}
      >
        {/* KPI Cards */}
        <KpiCards kpi={stats.kpi} />

        {/* Revenue chart — full width */}
        <div className="mt-6">
          <RevenueChart data={stats.revenueByDay} />
        </div>

        {/* Hours + Order types — two columns */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HoursChart data={stats.busiestHours} />
          <OrderTypesChart data={stats.orderTypes} />
        </div>

        {/* Top products — full width */}
        <div className="mt-6">
          <ProductsChart data={stats.topProducts} />
        </div>

        {/* Payment methods + Reservations — two columns */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PaymentChart data={stats.paymentMethods} />
          <ReservationStats data={stats.reservations} />
        </div>
      </div>
    </div>
  );
}
