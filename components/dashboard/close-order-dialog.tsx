"use client";

import { getOpenCashRegistersForBranch } from "@/actions/CashRegister";
import { getDeliveryConfig } from "@/actions/DeliveryConfig";
import {
  closeTableWithPayment,
  updateDeliveryFee,
  updateDiscount,
  type PaymentEntry,
} from "@/actions/Order";
import { OrderType } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePrint } from "@/hooks/use-print";
import { formatCurrency } from "@/lib/currency";
import { calculateDiscountAmount } from "@/lib/discount";
import { PAYMENT_METHODS } from "@/types/cash-register";
import { PaymentSection } from "@/components/dashboard/payment-section";
import { usePayments } from "@/hooks/use-payments";
import { Check, DollarSign, Percent, Receipt, Settings, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface OrderItem {
  id: string;
  itemName?: string;
  quantity: number;
  price: number;
  originalPrice: number | null;
  product: {
    name: string;
    categoryId: string | null;
  } | null;
}

interface Order {
  id: string;
  publicCode: string;
  type: OrderType;
  partySize: number | null;
  discountPercentage: number;
  discountType: string;
  deliveryFee: number;
  tableId: string | null;
  customerName: string | null;
  createdAt: Date | string;
  table: {
    number: number;
    name: string | null;
  } | null;
  client: {
    name: string;
    phone: string | null;
    addressStreet: string | null;
    addressNumber: string | null;
    addressApartment: string | null;
    addressCity: string | null;
    notes: string | null;
  } | null;
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

interface CloseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  branchId: string;
  branchName?: string;
  sectorId?: string | null;
  onSuccess: () => void;
}

const typeLabels: Record<OrderType, string> = {
  [OrderType.DINE_IN]: "Para Comer Aquí",
  [OrderType.TAKE_AWAY]: "Para Llevar",
  [OrderType.DELIVERY]: "Delivery",
};

export function CloseOrderDialog({
  open,
  onOpenChange,
  order,
  branchId,
  branchName = "Principal",
  sectorId,
  onSuccess,
}: CloseOrderDialogProps) {
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
  const [currentDiscountType, setCurrentDiscountType] = useState<
    "PERCENTAGE" | "FIXED"
  >((order.discountType as "PERCENTAGE" | "FIXED") || "PERCENTAGE");
  const [currentDeliveryFee, setCurrentDeliveryFee] = useState(
    order.deliveryFee,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { printControlTicket } = usePrint();

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
    return calculateDiscountAmount(subtotal, currentDiscount, currentDiscountType);
  }, [subtotal, currentDiscount, currentDiscountType]);

  const deliveryFeeValue =
    order.type === OrderType.DELIVERY ? currentDeliveryFee : 0;

  const total = useMemo(() => {
    return subtotal - discountAmount + deliveryFeeValue;
  }, [subtotal, discountAmount, deliveryFeeValue]);

  // Sync current discount when order changes
  useEffect(() => {
    setCurrentDiscount(order.discountPercentage);
    setCurrentDiscountType(
      (order.discountType as "PERCENTAGE" | "FIXED") || "PERCENTAGE",
    );
  }, [order.discountPercentage, order.discountType]);

  // Sync current delivery fee when order changes
  useEffect(() => {
    setCurrentDeliveryFee(order.deliveryFee);
  }, [order.deliveryFee]);

  // Auto-populate delivery fee from config when order has no fee set
  useEffect(() => {
    if (!open || order.type !== OrderType.DELIVERY || order.deliveryFee !== 0)
      return;
    getDeliveryConfig(branchId).then((config) => {
      const fee = config?.data?.deliveryFee;
      if (fee && fee > 0) {
        setCurrentDeliveryFee(fee);
        updateDeliveryFee(order.id, fee);
      }
    });
  }, [open, order.id, order.type, order.deliveryFee, branchId]);

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
        // Filter registers by sector if sectorId is provided
        let availableRegisters = result.data;

        if (sectorId) {
          // Only show registers that serve this sector
          availableRegisters = result.data.filter((register) =>
            register.sectors.some((sector) => sector.id === sectorId),
          );
        }

        // Fallback: If no registers found for sector, show all (safety net)
        if (availableRegisters.length === 0) {
          console.warn(
            `No cash registers found for sector ${sectorId}, showing all available registers`,
          );
          availableRegisters = result.data;
        }

        setCashRegisters(availableRegisters);

        // Auto-select the first register with an open session
        const registerWithSession = availableRegisters.find((r) => r.session);
        if (registerWithSession) {
          setSelectedRegisterId(registerWithSession.id);
        }
      }

      setIsLoadingRegisters(false);
    };

    if (open) {
      loadCashRegisters();
    }
  }, [open, branchId, sectorId]);

  const handleDiscountEdit = () => {
    setDiscountInput(currentDiscount.toString());
    setIsEditingDiscount(true);
  };

  const handleDiscountSave = async () => {
    const newDiscount = parseFloat(discountInput);
    if (isNaN(newDiscount) || newDiscount < 0) {
      setError("El descuento no puede ser negativo");
      return;
    }
    if (currentDiscountType === "PERCENTAGE" && newDiscount > 100) {
      setError("El descuento porcentual debe estar entre 0 y 100");
      return;
    }

    // Store previous values for rollback
    const previousDiscount = currentDiscount;
    const previousDiscountType = currentDiscountType;

    // Optimistic update - update UI immediately (keep editor open)
    setCurrentDiscount(newDiscount);
    setError(null);

    // Perform server update
    const result = await updateDiscount(
      order.id,
      newDiscount,
      currentDiscountType,
    );

    if (!result.success) {
      // Rollback on failure
      setCurrentDiscount(previousDiscount);
      setCurrentDiscountType(previousDiscountType);
      setError(result.error || "Error al actualizar el descuento");
    }
  };

  const handleDiscountCancel = () => {
    setIsEditingDiscount(false);
    setDiscountInput("");
  };

  const handleDeliveryFeeBlur = async () => {
    const result = await updateDeliveryFee(order.id, currentDeliveryFee);
    if (!result.success) {
      setError(result.error || "Error al actualizar el costo de envío");
    }
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
        // Print control ticket with payment breakdown (fire and forget)
        const isDelivery = order.type === OrderType.DELIVERY;

        let deliveryAddress: string | undefined;
        if (isDelivery && order.client) {
          const parts = [
            order.client.addressStreet,
            order.client.addressNumber,
            order.client.addressApartment,
          ].filter(Boolean);
          if (parts.length > 0) deliveryAddress = parts.join(" ");
        }

        printControlTicket({
          orderId: order.id,
          orderCode: order.publicCode,
          tableName: order.table?.number?.toString() ?? "—",
          branchId,
          items: order.items.map((item) => ({
            name: item.itemName ?? item.product?.name ?? "",
            quantity: item.quantity,
            price: item.price,
            notes: null,
          })),
          subtotal,
          discountPercentage: currentDiscount > 0 ? currentDiscount : undefined,
          discountType: currentDiscount > 0 ? currentDiscountType : undefined,
          deliveryFee:
            isDelivery && currentDeliveryFee > 0
              ? currentDeliveryFee
              : undefined,
          orderType: order.type,
          customerName: order.client?.name || order.customerName || undefined,
          clientPhone: isDelivery
            ? (order.client?.phone ?? undefined)
            : undefined,
          deliveryAddress: isDelivery ? deliveryAddress : undefined,
          deliveryCity: isDelivery
            ? (order.client?.addressCity ?? undefined)
            : undefined,
          deliveryNotes: isDelivery
            ? (order.client?.notes ?? undefined)
            : undefined,
          payments: validPayments.length > 1 ? validPayments : undefined,
          paymentMethod:
            validPayments.length === 1
              ? (PAYMENT_METHODS.find(
                  (m) => m.value === validPayments[0].method,
                )?.label ?? validPayments[0].method)
              : undefined,
          orderCreatedAt:
            order.createdAt instanceof Date
              ? order.createdAt.toISOString()
              : order.createdAt,
        });

        // Close dialog AFTER successful operation
        resetForm();
        onOpenChange(false);
        onSuccess();
      } else {
        // Show error to user - dialog stays open
        setError(result.error || "Error al cerrar la orden");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al cerrar la orden";
      setError(errorMessage);
      console.error("Error closing order:", err);
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
    setCurrentDiscountType(
      (order.discountType as "PERCENTAGE" | "FIXED") || "PERCENTAGE",
    );
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

  // Get order title based on type
  const getOrderTitle = () => {
    if (order.type === OrderType.DINE_IN && order.table) {
      return `Mesa ${order.table.number}`;
    }
    return `${typeLabels[order.type]} - ${order.publicCode}`;
  };

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
              Finalizar Venta - {getOrderTitle()}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{branchName}</p>
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
                Para finalizar una venta, primero debes abrir una caja
                registradora.
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
                          <span>
                            Descuento (
                            {currentDiscountType === "FIXED"
                              ? formatCurrency(currentDiscount)
                              : `${currentDiscount}%`}
                            ):
                          </span>
                          <div className="flex items-center gap-2">
                            <span>-{formatCurrency(discountAmount)}</span>
                            {!isEditingDiscount && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={handleDiscountEdit}
                                disabled={isLoadingAction}
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
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant={currentDiscountType === "PERCENTAGE" ? "default" : "outline"}
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => setCurrentDiscountType("PERCENTAGE")}
                          >
                            <Percent className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant={currentDiscountType === "FIXED" ? "default" : "outline"}
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => setCurrentDiscountType("FIXED")}
                          >
                            <DollarSign className="h-3 w-3" />
                          </Button>
                          <NumberInput
                            min="0"
                            max={currentDiscountType === "PERCENTAGE" ? "100" : undefined}
                            step="0.01"
                            value={discountInput}
                            onChange={(e) => setDiscountInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleDiscountSave();
                            }}
                            className="h-8 w-24"
                            placeholder={currentDiscountType === "PERCENTAGE" ? "%" : "$"}
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={handleDiscountSave}
                            disabled={isLoadingAction}
                          >
                            <Check className="h-4 w-4" />
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
                      </div>
                    )}

                    {/* Add Discount Button */}
                    {!isEditingDiscount && currentDiscount === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDiscountEdit}
                        disabled={isLoadingAction}
                        className="w-full"
                      >
                        <Percent className="h-4 w-4 mr-2" />
                        Agregar descuento
                      </Button>
                    )}

                    {/* Delivery Fee */}
                    {order.type === OrderType.DELIVERY && (
                      <div className="flex justify-between items-center text-sm text-blue-600">
                        <span>Costo de envío:</span>
                        <div className="relative w-28">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <NumberInput
                            min="0"
                            step="0.01"
                            value={currentDeliveryFee}
                            onChange={(e) =>
                              setCurrentDeliveryFee(
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            onBlur={handleDeliveryFeeBlur}
                            disabled={isLoadingAction}
                            className="h-8 pl-6 text-right"
                          />
                        </div>
                      </div>
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
                {/* Cash Register Selector */}
                <div className="space-y-2">
                  <Label htmlFor="cash-register-select">Caja:</Label>
                  {isLoadingRegisters ? (
                    <div className="text-sm text-muted-foreground">
                      Cargando cajas...
                    </div>
                  ) : cashRegisters.length === 0 ? (
                    <div className="text-sm text-destructive">
                      No hay cajas abiertas en este sector. Abra una caja
                      primero.
                    </div>
                  ) : cashRegisters.length === 1 ? (
                    <div className="text-sm font-medium">
                      {cashRegisters[0].name}
                      {cashRegisters[0].sectors.length > 0 && (
                        <span className="text-muted-foreground ml-2">
                          (
                          {cashRegisters[0].sectors
                            .map((s) => s.name)
                            .join(", ")}
                          )
                        </span>
                      )}
                    </div>
                  ) : (
                    <Select
                      value={selectedRegisterId}
                      onValueChange={setSelectedRegisterId}
                    >
                      <SelectTrigger id="cash-register-select">
                        <SelectValue placeholder="Seleccione una caja" />
                      </SelectTrigger>
                      <SelectContent>
                        {cashRegisters.map((register) => (
                          <SelectItem key={register.id} value={register.id}>
                            {register.name}
                            {register.sectors.length > 0 && (
                              <span className="text-muted-foreground ml-2">
                                (
                                {register.sectors.map((s) => s.name).join(", ")}
                                )
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
              className="bg-green-600 hover:bg-green-700"
              disabled={
                isLoadingAction ||
                isLoadingRegisters ||
                !selectedRegisterId ||
                cashRegisters.length === 0
              }
            >
              {isLoadingAction ? "Procesando..." : "Finalizar Venta"}
            </Button>
          )}
        </div>
      </div>
    </dialog>
  );
}
