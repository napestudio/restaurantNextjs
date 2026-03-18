"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { reopenOrder } from "@/actions/Order";
import { formatCurrency } from "@/lib/currency";

const paymentMethodLabels: Record<string, string> = {
  CASH: "Efectivo",
  CARD_DEBIT: "Tarjeta de Débito",
  CARD_CREDIT: "Tarjeta de Crédito",
  ACCOUNT: "Cuenta",
  TRANSFER: "Transferencia",
  PAYMENT_LINK: "Link de pago",
  QR_CODE: "QR",
};

interface ReopenOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    publicCode: string;
    cashMovements?: Array<{
      paymentMethod: string;
      amount: number;
    }>;
  };
  onSuccess: () => void;
}

export function ReopenOrderDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: ReopenOrderDialogProps) {
  const [notes, setNotes] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReopen = async () => {
    setIsPending(true);
    setError(null);

    try {
      const result = await reopenOrder({
        orderId: order.id,
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        onSuccess();
        resetForm();
      } else {
        setError(result.error ?? "Error al reabrir la orden");
      }
    } catch {
      setError("Error al reabrir la orden");
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    setNotes("");
    setError(null);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const movements = order.cashMovements ?? [];
  const total = movements.reduce((sum, m) => sum + m.amount, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reabrir Orden {order.publicCode}</DialogTitle>
          <DialogDescription>
            Esta acción reabre la orden para que puedas agregar productos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Se anularán los movimientos de caja originales. Al cerrar la
              orden nuevamente, deberás registrar el pago completo.
            </p>
          </div>

          {/* Original payments summary */}
          {movements.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
              <p className="text-muted-foreground font-medium text-xs uppercase tracking-wide">
                Pagos que se anularán
              </p>
              {movements.map((m, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {paymentMethodLabels[m.paymentMethod] ?? m.paymentMethod}
                  </span>
                  <span className="font-medium">{formatCurrency(m.amount)}</span>
                </div>
              ))}
              {movements.length > 1 && (
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="reopenNotes">Motivo de reapertura (opcional)</Label>
            <Textarea
              id="reopenNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Cliente quiso agregar un producto..."
              rows={3}
              disabled={isPending}
            />
          </div>

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
            onClick={handleReopen}
            className="bg-amber-600 hover:bg-amber-700"
            disabled={isPending}
          >
            {isPending ? "Reabriendo..." : "Reabrir Orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
