"use client";

import { useState } from "react";
import { createOrder, addOrderItem, removeOrderItem, updateOrderItemQuantity, updateOrderItemPrice } from "@/actions/Order";
import { OrderType } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Save } from "lucide-react";
import { ClientPicker } from "@/components/dashboard/client-picker";
import { WaiterPicker } from "@/components/dashboard/waiter-picker";
import { CreateClientDialog } from "@/components/dashboard/create-client-dialog";
import { ProductPicker } from "@/components/dashboard/product-picker";
import { OrderItemsList } from "@/components/dashboard/order-items-list";
import { type ClientData } from "@/actions/clients";
import { useProducts } from "@/contexts/products-context";

interface CreateOrderSidebarProps {
  branchId: string;
  tables: Array<{
    id: string;
    number: number;
    name: string | null;
  }>;
  open: boolean;
  onClose: () => void;
  onOrderCreated?: () => void;
}

type OrderItem = {
  id: string;
  itemName: string;
  quantity: number;
  price: number;
  originalPrice: number | null;
};

type CreatedOrder = {
  id: string;
  publicCode: string;
  type: OrderType;
  items: OrderItem[];
};

export function CreateOrderSidebar({
  branchId,
  tables,
  open,
  onClose,
  onOrderCreated,
}: CreateOrderSidebarProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [tableId, setTableId] = useState<string>("");
  const [partySize, setPartySize] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");

  // Created order state
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  // Create client dialog state
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  // Use cached products from context
  const { products } = useProducts();

  const handleCreateOrder = async () => {
    // Validation
    if (orderType === OrderType.DINE_IN && !tableId) {
      alert("Por favor selecciona una mesa para órdenes de comer aquí");
      return;
    }

    if (orderType === OrderType.DELIVERY && !selectedClient) {
      alert("Por favor selecciona un cliente para órdenes de delivery");
      return;
    }

    setIsLoading(true);

    const result = await createOrder({
      branchId,
      type: orderType,
      tableId: orderType === OrderType.DINE_IN ? tableId : null,
      partySize: partySize ? parseInt(partySize) : null,
      clientId: selectedClient?.id || null,
      assignedToId: selectedWaiterId || null,
      description: description.trim() || null,
    });

    setIsLoading(false);

    if (result.success && result.data) {
      // Set the created order so user can add items
      setCreatedOrder({
        id: result.data.id,
        publicCode: result.data.publicCode,
        type: result.data.type,
        items: [],
      });
    } else {
      alert(result.error || "Error al crear la orden");
    }
  };

  const handleSelectProduct = async (product: { id: string; name: string; price: number }) => {
    if (!createdOrder) return;

    setIsLoading(true);
    const result = await addOrderItem(createdOrder.id, {
      productId: product.id,
      itemName: product.name,
      quantity: 1,
      price: Number(product.price),
      originalPrice: Number(product.price),
    });

    if (result.success && result.data) {
      // Update local state
      setCreatedOrder({
        ...createdOrder,
        items: [
          ...createdOrder.items,
          {
            id: result.data.id,
            itemName: result.data.itemName,
            quantity: result.data.quantity,
            price: result.data.price,
            originalPrice: result.data.originalPrice,
          },
        ],
      });
    } else {
      alert(result.error || "Error al agregar el producto");
    }
    setIsLoading(false);
  };

  const handleUpdatePrice = async (itemId: string, price: number) => {
    if (!createdOrder) return;

    setIsLoading(true);
    const result = await updateOrderItemPrice(itemId, price);

    if (result.success && result.data) {
      setCreatedOrder({
        ...createdOrder,
        items: createdOrder.items.map((item) =>
          item.id === itemId ? { ...item, price: result.data.price } : item
        ),
      });
    } else {
      alert(result.error || "Error al actualizar el precio");
    }
    setIsLoading(false);
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (!createdOrder) return;

    setIsLoading(true);
    const result = await updateOrderItemQuantity(itemId, quantity);

    if (result.success && result.data) {
      setCreatedOrder({
        ...createdOrder,
        items: createdOrder.items.map((item) =>
          item.id === itemId ? { ...item, quantity: result.data.quantity } : item
        ),
      });
    } else {
      alert(result.error || "Error al actualizar la cantidad");
    }
    setIsLoading(false);
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!createdOrder) return;

    setIsLoading(true);
    const result = await removeOrderItem(itemId);

    if (result.success) {
      setCreatedOrder({
        ...createdOrder,
        items: createdOrder.items.filter((item) => item.id !== itemId),
      });
    } else {
      alert(result.error || "Error al eliminar el producto");
    }
    setIsLoading(false);
  };

  const handleFinishOrder = () => {
    if (!createdOrder || createdOrder.items.length === 0) {
      alert("Agrega al menos un producto a la orden");
      return;
    }

    // Close sidebar and notify parent - pass true to indicate success
    const orderId = createdOrder.id;
    resetForm();
    onClose();
    onOrderCreated?.();
  };

  const resetForm = () => {
    setOrderType(OrderType.DINE_IN);
    setTableId("");
    setPartySize("");
    setSelectedClient(null);
    setSelectedWaiterId(null);
    setDescription("");
    setClientSearchQuery("");
    setCreatedOrder(null);
  };

  const handleCreateNewClient = (searchQuery: string) => {
    setClientSearchQuery(searchQuery);
    setShowCreateClientDialog(true);
  };

  const handleClientCreated = (client: ClientData) => {
    setSelectedClient(client);
    setShowCreateClientDialog(false);
  };

  const handleClose = () => {
    if (createdOrder && createdOrder.items.length > 0) {
      if (confirm("¿Seguro que quieres cerrar? La orden ya fue creada con productos.")) {
        resetForm();
        onClose();
        onOrderCreated?.();
      }
    } else {
      resetForm();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold">
              {createdOrder ? `Orden ${createdOrder.publicCode}` : "Nueva Orden"}
            </h2>
            {createdOrder && (
              <p className="text-sm text-gray-500">
                Agrega productos a la orden
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!createdOrder ? (
            /* Order Creation Form */
            <>
              {/* Order Type */}
              <div className="space-y-2">
                <Label htmlFor="order-type">
                  Tipo de Orden <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={orderType}
                  onValueChange={(value) => setOrderType(value as OrderType)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="order-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={OrderType.DINE_IN}>Para Comer Aquí</SelectItem>
                    <SelectItem value={OrderType.TAKE_AWAY}>Para Llevar</SelectItem>
                    <SelectItem value={OrderType.DELIVERY}>Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table Selection - Only for DINE_IN */}
              {orderType === OrderType.DINE_IN && (
                <div className="space-y-2">
                  <Label htmlFor="table">
                    Mesa <span className="text-red-500">*</span>
                  </Label>
                  <Select value={tableId} onValueChange={setTableId} disabled={isLoading}>
                    <SelectTrigger id="table">
                      <SelectValue placeholder="Seleccionar mesa" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          Mesa {table.number} {table.name ? `- ${table.name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Party Size - Only for DINE_IN */}
              {orderType === OrderType.DINE_IN && (
                <div className="space-y-2">
                  <Label htmlFor="party-size">
                    Personas <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="party-size"
                    type="number"
                    min="1"
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                    placeholder="Ej: 4"
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* Client Picker */}
              <div className="space-y-2">
                <ClientPicker
                  branchId={branchId}
                  selectedClient={selectedClient}
                  onSelectClient={setSelectedClient}
                  onCreateNew={handleCreateNewClient}
                  label={orderType === OrderType.DELIVERY ? "Cliente *" : "Cliente"}
                  disabled={isLoading}
                />
              </div>

              {/* Show Client Info for Delivery */}
              {orderType === OrderType.DELIVERY && selectedClient && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  <h3 className="font-semibold text-sm text-blue-900">
                    Información de Entrega
                  </h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Nombre:</span> {selectedClient.name}
                    </p>
                    {selectedClient.phone && (
                      <p>
                        <span className="font-medium">Teléfono:</span> {selectedClient.phone}
                      </p>
                    )}
                    {(selectedClient.addressStreet || selectedClient.addressNumber) && (
                      <p>
                        <span className="font-medium">Dirección:</span>{" "}
                        {selectedClient.addressStreet} {selectedClient.addressNumber}
                        {selectedClient.addressApartment && ` - Depto ${selectedClient.addressApartment}`}
                        {selectedClient.addressCity && `, ${selectedClient.addressCity}`}
                      </p>
                    )}
                    {selectedClient.notes && (
                      <p>
                        <span className="font-medium">Notas:</span> {selectedClient.notes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Waiter Picker */}
              <div className="space-y-2">
                <WaiterPicker
                  branchId={branchId}
                  selectedWaiterId={selectedWaiterId}
                  onSelectWaiter={setSelectedWaiterId}
                  label="Mesero/Cajero"
                  disabled={isLoading}
                />
              </div>

              {/* Description/Notes */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Notas / Instrucciones
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Sin cebolla, bien cocido, entrega urgente..."
                  disabled={isLoading}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleCreateOrder}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? "Creando..." : "Crear Orden y Agregar Productos"}
              </Button>
            </>
          ) : (
            /* Product Selection */
            <>
              {/* Product Picker */}
              <div className="space-y-2">
                <ProductPicker
                  products={products}
                  onSelectProduct={handleSelectProduct}
                  label="Agregar Producto"
                  placeholder="Buscar producto..."
                  disabled={isLoading}
                />
              </div>

              {/* Order Items List */}
              <div className="space-y-2">
                <Label>Productos en la Orden ({createdOrder.items.length})</Label>
                {createdOrder.items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                    <p>No hay productos en la orden</p>
                    <p className="text-sm mt-1">Busca y selecciona productos arriba</p>
                  </div>
                ) : (
                  <OrderItemsList
                    items={createdOrder.items}
                    onUpdatePrice={handleUpdatePrice}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    disabled={isLoading}
                  />
                )}
              </div>

              {/* Order Summary */}
              {createdOrder.items.length > 0 && (
                <div className="p-4 bg-gray-50 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Subtotal:</span>
                    <span className="text-lg font-bold">
                      $
                      {createdOrder.items
                        .reduce((sum, item) => sum + item.price * item.quantity, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {createdOrder && (
          <div className="border-t p-4 bg-gray-50">
            <Button
              onClick={handleFinishOrder}
              disabled={isLoading || createdOrder.items.length === 0}
              className="w-full"
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              Finalizar Orden
            </Button>
          </div>
        )}

        {/* Create Client Dialog */}
        <CreateClientDialog
          open={showCreateClientDialog}
          onOpenChange={setShowCreateClientDialog}
          branchId={branchId}
          onSuccess={handleClientCreated}
          initialName={clientSearchQuery}
        />
      </div>
    </>
  );
}
