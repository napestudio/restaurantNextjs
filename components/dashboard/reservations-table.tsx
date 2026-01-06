"use client";

import type { ReservationFilterType } from "@/actions/Reservation";
import type { SerializedReservation } from "@/app/(admin)/dashboard/reservations/lib/reservations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  Eye,
  Filter,
  History,
  Loader2,
  Trash2,
  UserCheck,
} from "lucide-react";

interface ReservationsTableProps {
  reservations: SerializedReservation[];
  filterType: ReservationFilterType;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
  };
  isPending: boolean;
  onFilterTypeChange: (
    type: ReservationFilterType,
    dateFrom?: string,
    dateTo?: string
  ) => void;
  onStatusFilterChange: (status: string) => void;
  onDateRangeChange: (dateFrom: string, dateTo: string) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onView: (reservation: SerializedReservation) => void;
  onCancel: (id: string) => void;
  onLoadMore: () => void;
}

export function ReservationsTable({
  reservations,
  filterType,
  statusFilter,
  dateFrom,
  dateTo,
  pagination,
  isPending,
  onFilterTypeChange,
  onStatusFilterChange,
  onDateRangeChange,
  onStatusUpdate,
  onView,
  onCancel,
  onLoadMore,
}: ReservationsTableProps) {
  const handleSetToday = () => {
    onFilterTypeChange("today");
  };

  const handleSetPast = () => {
    onFilterTypeChange("past");
  };

  const handleDateFromChange = (value: string) => {
    onDateRangeChange(value, dateTo);
  };

  const handleDateToChange = (value: string) => {
    onDateRangeChange(dateFrom, value);
  };

  const handleClearFilters = () => {
    onFilterTypeChange("today", "", "");
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case "today":
        return "Hoy";
      case "past":
        return "Historial";
      case "dateRange":
        return "Rango de fechas";
      default:
        return "Hoy";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Gestión de Reservas
                {/* <Badge variant="secondary" className="ml-2">
                  {pagination.totalCount} total
                </Badge> */}
              </CardTitle>
              <CardDescription>
                {filterType === "today" && "Mostrando reservas de hoy"}
                {filterType === "past" && "Mostrando reservas pasadas"}
                {filterType === "dateRange" &&
                  "Mostrando rango de fechas seleccionado"}
              </CardDescription>
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

          {/* Date Filter Tabs */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Período:</span>
            </div>

            {/* Filter Type Buttons */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant={filterType === "today" ? "default" : "ghost"}
                size="sm"
                onClick={handleSetToday}
                className={
                  filterType === "today" ? "bg-red-600 hover:bg-red-700" : ""
                }
                disabled={isPending}
              >
                <Clock className="h-4 w-4 mr-1" />
                Hoy
              </Button>
              <Button
                variant={filterType === "past" ? "default" : "ghost"}
                size="sm"
                onClick={handleSetPast}
                className={
                  filterType === "past" ? "bg-red-600 hover:bg-red-700" : ""
                }
                disabled={isPending}
              >
                <History className="h-4 w-4 mr-1" />
                Historial
              </Button>
              <Button
                variant={filterType === "dateRange" ? "default" : "ghost"}
                size="sm"
                onClick={() => onFilterTypeChange("dateRange")}
                className={
                  filterType === "dateRange"
                    ? "bg-red-600 hover:bg-red-700"
                    : ""
                }
                disabled={isPending}
              >
                <CalendarDays className="h-4 w-4 mr-1" />
                Rango
              </Button>
            </div>

            {/* Date Range Inputs - Only show when dateRange is selected */}
            {filterType === "dateRange" && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="w-40"
                  placeholder="Desde"
                  disabled={isPending}
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className="w-40"
                  placeholder="Hasta"
                  disabled={isPending}
                />
              </div>
            )}

            {/* Clear Filters */}
            {(filterType !== "today" || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-muted-foreground hover:text-foreground"
                disabled={isPending}
              >
                Limpiar filtros
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
            {reservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground font-medium">
                      No se encontraron reservas
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {filterType === "today" && "No hay reservas para hoy"}
                      {filterType === "past" &&
                        "No hay reservas en el historial"}
                      {filterType === "dateRange" &&
                        "Selecciona un rango de fechas"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              reservations.map((reservation) => (
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
                        {format(parseISO(reservation.date), "dd MMM yyyy", {
                          locale: es,
                        })}
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
                          onClick={() =>
                            onStatusUpdate(reservation.id, "seated")
                          }
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

        {/* Pagination / Load More */}
        {pagination.hasMore && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={isPending}
              className="min-w-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Cargar más ({reservations.length} de {pagination.totalCount})
                </>
              )}
            </Button>
          </div>
        )}

        {/* Show count when all loaded */}
        {!pagination.hasMore && reservations.length > 0 && (
          <div className="text-center mt-4 text-sm text-muted-foreground">
            Mostrando {reservations.length} de {pagination.totalCount} reservas
          </div>
        )}
      </CardContent>
    </Card>
  );
}
