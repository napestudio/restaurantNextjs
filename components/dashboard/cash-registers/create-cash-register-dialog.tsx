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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard } from "lucide-react";
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
  const [sectorId, setSectorId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        sectorId: sectorId || null,
      });

      if (result.success && result.data) {
        // Create the full object with relations for the UI
        const newRegister: CashRegisterWithStatus = {
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
    setSectorId(null);
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

          {/* Sector (optional) */}
          <div className="space-y-2">
            <Label htmlFor="sector">Sector (Opcional)</Label>
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
            <p className="text-xs text-muted-foreground">
              Asigna la caja a un sector del plano (para futura integración
              visual).
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
