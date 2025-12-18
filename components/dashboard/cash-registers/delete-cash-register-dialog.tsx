"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CreditCard } from "lucide-react";
import { deleteCashRegister } from "@/actions/CashRegister";
import { CashRegisterWithStatus } from "@/types/cash-register";

interface DeleteCashRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  register: CashRegisterWithStatus;
  onDeleted: (id: string) => void;
}

export function DeleteCashRegisterDialog({
  open,
  onOpenChange,
  register,
  onDeleted,
}: DeleteCashRegisterDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasHistoricalSessions = register._count.sessions > 0;

  const handleDelete = async () => {
    setIsPending(true);
    setError(null);

    try {
      const result = await deleteCashRegister(register.id);

      if (result.success) {
        onDeleted(register.id);
      } else {
        setError(result.error || "Error al eliminar la caja");
      }
    } catch {
      setError("Error al eliminar la caja");
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Caja
          </DialogTitle>
          <DialogDescription>
            {hasHistoricalSessions
              ? "Esta caja será desactivada porque tiene historial de sesiones."
              : "Esta acción eliminará la caja permanentemente."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Register info */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg mb-4">
            <div className="p-2 bg-gray-200 rounded-lg">
              <CreditCard className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium">{register.name}</p>
              {register.sectors && register.sectors.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Sectores: {register.sectors.map((s) => s.sector.name).join(", ")}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {register._count.sessions} sesiones históricas
              </p>
            </div>
          </div>

          {/* Warning message */}
          {hasHistoricalSessions ? (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              <p className="font-medium mb-1">Desactivación</p>
              <p>
                Esta caja tiene sesiones históricas y no puede eliminarse
                permanentemente. Se marcará como inactiva y no podrá abrir nuevas
                sesiones.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <p className="font-medium mb-1">Eliminación permanente</p>
              <p>
                Esta caja no tiene sesiones históricas y será eliminada
                permanentemente. Esta acción no se puede deshacer.
              </p>
            </div>
          )}

          {/* Open session warning */}
          {register.hasOpenSession && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <p className="font-medium">No se puede eliminar</p>
              <p>
                Esta caja tiene una sesión abierta. Cierra la sesión antes de
                eliminarla.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
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
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || register.hasOpenSession}
          >
            {isPending
              ? "Procesando..."
              : hasHistoricalSessions
              ? "Desactivar Caja"
              : "Eliminar Caja"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
