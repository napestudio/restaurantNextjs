"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import { Settings, Plus, X } from "lucide-react";
import {
  closeTableWithPayment,
  type PaymentMethodExtended,
  type PaymentEntry,
} from "@/actions/Order";
import { getOpenCashRegistersForBranch } from "@/actions/CashRegister";

interface OrderItem {
  id: string;
  itemName?: string;
  quantity: number;
  price: number;
  originalPrice: number | null;
  product: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
}

interface Order {
  id: string;
  publicCode: string;
  partySize: number | null;
  discountPercentage: number;
  items: OrderItem[];
}

interface CashRegisterWithSession {
  id: string;
  name: string;
  sector: {
    id: string;
    name: string;
    color: string;
  } | null;
  session: {
    id: string;
    openedAt: string;
    openingAmount: number;
  } | null;
}

interface CloseTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  tableNumber: number;
  branchId: string;
  branchName?: string;
  onSuccess: (tableId: string) => void;
  tableId: string;
  tableSectorId?: string | null;
}

type PaymentLine = {
  id: string;
  method: PaymentMethodExtended;
  amount: string;
};

const PAYMENT_METHODS: { value: PaymentMethodExtended; label: string }[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "CARD_DEBIT", label: "Tarjeta Débito" },
  { value: "CARD_CREDIT", label: "Tarjeta Crédito" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "ACCOUNT", label: "Cuenta Corriente" },
];

