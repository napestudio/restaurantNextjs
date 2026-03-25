"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  CreditCard,
  Banknote,
  Building2,
  ArrowRightLeft,
  Wallet,
  Link,
  QrCode,
  ShoppingBag,
  UtensilsCrossed,
  Truck,
  Phone,
  Mail,
  Hash,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";
import {
  updateManualMovement,
  getMovementWithOrderDetails,
} from "@/actions/CashRegister";
import {
  CashRegisterWithStatus,
  PAYMENT_METHODS,
  MOVEMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/types/cash-register";
import { formatCurrency } from "@/lib/currency";
import { calculateDiscountAmount } from "@/lib/discount";
import { cn } from "@/lib/utils";

type MovementData = Awaited<
  ReturnType<typeof getMovementWithOrderDetails>
>["data"];

const PAYMENT_METHOD_ICONS: Record<string, React.ReactNode> = {
  CASH: <Banknote className="h-4 w-4" />,
  CARD_DEBIT: <CreditCard className="h-4 w-4" />,
  CARD_CREDIT: <CreditCard className="h-4 w-4" />,
  TRANSFER: <ArrowRightLeft className="h-4 w-4" />,
  ACCOUNT: <Building2 className="h-4 w-4" />,
  PAYMENT_LINK: <Link className="h-4 w-4" />,
  QR_CODE: <QrCode className="h-4 w-4" />,
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Mesa",
  TAKE_AWAY: "Para llevar",
  DELIVERY: "A domicilio",
};

const ORDER_TYPE_ICONS: Record<string, React.ReactNode> = {
  DINE_IN: <UtensilsCrossed className="h-4 w-4" />,
  TAKE_AWAY: <ShoppingBag className="h-4 w-4" />,
  DELIVERY: <Truck className="h-4 w-4" />,
};

interface MovementDetailsSidebarProps {
  open: boolean;
  onClose: () => void;
  movementId: string | null;
  cashRegisters: CashRegisterWithStatus[];
  onMovementUpdated: () => void;
  userRole: string;
}

export function MovementDetailsSidebar({
  open,
  onClose,
  movementId,
  cashRegisters,
  onMovementUpdated,
  userRole,
}: MovementDetailsSidebarProps) {
  const [data, setData] = useState<MovementData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState("");
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [itemsExpanded, setItemsExpanded] = useState(false);

  const canEdit =
    userRole === "MANAGER" || userRole === "ADMIN" || userRole === "SUPERADMIN";

  const registersWithOpenSessions = cashRegisters.filter(
    (r) => r.hasOpenSession && r.isActive,
  );

  // Fetch data when movementId or open changes
  useEffect(() => {
    if (!open || !movementId) return;
    setIsLoading(true);
    setFetchError(null);
    setData(null);
    setItemsExpanded(false);
    getMovementWithOrderDetails(movementId)
      .then((result) => {
        if (result.success && result.data) {
          setData(result.data);
          const mv = result.data.movement;
          if (mv) {
            setPaymentMethod(mv.paymentMethod);
            setCashRegisterId(mv.cashRegisterId ?? "");
            setDescription(mv.description ?? "");
          }
        } else {
          setFetchError(result.error ?? "Error al cargar el movimiento");
        }
      })
      .catch(() => setFetchError("Error al cargar el movimiento"))
      .finally(() => setIsLoading(false));
  }, [movementId, open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSaveError(null);
      setIsPending(false);
      setData(null);
    }
  }, [open]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleSave = async () => {
    if (!movement) return;

    setIsPending(true);
    setSaveError(null);

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
        setSaveError(result.error ?? "Error al actualizar el movimiento");
      }
    } catch {
      setSaveError("Error al actualizar el movimiento");
    } finally {
      setIsPending(false);
    }
  };

  const movement = data?.movement;
  const order = data?.order;

  const isManual =
    movement?.type === "INCOME" ||
    movement?.type === "EXPENSE" ||
    movement?.type === "CORRECTION";

  const isIncome = movement?.type === "INCOME";
  const isCorrection = movement?.type === "CORRECTION";
  const isPositive =
    movement?.type === "INCOME" ||
    movement?.type === "SALE" ||
    (isCorrection && (movement?.amount ?? 0) >= 0);

  const amountColor = isPositive ? "text-green-600" : "text-red-600";

  const amountPrefix = isCorrection
    ? (movement?.amount ?? 0) >= 0
      ? "+"
      : ""
    : isPositive
      ? "+"
      : "-";

  const movementTypeBadgeLabel = () => {
    if (!movement) return "";
    if (movement.type === "INCOME") return "Ingreso Manual";
    if (movement.type === "EXPENSE") return "Egreso Manual";
    return (
      MOVEMENT_TYPE_LABELS[
        movement.type as keyof typeof MOVEMENT_TYPE_LABELS
      ] ?? movement.type
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-112.5 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0">
          <div className="flex items-center gap-2">
            {isLoading || !movement ? (
              <Skeleton className="h-9 w-9 rounded-lg" />
            ) : isCorrection ? (
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ArrowLeftRight className="h-5 w-5 text-yellow-600" />
              </div>
            ) : isIncome || movement.type === "SALE" ? (
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
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="space-y-4 p-4">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {fetchError && (
            <div className="p-4 text-center text-sm text-red-600">
              {fetchError}
            </div>
          )}

          {!isLoading && movement && (
            <>
              {/* Amount */}
              <div className="text-center py-6 bg-gray-50 border-b">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <p className="text-sm text-muted-foreground">
                    {movementTypeBadgeLabel()}
                  </p>
                  {order && (
                    <>
                      <span className="text-muted-foreground text-sm">·</span>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        {ORDER_TYPE_ICONS[order.type]}
                        {ORDER_TYPE_LABELS[order.type] ?? order.type}
                      </span>
                    </>
                  )}
                </div>
                <p className={cn("text-3xl font-bold", amountColor)}>
                  {amountPrefix}
                  {formatCurrency(Math.abs(movement.amount))}
                </p>
                {order && (
                  <p className="text-xs text-muted-foreground mt-1">
                    #{order.publicCode}
                  </p>
                )}
              </div>

              {/* Read-only info */}
              <div className="px-4 py-4 space-y-3 border-b">
                {/* Payment method */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    {PAYMENT_METHOD_ICONS[movement.paymentMethod] ?? (
                      <Wallet className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Medio de pago
                    </p>
                    <p className="font-medium text-sm">
                      {PAYMENT_METHOD_LABELS[
                        movement.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS
                      ] ?? movement.paymentMethod}
                    </p>
                  </div>
                </div>

                {/* Date */}
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

                {/* Time */}
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

                {/* Assigned to (from order) */}
                {order?.assignedTo && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Atendido por
                      </p>
                      <p className="font-medium text-sm">
                        {order.assignedTo.name ?? order.assignedTo.username}
                      </p>
                    </div>
                  </div>
                )}

                {/* Description (read-only for non-editors or non-manual movements) */}
                {movement.description && (!canEdit || !isManual) && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        Descripción
                      </p>
                      <p className="font-medium text-sm">
                        {movement.description
                          .replace(/\bTable\b/g, "Mesa")
                          .replace(/\bOrder\b/g, "Orden")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Registered by */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Registrado por
                    </p>
                    <p className="font-medium text-sm">
                      {movement.createdBy || "Sistema"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order details section */}
              {order && (
                <div className="px-4 py-4 space-y-4 border-b">
                  <Separator className="hidden" />

                  {/* Table info (DINE_IN) */}
                  {order.type === "DINE_IN" && order.table && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                        <UtensilsCrossed className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Mesa</p>
                        <p className="font-medium text-sm">
                          {order.table.name
                            ? order.table.name
                            : `Mesa ${order.table.number}`}
                          {order.partySize
                            ? ` · ${order.partySize} personas`
                            : ""}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Client */}
                  {(order.client || order.customerName) && (
                    <div className="rounded-lg border p-3 space-y-2 bg-gray-50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Cliente
                      </p>
                      <p className="font-medium text-sm">
                        {order.client?.name ?? order.customerName}
                      </p>
                      {order.client?.phone && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Phone className="h-3.5 w-3.5" />
                          {order.client.phone}
                        </div>
                      )}
                      {(order.client?.email ?? order.customerEmail) && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Mail className="h-3.5 w-3.5" />
                          {order.client?.email ?? order.customerEmail}
                        </div>
                      )}
                      {order.client?.taxId && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Hash className="h-3.5 w-3.5" />
                          {order.client.taxId}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  {order.items.length > 0 && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setItemsExpanded((v) => !v)}
                        className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-gray-700 transition-colors"
                      >
                        <span>Productos ({order.items.length})</span>
                        {itemsExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {itemsExpanded && (
                        <div className="rounded-lg border divide-y">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between items-start px-3 py-2 text-sm"
                            >
                              <div>
                                <span className="font-medium text-gray-700">
                                  {item.quantity}×
                                </span>{" "}
                                <span>{item.itemName}</span>
                                {item.notes && (
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                              <span className="text-gray-600 ml-4 shrink-0">
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Discount / delivery fee */}
                      {(order.discountPercentage > 0 ||
                        order.deliveryFee > 0) && (
                        <div className="space-y-1 px-1">
                          {order.discountPercentage > 0 && (
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>
                                Descuento (
                                {order.discountType === "FIXED"
                                  ? formatCurrency(order.discountPercentage)
                                  : `${order.discountPercentage}%`}
                                )
                              </span>
                              <span className="text-red-500">
                                -
                                {formatCurrency(
                                  calculateDiscountAmount(
                                    order.items.reduce(
                                      (sum, i) => sum + i.price * i.quantity,
                                      0,
                                    ),
                                    order.discountPercentage,
                                    order.discountType,
                                  ),
                                )}
                              </span>
                            </div>
                          )}
                          {order.deliveryFee > 0 && (
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>Costo de envío</span>
                              <span>+{formatCurrency(order.deliveryFee)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment breakdown */}
                  {order.paymentBreakdown.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Pagos registrados
                      </p>
                      <div className="rounded-lg border divide-y">
                        {order.paymentBreakdown.map((pm, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2 text-gray-600">
                              {PAYMENT_METHOD_ICONS[pm.paymentMethod] ?? (
                                <Wallet className="h-4 w-4" />
                              )}
                              <span>
                                {PAYMENT_METHOD_LABELS[
                                  pm.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS
                                ] ?? pm.paymentMethod}
                              </span>
                            </div>
                            <span className="font-medium">
                              {formatCurrency(pm.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit fields — only for manual movements and authorized roles */}
              {canEdit && (
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

                  {/* Save error */}
                  {saveError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      {saveError}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — only shown when edit form is active */}
        {!isLoading && movement && canEdit && (
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
