"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  DollarSign,
  ExternalLink,
  Settings,
  Tag,
  Users,
} from "lucide-react";
import { DAYS } from "@/app/(admin)/dashboard/config/slots/lib/time-slots";
import {
  formatTime,
  getDayBadges,
} from "@/app/(admin)/dashboard/config/slots/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Checkbox } from "../ui/checkbox";
import { getAvailableTablesForTimeSlot } from "@/actions/TimeSlot";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NewSlot {
  timeFrom: string;
  timeTo: string;
  days: string[];
  price: string;
  notes: string;
  name?: string;
  tableIds: string[];
  moreInfoUrl?: string;
}

interface TableWithAvailability {
  id: string;
  number: number;
  name?: string | null;
  capacity: number;
  isActive: boolean;
  isShared: boolean;
  isAvailable: boolean;
  conflictingTimeSlot: {
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
  } | null;
}

interface CreateTimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (slot: NewSlot) => void;
  isPending?: boolean;
  branchId: string;
}

export function CreateTimeSlotDialog({
  open,
  onOpenChange,
  onCreate,
  isPending = false,
  branchId,
}: CreateTimeSlotDialogProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [tables, setTables] = useState<TableWithAvailability[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [newSlot, setNewSlot] = useState<NewSlot>({
    timeFrom: "",
    timeTo: "",
    days: [],
    price: "",
    tableIds: [],
    notes: "",
    name: "",
    moreInfoUrl: "",
  });

  // Fetch available tables when time/days change
  useEffect(() => {
    if (
      open &&
      branchId &&
      newSlot.timeFrom &&
      newSlot.timeTo &&
      newSlot.days.length > 0
    ) {
      setLoadingTables(true);
      getAvailableTablesForTimeSlot({
        branchId,
        startTime: newSlot.timeFrom,
        endTime: newSlot.timeTo,
        daysOfWeek: newSlot.days,
      })
        .then((result) => {
          if (result.success && result.data) {
            setTables(result.data);
            // Auto-deselect tables that are now unavailable
            const availableTableIds = result.data
              .filter((t) => t.isAvailable)
              .map((t) => t.id);
            setNewSlot((prev) => ({
              ...prev,
              tableIds: prev.tableIds.filter((id) =>
                availableTableIds.includes(id)
              ),
            }));
          }
        })
        .catch((error) => {
          console.error("Error fetching tables:", error);
        })
        .finally(() => {
          setLoadingTables(false);
        });
    } else if (open && branchId) {
      // Reset tables if criteria not met
      setTables([]);
      setNewSlot((prev) => ({ ...prev, tableIds: [] }));
    }
  }, [open, branchId, newSlot.timeFrom, newSlot.timeTo, newSlot.days]);

  const toggleDay = (day: string) => {
    setNewSlot((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const onOpenChangeHandler = (open: boolean) => {
    setAdvancedOpen(false);
    onOpenChange(open);
  };

  const selectAllDays = () => {
    setNewSlot((prev) => ({
      ...prev,
      days: DAYS.map((d) => d.value),
    }));
  };

  const selectWeekdays = () => {
    setNewSlot((prev) => ({
      ...prev,
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    }));
  };

  const selectWeekend = () => {
    setNewSlot((prev) => ({
      ...prev,
      days: ["saturday", "sunday"],
    }));
  };

  const handleTableToggle = (tableId: string) => {
    setNewSlot((prev) => {
      const tableIds = prev.tableIds || [];
      if (tableIds.includes(tableId)) {
        return { ...prev, tableIds: tableIds.filter((id) => id !== tableId) };
      } else {
        return { ...prev, tableIds: [...tableIds, tableId] };
      }
    });
  };

  const handleSelectAllTables = () => {
    // Only select available tables
    const availableTableIds = tables
      .filter((t) => t.isAvailable)
      .map((t) => t.id);
    setNewSlot((prev) => ({ ...prev, tableIds: availableTableIds }));
  };

  const handleDeselectAllTables = () => {
    setNewSlot((prev) => ({ ...prev, tableIds: [] }));
  };

  const handleCreate = () => {
    if (newSlot.timeFrom && newSlot.timeTo && newSlot.days.length > 0) {
      // Validation: must have at least one table selected
      if (newSlot.tableIds.length === 0) {
        alert("Debes seleccionar al menos una mesa para este turno.");
        return;
      }
      onCreate(newSlot);
      setNewSlot({
        timeFrom: "",
        timeTo: "",
        days: [],
        price: "",
        notes: "",
        name: "",
        moreInfoUrl: "",
        tableIds: [],
      });
    }
  };

  // Check if there are available tables
  const availableTables = tables.filter((t) => t.isAvailable);
  const hasNoAvailableTables =
    tables.length > 0 && availableTables.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChangeHandler}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Turno</DialogTitle>
          <DialogDescription>
            Crear un turno con horarios, días y precios personalizados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="name">
              Titulo <span className="text-red-500"></span>
            </Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                id="name"
                value={newSlot.name || ""}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, name: e.target.value })
                }
                placeholder="ej., Experiencia OMAKASE"
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Este nombre aparecerá en el formulario de reserva.
            </p>
          </div>
          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timeFrom">Hora Desde</Label>
              <Input
                id="timeFrom"
                type="time"
                value={newSlot.timeFrom}
                onChange={(e) =>
                  setNewSlot((prev) => ({
                    ...prev,
                    timeFrom: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="timeTo">Hora Hasta</Label>
              <Input
                id="timeTo"
                type="time"
                value={newSlot.timeTo}
                onChange={(e) =>
                  setNewSlot((prev) => ({ ...prev, timeTo: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Day Picker */}
          <div>
            <Label>Días</Label>
            <div className="flex gap-2 mb-3 mt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={selectAllDays}
              >
                Todos
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={selectWeekdays}
              >
                Semana
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={selectWeekend}
              >
                Fines de Semana
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => (
                <Button
                  key={day.value}
                  type="button"
                  variant={
                    newSlot.days.includes(day.value) ? "default" : "outline"
                  }
                  onClick={() => toggleDay(day.value)}
                  className="flex flex-col items-center p-3 h-auto"
                >
                  <span className="text-lg font-bold">{day.short}</span>
                  <span className="text-xs">{day.label.slice(0, 3)}</span>
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Seleccionados: {newSlot.days.length} day
              {newSlot.days.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Price */}
          <div>
            <Label htmlFor="price">Precio por persona (Opcional)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={newSlot.price}
                onChange={(e) =>
                  setNewSlot((prev) => ({ ...prev, price: e.target.value }))
                }
                placeholder="0.00"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dejar en $0.00 para turnos gratis.
            </p>
          </div>

          {/* Notes */}

          <div>
            <Label htmlFor="moreInfoUrl">Más info URL (Opcional)</Label>
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                id="moreInfoUrl"
                type="url"
                value={newSlot.moreInfoUrl || ""}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, moreInfoUrl: e.target.value })
                }
                placeholder="https://ejemplo.com/experiencia-omakase"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Link con información adicional sobre este turno.
            </p>
          </div>
          <div>
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              value={newSlot.notes}
              onChange={(e) =>
                setNewSlot((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="e.j., Reservas solo para grupos grandes"
              rows={3}
            />
          </div>
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-transparent"
              >
                <Settings className="mr-2 h-4 w-4" />
                Opciones Avanzadas
                <ChevronDown
                  className={`ml-2 h-4 w-4 transition-transform ${
                    advancedOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Mesas disponibles</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllTables}
                      disabled={loadingTables || availableTables.length === 0}
                    >
                      Seleccionar Todas
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllTables}
                      disabled={loadingTables}
                    >
                      Deseleccionar Todas
                    </Button>
                  </div>
                </div>

                {/* Warning if no tables available */}
                {hasNoAvailableTables && (
                  <Alert className="mb-3 border-yellow-500 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      No hay mesas disponibles para el horario y días
                      seleccionados. Todas las mesas ya están asignadas a otros
                      turnos que se superponen.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                  {loadingTables ? (
                    <div className="col-span-2 text-center py-4 text-gray-500">
                      Cargando Mesas...
                    </div>
                  ) : tables.length === 0 ? (
                    <div className="col-span-2 text-center py-4 text-gray-500">
                      Selecciona horario y días para ver las mesas disponibles.
                    </div>
                  ) : (
                    <TooltipProvider>
                      {tables.map((table) => {
                        const isDisabled = !table.isAvailable;
                        const tableElement = (
                          <div
                            key={table.id}
                            className={`flex items-center space-x-3 p-3 rounded-md border-2 transition-colors ${
                              isDisabled
                                ? "bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed"
                                : newSlot.tableIds?.includes(table.id)
                                ? "bg-green-50 border-green-500"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <Checkbox
                              id={`table-${table.id}`}
                              checked={newSlot.tableIds?.includes(table.id)}
                              onCheckedChange={() =>
                                handleTableToggle(table.id)
                              }
                              disabled={isDisabled}
                            />
                            <Label
                              htmlFor={`table-${table.id}`}
                              className={`flex-1 ${
                                isDisabled
                                  ? "cursor-not-allowed"
                                  : "cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {table.name || `Mesa ${table.number}`}
                                </span>
                                {table.isShared && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                    <Users className="h-2.5 w-2.5" />
                                    Compartida
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                Capacidad: {table.capacity}
                              </div>
                            </Label>
                          </div>
                        );

                        // Wrap unavailable tables in tooltip
                        if (isDisabled && table.conflictingTimeSlot) {
                          return (
                            <Tooltip key={table.id}>
                              <TooltipTrigger asChild>
                                {tableElement}
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="font-semibold">No disponible</p>
                                <p className="text-xs">
                                  Asignada a: {table.conflictingTimeSlot.name}
                                </p>
                                <p className="text-xs">
                                  {formatTime(
                                    table.conflictingTimeSlot.startTime
                                  )}{" "}
                                  -{" "}
                                  {formatTime(
                                    table.conflictingTimeSlot.endTime
                                  )}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        return tableElement;
                      })}
                    </TooltipProvider>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  <p>
                    Selecciona las mesas que estarán disponibles para este
                    turno. Las mesas no disponibles están ocupadas por otros
                    turnos.
                  </p>
                  <p className="flex items-center gap-1.5 text-blue-600">
                    <Users className="h-3 w-3" />
                    <span>
                      Las <strong>mesas compartidas</strong> pueden tener
                      múltiples reservas simultáneas hasta llenar su capacidad.
                    </span>
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Preview */}
          {newSlot.timeFrom && newSlot.timeTo && newSlot.days.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Vista Previa</h4>
              <p className="text-sm text-blue-800">
                <strong>Time:</strong> {formatTime(newSlot.timeFrom)} -{" "}
                {formatTime(newSlot.timeTo)}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Días:</strong> {getDayBadges(newSlot.days)}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Precio:</strong>{" "}
                {newSlot.price ? `$${newSlot.price} per person` : "Free"}
              </p>
              {newSlot.notes && (
                <p className="text-sm text-blue-800">
                  <strong>Notas:</strong> {newSlot.notes}
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-red-600 hover:bg-red-700"
            disabled={isPending}
          >
            {isPending ? "Creando..." : "Crear Turno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
