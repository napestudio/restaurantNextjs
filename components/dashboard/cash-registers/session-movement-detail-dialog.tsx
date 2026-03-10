"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Building2,
  ArrowRightLeft,
  Wallet,
  Calendar,
  Clock,
  FileText,
  User,
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
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  PAYMENT_METHOD_LABELS,
  MOVEMENT_TYPE_LABELS,
} from "@/types/cash-register";
import { getMovementWithOrderDetails } from "@/actions/CashRegister";

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

interface SessionMovementDetailDialogProps {
  movementId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionMovementDetailDialog({
  movementId,
  open,
  onOpenChange,
}: SessionMovementDetailDialogProps) {
  const [data, setData] = useState<MovementData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemsExpanded, setItemsExpanded] = useState(false);

  useEffect(() => {
    if (!open || !movementId) return;
    setIsLoading(true);
    setError(null);
    setData(null);
    getMovementWithOrderDetails(movementId)
      .then((result) => {
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error ?? "Error al cargar el detalle");
        }
      })
      .catch(() => setError("Error al cargar el detalle"))
      .finally(() => setIsLoading(false));
  }, [movementId, open]);

  const movement = data?.movement;
  const order = data?.order;

  const isPositive = movement?.type === "INCOME" || movement?.type === "SALE";

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

  const movementTypeBadgeLabel = () => {
    if (!movement) return "";
    if (movement.type === "INCOME") return "Ingreso Manual";
    if (movement.type === "EXPENSE") return "Egreso Manual";
    return MOVEMENT_TYPE_LABELS[
      movement.type as keyof typeof MOVEMENT_TYPE_LABELS
    ];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLoading || !movement ? (
              <Skeleton className="h-9 w-9 rounded-lg" />
            ) : isPositive ? (
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            ) : (
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            )}
            <span>Detalle del Movimiento</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {error && (
          <div className="py-4 text-center text-sm text-red-600">{error}</div>
        )}

        {!isLoading && movement && (
          <div className="space-y-5 py-2">
            {/* Amount */}
            <div className="text-center py-4 bg-gray-50 rounded-lg">
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
              <p
                className={`text-3xl font-bold ${
                  isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {isPositive ? "+" : "-"}
                {formatCurrency(movement.amount)}
              </p>
              {order && (
                <p className="text-xs text-muted-foreground mt-1">
                  #{order.publicCode}
                </p>
              )}
            </div>

            {/* Movement details */}
            <div className="space-y-3">
              {/* Payment method */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  {PAYMENT_METHOD_ICONS[movement.paymentMethod] ?? (
                    <Wallet className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Medio de pago</p>
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
                  <p className="font-medium text-sm capitalize">
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

              {/* Atendido por (from order, shown in place of Registrado por) */}
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

              {/* Description */}
              {movement.description && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Descripción</p>
                    <p className="font-medium text-sm">
                      {movement.description
                        .replace(/\bTable\b/g, "Mesa")
                        .replace(/\bOrder\b/g, "Orden")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Type badge */}
            <div className="flex justify-center">
              <Badge
                className={
                  isPositive
                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                    : "bg-red-100 text-red-700 hover:bg-red-100"
                }
              >
                {movementTypeBadgeLabel()}
              </Badge>
            </div>

            {/* Order details section */}
            {order && (
              <>
                <Separator />
                <div className="space-y-4">
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

                  {/* Client / customer */}
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
                                Descuento ({order.discountPercentage}%)
                              </span>
                              <span className="text-red-500">
                                -
                                {formatCurrency(
                                  order.items.reduce(
                                    (sum, i) => sum + i.price * i.quantity,
                                    0,
                                  ) *
                                    (order.discountPercentage / 100),
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
              </>
            )}

            {/* Registrado por — always at the bottom */}
            <div className="flex items-center gap-3 pt-1 border-t">
              <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Registrado por</p>
                <p className="font-medium text-sm">
                  {movement.createdBy || "Sistema"}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
