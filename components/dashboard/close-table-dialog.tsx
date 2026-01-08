"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Plus, X, Receipt, CreditCard, Percent } from "lucide-react";
import {
  closeTableWithPayment,
  updateDiscount,
  type PaymentMethodExtended,
  type PaymentEntry,
} from "@/actions/Order";
import { getOpenCashRegistersForBranch } from "@/actions/CashRegister";
import { PAYMENT_METHODS } from "@/types/cash-register";

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
  sectors: {
    id: string;
    name: string;
    color: string;
  }[];
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
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashRegisters, setCashRegisters] = useState<CashRegisterWithSession[]>(
    []
  );
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>("");
  const [isLoadingRegisters, setIsLoadingRegisters] = useState(false);
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [currentDiscount, setCurrentDiscount] = useState(
    order.discountPercentage
  );
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open/close dialog based on open prop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  // Calculate totals
  const subtotal = useMemo(() => {
    return order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [order.items]);

  const discountAmount = useMemo(() => {
    return subtotal * (currentDiscount / 100);
  }, [subtotal, currentDiscount]);

  const total = useMemo(() => {
    return subtotal - discountAmount;
  }, [subtotal, discountAmount]);

  // Sync current discount when order changes
  useEffect(() => {
    setCurrentDiscount(order.discountPercentage);
  }, [order.discountPercentage]);

  // Update payment amount when total changes
  useEffect(() => {
    setPayments((prevPayments) => {
      if (prevPayments.length === 1) {
        // Update the first payment amount to match the new total
        return [{ ...prevPayments[0], amount: total.toFixed(2) }];
      }
      return prevPayments;
    });
  }, [total]);

  // Calculate total payment and change
  const totalPayment = useMemo(() => {
    return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }, [payments]);

  const change = useMemo(() => {
    return Math.max(0, totalPayment - total);
  }, [totalPayment, total]);

  // Load open cash registers when dialog opens
  useEffect(() => {
    const loadCashRegisters = async () => {
      setIsLoadingRegisters(true);
      const result = await getOpenCashRegistersForBranch(branchId);
      if (result.success && result.data) {
        setCashRegisters(result.data);

        // Check if the table's sector has an assigned cash register with an open session
        if (tableSectorId) {
          const sectorRegister = result.data.find(
            (r) => r.sectors?.some((s) => s.id === tableSectorId) && r.session
          );
          if (sectorRegister) {
            setSelectedRegisterId(sectorRegister.id);
          } else if (result.data.length === 1 && result.data[0].session) {
            // Auto-select first register if only one
            setSelectedRegisterId(result.data[0].id);
          }
        } else if (result.data.length === 1 && result.data[0].session) {
          // Auto-select first register if only one
          setSelectedRegisterId(result.data[0].id);
        }
      }
      setIsLoadingRegisters(false);
    };

    if (open) {
      loadCashRegisters();
    }
  }, [open, branchId, tableSectorId]);

  // Set initial payment amount when total changes
  useEffect(() => {
    if (open) {
      setPayments((prev) => {
        if (prev.length === 1 && prev[0].amount === "") {
          return [{ ...prev[0], amount: total.toFixed(2) }];
        }
        return prev;
      });
    }
  }, [open, total]);

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
        p.id === id ? { ...p, [field]: field === "method" ? value : value } : p
      )
    );
  };

  const handleDiscountEdit = () => {
    setDiscountInput(currentDiscount.toString());
    setIsEditingDiscount(true);
  };

  const handleDiscountSave = async () => {
    const newDiscount = parseFloat(discountInput);
    if (isNaN(newDiscount) || newDiscount < 0 || newDiscount > 100) {
      setError("El descuento debe ser un número entre 0 y 100");
      return;
    }

    // Store previous discount for rollback
    const previousDiscount = currentDiscount;

    // Optimistic update - update UI immediately
    setCurrentDiscount(newDiscount);
    setIsEditingDiscount(false);
    setError(null);

    // Perform server update
    const result = await updateDiscount(order.id, newDiscount);

    if (!result.success) {
      // Rollback on failure
      setCurrentDiscount(previousDiscount);
      setError(result.error || "Error al actualizar el descuento");
    }
  };

  const handleDiscountCancel = () => {
    setIsEditingDiscount(false);
    setDiscountInput("");
  };

  const handleClose = async () => {
    // Validate cash register selection
    const selectedRegister = cashRegisters.find(
      (r) => r.id === selectedRegisterId
    );
    if (!selectedRegister?.session) {
      setError("Selecciona una caja registradora con sesión abierta");
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
      setError("Ingresa al menos un monto de pago");
      return;
    }

    const paymentTotal = validPayments.reduce((sum, p) => sum + p.amount, 0);
    if (paymentTotal < total - 0.01) {
      setError(
        `El monto pagado (${formatCurrency(
          paymentTotal
        )}) es menor al total (${formatCurrency(total)})`
      );
      return;
    }

    // Close dialog immediately for snappy feel
    resetForm();
    onOpenChange(false);

    // Perform server action and then update UI
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
        // Update table state after server confirms
        onSuccess(tableId);
      } else {
        console.error("Failed to close table:", result.error);
      }
    } catch (err) {
      console.error("Error closing table:", err);
    }
  };

  const resetForm = () => {
    setPayments([{ id: "1", method: "CASH", amount: "" }]);
    setIsPartialClose(false);
    setError(null);
    setSelectedRegisterId("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
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
    <dialog
      ref={dialogRef}
      onClose={() => handleOpenChange(false)}
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === dialogRef.current) {
          handleOpenChange(false);
        }
      }}
      className="w-225 max-w-[95vw] self-center mx-auto max-h-[90vh] overflow-hidden rounded-lg shadow-xl p-0 backdrop:bg-black/50"
    >
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
          <div>
            <h2 className="text-xl font-semibold">
              Cerrar Mesa {tableNumber} - {branchName}
            </h2>
            {/* <p className="text-sm text-muted-foreground mt-1">
              Revisa los items de la orden y procesa el pago para cerrar la
              mesa.
            </p> */}
          </div>
          <button
            onClick={() => handleOpenChange(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {noOpenRegisters ? (
            <div className="py-8 text-center">
              <div className="text-amber-600 mb-4">
                <Settings className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                No hay cajas abiertas
              </h3>
              <p className="text-muted-foreground mb-4">
                Para cerrar una mesa, primero debes abrir una caja registradora.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Side - Order Items */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">Detalle de la orden</h3>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-72 overflow-y-auto">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground font-medium min-w-8">
                            {item.quantity}x
                          </span>
                          <span className="font-medium">
                            {item.product?.name || item.itemName || "Item"}
                          </span>
                        </div>
                        <span className="font-medium whitespace-nowrap">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="bg-gray-50 border-t px-4 py-4 space-y-2">
                    {currentDiscount > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Subtotal:
                          </span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-green-600">
                          <span>Descuento ({currentDiscount}%):</span>
                          <div className="flex items-center gap-2">
                            <span>-{formatCurrency(discountAmount)}</span>
                            {!isEditingDiscount && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={handleDiscountEdit}
                                disabled={isPending || isLoadingAction}
                              >
                                <Percent className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Discount Editor */}
                    {isEditingDiscount && (
                      <div className="flex items-center gap-2 text-sm">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={discountInput}
                          onChange={(e) => setDiscountInput(e.target.value)}
                          className="h-8 w-20"
                          placeholder="%"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={handleDiscountSave}
                          disabled={isLoadingAction}
                        >
                          Guardar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={handleDiscountCancel}
                          disabled={isLoadingAction}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Add Discount Button */}
                    {!isEditingDiscount && currentDiscount === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDiscountEdit}
                        disabled={isPending || isLoadingAction}
                        className="w-full"
                      >
                        <Percent className="h-4 w-4 mr-2" />
                        Agregar descuento
                      </Button>
                    )}

                    <div className="flex justify-between text-xl font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Payment */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">Pago</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addPaymentLine}
                    disabled={isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Dividir pago
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Cash Register Display */}
                  <div className="flex items-center gap-1">
                    <Label>Caja:</Label>
                    <div className="text-sm">
                      {isLoadingRegisters
                        ? "Cargando..."
                        : cashRegisters.find((r) => r.id === selectedRegisterId)
                            ?.name || "Sin caja seleccionada"}
                    </div>
                  </div>

                  {/* Payment Lines */}
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <select
                            value={payment.method}
                            onChange={(e) =>
                              updatePaymentLine(
                                payment.id,
                                "method",
                                e.target.value as PaymentMethodExtended
                              )
                            }
                            disabled={isPending}
                            className="w-48 h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {PAYMENT_METHODS.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                          <div className="relative flex-1 min-w-32">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={payment.amount}
                              onChange={(e) =>
                                updatePaymentLine(
                                  payment.id,
                                  "amount",
                                  e.target.value
                                )
                              }
                              placeholder="0.00"
                              className="pl-7"
                              disabled={isPending}
                            />
                          </div>
                          {payments.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-red-500 shrink-0"
                              onClick={() => removePaymentLine(payment.id)}
                              disabled={isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Change Display */}
                  {change > 0 && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-green-800 font-medium">
                          Vuelto:
                        </span>
                        <span className="text-2xl font-bold text-green-700">
                          {formatCurrency(change)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Partial Close Option */}
                  {/* <div className="flex items-center gap-2 pt-2">
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
                  </div> */}

                  {/* Error Message */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          {!noOpenRegisters && (
            <Button
              onClick={handleClose}
              className="bg-red-500 hover:bg-red-600"
              disabled={isPending || !selectedRegisterId}
            >
              {isPending ? "Cerrando..." : `Cerrar Mesa ${tableNumber}`}
            </Button>
          )}
        </div>
      </div>
    </dialog>
  );
}
