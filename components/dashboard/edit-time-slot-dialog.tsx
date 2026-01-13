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
import type { TimeSlot } from "@/app/(admin)/dashboard/config/slots/lib/time-slots";

interface EditSlot {
  timeFrom: string;
  timeTo: string;
  days: string[];
  price: string;
  notes: string;
  name?: string;
  tableIds: string[];
  moreInfoUrl?: string;
  customerLimit: number | null; // NEW
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

interface EditTimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (slotId: string, slot: EditSlot) => void;
  isPending?: boolean;
  branchId: string;
  timeSlot: TimeSlot | null;
}

export function EditTimeSlotDialog({
  open,
  onOpenChange,
  onEdit,
  isPending = false,
  branchId,
  timeSlot,
}: EditTimeSlotDialogProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [tables, setTables] = useState<TableWithAvailability[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [editSlot, setEditSlot] = useState<EditSlot>({
    timeFrom: "",
    timeTo: "",
    days: [],
    price: "",
    tableIds: [],
    notes: "",
    name: "",
    moreInfoUrl: "",
    customerLimit: null, // NEW
  });

  // NEW: State for customer limit feature
  const [branchCapacity, setBranchCapacity] = useState(0);
  const [selectedTablesCapacity, setSelectedTablesCapacity] = useState(0);
  const [customerLimitError, setCustomerLimitError] = useState("");

  // Initialize form with time slot data when dialog opens
  useEffect(() => {
    if (open && timeSlot) {
      // Extract time from ISO datetime strings
      const startTime = new Date(timeSlot.startTime);
      const endTime = new Date(timeSlot.endTime);

      const timeFrom = `${String(startTime.getUTCHours()).padStart(
        2,
        "0"
      )}:${String(startTime.getUTCMinutes()).padStart(2, "0")}`;
      const timeTo = `${String(endTime.getUTCHours()).padStart(
        2,
        "0"
      )}:${String(endTime.getUTCMinutes()).padStart(2, "0")}`;

      setEditSlot({
        timeFrom,
        timeTo,
        days: timeSlot.daysOfWeek,
        price: timeSlot.pricePerPerson?.toString() || "",
        notes: timeSlot.notes || "",
        name: timeSlot.name || "",
        moreInfoUrl: timeSlot.moreInfoUrl || "",
        tableIds: timeSlot.tables?.map((t) => t.id) || [],
        customerLimit: (timeSlot as { customerLimit?: number | null }).customerLimit || null, // NEW
      });
    }
  }, [open, timeSlot]);

  // NEW: Fetch branch capacity on mount
  useEffect(() => {
    if (branchId && open) {
      import("@/actions/Table").then(({ getBranchCapacity }) => {
        getBranchCapacity(branchId).then((result) => {
          if (result.success && result.data) {
            setBranchCapacity(result.data);
          }
        });
      });
    }
  }, [branchId, open]);

  // NEW: Recalculate selected tables capacity when selection changes
  useEffect(() => {
    const selected = tables.filter((t) => editSlot.tableIds.includes(t.id));
    const totalCap = selected.reduce((sum, t) => sum + t.capacity, 0);
    setSelectedTablesCapacity(totalCap);
  }, [editSlot.tableIds, tables]);

  // Fetch available tables when time/days change
  useEffect(() => {
    if (
      open &&
      branchId &&
      editSlot.timeFrom &&
      editSlot.timeTo &&
      editSlot.days.length > 0 &&
      timeSlot
    ) {
      setLoadingTables(true);
      getAvailableTablesForTimeSlot({
        branchId,
        startTime: editSlot.timeFrom,
        endTime: editSlot.timeTo,
        daysOfWeek: editSlot.days,
        excludeTimeSlotId: timeSlot.id, // Exclude current slot from conflict checking
      })
        .then((result) => {
          if (result.success && result.data) {
            setTables(result.data);
            // Auto-deselect tables that are now unavailable
            const availableTableIds = result.data
              .filter((t) => t.isAvailable)
              .map((t) => t.id);
            setEditSlot((prev) => ({
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
    }
  }, [
    open,
    branchId,
    editSlot.timeFrom,
    editSlot.timeTo,
    editSlot.days,
    timeSlot,
  ]);

  const toggleDay = (day: string) => {
    setEditSlot((prev) => ({
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
    setEditSlot((prev) => ({
      ...prev,
      days: DAYS.map((d) => d.value),
    }));
  };

  const selectWeekdays = () => {
    setEditSlot((prev) => ({
      ...prev,
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    }));
  };

  const selectWeekend = () => {
    setEditSlot((prev) => ({
      ...prev,
      days: ["saturday", "sunday"],
    }));
  };

  // NEW: Handle customer limit changes
  const handleCustomerLimitChange = (value: string) => {
    const limit = value === "" ? null : parseInt(value);

    // Warn if removing limit with exclusive tables
    if (limit === null && editSlot.tableIds.length > 0) {
      const confirmed = confirm(
        "Eliminar el límite de clientes devolverá estas mesas al grupo compartido. ¿Continuar?"
      );
      if (!confirmed) return;
    }

    if (limit !== null && limit > branchCapacity) {
      setCustomerLimitError(
        `El límite de clientes (${limit}) excede la capacidad total (${branchCapacity})`
      );
    } else {
      setCustomerLimitError("");
    }

    setEditSlot((prev) => ({ ...prev, customerLimit: limit }));
  };

  const handleTableToggle = (tableId: string) => {
    setEditSlot((prev) => {
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
    setEditSlot((prev) => ({ ...prev, tableIds: availableTableIds }));
  };

  const handleDeselectAllTables = () => {
    setEditSlot((prev) => ({ ...prev, tableIds: [] }));
  };

  const handleEdit = () => {
    if (
      editSlot.timeFrom &&
      editSlot.timeTo &&
      editSlot.days.length > 0 &&
      timeSlot
    ) {
      // Validation: must have at least one table selected (removed as tables are now optional)
      // NEW: Validate customer limit
      if (editSlot.customerLimit && editSlot.customerLimit > 0) {
        if (editSlot.tableIds.length === 0) {
          alert(
            "Debes seleccionar al menos una mesa exclusiva al establecer un límite de clientes."
          );
          return;
        }

        if (selectedTablesCapacity < editSlot.customerLimit) {
          const confirmed = confirm(
            `Las mesas seleccionadas (${selectedTablesCapacity} asientos) no cumplen el límite de clientes (${editSlot.customerLimit}). ¿Continuar de todas formas?`
          );
          if (!confirmed) return;
        }
      }

      onEdit(timeSlot.id, editSlot);
    }
  };

  // Check if there are available tables
  const availableTables = tables.filter((t) => t.isAvailable);
  const hasNoAvailableTables =
    tables.length > 0 && availableTables.length === 0;

  if (!timeSlot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChangeHandler}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Turno</DialogTitle>
          <DialogDescription>
            Actualizar el turno con horarios, días y precios personalizados.
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
                value={editSlot.name || ""}
                onChange={(e) =>
                  setEditSlot({ ...editSlot, name: e.target.value })
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
                value={editSlot.timeFrom}
                onChange={(e) =>
                  setEditSlot((prev) => ({
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
                value={editSlot.timeTo}
                onChange={(e) =>
                  setEditSlot((prev) => ({ ...prev, timeTo: e.target.value }))
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
                    editSlot.days.includes(day.value) ? "default" : "outline"
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
              Seleccionados: {editSlot.days.length} day
              {editSlot.days.length !== 1 ? "s" : ""}
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
                value={editSlot.price}
                onChange={(e) =>
                  setEditSlot((prev) => ({ ...prev, price: e.target.value }))
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
                value={editSlot.moreInfoUrl || ""}
                onChange={(e) =>
                  setEditSlot({ ...editSlot, moreInfoUrl: e.target.value })
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
              value={editSlot.notes}
              onChange={(e) =>
                setEditSlot((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="e.j., Reservas solo para grupos grandes"
              rows={3}
            />
          </div>

          {/* NEW: Customer Limit Section */}
          <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-600" />
              <Label htmlFor="customerLimit" className="font-semibold">
                Límite de Clientes (Opcional)
              </Label>
            </div>

            <p className="text-sm text-gray-600">
              Establece un número máximo de clientes para este turno. Luego
              seleccionarás mesas exclusivas para cumplir con esta capacidad.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerLimit">Límite de Clientes</Label>
                <Input
                  id="customerLimit"
                  type="number"
                  min="0"
                  value={editSlot.customerLimit || ""}
                  onChange={(e) => handleCustomerLimitChange(e.target.value)}
                  placeholder="Dejar vacío para ilimitado"
                />
              </div>

              <div>
                <Label>Capacidad Total</Label>
                <div className="h-10 px-3 flex items-center bg-white border rounded-md">
                  <span className="text-sm font-medium text-gray-700">
                    {branchCapacity} asientos
                  </span>
                </div>
              </div>
            </div>

            {customerLimitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{customerLimitError}</AlertDescription>
              </Alert>
            )}

            {editSlot.customerLimit && editSlot.customerLimit > 0 && (
              <Alert className="border-blue-500 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {selectedTablesCapacity} / {editSlot.customerLimit} asientos
                  seleccionados.
                  {selectedTablesCapacity < editSlot.customerLimit && (
                    <span className="block mt-1 font-semibold">
                      Selecciona{" "}
                      {editSlot.customerLimit - selectedTablesCapacity} asientos más
                      para cumplir el límite.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
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
                  <div>
                    <Label>
                      {editSlot.customerLimit && editSlot.customerLimit > 0
                        ? "Seleccionar Mesas Exclusivas (Requerido)"
                        : "Seleccionar Mesas Exclusivas (Opcional)"}
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      {editSlot.customerLimit && editSlot.customerLimit > 0
                        ? "Estas mesas SOLO estarán disponibles para este turno"
                        : "Por defecto, todas las mesas son compartidas. Selecciona mesas para hacerlas exclusivas de este turno."}
                    </p>
                  </div>
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
                                : editSlot.tableIds?.includes(table.id)
                                ? "bg-green-50 border-green-500"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <Checkbox
                              id={`table-${table.id}`}
                              checked={editSlot.tableIds?.includes(table.id)}
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
          {editSlot.timeFrom && editSlot.timeTo && editSlot.days.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Vista Previa</h4>
              <p className="text-sm text-blue-800">
                <strong>Time:</strong> {formatTime(editSlot.timeFrom)} -{" "}
                {formatTime(editSlot.timeTo)}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Días:</strong> {getDayBadges(editSlot.days)}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Precio:</strong>{" "}
                {editSlot.price ? `$${editSlot.price} per person` : "Free"}
              </p>
              {editSlot.notes && (
                <p className="text-sm text-blue-800">
                  <strong>Notas:</strong> {editSlot.notes}
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
            onClick={handleEdit}
            className="bg-red-600 hover:bg-red-700"
            disabled={isPending}
          >
            {isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
