"use client";

import { useState } from "react";
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
import { DollarSign } from "lucide-react";
import { DAYS } from "@/app/(admin)/dashboard/reservations/slots/lib/time-slots";
import {
  formatTime,
  getDayBadges,
} from "@/app/(admin)/dashboard/reservations/slots/lib/utils";

interface NewSlot {
  timeFrom: string;
  timeTo: string;
  days: string[];
  price: string;
  notes: string;
}

interface CreateTimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (slot: NewSlot) => void;
  isPending?: boolean;
}

export function CreateTimeSlotDialog({
  open,
  onOpenChange,
  onCreate,
  isPending = false,
}: CreateTimeSlotDialogProps) {
  const [newSlot, setNewSlot] = useState<NewSlot>({
    timeFrom: "",
    timeTo: "",
    days: [],
    price: "",
    notes: "",
  });

  const toggleDay = (day: string) => {
    setNewSlot((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
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

  const handleCreate = () => {
    if (newSlot.timeFrom && newSlot.timeTo && newSlot.days.length > 0) {
      onCreate(newSlot);
      setNewSlot({ timeFrom: "", timeTo: "", days: [], price: "", notes: "" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Turno</DialogTitle>
          <DialogDescription>
            Crear un turno con horarios, días y precios personalizados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
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
            <Label htmlFor="notes">Notas (Opacional)</Label>
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
