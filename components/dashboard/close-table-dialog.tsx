"use client";

import { getOpenCashRegistersForBranch } from "@/actions/CashRegister";
import {
  closeTableWithPayment,
  updateDiscount,
  type PaymentEntry,
} from "@/actions/Order";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { PaymentSection } from "@/components/dashboard/payment-section";
import { formatCurrency } from "@/lib/currency";
import { usePayments } from "@/hooks/use-payments";
import { Percent, Receipt, Settings, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashRegisters, setCashRegisters] = useState<CashRegisterWithSession[]>(
    [],
  );
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>("");
  const [isLoadingRegisters, setIsLoadingRegisters] = useState(false);
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [currentDiscount, setCurrentDiscount] = useState(
    order.discountPercentage,
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
      0,
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

  const {
    payments,
    lastAddedId,
    remainder,
    change,
    addPaymentLine,
    removePaymentLine,
    updatePaymentLine,
    resetPayments,
  } = usePayments(total);

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
            (r) => r.sectors?.some((s) => s.id === tableSectorId) && r.session,
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
      (r) => r.id === selectedRegisterId,
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

    // Allow closing with no payments if total is $0
    if (validPayments.length === 0 && total > 0.01) {
      setError("Ingresa al menos un monto de pago");
      return;
    }

    if (remainder > 0.01 && total > 0.01) {
      setError(
        `El monto pagado (${formatCurrency(total - remainder)}) es menor al total (${formatCurrency(total)})`,
      );
      return;
    }

    // Start loading state
    setIsLoadingAction(true);

    try {
      const result = await closeTableWithPayment({
        orderId: order.id,
        payments: validPayments,
        sessionId: selectedRegister.session.id,
        isPartialClose: false,
      });

      if (result.success) {
        // Close dialog AFTER successful operation
        resetForm();
        onOpenChange(false);
        onSuccess(tableId);
      } else {
        // Show error to user - dialog stays open
        setError(result.error || "Error al cerrar la mesa");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al cerrar la mesa";
      setError(errorMessage);
      console.error("Error closing table:", err);
    } finally {
      // Always clear loading state
      setIsLoadingAction(false);
    }
  };

  const resetForm = () => {
    resetPayments(total);
    setError(null);
    setSelectedRegisterId("");
    setCurrentDiscount(order.discountPercentage);
    setIsEditingDiscount(false);
    setDiscountInput("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
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
            <h2 className="text-xl font-semibold">Cerrar Mesa {tableNumber}</h2>
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
                                disabled={isLoadingAction || isLoadingAction}
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
                        <NumberInput
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
                        disabled={isLoadingAction || isLoadingAction}
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

                <PaymentSection
                  payments={payments}
                  lastAddedId={lastAddedId}
                  remainder={remainder}
                  change={change}
                  disabled={isLoadingAction}
                  onAdd={addPaymentLine}
                  onRemove={removePaymentLine}
                  onUpdate={updatePaymentLine}
                />

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoadingAction}
          >
            Cancelar
          </Button>
          {!noOpenRegisters && (
            <Button
              onClick={handleClose}
              className="bg-red-500 hover:bg-red-600"
              disabled={isLoadingAction || !selectedRegisterId}
            >
              {isLoadingAction ? "Cerrando..." : `Cerrar Mesa ${tableNumber}`}
            </Button>
          )}
        </div>
      </div>
    </dialog>
  );
}
