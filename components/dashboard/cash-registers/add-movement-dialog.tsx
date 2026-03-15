"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, DollarSign, Minus } from "lucide-react";
import { addManualMovement } from "@/actions/CashRegister";
import {
  CashRegisterWithStatus,
  PAYMENT_METHODS,
  MOVEMENT_TYPE_LABELS,
} from "@/types/cash-register";
import { cn } from "@/lib/utils";

export interface OptimisticMovement {
  id: string;
  type: "INCOME" | "EXPENSE" | "CORRECTION";
  paymentMethod: string;
  amount: number;
  description: string | null;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  sessionId: string;
  cashRegister: { id: string; name: string };
  isOptimistic: true;
}

interface AddMovementDialogProps {
  cashRegisters: CashRegisterWithStatus[];
  onMovementAdded?: (movement: OptimisticMovement) => void;
  onMovementFailed?: (tempId: string) => void;
  onMovementConfirmed?: (tempId: string, realMovement: OptimisticMovement) => void;
}

export function AddMovementDialog({
  cashRegisters,
  onMovementAdded,
  onMovementFailed,
  onMovementConfirmed,
}: AddMovementDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE" | "CORRECTION">("INCOME");
  const [correctionSign, setCorrectionSign] = useState<"positive" | "negative">("positive");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Get only registers with open sessions
  const registersWithOpenSessions = cashRegisters.filter(
    (r) => r.hasOpenSession && r.isActive
  );

  // Default to the first open register when dialog opens
  useEffect(() => {
    if (open && !cashRegisterId && registersWithOpenSessions.length > 0) {
      setCashRegisterId(registersWithOpenSessions[0].id);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get the session ID for the selected register
  const getSessionId = () => {
    const register = registersWithOpenSessions.find(
      (r) => r.id === cashRegisterId
    );
    return register?.sessions[0]?.id;
  };

  const getSelectedRegisterName = () => {
    const register = registersWithOpenSessions.find(
      (r) => r.id === cashRegisterId
    );
    return register?.name ?? cashRegisterId;
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Ingresa un monto válido mayor a 0");
      return;
    }

    if (!cashRegisterId) {
      setError("Selecciona una caja");
      return;
    }

    const sessionId = getSessionId();
    if (!sessionId) {
      setError("La caja seleccionada no tiene una sesión abierta");
      return;
    }

    if (type === "CORRECTION" && !description.trim()) {
      setError("La descripción es requerida para correcciones");
      return;
    }

    const finalAmount =
      type === "CORRECTION" && correctionSign === "negative"
        ? -parsedAmount
        : parsedAmount;

    // Capture all values before resetting the form
    const capturedType = type;
    const capturedPaymentMethod = paymentMethod;
    const capturedCashRegisterId = cashRegisterId;
    const capturedDescription = description.trim();
    const capturedRegisterName = getSelectedRegisterName();

    const tempId = crypto.randomUUID();
    const optimisticMovement: OptimisticMovement = {
      id: tempId,
      type: capturedType,
      paymentMethod: capturedPaymentMethod,
      amount: finalAmount,
      description: capturedDescription || null,
      createdAt: new Date().toISOString(),
      createdBy: "",
      createdByName: "Tú",
      sessionId,
      cashRegister: { id: capturedCashRegisterId, name: capturedRegisterName },
      isOptimistic: true,
    };

    // Optimistic update — update UI immediately and close dialog
    onMovementAdded?.(optimisticMovement);
    resetForm();
    setOpen(false);

    // Run server action in background
    try {
      const result = await addManualMovement({
        sessionId,
        type: capturedType,
        paymentMethod: capturedPaymentMethod as
          | "CASH"
          | "CARD_DEBIT"
          | "CARD_CREDIT"
          | "ACCOUNT"
          | "TRANSFER"
          | "PAYMENT_LINK"
          | "QR_CODE",
        amount: finalAmount,
        description: capturedDescription || undefined,
      });

      if (result.success && result.data) {
        const real = result.data as unknown as {
          id: string;
          createdAt: string;
          createdBy: string;
        };
        onMovementConfirmed?.(tempId, {
          ...optimisticMovement,
          id: real.id,
          createdAt: real.createdAt,
          createdBy: real.createdBy,
          isOptimistic: true,
        });
      } else {
        onMovementFailed?.(tempId);
      }
    } catch {
      onMovementFailed?.(tempId);
    }
  };

  const resetForm = () => {
    setAmount("");
    setType("INCOME");
    setCorrectionSign("positive");
    setPaymentMethod("CASH");
    setCashRegisterId("");
    setDescription("");
    setError(null);
  };

  const isSubmitDisabled = !amount || !cashRegisterId;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setOpen(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={registersWithOpenSessions.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo movimiento de caja
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento de Caja</DialogTitle>
          <DialogDescription>
            Registra un ingreso, egreso o corrección manual en la caja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <NumberInput
                id="amount"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-10"
                              />
            </div>
          </div>

          {/* Movement Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select
              value={type}
              onValueChange={(value) =>
                setType(value as "INCOME" | "EXPENSE" | "CORRECTION")
              }
                          >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">
                  {MOVEMENT_TYPE_LABELS.INCOME}
                </SelectItem>
                <SelectItem value="EXPENSE">
                  {MOVEMENT_TYPE_LABELS.EXPENSE}
                </SelectItem>
                <SelectItem value="CORRECTION">
                  {MOVEMENT_TYPE_LABELS.CORRECTION}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Correction direction toggle */}
          {type === "CORRECTION" && (
            <div className="space-y-2">
              <Label>Dirección *</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectionSign("positive")}
                                    className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium transition-colors",
                    correctionSign === "positive"
                      ? "bg-green-100 border-green-400 text-green-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Positivo
                </button>
                <button
                  type="button"
                  onClick={() => setCorrectionSign("negative")}
                                    className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium transition-colors",
                    correctionSign === "negative"
                      ? "bg-red-100 border-red-400 text-red-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Minus className="h-3.5 w-3.5" />
                  Negativo
                </button>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Medio de Pago *</Label>
            <Select
              value={paymentMethod}
              onValueChange={setPaymentMethod}
                          >
              <SelectTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="register">Caja *</Label>
            <Select
              value={cashRegisterId}
              onValueChange={setCashRegisterId}
                          >
              <SelectTrigger>
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
                Debes abrir una caja antes de agregar movimientos.
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Comentario {type === "CORRECTION" ? "*" : "(Opcional)"}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === "CORRECTION"
                  ? "Describe la razón de la corrección..."
                  : "Descripción del movimiento..."
              }
              rows={3}
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
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-red-600 hover:bg-red-700"
            disabled={isSubmitDisabled}
          >
            Agregar Movimiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
