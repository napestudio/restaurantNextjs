"use client";

import { formatCurrency } from "@/lib/currency";
import { calculateDiscountAmount } from "@/lib/discount";
import React from "react";
import type { ClientData } from "@/actions/clients";
import {
  assignClientToOrder,
  assignStaffToOrder,
  updateOrderStatus,
  updateDeliveryFee,
  updateDiscount,
  addOrderItems,
  getAvailableProductsForOrder,
  updateOrderType,
} from "@/actions/Order";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getDeliveryConfig } from "@/actions/DeliveryConfig";
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
  ArrowLeftRight,
  Clock,
  CreditCard,
  DollarSign,
  Edit,
  FileText,
  Mail,
  Package,
  Percent,
  Printer,
  Save,
  Truck,
  User,
  UtensilsCrossed,
  X,
  Banknote,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { useState } from "react";
import TableIcon from "../ui/icons/TableIcon";
import { ClientPicker } from "./client-picker";
import { WaiterPicker } from "./waiter-picker";
import { CloseOrderDialog } from "./close-order-dialog";
import { CreateClientDialog } from "./create-client-dialog";
import { GenerateInvoiceDialog } from "./generate-invoice-dialog";
import { ProductPicker } from "./product-picker";
import { PreOrderItemsList, type PreOrderItem } from "./pre-order-items-list";
import { useToast } from "@/hooks/use-toast";
import type { OrderProduct } from "@/types/products";

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
  discountType: string;
  deliveryFee: number;
  needsInvoice: boolean;
  assignedToId: string | null;
  table: {
    number: number;
    name: string | null;
    sectorId: string | null;
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
    notes: string | null;
    product: {
      name: string;
      categoryId: string | null;
    } | null;
  }>;
  invoices?: Array<{
    id: string;
    status: string;
  }>;
  cashMovements?: Array<{
    paymentMethod: string;
    amount: number;
  }>;
};

interface OrderDetailsSidebarProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  branchId: string;
  onOrderUpdated?: () => void;
  canChangeOrderType?: boolean;
  onOrderTypeChanged?: (newType: OrderType) => void;
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
  PAYMENT_LINK: "Link de pago",
  QR_CODE: "QR",
};

