"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DeliveryWindow,
  DAYS,
  validateDeliveryWindow,
} from "../lib/delivery-windows";
import { useToast } from "@/hooks/use-toast";

interface DeliveryWindowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (window: DeliveryWindow) => void;
  editingWindow?: DeliveryWindow | null;
}

export function DeliveryWindowDialog({
  open,
  onOpenChange,
  onSave,
  editingWindow,
}: DeliveryWindowDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [maxOrders, setMaxOrders] = useState("10");
  const [isActive, setIsActive] = useState(true);

  // Reset form when dialog opens/closes or editing window changes
  useEffect(() => {
    if (open && editingWindow) {
      setName(editingWindow.name);
      setStartTime(editingWindow.startTime);
      setEndTime(editingWindow.endTime);
      setDaysOfWeek(editingWindow.daysOfWeek);
      setMaxOrders(editingWindow.maxOrders.toString());
      setIsActive(editingWindow.isActive);
    } else if (open && !editingWindow) {
      // Reset for new window
      setName("");
      setStartTime("");
      setEndTime("");
      setDaysOfWeek([]);
      setMaxOrders("10");
      setIsActive(true);
    }
  }, [open, editingWindow]);

  const toggleDay = (day: string) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const selectAllDays = () => {
    setDaysOfWeek(DAYS.map((d) => d.value));
  };

  const selectWeekdays = () => {
    setDaysOfWeek(["monday", "tuesday", "wednesday", "thursday", "friday"]);
  };

  const selectWeekend = () => {
    setDaysOfWeek(["saturday", "sunday"]);
  };

  const handleSave = () => {
    const window: DeliveryWindow = {
      id: editingWindow?.id,
      name,
      startTime,
      endTime,
      daysOfWeek,
      maxOrders: parseInt(maxOrders) || 10,
      isActive,
    };

    const validation = validateDeliveryWindow(window);
    if (!validation.valid) {
      toast({
        title: "Validación fallida",
        description: validation.errors[0],
        variant: "destructive",
      });
      return;
    }

    onSave(window);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingWindow ? "Editar Horario" : "Agregar Horario de Delivery"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Horario</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Almuerzo, Cena, Fin de semana"
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora de Inicio</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Hora de Fin</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Days of Week */}
          <div className="space-y-3">
            <Label>Días de la Semana</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllDays}
              >
                Todos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectWeekdays}
              >
                Lun-Vie
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectWeekend}
              >
                Sáb-Dom
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`
                    py-2 px-1 rounded-lg border-2 text-center font-medium transition-colors
                    ${
                      daysOfWeek.includes(day.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-gray-200 hover:border-gray-300"
                    }
                  `}
                >
                  <div className="text-xs">{day.short}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Max Orders */}
          <div className="space-y-2">
            <Label htmlFor="maxOrders">Máximo de Órdenes</Label>
            <Input
              id="maxOrders"
              type="number"
              min="1"
              value={maxOrders}
              onChange={(e) => setMaxOrders(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Cantidad máxima de órdenes que se pueden aceptar en esta ventana horaria
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Horario Activo</Label>
              <p className="text-sm text-gray-500">
                Permite recibir pedidos en este horario
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {editingWindow ? "Actualizar" : "Agregar"} Horario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
