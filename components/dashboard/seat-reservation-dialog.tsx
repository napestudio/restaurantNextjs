"use client";

import { getTablesForSeating, type TableForSeating } from "@/actions/Table";
import type { SerializedReservation } from "@/app/(admin)/dashboard/reservations/lib/reservations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateAR, formatTimeAR } from "@/lib/date-utils";
import { AlertTriangle, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface SeatReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: SerializedReservation;
  branchId: string;
  onConfirm: (
    reservationId: string,
    selectedTableIds: string[],
  ) => Promise<void>;
  isLoading: boolean;
}

export function SeatReservationDialog({
  open,
  onOpenChange,
  reservation,
  branchId,
  onConfirm,
  isLoading,
}: SeatReservationDialogProps) {
  const [tables, setTables] = useState<TableForSeating[]>([]);
  const [isFetchingTables, setIsFetchingTables] = useState(false);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState(false);

  // Lazy-load tables when dialog opens
  useEffect(() => {
    if (!open) return;
    setSplitMode(false);
    setIsFetchingTables(true);
    getTablesForSeating(branchId, reservation.id).then((result) => {
      if (result.success && result.data) {
        setTables(result.data);
        // Pre-select already assigned tables
        setSelectedTableIds(
          result.data
            .filter((t) => t.isAssignedToThisReservation)
            .map((t) => t.id),
        );
      }
      setIsFetchingTables(false);
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTable = (tableId: string) => {
    if (splitMode) {
      setSelectedTableIds((prev) =>
        prev.includes(tableId)
          ? prev.filter((id) => id !== tableId)
          : [...prev, tableId],
      );
    } else {
      setSelectedTableIds((prev) => (prev.includes(tableId) ? [] : [tableId]));
    }
  };

  const totalSelectedCapacity = tables
    .filter((t) => selectedTableIds.includes(t.id))
    .reduce((sum, t) => sum + t.capacity, 0);

  const capacityInsufficient =
    selectedTableIds.length > 0 && totalSelectedCapacity < reservation.people;

  const availableCount = tables.filter(
    (t) => t.status !== "OCCUPIED" || t.isAssignedToThisReservation,
  ).length;

  const handleConfirm = async () => {
    if (selectedTableIds.length === 0) return;
    await onConfirm(reservation.id, selectedTableIds);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const arrivalTime = reservation.exactTime ?? reservation.timeSlot?.startTime;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sentar Reserva</DialogTitle>
          <DialogDescription>
            Seleccioná la mesa donde se sentará la reserva.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Reservation summary */}
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-1">
            <div className="font-semibold text-base">
              {reservation.customerName}
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {reservation.people} persona
                {reservation.people !== 1 ? "s" : ""}
              </span>
              {arrivalTime && (
                <span>
                  {formatDateAR(reservation.date)} · {formatTimeAR(arrivalTime)}
                </span>
              )}
            </div>
          </div>

          {/* Capacity warning */}
          {capacityInsufficient && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Capacidad insuficiente: {reservation.people} personas,{" "}
                {totalSelectedCapacity} lugar
                {totalSelectedCapacity !== 1 ? "es" : ""} seleccionado
                {totalSelectedCapacity !== 1 ? "s" : ""}.
              </AlertDescription>
            </Alert>
          )}

          {/* Table grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Mesas disponibles
                {!isFetchingTables && ` (${availableCount})`}
              </Label>
              {!isFetchingTables && tables.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSplitMode((prev) => {
                      if (prev) {
                        setSelectedTableIds((ids) => ids.slice(0, 1));
                      }
                      return !prev;
                    });
                  }}
                  disabled={isLoading}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  {splitMode ? "Quitar división" : "Dividir en varias mesas"}
                </button>
              )}
            </div>
            {splitMode && (
              <p className="text-xs text-muted-foreground">
                Modo división activo: seleccioná todas las mesas donde se
                sentará el grupo.
              </p>
            )}

            {isFetchingTables ? (
              <div className="grid grid-cols-3 gap-2 p-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : tables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No hay mesas disponibles en este momento
              </div>
            ) : (
              <ScrollArea className="h-64 rounded-md border">
                <div className="p-3 grid grid-cols-3 gap-2">
                  {tables.map((table) => {
                    const isSelected = selectedTableIds.includes(table.id);
                    const isOccupied =
                      table.status === "OCCUPIED" &&
                      !table.isAssignedToThisReservation;

                    return (
                      <button
                        key={table.id}
                        onClick={() => !isOccupied && toggleTable(table.id)}
                        disabled={isOccupied || isLoading}
                        className={[
                          "w-full p-3 rounded-lg border-2 transition-all text-left",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : table.isAssignedToThisReservation
                              ? "border-blue-400 bg-blue-50"
                              : "border-border hover:border-primary/50 hover:bg-accent",
                          isOccupied
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer",
                          isLoading ? "opacity-50 pointer-events-none" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="flex flex-col items-center gap-1 text-center">
                          <span className="font-semibold">
                            Mesa {table.number}
                          </span>
                          {table.name && (
                            <span className="text-xs text-muted-foreground truncate w-full text-center">
                              {table.name}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {table.capacity} lug.
                          </span>
                          {table.isAssignedToThisReservation && !isSelected && (
                            <span className="text-xs text-blue-600 font-medium">
                              Auto-Asignada
                            </span>
                          )}

                          <div
                            className={`${isSelected ? "opacity-100" : "opacity-0"} w-4 h-4 rounded-full bg-primary flex items-center justify-center mt-0.5`}
                          >
                            <svg
                              className="w-2.5 h-2.5 text-primary-foreground"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedTableIds.length === 0 || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? "Sentando..." : "Confirmar y Sentar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
