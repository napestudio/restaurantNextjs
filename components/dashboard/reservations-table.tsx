"use client";

import { useEffect, useMemo } from "react";
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
import { Eye, Trash2, Filter, UserCheck, CalendarDays } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import type { SerializedReservation } from "@/app/(admin)/dashboard/reservations/lib/reservations";
import { Input } from "@/components/ui/input";

interface ReservationsTableProps {
  reservations: SerializedReservation[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onView: (reservation: SerializedReservation) => void;
  onCancel: (id: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onFilteredReservationsChange: (reservations: SerializedReservation[]) => void;
}

export function ReservationsTable({
  reservations,
  statusFilter,
  onStatusFilterChange,
  onStatusUpdate,
  onView,
  onCancel,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onFilteredReservationsChange,
}: ReservationsTableProps) {
  // Apply filters using useMemo to prevent unnecessary recalculations
  const filteredReservations = useMemo(() => {
    // Apply status filter
    let filtered =
      statusFilter === "all"
        ? reservations
        : reservations.filter((res) => res.status.toLowerCase() === statusFilter);

    // Apply date range filter
    if (dateFrom || dateTo) {
      filtered = filtered.filter((res) => {
        const resDate = parseISO(res.date);

        if (dateFrom && dateTo) {
          const from = startOfDay(parseISO(dateFrom));
          const to = endOfDay(parseISO(dateTo));
          return isWithinInterval(resDate, { start: from, end: to });
        } else if (dateFrom) {
          return resDate >= startOfDay(parseISO(dateFrom));
        } else if (dateTo) {
          return resDate <= endOfDay(parseISO(dateTo));
        }

        return true;
      });
    }

    return filtered;
  }, [reservations, statusFilter, dateFrom, dateTo]);

  // Update parent component with filtered data - using dependencies that won't cause infinite loops
  useEffect(() => {
    onFilteredReservationsChange(filteredReservations);
  }, [reservations, statusFilter, dateFrom, dateTo]);

  const handleSetToday = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    onDateFromChange(today);
    onDateToChange(today);
  };

  const handleClearDates = () => {
    onDateFromChange("");
    onDateToChange("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
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
                  <SelectItem value="seated">Sentadas</SelectItem>
                  <SelectItem value="completed">Completadas</SelectItem>
                  <SelectItem value="canceled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros de Fecha:</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="w-40"
                placeholder="Desde"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="w-40"
                placeholder="Hasta"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetToday}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Hoy
            </Button>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearDates}
                className="text-muted-foreground hover:text-foreground"
              >
                Limpiar
              </Button>
            )}
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
                  className="text-center py-12"
                >
                  <div className="flex flex-col items-center gap-2">
                    <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground font-medium">
                      No se encontraron reservas
                    </p>
                    {(dateFrom || dateTo || statusFilter !== "all") && (
                      <p className="text-sm text-muted-foreground">
                        Intenta ajustar los filtros para ver más resultados
                      </p>
                    )}
                  </div>
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
                    <Badge variant="outline" className="font-bold">
                      {reservation.people}
                    </Badge>
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
                        <SelectItem value="seated">Sentada</SelectItem>
                        <SelectItem value="completed">Completada</SelectItem>
                        <SelectItem value="canceled">Cancelada</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {reservation.status.toUpperCase() === "CONFIRMED" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => onStatusUpdate(reservation.id, "seated")}
                          title="Marcar como Sentada"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
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
