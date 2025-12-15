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
import { DollarSign, AlertTriangle } from "lucide-react";
import { closeCashRegisterSession } from "@/actions/CashRegister";
import { cn } from "@/lib/utils";

interface SerializedSession {
  id: string;
  cashRegisterId: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  openedBy: string;
  openingAmount: number;
  closedAt: string | null;
  closedBy: string | null;
  expectedCash: number | null;
  countedCash: number | null;
  variance: number | null;
  closingNotes: string | null;
  createdAt: string;
  updatedAt: string;
  cashRegister: {
    id: string;
    name: string;
  };
  _count: {
    movements: number;
  };
}

interface CloseRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SerializedSession;
  onClosed: (session: SerializedSession) => void;
}

export function CloseRegisterDialog({
  open,
  onOpenChange,
  session,
  onClosed,
}: CloseRegisterDialogProps) {
  const [countedCash, setCountedCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate expected cash (opening amount + sales - expenses)
  // For now, we just use opening amount since we don't have movements yet
  const expectedCash = session.openingAmount;

  // Calculate variance preview
  const countedAmount = parseFloat(countedCash) || 0;
  const variancePreview = countedAmount - expectedCash;

  const handleClose = async () => {
    const amount = parseFloat(countedCash);
    if (isNaN(amount) || amount < 0) {
      setError("Ingresa un monto válido");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      // TODO: Get actual user ID from session
      const userId = "system";

      const result = await closeCashRegisterSession({
        sessionId: session.id,
        countedCash: amount,
        closingNotes: closingNotes.trim() || undefined,
        userId,
      });

      if (result.success && result.data) {
        // Handle date serialization (could be Date or string from server)
        const closedAt = result.data.closedAt
          ? (result.data.closedAt instanceof Date
              ? result.data.closedAt.toISOString()
              : String(result.data.closedAt))
          : new Date().toISOString();
        const updatedAt = result.data.updatedAt instanceof Date
          ? result.data.updatedAt.toISOString()
          : String(result.data.updatedAt);

        const closedSession: SerializedSession = {
          ...session,
          status: "CLOSED",
          closedAt,
          closedBy: result.data.closedBy || userId,
          expectedCash: result.data.expectedCash ?? expectedCash,
          countedCash: result.data.countedCash ?? 0,
          variance: result.data.variance ?? 0,
          closingNotes: result.data.closingNotes,
          updatedAt,
        };

        onClosed(closedSession);
        resetForm();
      } else {
        setError(result.error || "Error al cerrar la caja");
      }
    } catch {
      setError("Error al cerrar la caja");
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    setCountedCash("");
    setClosingNotes("");
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  // Format date/time
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar Arqueo de Caja</DialogTitle>
          <DialogDescription>
            Cierra la sesión de caja y registra el efectivo contado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Session Info */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Caja:</span>
              <span className="font-medium">{session.cashRegister.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Apertura:</span>
              <span>{formatDateTime(session.openedAt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monto inicial:</span>
              <span className="font-medium">
                {formatCurrency(session.openingAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Movimientos:</span>
              <span>{session._count.movements}</span>
            </div>
          </div>

          {/* Expected vs Counted */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">
                Efectivo esperado (Sistema):
              </span>
              <span className="text-lg font-bold text-blue-900">
                {formatCurrency(expectedCash)}
              </span>
            </div>
          </div>

          {/* Counted Cash Input */}
          <div className="space-y-2">
            <Label htmlFor="counted">Efectivo contado *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                id="counted"
                type="number"
                min="0"
                step="0.01"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="0.00"
                className="pl-10"
                disabled={isPending}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Ingresa el efectivo real contado en la caja.
            </p>
          </div>

          {/* Variance Preview */}
          {countedCash && (
            <div
              className={cn(
                "p-4 rounded-lg border",
                variancePreview < 0
                  ? "bg-red-50 border-red-200"
                  : variancePreview > 0
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              )}
            >
              <div className="flex items-center gap-2">
                {variancePreview !== 0 && (
                  <AlertTriangle
                    className={cn(
                      "h-4 w-4",
                      variancePreview < 0 ? "text-red-600" : "text-green-600"
                    )}
                  />
                )}
                <span className="text-sm font-medium">Diferencia:</span>
                <span
                  className={cn(
                    "text-lg font-bold",
                    variancePreview < 0
                      ? "text-red-600"
                      : variancePreview > 0
                      ? "text-green-600"
                      : "text-gray-600"
                  )}
                >
                  {formatCurrency(variancePreview)}
                </span>
              </div>
              {variancePreview !== 0 && (
                <p
                  className={cn(
                    "text-xs mt-1",
                    variancePreview < 0 ? "text-red-600" : "text-green-600"
                  )}
                >
                  {variancePreview < 0
                    ? "Faltante de efectivo"
                    : "Sobrante de efectivo"}
                </p>
              )}
            </div>
          )}

          {/* Closing Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas de cierre (Opcional)</Label>
            <Textarea
              id="notes"
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Observaciones sobre el cierre..."
              rows={3}
              disabled={isPending}
            />
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
            onClick={handleClose}
            className="bg-red-600 hover:bg-red-700"
            disabled={isPending || !countedCash}
          >
            {isPending ? "Cerrando..." : "Cerrar Arqueo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
