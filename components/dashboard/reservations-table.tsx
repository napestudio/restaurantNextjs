"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, Filter } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { SerializedReservation } from "@/app/(admin)/dashboard/reservations/lib/reservations";

interface ReservationsTableProps {
  reservations: SerializedReservation[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onView: (reservation: SerializedReservation) => void;
  onCancel: (id: string) => void;
}

export function ReservationsTable({
  reservations,
  statusFilter,
  onStatusFilterChange,
  onStatusUpdate,
  onView,
  onCancel,
}: ReservationsTableProps) {
  const filteredReservations =
    statusFilter === "all"
      ? reservations
      : reservations.filter((res) => res.status.toLowerCase() === statusFilter);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestión de Reservas</CardTitle>
            <CardDescription>Administra todas las reservas</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="confirmed">Confirmadas</SelectItem>
                <SelectItem value="cancelled">Completadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Fecha y hora</TableHead>
              <TableHead>Personas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReservations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No se encontraron reservas.
                </TableCell>
              </TableRow>
            ) : (
              filteredReservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-mono text-sm">
                    {reservation.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {reservation.customerName}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{reservation.customerEmail}</div>
                      <div className="text-muted-foreground">
                        {reservation.customerPhone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">
                        {format(parseISO(reservation.date), "MMM dd, yyyy")}
                      </div>
                      <div className="text-muted-foreground">
                        {reservation.timeSlot
                          ? `${reservation.timeSlot.startTime.slice(
                              11,
                              16
                            )} - ${reservation.timeSlot.endTime.slice(11, 16)}`
                          : "No time slot"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{reservation.people} guests</Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={reservation.status.toLowerCase()}
                      onValueChange={(value) =>
                        onStatusUpdate(reservation.id, value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="confirmed">Confirmada</SelectItem>
                        <SelectItem value="canceled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView(reservation)}
                        title="Ver Detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onCancel(reservation.id)}
                        title="Cancelar Reserva"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
