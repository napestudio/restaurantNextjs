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
import { Calendar, Clock, DollarSign } from "lucide-react";
import { openCashRegisterSession } from "@/actions/CashRegister";
import { CashRegisterWithStatus } from "@/types/cash-register";

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

interface OpenRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashRegisters: CashRegisterWithStatus[];
  onOpened: (session: SerializedSession) => void;
}

export function OpenRegisterDialog({
  open,
  onOpenChange,
  cashRegisters,
  onOpened,
}: OpenRegisterDialogProps) {
  const now = new Date();
  const [date, setDate] = useState(now.toISOString().split("T")[0]);
  const [time, setTime] = useState(
    now.toTimeString().split(" ")[0].substring(0, 8)
  );
  const [openingAmount, setOpeningAmount] = useState("");
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    if (!cashRegisterId) {
      setError("Selecciona una caja");
      return;
    }

    const amount = parseFloat(openingAmount) || 0;
    if (amount < 0) {
      setError("El monto inicial no puede ser negativo");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      // TODO: Get actual user ID from session
      const userId = "system";

      const result = await openCashRegisterSession({
        cashRegisterId,
        openingAmount: amount,
        userId,
      });

      if (result.success && result.data) {
        const selectedRegister = cashRegisters.find(
          (r) => r.id === cashRegisterId
        );

        // Handle date serialization (could be Date or string from server)
        const openedAt = result.data.openedAt instanceof Date
          ? result.data.openedAt.toISOString()
          : String(result.data.openedAt);
        const createdAt = result.data.createdAt instanceof Date
          ? result.data.createdAt.toISOString()
          : String(result.data.createdAt);
        const updatedAt = result.data.updatedAt instanceof Date
          ? result.data.updatedAt.toISOString()
          : String(result.data.updatedAt);

        // Create serialized session for client
        const newSession: SerializedSession = {
          id: result.data.id,
          cashRegisterId: result.data.cashRegisterId,
          status: "OPEN",
          openedAt,
          openedBy: result.data.openedBy,
          openingAmount: result.data.openingAmount,
          closedAt: null,
          closedBy: null,
          expectedCash: null,
          countedCash: null,
          variance: null,
          closingNotes: null,
          createdAt,
          updatedAt,
          cashRegister: {
            id: cashRegisterId,
            name: selectedRegister?.name || "Caja",
          },
          _count: {
            movements: 0,
          },
        };

        onOpened(newSession);
        resetForm();
      } else {
        setError(result.error || "Error al abrir la caja");
      }
    } catch {
      setError("Error al abrir la caja");
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    const now = new Date();
    setDate(now.toISOString().split("T")[0]);
    setTime(now.toTimeString().split(" ")[0].substring(0, 8));
    setOpeningAmount("");
    setCashRegisterId("");
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    } else {
      // Reset to current time when opening
      const now = new Date();
      setDate(now.toISOString().split("T")[0]);
      setTime(now.toTimeString().split(" ")[0].substring(0, 8));
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Arqueo de Caja</DialogTitle>
          <DialogDescription>
            Abre una nueva sesión de caja para registrar los movimientos del
            día.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Hora de apertura *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10"
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">&nbsp;</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="time"
                  type="time"
                  step="1"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-10"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          {/* Opening Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto Inicial *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="0.00"
                className="pl-10"
                disabled={isPending}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Efectivo inicial en la caja al momento de abrir.
            </p>
          </div>

          {/* Cash Register Selection */}
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
                {cashRegisters.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No hay cajas disponibles
                  </SelectItem>
                ) : (
                  cashRegisters.map((register) => (
                    <SelectItem key={register.id} value={register.id}>
                      {register.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {cashRegisters.length === 0 && (
              <p className="text-xs text-yellow-600">
                Todas las cajas tienen sesiones abiertas o no hay cajas
                configuradas.
              </p>
            )}
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
            onClick={handleOpen}
            className="bg-red-600 hover:bg-red-700"
            disabled={isPending || !cashRegisterId}
          >
            {isPending ? "Abriendo..." : "Iniciar Arqueo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
