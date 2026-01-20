"use client";

import React from "react";
import type { ClientData } from "@/actions/clients";
import {
  assignClientToOrder,
  assignStaffToOrder,
  updateOrderStatus,
} from "@/actions/Order";
import { usePrint } from "@/hooks/use-print";
import { OrderStatus, OrderType } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Clock,
  CreditCard,
  DollarSign,
  Edit,
  FileText,
  Mail,
  Package,
  Printer,
  Save,
  Truck,
  User,
  UtensilsCrossed,
  X,
  Banknote,
} from "lucide-react";
import { useState } from "react";
import TableIcon from "../ui/icons/TableIcon";
import { ClientPicker } from "./client-picker";
import { WaiterPicker } from "./waiter-picker";
import { CloseOrderDialog } from "./close-order-dialog";
import { useToast } from "@/hooks/use-toast";

type Order = {
  id: string;
  publicCode: string;
  type: OrderType;
  status: OrderStatus;
  customerName: string | null;
  customerEmail: string | null;
  partySize: number | null;
  description: string | null;
  courierName: string | null;
  createdAt: Date;
  tableId: string | null;
  paymentMethod: string;
  discountPercentage: number;
  needsInvoice: boolean;
  assignedToId: string | null;
  table: {
    number: number;
    name: string | null;
  } | null;
  client: ClientData | null;
  assignedTo: {
    id: string;
    name: string | null;
    username: string;
  } | null;
  items: Array<{
    id: string;
    itemName: string;
    quantity: number;
    price: number;
    originalPrice: number | null;
    product: {
      name: string;
      categoryId: string | null;
    } | null;
  }>;
};

interface OrderDetailsSidebarProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  branchId: string;
  onOrderUpdated?: () => void;
}

const statusColors = {
  [OrderStatus.PENDING]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [OrderStatus.IN_PROGRESS]: "bg-blue-100 text-blue-800 border-blue-200",
  [OrderStatus.COMPLETED]: "bg-green-100 text-green-800 border-green-200",
  [OrderStatus.CANCELED]: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  [OrderStatus.PENDING]: "Pendiente",
  [OrderStatus.IN_PROGRESS]: "En Progreso",
  [OrderStatus.COMPLETED]: "Completada",
  [OrderStatus.CANCELED]: "Cancelada",
};

const typeIcons = {
  [OrderType.DINE_IN]: UtensilsCrossed,
  [OrderType.TAKE_AWAY]: Package,
  [OrderType.DELIVERY]: Truck,
};

const typeLabels = {
  [OrderType.DINE_IN]: "Para Comer Aquí",
  [OrderType.TAKE_AWAY]: "Para Llevar",
  [OrderType.DELIVERY]: "Delivery",
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Efectivo",
  CARD_DEBIT: "Tarjeta de Débito",
  CARD_CREDIT: "Tarjeta de Crédito",
  ACCOUNT: "Cuenta",
  TRANSFER: "Transferencia",
};

