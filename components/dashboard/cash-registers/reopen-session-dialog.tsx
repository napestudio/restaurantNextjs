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
import { reopenCashRegisterSession } from "@/actions/CashRegister";

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
  reopenedAt: string | null;
  reopenedBy: string | null;
  reopenNotes: string | null;
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

interface ReopenSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SerializedSession;
  onReopened: (session: SerializedSession) => void;
}

export function ReopenSessionDialog({
  open,
  onOpenChange,
  session,
  onReopened,
}: ReopenSessionDialogProps) {
  const [reopenNotes, setReopenNotes] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleReopen = async () => {
    setIsPending(true);
    setError(null);

    try {
      const result = await reopenCashRegisterSession({
        sessionId: session.id,
        notes: reopenNotes.trim() || undefined,
      });

      if (result.success && result.data) {
        const now = new Date().toISOString();
        const reopenedSession: SerializedSession = {
          ...session,
          status: "OPEN",
          closedAt: null,
          closedBy: null,
          expectedCash: null,
          countedCash: null,
          variance: null,
          closingNotes: null,
          reopenedAt: now,
          reopenedBy: "system",
          reopenNotes: reopenNotes.trim() || null,
          updatedAt: now,
        };
        onReopened(reopenedSession);
        resetForm();
      } else {
        setError(result.error || "Error al reabrir la sesión");
      }
    } catch {
      setError("Error al reabrir la sesión");
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    setReopenNotes("");
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reabrir Sesión de Caja</DialogTitle>
          <DialogDescription>
            Esta acción reabrirá la sesión cerrada y borrará los datos del
            cierre. Queda registrada para auditoría.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Warning banner */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Se borrarán los datos del cierre (efectivo contado, diferencia,
              notas). Los movimientos de caja no se modifican.
            </p>
          </div>

          {/* Session info */}
          <div className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Caja:</span>
              <span className="font-medium">{session.cashRegister.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Apertura:</span>
              <span>{formatDateTime(session.openedAt)}</span>
            </div>
            {session.closedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cierre:</span>
                <span>{formatDateTime(session.closedAt)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Movimientos:</span>
              <span>{session._count.movements}</span>
            </div>
          </div>

          {/* Reopen notes */}
          <div className="space-y-1.5">
            <Label htmlFor="reopenNotes">Motivo de reapertura (opcional)</Label>
            <Textarea
              id="reopenNotes"
              value={reopenNotes}
              onChange={(e) => setReopenNotes(e.target.value)}
              placeholder="Ej: Faltó registrar un movimiento..."
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
            className="bg-red-600 hover:bg-red-700"
            disabled={isPending}
          >
            {isPending ? "Reabriendo..." : "Reabrir Sesión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