export function OrderDetailsSidebar({
  order,
  open,
  onClose,
  branchId,
  onOrderUpdated,
  canChangeOrderType,
  onOrderTypeChanged,
}: OrderDetailsSidebarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [discountTypeInput, setDiscountTypeInput] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCloseOrderDialogOpen, setIsCloseOrderDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [currentDeliveryFee, setCurrentDeliveryFee] = useState(order?.deliveryFee ?? 0);

  // Type change state
  const [typeChangeConfirmOpen, setTypeChangeConfirmOpen] = useState(false);
  const [pendingNewType, setPendingNewType] = useState<OrderType | null>(null);
  const [isChangingType, setIsChangingType] = useState(false);

  // Add items state
  const [preOrderItems, setPreOrderItems] = useState<PreOrderItem[]>([]);
  const [availableProducts, setAvailableProducts] = useState<OrderProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isConfirmingItems, setIsConfirmingItems] = useState(false);

  // GG EZ Print printing
  const { printControlTicket, printPreOrderTicket, printOrderItems, isPrinting } = usePrint();
  const { toast } = useToast();

  React.useEffect(() => {
    setCurrentDeliveryFee(order?.deliveryFee ?? 0);
  }, [order?.deliveryFee]);

  // Reset pre-order items and reload products when switching between orders
  React.useEffect(() => {
    setPreOrderItems([]);
    if (!order?.id) return;
    setIsLoadingProducts(true);
    getAvailableProductsForOrder(branchId, order.type).then((products) => {
      setAvailableProducts(products);
      setIsLoadingProducts(false);
    });
  }, [order?.id, order?.type, branchId]);

  React.useEffect(() => {
    if (order?.type !== OrderType.DELIVERY || (order?.deliveryFee ?? 0) !== 0) return;
    getDeliveryConfig(branchId).then((config) => {
      const fee = config?.data?.deliveryFee;
      if (fee && fee > 0) {
        setCurrentDeliveryFee(fee);
        updateDeliveryFee(order.id, fee);
      }
    });
  }, [order?.id, order?.type, order?.deliveryFee, branchId]);

  if (!order) return null;

  const TypeIcon = typeIcons[order.type];
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  const effectiveDiscount = isEditing
    ? (parseFloat(discountInput) || 0)
    : order.discountPercentage;
  const effectiveDiscountType = isEditing
    ? discountTypeInput
    : (order.discountType as "PERCENTAGE" | "FIXED") || "PERCENTAGE";
  const discount = calculateDiscountAmount(subtotal, effectiveDiscount, effectiveDiscountType);
  const deliveryFeeValue = order.type === OrderType.DELIVERY ? currentDeliveryFee : 0;
  const total = subtotal - discount + deliveryFeeValue;

  const handleClientSelect = (client: ClientData | null) => {
    setSelectedClient(client);
    setDiscountInput((client?.discountPercentage ?? 0).toString());
    setDiscountTypeInput(
      (client?.discountType as "PERCENTAGE" | "FIXED") || "PERCENTAGE",
    );
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setDiscountInput(order.discountPercentage.toString());
    setDiscountTypeInput(
      (order.discountType as "PERCENTAGE" | "FIXED") || "PERCENTAGE",
    );
    // Set current values
    if (order.client) {
      setSelectedClient(order.client);
    }
    if (order.assignedTo) {
      setSelectedWaiterId(order.assignedTo.id);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedClient(null);
    setSelectedWaiterId(null);
    setDiscountInput("");
    setDiscountTypeInput("PERCENTAGE");
  };

  const handleCreateNewClient = (searchQuery: string) => {
    setClientSearchQuery(searchQuery);
    setShowCreateClientDialog(true);
  };

  const handleClientCreated = (client: ClientData) => {
    setSelectedClient(client);
    setShowCreateClientDialog(false);
  };

  const handleSelectProduct = (product: OrderProduct) => {
    setPreOrderItems((prev) => [
      ...prev,
      {
        productId: product.id,
        itemName: product.name,
        quantity: 1,
        price: Number(product.price),
        originalPrice: Number(product.price),
        notes: undefined,
        categoryId: product.categoryId,
      },
    ]);
  };

  const handleConfirmAddItems = async () => {
    if (!order || preOrderItems.length === 0) return;
    setIsConfirmingItems(true);

    // Capture before clearing
    const itemsToPrint = [...preOrderItems];

    const result = await addOrderItems(order.id, preOrderItems);
    if (result.success) {
      setPreOrderItems([]);
      onOrderUpdated?.();

      // Auto-print station comandas (fire and forget)
      const tableName = order.table?.number?.toString() || "—";
      printOrderItems(
        { orderId: order.id, orderCode: order.publicCode, tableName, branchId },
        itemsToPrint.map((item) => ({
          productId: item.productId,
          itemName: item.itemName,
          quantity: item.quantity,
          notes: item.notes ?? null,
          categoryId: item.categoryId,
        })),
      );
    } else {
      toast({ variant: "destructive", title: result.error || "Error al agregar productos" });
    }
    setIsConfirmingItems(false);
  };

  const handleDeliveryFeeBlur = async () => {
    const result = await updateDeliveryFee(order.id, currentDeliveryFee);
    if (!result.success) {
      toast({ variant: "destructive", title: "Error al actualizar el costo de envío" });
    } else {
      onOrderUpdated?.();
    }
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

      // Update discount if changed (user's input wins over client's auto-discount)
      const rawDiscount = parseFloat(discountInput) || 0;
      const finalDiscount =
        discountTypeInput === "PERCENTAGE"
          ? Math.max(0, Math.min(100, rawDiscount))
          : Math.max(0, rawDiscount);
      if (
        finalDiscount !== order.discountPercentage ||
        discountTypeInput !== order.discountType ||
        clientId !== currentClientId
      ) {
        const result = await updateDiscount(
          order.id,
          finalDiscount,
          discountTypeInput,
        );
        if (!result.success) {
          console.error("Failed to update discount:", result.error);
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
        toast({
          title: "Estado actualizado",
          description: `La orden ahora está ${statusLabels[newStatus].toLowerCase()}`,
        });
        onOrderUpdated?.();
      } else {
        // Show error message from backend
        toast({
          title: "Error",
          description: result.error || "No se pudo actualizar el estado",
          variant: "destructive",
        });
        // Refresh to restore correct state
        onOrderUpdated?.();
        console.error("Failed to update status:", result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar el estado de la orden",
        variant: "destructive",
      });
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
      order.assignedTo?.name || order.assignedTo?.username || undefined;
    const tableName = order.table?.number?.toString() || "—";
    const isDelivery = order.type === OrderType.DELIVERY;
    const showPaymentMethod =
      order.type === OrderType.DELIVERY || order.type === OrderType.TAKE_AWAY;

    let deliveryAddress: string | undefined;
    if (isDelivery && order.client) {
      const parts = [
        order.client.addressStreet,
        order.client.addressNumber,
        order.client.addressApartment,
      ].filter(Boolean);
      if (parts.length > 0) deliveryAddress = parts.join(" ");
    }

    // Print via gg-ez-print - optimistic updates handled by usePrint hook
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
        notes: item.notes ?? null,
      })),
      subtotal,
      discountPercentage:
        order.discountPercentage > 0 ? order.discountPercentage : undefined,
      discountType:
        order.discountPercentage > 0 ? order.discountType : undefined,
      deliveryFee: isDelivery && currentDeliveryFee > 0 ? currentDeliveryFee : undefined,
      orderType: order.type,
      customerName: order.client?.name || order.customerName || undefined,
      clientPhone: isDelivery ? (order.client?.phone ?? undefined) : undefined,
      deliveryAddress: isDelivery ? deliveryAddress : undefined,
      deliveryCity: isDelivery ? (order.client?.addressCity ?? undefined) : undefined,
      deliveryNotes: isDelivery ? (order.client?.notes ?? undefined) : undefined,
      payments: order.cashMovements && order.cashMovements.length > 0
        ? order.cashMovements.map((m) => ({ method: m.paymentMethod, amount: m.amount }))
        : undefined,
      paymentMethod: showPaymentMethod
        ? (paymentMethodLabels[order.paymentMethod] ?? order.paymentMethod)
        : undefined,
      orderCreatedAt: order.createdAt instanceof Date
        ? order.createdAt.toISOString()
        : order.createdAt,
    });

    if (!success) {
      toast({
        variant: "destructive",
        title: "Error de impresión",
        description:
          "No se pudo imprimir el ticket. Verifica que gg-ez-print esté ejecutándose y que haya impresoras configuradas.",
      });
    }
  };

  const handlePrintPreOrderTicket = async () => {
    if (!order) return;
    const tableName = order.table?.number?.toString() || "—";
    const success = await printPreOrderTicket({
      orderId: order.id,
      orderCode: order.publicCode,
      tableName,
      branchId,
      items: order.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        notes: item.notes ?? null,
      })),
    });
    if (!success) {
      toast({
        variant: "destructive",
        title: "Error de impresión",
        description:
          "No se pudo imprimir la comanda. Verifica que gg-ez-print esté ejecutándose y que haya impresoras configuradas.",
      });
    }
  };

  const handleCloseOrderSuccess = () => {
    setIsCloseOrderDialogOpen(false);
    onOrderUpdated?.();
    onClose();
  };

  const handleTypeChangeTrigger = (newType: OrderType) => {
    setPendingNewType(newType);
    setTypeChangeConfirmOpen(true);
  };

  const handleTypeChangeConfirm = async () => {
    if (!pendingNewType) return;
    setIsChangingType(true);
    const result = await updateOrderType(order.id, pendingNewType);
    if (result.success) {
      setTypeChangeConfirmOpen(false);
      setPendingNewType(null);
      toast({ title: "Tipo de orden actualizado" });
      onOrderTypeChanged?.(pendingNewType);
    } else {
      toast({
        variant: "destructive",
        title: result.error ?? "Error al cambiar el tipo de orden",
      });
    }
    setIsChangingType(false);
  };

  // Whether type can be changed for this order
  const canChangeType =
    canChangeOrderType &&
    (order.type === OrderType.TAKE_AWAY || order.type === OrderType.DELIVERY) &&
    order.status !== OrderStatus.COMPLETED &&
    order.status !== OrderStatus.CANCELED;

  const oppositeType =
    order.type === OrderType.TAKE_AWAY ? OrderType.DELIVERY : OrderType.TAKE_AWAY;

  // Check if order can be finalized (not already completed or canceled)
  const canFinalizeOrder =
    order.status !== OrderStatus.COMPLETED &&
    order.status !== OrderStatus.CANCELED &&
    order.items.length > 0;

  const canAddItems =
    order.status !== OrderStatus.COMPLETED &&
    order.status !== OrderStatus.CANCELED;

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
                {canChangeType && (
                  <button
                    onClick={() => handleTypeChangeTrigger(oppositeType)}
                    className="ml-1 p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title={`Cambiar a ${typeLabels[oppositeType]}`}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </button>
                )}
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
                  {/* Only show COMPLETED if order is already completed (for visibility) */}
                  {order.status === OrderStatus.COMPLETED && (
                    <SelectItem value={OrderStatus.COMPLETED} disabled>
                      {statusLabels[OrderStatus.COMPLETED]} (Pagada)
                    </SelectItem>
                  )}
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
                onSelectClient={handleClientSelect}
                onCreateNew={handleCreateNewClient}
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

          {/* Product Picker — always visible for active orders */}
          {canAddItems && (
            <div className="p-4 border-b space-y-3">
              <ProductPicker
                products={availableProducts}
                onSelectProduct={handleSelectProduct}
                onSubmitPreOrder={
                  preOrderItems.length > 0 ? handleConfirmAddItems : undefined
                }
                placeholder="Buscar producto..."
                disabled={isConfirmingItems || isLoadingProducts}
              />
              {preOrderItems.length > 0 && (
                <>
                  <PreOrderItemsList
                    items={preOrderItems}
                    onUpdateItem={(index, item) =>
                      setPreOrderItems((prev) =>
                        prev.map((x, i) => (i === index ? item : x)),
                      )
                    }
                    onRemoveItem={(index) =>
                      setPreOrderItems((prev) =>
                        prev.filter((_, i) => i !== index),
                      )
                    }
                    disabled={isConfirmingItems}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setPreOrderItems([])}
                      disabled={isConfirmingItems}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleConfirmAddItems}
                      disabled={isConfirmingItems}
                    >
                      {isConfirmingItems ? "Guardando..." : "Confirmar"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

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
                          Precio modificado (Original: {formatCurrency(item.originalPrice)})
                        </div>
                      )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(item.quantity * item.price)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(item.price)}{" "}
                      c/u
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
            <span className="font-medium">
              {formatCurrency(subtotal)}
            </span>
          </div>

          {/* Discount */}
          {isEditing ? (
            <div className="flex justify-between items-center px-4 py-3 text-orange-600">
              <div className="flex items-center gap-1">
                <span>Descuento</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant={discountTypeInput === "PERCENTAGE" ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setDiscountTypeInput("PERCENTAGE")}
                >
                  <Percent className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant={discountTypeInput === "FIXED" ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setDiscountTypeInput("FIXED")}
                >
                  <DollarSign className="h-3 w-3" />
                </Button>
                <div className="relative w-24">
                  <NumberInput
                    min="0"
                    max={discountTypeInput === "PERCENTAGE" ? "100" : undefined}
                    step="0.01"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="h-8 pr-6 text-right"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-orange-600">
                    {discountTypeInput === "PERCENTAGE" ? "%" : "$"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            order.discountPercentage > 0 && (
              <div className="flex justify-between px-4 py-3 text-orange-600">
                <span>
                  Descuento (
                  {order.discountType === "FIXED"
                    ? formatCurrency(order.discountPercentage)
                    : `${order.discountPercentage}%`}
                  )
                </span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )
          )}

          {/* Delivery Fee */}
          {order.type === OrderType.DELIVERY && (
            <div className="px-4 py-3 flex justify-between items-center text-blue-600">
              <span>Costo de envío</span>
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
                <NumberInput
                  min="0"
                  step="0.01"
                  value={currentDeliveryFee}
                  onChange={(e) => setCurrentDeliveryFee(parseFloat(e.target.value) || 0)}
                  onBlur={handleDeliveryFeeBlur}
                  disabled={order.status === OrderStatus.COMPLETED}
                  className="h-8 pl-6 text-right"
                />
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between px-4 py-4 bg-gray-100 font-semibold text-lg">
            <span>Total</span>
            <span className="text-red-600">
              {formatCurrency(total)}
            </span>
          </div>

          {/* Payment breakdown — shown below total for completed orders */}
          {order.status === OrderStatus.COMPLETED && (
            <div className="border-t">
              {order.cashMovements && order.cashMovements.length > 0 ? (
                order.cashMovements.map((m, i) => (
                  <div key={i} className="flex justify-between items-center px-4 py-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>{paymentMethodLabels[m.paymentMethod] ?? m.paymentMethod}</span>
                    </div>
                    <span className="font-medium text-gray-700">
                      {formatCurrency(m.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{paymentMethodLabels[order.paymentMethod] ?? order.paymentMethod}</span>
                </div>
              )}
            </div>
          )}
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
          {order.status === OrderStatus.COMPLETED &&
            !order.invoices?.some(
              (invoice) => invoice.status === "EMITTED",
            ) && (
              <Button
                onClick={() => setIsInvoiceDialogOpen(true)}
                variant="default"
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generar Factura
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
          <Button
            onClick={handlePrintPreOrderTicket}
            disabled={isPrinting || order.items.length === 0}
            variant="outline"
            className="w-full"
          >
            <Printer className="h-4 w-4 mr-2" />
            {isPrinting ? "Imprimiendo..." : "Imprimir Comanda"}
          </Button>
        </div>
      </div>

      {/* Close Order Dialog */}
      <CloseOrderDialog
        open={isCloseOrderDialogOpen}
        onOpenChange={setIsCloseOrderDialogOpen}
        order={order}
        branchId={branchId}
        sectorId={order.table?.sectorId}
        onSuccess={handleCloseOrderSuccess}
      />

      {/* Create Client Dialog */}
      <CreateClientDialog
        open={showCreateClientDialog}
        onOpenChange={setShowCreateClientDialog}
        branchId={branchId}
        onSuccess={handleClientCreated}
        initialName={clientSearchQuery}
      />

      {/* Generate Invoice Dialog */}
      <GenerateInvoiceDialog
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        orderId={order.id}
        orderTotal={total}
        onSuccess={() => {
          toast({
            title: "Factura generada",
            description: "La factura se generó correctamente",
          });
          onOrderUpdated?.();
        }}
      />

      {/* Change Order Type Confirmation Dialog */}
      <Dialog open={typeChangeConfirmOpen} onOpenChange={setTypeChangeConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar tipo de orden</DialogTitle>
          </DialogHeader>
          {pendingNewType && (
            <div className="py-2 space-y-3">
              <p className="text-sm text-gray-700">
                ¿Cambiar de{" "}
                <span className="font-semibold">{typeLabels[order.type]}</span>{" "}
                a{" "}
                <span className="font-semibold">{typeLabels[pendingNewType]}</span>?
              </p>
              <p className="text-xs text-gray-500">
                Los precios de los productos se recalcularán según el nuevo tipo.
                {pendingNewType === OrderType.DELIVERY
                  ? " Se aplicará el costo de envío configurado."
                  : " Se eliminará el costo de envío."}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTypeChangeConfirmOpen(false)}
              disabled={isChangingType}
            >
              Cancelar
            </Button>
            <Button onClick={handleTypeChangeConfirm} disabled={isChangingType}>
              {isChangingType ? "Cambiando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
