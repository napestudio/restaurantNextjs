"use client";

import type { SerializedReservation } from "@/app/(admin)/dashboard/reservations/lib/reservations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateLongAR, formatTimeAR, formatDateTimeAR } from "@/lib/date-utils";

interface ViewReservationDialogProps {
  reservation: SerializedReservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewReservationDialog({
  reservation,
  open,
  onOpenChange,
}: ViewReservationDialogProps) {
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    const variants = {
      confirmed: "default",
      pending: "secondary",
      canceled: "destructive",
      cancelled: "destructive",
    };
    return (
      <Badge
        variant={
          (variants[statusLower as keyof typeof variants] || "default") as
            | "default"
            | "secondary"
            | "destructive"
            | "outline"
        }
      >
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de la reserva</DialogTitle>
        </DialogHeader>
        {reservation && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Nombre
                </h3>
                <p className="text-lg font-semibold">
                  {reservation.customerName}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Estado
                </h3>
                <div>{getStatusBadge(reservation.status)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Email
                </h3>
                <p className="text-sm">{reservation.customerEmail}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Teléfono
                </h3>
                <p className="text-sm">{reservation.customerPhone || "N/A"}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Fecha
                </h3>
                <p className="text-sm font-semibold">
                  {formatDateLongAR(reservation.date)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Hora</h3>
                <p className="text-sm font-semibold">
                  {reservation.timeSlot
                    ? `${reservation.timeSlot.startTime.slice(
                        11,
                        16
                      )} - ${reservation.timeSlot.endTime.slice(11, 16)}`
                    : "No time slot"}
                </p>
                {reservation.exactTime && (
                  <p className="text-xs text-blue-600 mt-1">
                    Llegada: {formatTimeAR(reservation.exactTime)}
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Personas
                </h3>
                <p className="text-sm font-semibold">
                  {reservation.people} comensales
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Mesas Asignadas
              </h3>
              {reservation.tables && reservation.tables.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {reservation.tables.map((rt) => (
                    <Badge
                      key={rt.tableId}
                      variant="outline"
                      className="text-sm font-semibold bg-blue-50 border-blue-300"
                    >
                      {rt.table.name ?? `Mesa ${rt.table.number}`}
                      {" "}(cap. {rt.table.capacity})
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Sin mesas asignadas
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Restricciones alimentarias
                </h3>
                <p className="text-sm bg-orange-50 p-3 rounded-md border border-orange-200">
                  {reservation.dietaryRestrictions || "Ninguna"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Accesibilidad
                </h3>
                <p className="text-sm bg-blue-50 p-3 rounded-md border border-blue-200">
                  {reservation.accessibilityNeeds || "Ninguna"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Pedidos especialas / Notas
              </h3>
              <p className="text-sm bg-gray-50 p-3 rounded-md">
                {reservation.notes || "No hay notas"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Creada el
              </h3>
              <p className="text-sm">
                {formatDateTimeAR(reservation.createdAt)}
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
