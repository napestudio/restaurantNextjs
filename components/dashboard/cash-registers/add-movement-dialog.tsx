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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, DollarSign } from "lucide-react";
import { addManualMovement } from "@/actions/CashRegister";
import {
  CashRegisterWithStatus,
  PAYMENT_METHOD_LABELS,
  MOVEMENT_TYPE_LABELS,
} from "@/types/cash-register";

interface AddMovementDialogProps {
  cashRegisters: CashRegisterWithStatus[];
  onMovementAdded?: () => void;
}

export function AddMovementDialog({
  cashRegisters,
  onMovementAdded,
}: AddMovementDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get only registers with open sessions
  const registersWithOpenSessions = cashRegisters.filter(
    (r) => r.hasOpenSession && r.isActive
  );

  // Get the session ID for the selected register
  const getSessionId = () => {
    const register = registersWithOpenSessions.find(
      (r) => r.id === cashRegisterId
    );
    return register?.sessions[0]?.id;
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

    setIsPending(true);
    setError(null);

    try {
      // TODO: Get actual user ID from session
      const userId = "system";

      const result = await addManualMovement({
        sessionId,
        type,
        paymentMethod: paymentMethod as "CASH" | "CARD_DEBIT" | "CARD_CREDIT" | "ACCOUNT" | "TRANSFER",
        amount: parsedAmount,
        description: description.trim() || undefined,
        userId,
      });

      if (result.success) {
        resetForm();
        setOpen(false);
        onMovementAdded?.();
      } else {
        setError(result.error || "Error al agregar el movimiento");
      }
    } catch {
      setError("Error al agregar el movimiento");
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setType("INCOME");
    setPaymentMethod("CASH");
    setCashRegisterId("");
    setDescription("");
    setError(null);
  };

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
            Registra un ingreso o egreso manual en la caja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-10"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Movement Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as "INCOME" | "EXPENSE")}
              disabled={isPending}
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
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Medio de Pago *</Label>
            <Select
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar medio de pago" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
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
              disabled={isPending}
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
            <Label htmlFor="description">Comentario (Opcional)</Label>
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-red-600 hover:bg-red-700"
            disabled={isPending || !amount || !cashRegisterId}
          >
            {isPending ? "Guardando..." : "Agregar Movimiento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