export function OrderDetailsSidebar({
  order,
  open,
  onClose,
  branchId,
  onOrderUpdated,
}: OrderDetailsSidebarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCloseOrderDialogOpen, setIsCloseOrderDialogOpen] = useState(false);

  // GG EZ Print printing
  const { printControlTicket, isPrinting } = usePrint();
  const { toast } = useToast();

  if (!order) return null;

  const TypeIcon = typeIcons[order.type];
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  const discount = (subtotal * order.discountPercentage) / 100;
  const total = subtotal - discount;

  const handleEditClick = () => {
    setIsEditing(true);
    // Set current values
    if (order.client) {
      setSelectedClient({
        id: order.client.id,
        name: order.client.name,
        email: order.client.email,
        phone: null,
        birthDate: null,
        taxId: null,
        notes: null,
        addressStreet: null,
        addressNumber: null,
        addressApartment: null,
        addressCity: null,
        discountPercentage: 0,
        preferredPaymentMethod: null,
        hasCurrentAccount: false,
        createdAt: new Date(),
      } as ClientData);
    }
    if (order.assignedTo) {
      setSelectedWaiterId(order.assignedTo.id);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedClient(null);
    setSelectedWaiterId(null);
  };

  const handleSaveChanges = async () => {
    if (!order) return;

    setIsSaving(true);

    // Store previous values for potential error message
    const clientId = selectedClient?.id || null;
    const currentClientId = order.client?.id || null;
    const waiterId = selectedWaiterId || null;
    const currentWaiterId = order.assignedTo?.id || null;

    try {
      // Update client if changed
      if (clientId !== currentClientId) {
        const result = await assignClientToOrder(order.id, clientId);
        if (!result.success) {
          console.error("Failed to update client:", result.error);
        }
      }

      // Update waiter if changed
      if (waiterId !== currentWaiterId) {
        const result = await assignStaffToOrder(order.id, waiterId);
        if (!result.success) {
          console.error("Failed to update waiter:", result.error);
        }
      }

      // Close edit mode after successful save
      setIsEditing(false);
      setSelectedClient(null);
      setSelectedWaiterId(null);

      // Refresh to get updated data
      onOrderUpdated?.();
    } catch (error) {
      console.error("Error updating order:", error);
      // Refresh to restore correct state
      onOrderUpdated?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;

    setIsUpdatingStatus(true);

    try {
      const result = await updateOrderStatus(order.id, newStatus);
      if (result.success) {
        onOrderUpdated?.();
      } else {
        // Refresh to restore correct state
        onOrderUpdated?.();
        console.error("Failed to update status:", result.error);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      // Refresh to restore correct state
      onOrderUpdated?.();
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePrintControlTicket = async () => {
    if (!order) return;

    const waiterName =
      order.assignedTo?.name || order.assignedTo?.username || "—";
    const tableName = order.table?.number?.toString() || "—";

    // Print via QZ Tray - optimistic updates handled by usePrint hook
    const success = await printControlTicket({
      orderId: order.id,
      orderCode: order.publicCode,
      tableName,
      waiterName,
      branchId,
      items: order.items.map((item) => ({
        name: item.itemName,
        quantity: item.quantity,
        price: Number(item.price),
        notes: null,
      })),
      subtotal,
      discountPercentage:
        order.discountPercentage > 0 ? order.discountPercentage : undefined,
      orderType: order.type,
      customerName: order.client?.name || order.customerName || undefined,
    });

    if (!success) {
      toast({
        variant: "destructive",
        title: "Error de impresión",
        description:
          "No se pudo imprimir el ticket. Verifica que QZ Tray esté ejecutándose y que haya impresoras configuradas.",
      });
    }
  };

  const handleCloseOrderSuccess = () => {
    setIsCloseOrderDialogOpen(false);
    onOrderUpdated?.();
    onClose();
  };

  // Check if order can be finalized (not already completed or canceled)
  const canFinalizeOrder =
    order.status !== OrderStatus.COMPLETED &&
    order.status !== OrderStatus.CANCELED &&
    order.items.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 h-full bg-black/50 z-40 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-125 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="bg-red-500 text-white p-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-semibold">DETALLES DE ORDEN</h2>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-orange-600"
                onClick={handleEditClick}
                title="Editar cliente y mesero"
              >
                <Edit className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-orange-600"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  title="Cancelar"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-green-600"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  title="Guardar cambios"
                >
                  <Save className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-orange-600"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Order Info */}
        <div className="p-4 space-y-4 border-b">
          {/* Order Code and Status */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {order.publicCode}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                <TypeIcon className="h-4 w-4" />
                <span>{typeLabels[order.type]}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Select
                value={order.status}
                onValueChange={(value) =>
                  handleStatusChange(value as OrderStatus)
                }
                disabled={isUpdatingStatus}
              >
                <SelectTrigger
                  className={cn("w-45", statusColors[order.status])}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OrderStatus.PENDING}>
                    {statusLabels[OrderStatus.PENDING]}
                  </SelectItem>
                  <SelectItem value={OrderStatus.IN_PROGRESS}>
                    {statusLabels[OrderStatus.IN_PROGRESS]}
                  </SelectItem>
                  <SelectItem value={OrderStatus.COMPLETED}>
                    {statusLabels[OrderStatus.COMPLETED]}
                  </SelectItem>
                  <SelectItem value={OrderStatus.CANCELED}>
                    {statusLabels[OrderStatus.CANCELED]}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date/Time */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              {format(new Date(order.createdAt), "PPp", { locale: es })}
            </span>
          </div>

          {/* Table Info */}
          {order.table && (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-4 w-4 text-gray-400">
                <TableIcon />
              </div>
              <span className="text-gray-600">Mesa {order.table.number}</span>
            </div>
          )}

          {/* Party Size */}
          {order.partySize && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">
                {order.partySize}{" "}
                {/* {order.partySize === 1 ? "persona" : "personas"} */}
              </span>
            </div>
          )}

          {/* Client Info */}
          {isEditing ? (
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">
                Cliente
              </label>
              <ClientPicker
                branchId={branchId}
                selectedClient={selectedClient}
                onSelectClient={setSelectedClient}
                onCreateNew={() => {}}
                disabled={isSaving}
              />
            </div>
          ) : (
            order.client && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Cliente</span>
                    <span className="text-gray-900 font-medium">
                      {order.client.name}
                    </span>
                  </div>
                </div>

                {/* Show delivery info for delivery orders */}
                {order.type === OrderType.DELIVERY && (
                  <div className="ml-6 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <h4 className="text-xs font-semibold text-blue-900">
                      Información de Entrega
                    </h4>
                    <div className="text-xs space-y-1">
                      {order.client.phone && (
                        <p className="text-gray-700">
                          <span className="font-medium">Tel:</span>{" "}
                          {order.client.phone}
                        </p>
                      )}
                      {(order.client.addressStreet ||
                        order.client.addressNumber) && (
                        <p className="text-gray-700">
                          <span className="font-medium">Dirección:</span>{" "}
                          {order.client.addressStreet}{" "}
                          {order.client.addressNumber}
                          {order.client.addressApartment &&
                            ` - Depto ${order.client.addressApartment}`}
                          {order.client.addressCity &&
                            `, ${order.client.addressCity}`}
                        </p>
                      )}
                      {order.client.notes && (
                        <p className="text-gray-700">
                          <span className="font-medium">Notas:</span>{" "}
                          {order.client.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* Waitress/Waiter Info */}
          {isEditing ? (
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">
                Camarero/a
              </label>
              <WaiterPicker
                branchId={branchId}
                selectedWaiterId={selectedWaiterId}
                onSelectWaiter={setSelectedWaiterId}
                disabled={isSaving}
              />
            </div>
          ) : (
            order.assignedTo && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Camarero/a</span>
                  <span className="text-gray-900 font-medium">
                    {order.assignedTo.name || order.assignedTo.username}
                  </span>
                </div>
              </div>
            )
          )}

          {/* Customer Info */}
          {order.customerName && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{order.customerName}</span>
              </div>
              {order.customerEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{order.customerEmail}</span>
                </div>
              )}
            </div>
          )}

          {/* Courier Name */}
          {order.courierName && (
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">
                Repartidor: {order.courierName}
              </span>
            </div>
          )}

          {/* Description */}
          {order.description && (
            <div className="flex items-start gap-2 text-sm">
              <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
              <span className="text-gray-600">{order.description}</span>
            </div>
          )}

          {/* Invoice Required */}
          {order.needsInvoice && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Requiere Factura</span>
            </div>
          )}
        </div>

        {/* Items Section */}
        <div>
          <div className="bg-gray-400 text-white px-4 py-2 font-semibold text-sm">
            PRODUCTOS ({order.items.length})
          </div>

          <div className="divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {item.itemName}
                    </div>
                    <div className="text-sm text-gray-500">
                      Cantidad: {item.quantity}
                    </div>
                    {item.originalPrice &&
                      item.originalPrice !== item.price && (
                        <div className="text-xs text-orange-600">
                          Precio modificado (Original: $
                          {item.originalPrice.toFixed(2)})
                        </div>
                      )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      ${(item.quantity * item.price).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${item.price.toFixed(2)} c/u
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals Section */}
        <div className="border-t">
          {/* Subtotal */}
          <div className="flex justify-between px-4 py-3">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>

          {/* Discount */}
          {order.discountPercentage > 0 && (
            <div className="flex justify-between px-4 py-3 text-orange-600">
              <span>Descuento ({order.discountPercentage}%)</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between px-4 py-4 bg-gray-100 font-semibold text-lg">
            <span>Total</span>
            {/* Payment Method */}
            {order.status === OrderStatus.COMPLETED && (
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  {paymentMethodLabels[order.paymentMethod] ||
                    order.paymentMethod}
                </span>
              </div>
            )}
            <span className="text-red-600">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t space-y-3">
          {canFinalizeOrder && (
            <Button
              onClick={() => setIsCloseOrderDialogOpen(true)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Banknote className="h-4 w-4 mr-2" />
              Finalizar Venta
            </Button>
          )}
          <Button
            onClick={handlePrintControlTicket}
            disabled={isPrinting || order.items.length === 0}
            variant="outline"
            className="w-full"
          >
            <Printer className="h-4 w-4 mr-2" />
            {isPrinting ? "Imprimiendo..." : "Imprimir Ticket de Control"}
          </Button>
        </div>
      </div>

      {/* Close Order Dialog */}
      <CloseOrderDialog
        open={isCloseOrderDialogOpen}
        onOpenChange={setIsCloseOrderDialogOpen}
        order={order}
        branchId={branchId}
        onSuccess={handleCloseOrderSuccess}
      />
    </>
  );
}
