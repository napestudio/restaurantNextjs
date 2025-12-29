"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, X } from "lucide-react";
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
  // Extract current sector IDs from the register
  const getCurrentSectorIds = () =>
    register.sectors?.map((s) => s.sectorId) || [];

  const [name, setName] = useState(register.name);
  const [sectorIds, setSectorIds] = useState<string[]>(getCurrentSectorIds());
  const [isActive, setIsActive] = useState(register.isActive);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when register changes
  useEffect(() => {
    setName(register.name);
    setSectorIds(getCurrentSectorIds());
    setIsActive(register.isActive);
    setError(null);
  }, [register]);

  const handleSectorToggle = (sectorId: string, checked: boolean) => {
    if (checked) {
      setSectorIds((prev) => [...prev, sectorId]);
    } else {
      setSectorIds((prev) => prev.filter((id) => id !== sectorId));
    }
  };

  const handleRemoveSector = (sectorId: string) => {
    setSectorIds((prev) => prev.filter((id) => id !== sectorId));
  };

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
        sectorIds,
        isActive,
      });

      if (result.success && result.data) {
        // Create the full object with relations for the UI
        const selectedSectors = sectorIds
          .map((id) => sectors.find((s) => s.id === id))
          .filter(Boolean) as typeof sectors;

        const updatedRegister: CashRegisterWithStatus = {
          ...register,
          ...result.data,
          sectors: selectedSectors.map((s) => ({
            id: `temp-${s.id}`,
            cashRegisterId: register.id,
            sectorId: s.id,
            createdAt: new Date().toISOString(),
            sector: {
              id: s.id,
              name: s.name,
              color: s.color,
            },
          })),
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

  // Check if sectors have changed
  const currentSectorIds = getCurrentSectorIds();
  const sectorsChanged =
    sectorIds.length !== currentSectorIds.length ||
    sectorIds.some((id) => !currentSectorIds.includes(id));

  const hasChanges =
    name !== register.name || sectorsChanged || isActive !== register.isActive;

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

          {/* Sectors (optional, multi-select) */}
          <div className="space-y-2">
            <Label>Sectores (Opcional)</Label>
            {/* Selected sectors as badges */}
            {sectorIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {sectorIds.map((id) => {
                  const sector = sectors.find((s) => s.id === id);
                  if (!sector) return null;
                  return (
                    <div
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: sector.color }}
                    >
                      {sector.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveSector(id)}
                        className="hover:bg-white/20 rounded-full p-0.5"
                        disabled={isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Sector checkboxes */}
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              {sectors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay sectores disponibles
                </p>
              ) : (
                sectors.map((sector) => (
                  <div key={sector.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-sector-${sector.id}`}
                      checked={sectorIds.includes(sector.id)}
                      onCheckedChange={(checked) =>
                        handleSectorToggle(sector.id, checked === true)
                      }
                      disabled={isPending}
                    />
                    <label
                      htmlFor={`edit-sector-${sector.id}`}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: sector.color }}
                      />
                      {sector.name}
                    </label>
                  </div>
                ))
              )}
            </div>
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
