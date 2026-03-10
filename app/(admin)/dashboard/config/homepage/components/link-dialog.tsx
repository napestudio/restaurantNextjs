"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { HomePageLinkType } from "@/app/generated/prisma";
import type { SerializedHomePageLink } from "@/actions/HomePageLinks";
import {
  createHomePageLink,
  updateHomePageLink,
} from "@/actions/HomePageLinks";

type Menu = {
  id: string;
  name: string;
  slug: string;
};

type TimeSlot = {
  id: string;
  name: string;
};

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  editingLink: SerializedHomePageLink | null;
  availableMenus: Menu[];
  availableTimeSlots: TimeSlot[];
  onLinkCreated: (link: SerializedHomePageLink) => void;
  onLinkUpdated: (link: SerializedHomePageLink) => void;
}

export function LinkDialog({
  open,
  onOpenChange,
  branchId,
  editingLink,
  availableMenus,
  availableTimeSlots,
  onLinkCreated,
  onLinkUpdated,
}: LinkDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState<HomePageLinkType>(
    editingLink?.type || "RESERVATION",
  );
  const [label, setLabel] = useState(editingLink?.label || "");
  const [menuId, setMenuId] = useState(editingLink?.menuId || "__none__");
  const [timeSlotId, setTimeSlotId] = useState(
    editingLink?.timeSlotId || "__none__",
  );
  const [customUrl, setCustomUrl] = useState(editingLink?.customUrl || "");
  const [isActive, setIsActive] = useState(editingLink?.isActive ?? true);

  // Reset form when dialog opens/closes or editingLink changes
  useEffect(() => {
    if (open) {
      if (editingLink) {
        setType(editingLink.type);
        setLabel(editingLink.label);
        setMenuId(editingLink.menuId || "__none__");
        setTimeSlotId(editingLink.timeSlotId || "__none__");
        setCustomUrl(editingLink.customUrl || "");
        setIsActive(editingLink.isActive);
      } else {
        setType("RESERVATION");
        setLabel("");
        setMenuId("__none__");
        setTimeSlotId("__none__");
        setCustomUrl("");
        setIsActive(true);
      }
    }
  }, [open, editingLink]);

  const handleSave = () => {
    if (!label.trim()) {
      toast({
        title: "Error de validación",
        description: "El texto del botón es requerido",
        variant: "destructive",
      });
      return;
    }

    if (type === "MENU" && menuId === "__none__") {
      toast({
        title: "Error de validación",
        description: "Debes seleccionar un menú",
        variant: "destructive",
      });
      return;
    }

    if (type === "TIMESLOT" && timeSlotId === "__none__") {
      toast({
        title: "Error de validación",
        description: "Debes seleccionar un horario",
        variant: "destructive",
      });
      return;
    }

    if (type === "CUSTOM" && !customUrl.trim()) {
      toast({
        title: "Error de validación",
        description: "La URL personalizada es requerida",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const data = {
        type,
        label,
        menuId: type === "MENU" && menuId !== "__none__" ? menuId : null,
        timeSlotId:
          type === "TIMESLOT" && timeSlotId !== "__none__" ? timeSlotId : null,
        customUrl: type === "CUSTOM" ? customUrl : null,
        isActive,
      };

      const result = editingLink
        ? await updateHomePageLink(editingLink.id, data)
        : await createHomePageLink({ ...data, branchId });

      if (result.success && result.data) {
        toast({
          title: editingLink ? "Enlace actualizado" : "Enlace creado",
          description: `El enlace se ${editingLink ? "actualizó" : "creó"} correctamente`,
        });

        // Optimistic update
        if (editingLink) {
          onLinkUpdated(result.data);
        } else {
          onLinkCreated(result.data);
        }

        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al guardar enlace",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingLink ? "Editar Enlace" : "Agregar Enlace"}
          </DialogTitle>
          <DialogDescription>
            Configura un enlace para la página de inicio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Link Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Enlace</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as HomePageLinkType)}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MENU">Menú</SelectItem>
                {/* <SelectItem value="TIMESLOT">Horario de Reserva</SelectItem> */}
                <SelectItem value="RESERVATION">Reservas</SelectItem>
                <SelectItem value="PEDIDOS">Pedidos</SelectItem>
                <SelectItem value="CUSTOM">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Texto del Botón</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ej: Reservar Mesa, Ver Menú"
            />
          </div>

          {/* Conditional: Menu Selection */}
          {type === "MENU" && (
            <div className="space-y-2">
              <Label htmlFor="menu">Menú</Label>
              <Select value={menuId} onValueChange={setMenuId}>
                <SelectTrigger id="menu">
                  <SelectValue placeholder="Seleccionar menú" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccionar...</SelectItem>
                  {availableMenus.map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Conditional: TimeSlot Selection */}
          {type === "TIMESLOT" && (
            <div className="space-y-2">
              <Label htmlFor="timeSlot">Horario</Label>
              <Select value={timeSlotId} onValueChange={setTimeSlotId}>
                <SelectTrigger id="timeSlot">
                  <SelectValue placeholder="Seleccionar horario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccionar...</SelectItem>
                  {availableTimeSlots.map((slot) => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {slot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Conditional: Custom URL */}
          {type === "CUSTOM" && (
            <div className="space-y-2">
              <Label htmlFor="customUrl">URL Personalizada</Label>
              <Input
                id="customUrl"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://ejemplo.com o /ruta-interna"
              />
              <p className="text-xs text-gray-500">
                Puede ser una URL externa (https://...) o una ruta interna
                (/path)
              </p>
            </div>
          )}

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Activo</Label>
              <p className="text-sm text-gray-500">
                El enlace se mostrará en la página de inicio
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Guardando..." : editingLink ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
