"use client";

import Link from "next/link";
import {
  UtensilsCrossed,
  ShoppingBag,
  Calendar,
  AlertTriangle,
  Users,
  Truck,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@/types/orders";
import type { TableWithReservations } from "@/types/tables-client";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

type StockAlertItem = {
  id: string;
  stock: number;
  minStock: number | null;
  product: {
    name: string;
    minStockAlert: number | null;
  };
};

type ReservationItem = {
  id: string;
  customerName: string;
  people: number;
  status: string;
  timeSlot: { startTime: string } | null;
};

interface DashboardHomeProps {
  recentOrders: Order[];
  recentReservations: ReservationItem[];
  stockAlerts: StockAlertItem[];
  orderCounts: { DINE_IN: number; TAKE_AWAY: number; DELIVERY: number };
  tables: TableWithReservations[];
}

function reservationStatusBadge(status: string): {
  variant: BadgeVariant;
  label: string;
} {
  switch (status) {
    case "CONFIRMED":
      return { variant: "default", label: "Confirmada" };
    case "PENDING":
      return { variant: "secondary", label: "Pendiente" };
    case "SEATED":
      return { variant: "outline", label: "Sentada" };
    case "CANCELED":
      return { variant: "destructive", label: "Cancelada" };
    case "NO_SHOW":
      return { variant: "destructive", label: "No se presentó" };
    case "COMPLETED":
      return { variant: "outline", label: "Completada" };
    default:
      return { variant: "outline", label: status };
  }
}

function orderStatusBadge(status: string): {
  variant: BadgeVariant;
  label: string;
} {
  switch (status) {
    case "PENDING":
      return { variant: "secondary", label: "Pendiente" };
    case "IN_PROGRESS":
      return { variant: "default", label: "En proceso" };
    case "COMPLETED":
      return { variant: "outline", label: "Completado" };
    case "CANCELED":
      return { variant: "destructive", label: "Cancelado" };
    default:
      return { variant: "outline", label: status };
  }
}

function orderTypeLabel(type: string): string {
  switch (type) {
    case "DINE_IN":
      return "Mesa";
    case "TAKE_AWAY":
      return "Para llevar";
    case "DELIVERY":
      return "Delivery";
    default:
      return type;
  }
}

function formatTime(value: string | Date): string {
  try {
    return new Date(value).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--";
  }
}

export function DashboardHome({
  recentOrders,
  recentReservations,
  stockAlerts,
  orderCounts,
  tables,
}: DashboardHomeProps) {
  const availableTables = tables.filter(
    (t) => t.isActive && t.status === "EMPTY",
  );
  const totalActiveOrders =
    orderCounts.DINE_IN + orderCounts.TAKE_AWAY + orderCounts.DELIVERY;

  const quickLinks = [
    {
      label: "Mesas",
      href: "/dashboard/tables",
      icon: UtensilsCrossed,
      count: availableTables.length,
      color: "text-emerald-600",
      bg: "bg-emerald-50 hover:bg-emerald-100",
      border: "border-emerald-200",
      bubbleBg: "bg-emerald-100",
    },
    {
      label: "Pedidos",
      href: "/dashboard/orders",
      icon: ShoppingBag,
      count: totalActiveOrders,
      color: "text-blue-600",
      bg: "bg-blue-50 hover:bg-blue-100",
      border: "border-blue-200",
      bubbleBg: "bg-blue-100",
    },
    {
      label: "Reservas",
      href: "/dashboard/reservations",
      icon: Calendar,
      count: recentReservations.length,
      color: "text-purple-600",
      bg: "bg-purple-50 hover:bg-purple-100",
      border: "border-purple-200",
      bubbleBg: "bg-purple-100",
    },
  ];

  const orderStatCards = [
    {
      label: "En Mesa",
      count: orderCounts.DINE_IN,
      icon: UtensilsCrossed,
      color: "text-emerald-600",
    },
    {
      label: "Para Llevar",
      count: orderCounts.TAKE_AWAY,
      icon: ShoppingBag,
      color: "text-blue-600",
    },
    {
      label: "Delivery",
      count: orderCounts.DELIVERY,
      icon: Truck,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="min-h-svh bg-neutral-50">
      <main className="px-4 sm:px-6 lg:px-8 py-6 pt-20">
        {/* Quick Access */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Acceso Rápido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <div
                    className={`relative rounded-xl border p-5 flex items-center gap-4 cursor-pointer transition-colors ${link.bg} ${link.border}`}
                  >
                    <span
                      className={`absolute top-3 right-3 min-w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold px-1.5 ${link.bubbleBg} ${link.color}`}
                    >
                      {link.count}
                    </span>
                    <Icon className={`h-9 w-9 ${link.color} shrink-0`} />
                    <div className="font-bold text-gray-900 text-lg leading-tight">
                      {link.label}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Active Order Stats */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Pedidos Activos
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {orderStatCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {stat.label}
                    </CardTitle>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">
                      {stat.count}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Three-column Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Reservations */}
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                Reservas de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              {recentReservations.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  Sin reservas hoy
                </p>
              ) : (
                <ul className="space-y-3">
                  {recentReservations.map((res) => {
                    const badge = reservationStatusBadge(res.status);
                    const time = res.timeSlot?.startTime
                      ? formatTime(res.timeSlot.startTime)
                      : "--:--";
                    return (
                      <li
                        key={res.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {res.customerName}
                          </div>
                          <div className="flex items-center gap-2 text-gray-500 text-xs mt-0.5">
                            <Users className="h-3 w-3 shrink-0" />
                            {res.people} · {time}
                          </div>
                        </div>
                        <Badge
                          variant={badge.variant}
                          className="shrink-0 text-xs"
                        >
                          {badge.label}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
            <div className="px-6 pb-4 pt-0">
              <Link
                href="/dashboard/reservations"
                className="text-xs text-purple-600 hover:underline font-medium"
              >
                Ver todas →
              </Link>
            </div>
          </Card>

          {/* Recent Orders */}
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-blue-600" />
                Pedidos Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              {recentOrders.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  Sin pedidos recientes
                </p>
              ) : (
                <ul className="space-y-3">
                  {recentOrders.map((order) => {
                    const badge = orderStatusBadge(order.status);
                    const location =
                      order.type === "DINE_IN" && order.table?.number
                        ? `Mesa ${order.table.number}`
                        : orderTypeLabel(order.type);
                    const time = order.createdAt
                      ? formatTime(order.createdAt)
                      : "--:--";
                    return (
                      <li
                        key={order.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate font-mono text-xs">
                            {order.publicCode}
                          </div>
                          <div className="text-gray-500 text-xs mt-0.5">
                            {location} · {time}
                          </div>
                        </div>
                        <Badge
                          variant={badge.variant}
                          className="shrink-0 text-xs"
                        >
                          {badge.label}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
            <div className="px-6 pb-4 pt-0">
              <Link
                href="/dashboard/orders"
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Ver todos →
              </Link>
            </div>
          </Card>

          {/* Stock Alerts */}
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Alertas de Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              {stockAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 gap-1 text-emerald-600">
                  <CheckCircle className="h-6 w-6" />
                  <p className="text-sm font-medium">Todo en orden</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {stockAlerts.map((alert) => {
                    const isOut = alert.stock === 0;
                    return (
                      <li
                        key={alert.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {alert.product?.name}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-semibold shrink-0 ${isOut ? "text-red-600" : "text-orange-500"}`}
                        >
                          {alert.stock} /{" "}
                          {alert.product?.minStockAlert ??
                            alert.minStock ??
                            "?"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
            <div className="px-6 pb-4 pt-0">
              <Link
                href="/dashboard/stock"
                className="text-xs text-orange-600 hover:underline font-medium"
              >
                Ver stock →
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
