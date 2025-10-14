"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import type { SerializedReservation } from "@/app/(admin)/dashboard/reservations/lib/reservations";

interface ReservationStatsOverviewProps {
  reservations: SerializedReservation[];
}

export function ReservationStatsOverview({
  reservations,
}: ReservationStatsOverviewProps) {
  const stats = {
    total: reservations.length,
    confirmed: reservations.filter((r) => r.status === "CONFIRMED").length,
    pending: reservations.filter((r) => r.status === "PENDING").length,
    totalGuests: reservations.reduce((sum, res) => sum + res.people, 0),
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Reservas Totales
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
          <Badge variant="default">Activa</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.confirmed}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          <Badge variant="secondary">Revisar</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {stats.pending}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Comensales Totales
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalGuests}</div>
        </CardContent>
      </Card>
    </div>
  );
}