export function CloseTableDialog({
  open,
  onOpenChange,
  order,
  tableNumber,
  branchId,
  branchName = "Principal",
  onSuccess,
  tableId,
  tableSectorId,
}: CloseTableDialogProps) {
  const [payments, setPayments] = useState<PaymentLine[]>([
    { id: "1", method: "CASH", amount: "" },
  ]);
  const [isPartialClose, setIsPartialClose] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashRegisters, setCashRegisters] = useState<CashRegisterWithSession[]>(
    []
  );
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>("");
  const [isLoadingRegisters, setIsLoadingRegisters] = useState(false);
  const [sectorCashRegister, setSectorCashRegister] =
    useState<CashRegisterWithSession | null>(null);

  // Calculate totals
  const subtotal = useMemo(() => {
    return order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [order.items]);

  const discountAmount = useMemo(() => {
    return subtotal * (order.discountPercentage / 100);
  }, [subtotal, order.discountPercentage]);

  const total = useMemo(() => {
    return subtotal - discountAmount;
  }, [subtotal, discountAmount]);

  // Calculate total payment and change
  const totalPayment = useMemo(() => {
    return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }, [payments]);

  const change = useMemo(() => {
    return Math.max(0, totalPayment - total);
  }, [totalPayment, total]);

  // Load open cash registers when dialog opens
  useEffect(() => {
    if (open) {
      loadCashRegisters();
    }
  }, [open, branchId]);

  // Set initial payment amount when total changes
  useEffect(() => {
    if (open && payments.length === 1 && payments[0].amount === "") {
      setPayments([{ ...payments[0], amount: total.toFixed(2) }]);
    }
  }, [open, total]);

  const loadCashRegisters = async () => {
    setIsLoadingRegisters(true);
    const result = await getOpenCashRegistersForBranch(branchId);
    if (result.success && result.data) {
      setCashRegisters(result.data);

      // Check if the table's sector has an assigned cash register with an open session
      if (tableSectorId) {
        const sectorRegister = result.data.find(
          (r) => r.sector?.id === tableSectorId && r.session
        );
        if (sectorRegister) {
          setSectorCashRegister(sectorRegister);
          setSelectedRegisterId(sectorRegister.id);
        } else {
          setSectorCashRegister(null);
          // Auto-select first register if only one
          if (result.data.length === 1 && result.data[0].session) {
            setSelectedRegisterId(result.data[0].id);
          }
        }
      } else {
        setSectorCashRegister(null);
        // Auto-select first register if only one
        if (result.data.length === 1 && result.data[0].session) {
          setSelectedRegisterId(result.data[0].id);
        }
      }
    }
    setIsLoadingRegisters(false);
  };

  const addPaymentLine = () => {
    const newId = Date.now().toString();
    setPayments([...payments, { id: newId, method: "CASH", amount: "" }]);
  };

  const removePaymentLine = (id: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter((p) => p.id !== id));
    }
  };

  const updatePaymentLine = (
    id: string,
    field: "method" | "amount",
    value: string
  ) => {
    setPayments(
      payments.map((p) =>
        p.id === id
          ? { ...p, [field]: field === "method" ? value : value }
          : p
      )
    );
  };

  const handleClose = async () => {
    // Validate cash register selection
    const selectedRegister = cashRegisters.find(
      (r) => r.id === selectedRegisterId
    );
    if (!selectedRegister?.session) {
      setError("Please select a cash register with an open session");
      return;
    }

    // Validate payments
    const validPayments: PaymentEntry[] = payments
      .filter((p) => parseFloat(p.amount) > 0)
      .map((p) => ({
        method: p.method,
        amount: parseFloat(p.amount),
      }));

    if (validPayments.length === 0) {
      setError("Please enter at least one payment amount");
      return;
    }

    const paymentTotal = validPayments.reduce((sum, p) => sum + p.amount, 0);
    if (paymentTotal < total - 0.01) {
      setError(
        `Payment amount ($${paymentTotal.toFixed(2)}) is less than total ($${total.toFixed(2)})`
      );
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      // TODO: Get actual user ID from session
      const userId = "system";

      const result = await closeTableWithPayment({
        orderId: order.id,
        payments: validPayments,
        sessionId: selectedRegister.session.id,
        userId,
        isPartialClose,
      });

      if (result.success) {
        onSuccess(tableId);
        resetForm();
        onOpenChange(false);
      } else {
        setError(result.error || "Error closing the table");
      }
    } catch {
      setError("Error closing the table");
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    setPayments([{ id: "1", method: "CASH", amount: "" }]);
    setIsPartialClose(false);
    setError(null);
    setSelectedRegisterId("");
    setSectorCashRegister(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Check if there are no open cash registers
  const noOpenRegisters = !isLoadingRegisters && cashRegisters.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="bg-neutral-700 text-white px-4 py-3">
          <DialogTitle className="text-lg font-medium">
            CERRAR MESA {tableNumber} - {branchName.toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        {noOpenRegisters ? (
          <div className="p-8 text-center">
            <div className="text-amber-600 mb-4">
              <Settings className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              No hay cajas abiertas
            </h3>
            <p className="text-muted-foreground mb-4">
              Para cerrar una mesa, primero debes abrir una caja registradora.
            </p>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row">
            {/* Left Side - Order Items */}
            <div className="flex-1 flex flex-col">
              <div className="bg-neutral-600 text-white px-4 py-2 text-sm font-medium">
                ADICIONES
              </div>
              <div className="flex-1 max-h-[400px] overflow-y-auto bg-white">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-neutral-100"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-neutral-500 w-6">{item.quantity}</span>
                      <span className="font-medium">
                        {item.product?.name || item.itemName || "Item"}
                      </span>
                    </div>
                    <span className="text-neutral-700">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              {/* Total Section */}
              <div className="bg-neutral-700 text-white px-4 py-3 flex justify-between items-center">
                <span className="text-lg">Total:</span>
                <span className="text-2xl font-bold">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Right Side - Payment */}
            <div className="w-full md:w-[400px] flex flex-col bg-neutral-100">
              <div className="bg-neutral-600 text-white px-4 py-2 text-sm font-medium flex items-center justify-between">
                <span>PAGO</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:bg-neutral-500"
                    onClick={() => {}}
                    title="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:bg-neutral-500"
                    onClick={addPaymentLine}
                    title="Add payment method"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[300px]">
                {/* Cash Register Selection */}
                <div className="space-y-2">
                  <Label>Caja Registradora</Label>
                  {sectorCashRegister ? (
                    // Show read-only cash register name when sector has an assigned register
                    <div className="px-3 py-2 bg-white border rounded-md text-sm">
                      {sectorCashRegister.name}
                    </div>
                  ) : (
                    // Show dropdown selector when no sector register is assigned
                    <Select
                      value={selectedRegisterId}
                      onValueChange={setSelectedRegisterId}
                      disabled={isPending || isLoadingRegisters}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue
                          placeholder={
                            isLoadingRegisters
                              ? "Cargando..."
                              : "Seleccionar caja"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {cashRegisters.map((register) => (
                          <SelectItem key={register.id} value={register.id}>
                            {register.name}
                            {register.sector && ` (${register.sector.name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Payment Lines */}
                {payments.map((payment, index) => (
                  <div key={payment.id} className="flex items-center gap-2">
                    <Select
                      value={payment.method}
                      onValueChange={(value) =>
                        updatePaymentLine(
                          payment.id,
                          "method",
                          value as PaymentMethodExtended
                        )
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-[160px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-neutral-500">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payment.amount}
                        onChange={(e) =>
                          updatePaymentLine(payment.id, "amount", e.target.value)
                        }
                        placeholder="0"
                        className="bg-white"
                        disabled={isPending}
                      />
                    </div>
                    {payments.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-400 hover:text-red-500"
                        onClick={() => removePaymentLine(payment.id)}
                        disabled={isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}
              </div>

              {/* Change Section */}
              <div className="bg-neutral-200 px-4 py-3 flex justify-between items-center">
                <span className="text-neutral-600">Vuelto:</span>
                <span className="text-xl font-medium">{formatCurrency(change)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!noOpenRegisters && (
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 border rounded bg-white">
                <span className="text-neutral-600">$</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="partial-close"
                  checked={isPartialClose}
                  onCheckedChange={(checked) =>
                    setIsPartialClose(checked as boolean)
                  }
                  disabled={isPending}
                />
                <Label
                  htmlFor="partial-close"
                  className="text-sm cursor-pointer"
                >
                  Cierre Parcial
                </Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleClose}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isPending || !selectedRegisterId}
              >
                {isPending ? "Cerrando..." : `Cerrar mesa ${tableNumber}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
