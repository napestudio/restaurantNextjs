"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, X } from "lucide-react";
import { createCashRegister } from "@/actions/CashRegister";
import { CashRegisterWithStatus } from "@/types/cash-register";
import { Sector } from "@/app/generated/prisma";

interface CreateCashRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  sectors: (Sector & { _count: { tables: number } })[];
  onCreated: (register: CashRegisterWithStatus) => void;
}

export function CreateCashRegisterDialog({
  open,
  onOpenChange,
  branchId,
  sectors,
  onCreated,
}: CreateCashRegisterDialogProps) {
  const [name, setName] = useState("");
  const [sectorIds, setSectorIds] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const result = await createCashRegister({
        name: name.trim(),
        branchId,
        sectorIds,
      });

      if (result.success && result.data) {
        // Create the full object with relations for the UI
        const selectedSectors = sectorIds
          .map((id) => sectors.find((s) => s.id === id))
          .filter(Boolean) as typeof sectors;

        const newRegister: CashRegisterWithStatus = {
          ...result.data,
          sectors: selectedSectors.map((s) => ({
            id: `temp-${s.id}`,
            cashRegisterId: result.data.id,
            sectorId: s.id,
            createdAt: new Date().toISOString(),
            sector: {
              id: s.id,
              name: s.name,
              color: s.color,
            },
          })),
          sessions: [],
          _count: { sessions: 0 },
          hasOpenSession: false,
        };
        onCreated(newRegister);
        resetForm();
      } else {
        setError(result.error || "Error al crear la caja");
      }
    } catch {
      setError("Error al crear la caja");
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    setName("");
    setSectorIds([]);
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Nueva Caja
          </DialogTitle>
          <DialogDescription>
            Crea una nueva caja registradora para tu sucursal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej., Caja Principal, Caja Barra"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Un nombre único para identificar esta caja.
            </p>
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
                      id={`sector-${sector.id}`}
                      checked={sectorIds.includes(sector.id)}
                      onCheckedChange={(checked) =>
                        handleSectorToggle(sector.id, checked === true)
                      }
                      disabled={isPending}
                    />
                    <label
                      htmlFor={`sector-${sector.id}`}
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
            <p className="text-xs text-muted-foreground">
              Selecciona los sectores que esta caja puede atender.
            </p>
          </div>

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
            onClick={handleCreate}
            className="bg-red-600 hover:bg-red-700"
            disabled={isPending || !name.trim()}
          >
            {isPending ? "Creando..." : "Crear Caja"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
