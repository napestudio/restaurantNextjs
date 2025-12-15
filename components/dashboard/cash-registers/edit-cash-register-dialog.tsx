"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { updateCashRegister } from "@/actions/CashRegister";
import { CashRegisterWithStatus } from "@/types/cash-register";
import { Sector } from "@/app/generated/prisma";

interface EditCashRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  register: CashRegisterWithStatus;
  sectors: (Sector & { _count: { tables: number } })[];
  onUpdated: (register: CashRegisterWithStatus) => void;
}

export function EditCashRegisterDialog({
  open,
  onOpenChange,
  register,
  sectors,
  onUpdated,
}: EditCashRegisterDialogProps) {
  const [name, setName] = useState(register.name);
  const [sectorId, setSectorId] = useState<string | null>(register.sectorId);
  const [isActive, setIsActive] = useState(register.isActive);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when register changes
  useEffect(() => {
    setName(register.name);
    setSectorId(register.sectorId);
    setIsActive(register.isActive);
    setError(null);
  }, [register]);

  const handleUpdate = async () => {
    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const result = await updateCashRegister(register.id, {
        name: name.trim(),
        sectorId: sectorId,
        isActive,
      });

      if (result.success && result.data) {
        // Create the full object with relations for the UI
        const updatedRegister: CashRegisterWithStatus = {
          ...register,
          ...result.data,
          sector: sectorId
            ? sectors.find((s) => s.id === sectorId)
              ? {
                  id: sectorId,
                  name: sectors.find((s) => s.id === sectorId)!.name,
                  color: sectors.find((s) => s.id === sectorId)!.color,
                }
              : null
            : null,
        };
        onUpdated(updatedRegister);
      } else {
        setError(result.error || "Error al actualizar la caja");
      }
    } catch {
      setError("Error al actualizar la caja");
    } finally {
      setIsPending(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
    }
    onOpenChange(open);
  };

  const hasChanges =
    name !== register.name ||
    sectorId !== register.sectorId ||
    isActive !== register.isActive;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Caja
          </DialogTitle>
          <DialogDescription>
            Modifica la configuración de la caja registradora.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej., Caja Principal, Caja Barra"
              disabled={isPending}
            />
          </div>

          {/* Sector (optional) */}
          <div className="space-y-2">
            <Label htmlFor="edit-sector">Sector (Opcional)</Label>
            <Select
              value={sectorId || "none"}
              onValueChange={(value) =>
                setSectorId(value === "none" ? null : value)
              }
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin sector asignado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin sector asignado</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector.id} value={sector.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: sector.color }}
                      />
                      {sector.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="edit-active" className="text-sm font-medium">
                Caja Activa
              </Label>
              <p className="text-xs text-muted-foreground">
                Las cajas inactivas no pueden abrir nuevas sesiones.
              </p>
            </div>
            <Switch
              id="edit-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isPending || register.hasOpenSession}
            />
          </div>

          {register.hasOpenSession && !isActive && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              No puedes desactivar una caja con una sesión abierta.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpdate}
            className="bg-red-600 hover:bg-red-700"
            disabled={isPending || !name.trim() || !hasChanges}
          >
            {isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
