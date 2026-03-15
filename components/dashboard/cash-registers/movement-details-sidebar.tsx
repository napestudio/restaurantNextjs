"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  User,
  ArrowLeftRight,
} from "lucide-react";
import { updateManualMovement } from "@/actions/CashRegister";
import {
  CashRegisterWithStatus,
  PAYMENT_METHODS,
  MOVEMENT_TYPE_LABELS,
} from "@/types/cash-register";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface Movement {
  id: string;
  type: "INCOME" | "EXPENSE" | "CORRECTION";
  paymentMethod: string;
  amount: number;
  description: string | null;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  sessionId: string;
  cashRegister: {
    id: string;
    name: string;
  };
}

interface MovementDetailsSidebarProps {
  open: boolean;
  onClose: () => void;
  movement: Movement | null;
  cashRegisters: CashRegisterWithStatus[];
  onMovementUpdated: () => void;
  userRole: string;
}

export function MovementDetailsSidebar({
  open,
  onClose,
  movement,
  cashRegisters,
  onMovementUpdated,
  userRole,
}: MovementDetailsSidebarProps) {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit =
    userRole === "MANAGER" ||
    userRole === "ADMIN" ||
    userRole === "SUPERADMIN";

  const registersWithOpenSessions = cashRegisters.filter(
    (r) => r.hasOpenSession && r.isActive
  );

  // Pre-fill form when movement changes
  useEffect(() => {
    if (movement) {
      setPaymentMethod(movement.paymentMethod);
      setCashRegisterId(movement.cashRegister.id);
      setDescription(movement.description ?? "");
      setError(null);
    }
  }, [movement]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setError(null);
      setIsPending(false);
    }
  }, [open]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSave = async () => {
    if (!movement) return;

    setIsPending(true);
    setError(null);

    try {
      const result = await updateManualMovement({
        movementId: movement.id,
        paymentMethod: paymentMethod as
          | "CASH"
          | "CARD_DEBIT"
          | "CARD_CREDIT"
          | "ACCOUNT"
          | "TRANSFER"
          | "PAYMENT_LINK"
          | "QR_CODE",
        cashRegisterId,
        description: description.trim() || undefined,
      });

      if (result.success) {
        onMovementUpdated();
        onClose();
      } else {
        setError(result.error ?? "Error al actualizar el movimiento");
      }
    } catch {
      setError("Error al actualizar el movimiento");
    } finally {
      setIsPending(false);
    }
  };

  const isIncome = movement?.type === "INCOME";
  const isCorrection = movement?.type === "CORRECTION";
  const isPositiveCorrection = isCorrection && (movement?.amount ?? 0) >= 0;

  const amountColor = isCorrection
    ? isPositiveCorrection
      ? "text-green-600"
      : "text-red-600"
    : isIncome
      ? "text-green-600"
      : "text-red-600";

  const amountPrefix = isCorrection
    ? isPositiveCorrection
      ? "+"
      : ""
    : isIncome
      ? "+"
      : "-";

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-112.5 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0">
          <div className="flex items-center gap-2">
            {isCorrection ? (
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ArrowLeftRight className="h-5 w-5 text-yellow-600" />
              </div>
            ) : isIncome ? (
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            ) : (
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            )}
            <h2 className="font-semibold text-base">Detalle del Movimiento</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        {movement && (
          <div className="flex-1 overflow-y-auto">
            {/* Amount */}
            <div className="text-center py-6 bg-gray-50 border-b">
              <p className="text-sm text-muted-foreground mb-1">
                {MOVEMENT_TYPE_LABELS[movement.type]}
              </p>
              <p className={cn("text-3xl font-bold", amountColor)}>
                {amountPrefix}
                {formatCurrency(Math.abs(movement.amount))}
              </p>
            </div>

            {/* Read-only info */}
            <div className="px-4 py-4 space-y-3 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="font-medium capitalize text-sm">
                    {formatDate(movement.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hora</p>
                  <p className="font-medium text-sm">
                    {formatTime(movement.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Registrado por</p>
                  <p className="font-medium text-sm">
                    {movement.createdByName || "Sistema"}
                  </p>
                </div>
              </div>
            </div>

            {/* Edit fields */}
            {canEdit ? (
              <div className="px-4 py-4 space-y-4">
                <p className="text-sm font-medium text-gray-700">
                  Editar movimiento
                </p>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <Label htmlFor="paymentMethod">Medio de Pago</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    disabled={isPending}
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Seleccionar medio de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cash Register */}
                <div className="space-y-1.5">
                  <Label htmlFor="cashRegister">Caja</Label>
                  <Select
                    value={cashRegisterId}
                    onValueChange={setCashRegisterId}
                    disabled={isPending}
                  >
                    <SelectTrigger id="cashRegister">
                      <SelectValue placeholder="Seleccionar caja" />
                    </SelectTrigger>
                    <SelectContent>
                      {registersWithOpenSessions.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No hay cajas abiertas
                        </SelectItem>
                      ) : (
                        registersWithOpenSessions.map((register) => (
                          <SelectItem key={register.id} value={register.id}>
                            {register.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {registersWithOpenSessions.length === 0 && (
                    <p className="text-xs text-yellow-600">
                      No hay cajas abiertas disponibles.
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripción del movimiento..."
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
            ) : (
              /* Read-only description for non-editors */
              movement.description && (
                <div className="px-4 py-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Descripción
                  </p>
                  <p className="text-sm">{movement.description}</p>
                </div>
              )
            )}
          </div>
        )}

        {/* Footer */}
        {movement && canEdit && (
          <div className="border-t px-4 py-3 flex gap-2 bg-white">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !cashRegisterId || !paymentMethod}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
