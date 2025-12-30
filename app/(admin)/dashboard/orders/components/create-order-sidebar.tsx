"use client";

import { useState, useEffect } from "react";
import {
  createOrder,
  addOrderItem,
  removeOrderItem,
  updateOrderItemQuantity,
  updateOrderItemPrice,
} from "@/actions/Order";
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
import { X, Save, ShoppingBag, UtensilsCrossed, Truck, Minus, Plus, Trash2 } from "lucide-react";
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
  initialOrderType?: OrderType | null;
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

// Local item for Take-Away/Delivery before order is created
type LocalItem = {
  localId: string;
  productId: string;
  itemName: string;
  quantity: number;
  price: number;
  originalPrice: number;
};

export function CreateOrderSidebar({
  branchId,
  tables,
  open,
  onClose,
  onOrderCreated,
  initialOrderType,
}: CreateOrderSidebarProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [orderType, setOrderType] = useState<OrderType>(
    initialOrderType || OrderType.DINE_IN
  );
  const [tableId, setTableId] = useState<string>("");
  const [partySize, setPartySize] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");

  // Created order state (for Dine-In flow)
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  // Local items state (for Take-Away/Delivery flow before order creation)
  const [localItems, setLocalItems] = useState<LocalItem[]>([]);

  // Create client dialog state
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  // Use cached products from context
  const { products } = useProducts();

  // Update order type when initialOrderType changes
  useEffect(() => {
    if (initialOrderType) {
      setOrderType(initialOrderType);
    }
  }, [initialOrderType]);

  // Check if it's a single-step flow (Take-Away or Delivery)
  const isSingleStepFlow = orderType !== OrderType.DINE_IN;

  // ==================== DINE-IN FLOW (Two-Step) ====================

  const handleCreateDineInOrder = async () => {
    if (!tableId) {
      alert("Por favor selecciona una mesa");
      return;
    }

    setIsLoading(true);

    const result = await createOrder({
      branchId,
      type: OrderType.DINE_IN,
      tableId,
      partySize: partySize ? parseInt(partySize) : null,
      clientId: selectedClient?.id || null,
      assignedToId: selectedWaiterId || null,
      description: description.trim() || null,
    });

    setIsLoading(false);

    if (result.success && result.data) {
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

  const handleSelectProductDineIn = async (product: {
    id: string;
    name: string;
    price: number;
  }) => {
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

  const handleUpdatePriceDineIn = async (itemId: string, price: number) => {
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

  const handleUpdateQuantityDineIn = async (itemId: string, quantity: number) => {
    if (!createdOrder) return;

    setIsLoading(true);
    const result = await updateOrderItemQuantity(itemId, quantity);

    if (result.success && result.data) {
      setCreatedOrder({
        ...createdOrder,
        items: createdOrder.items.map((item) =>
          item.id === itemId
            ? { ...item, quantity: result.data.quantity }
            : item
        ),
      });
    } else {
      alert(result.error || "Error al actualizar la cantidad");
    }
    setIsLoading(false);
  };

  const handleRemoveItemDineIn = async (itemId: string) => {
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

  const handleFinishDineInOrder = () => {
    if (!createdOrder || createdOrder.items.length === 0) {
      alert("Agrega al menos un producto a la orden");
      return;
    }

    resetForm();
    onClose();
    onOrderCreated?.();
  };

  // ==================== TAKE-AWAY/DELIVERY FLOW (Single-Step) ====================

  const handleSelectProductLocal = (product: {
    id: string;
    name: string;
    price: number;
  }) => {
    // Check if product already exists
    const existingItem = localItems.find((item) => item.productId === product.id);
    if (existingItem) {
      // Increment quantity
      setLocalItems(
        localItems.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      // Add new item
      setLocalItems([
        ...localItems,
        {
          localId: `local-${Date.now()}`,
          productId: product.id,
          itemName: product.name,
          quantity: 1,
          price: Number(product.price),
          originalPrice: Number(product.price),
        },
      ]);
    }
  };

  const handleUpdateQuantityLocal = (localId: string, quantity: number) => {
    if (quantity < 1) return;
    setLocalItems(
      localItems.map((item) =>
        item.localId === localId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItemLocal = (localId: string) => {
    setLocalItems(localItems.filter((item) => item.localId !== localId));
  };

  const handleCreateSingleStepOrder = async () => {
    // Validation: at least one product required
    if (localItems.length === 0) {
      alert("Agrega al menos un producto a la orden");
      return;
    }

    setIsLoading(true);

    // Create the order first
    const orderResult = await createOrder({
      branchId,
      type: orderType,
      tableId: null,
      partySize: null,
      clientId: selectedClient?.id || null,
      assignedToId: selectedWaiterId || null,
      description: description.trim() || null,
    });

    if (!orderResult.success || !orderResult.data) {
      setIsLoading(false);
      alert(orderResult.error || "Error al crear la orden");
      return;
    }

    const orderId = orderResult.data.id;

    // Add all items to the order
    for (const item of localItems) {
      const itemResult = await addOrderItem(orderId, {
        productId: item.productId,
        itemName: item.itemName,
        quantity: item.quantity,
        price: item.price,
        originalPrice: item.originalPrice,
      });

      if (!itemResult.success) {
        console.error("Error adding item:", itemResult.error);
      }
    }

    setIsLoading(false);
    resetForm();
    onClose();
    onOrderCreated?.();
  };

  // ==================== SHARED FUNCTIONS ====================

  const resetForm = () => {
    setOrderType(initialOrderType || OrderType.DINE_IN);
    setTableId("");
    setPartySize("");
    setSelectedClient(null);
    setSelectedWaiterId(null);
    setDescription("");
    setClientSearchQuery("");
    setCreatedOrder(null);
    setLocalItems([]);
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
    const hasItems = createdOrder
      ? createdOrder.items.length > 0
      : localItems.length > 0;

    if (hasItems) {
      if (
        confirm(
          createdOrder
            ? "¿Seguro que quieres cerrar? La orden ya fue creada con productos."
            : "¿Seguro que quieres cerrar? Perderás los productos agregados."
        )
      ) {
        if (createdOrder) {
          onOrderCreated?.();
        }
        resetForm();
        onClose();
      }
    } else {
      resetForm();
      onClose();
    }
  };

  // Calculate subtotal for local items
  const localSubtotal = localItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (!open) return null;

  const getOrderTypeIcon = () => {
    switch (orderType) {
      case OrderType.TAKE_AWAY:
        return <ShoppingBag className="h-5 w-5" />;
      case OrderType.DELIVERY:
        return <Truck className="h-5 w-5" />;
      default:
        return <UtensilsCrossed className="h-5 w-5" />;
    }
  };

  const getOrderTypeLabel = () => {
    switch (orderType) {
      case OrderType.TAKE_AWAY:
        return "Para Llevar";
      case OrderType.DELIVERY:
        return "Delivery";
      default:
        return "Para Comer Aquí";
    }
  };

  return (
    <>
      <div
        className="fixed h-svh inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            {getOrderTypeIcon()}
            <div>
              <h2 className="text-xl font-semibold">
                {createdOrder
                  ? `Orden ${createdOrder.publicCode}`
                  : `Nueva Orden - ${getOrderTypeLabel()}`}
              </h2>
              {createdOrder && (
                <p className="text-sm text-gray-500">
                  Agrega productos a la orden
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ==================== DINE-IN: Two-Step Flow ==================== */}
          {orderType === OrderType.DINE_IN && !createdOrder && (
            <>
              {/* Table Selection */}
              <div className="space-y-2">
                <Label htmlFor="table">
                  Mesa <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={tableId}
                  onValueChange={setTableId}
                  disabled={isLoading}
                >
                  <SelectTrigger id="table">
                    <SelectValue placeholder="Seleccionar mesa" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (
                      <SelectItem key={table.id} value={table.id}>
                        Mesa {table.number}{" "}
                        {table.name ? `- ${table.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Party Size */}
              <div className="space-y-2">
                <Label htmlFor="party-size">Personas</Label>
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

              {/* Client Picker */}
              <div className="space-y-2">
                <ClientPicker
                  branchId={branchId}
                  selectedClient={selectedClient}
                  onSelectClient={setSelectedClient}
                  onCreateNew={handleCreateNewClient}
                  label="Cliente"
                  disabled={isLoading}
                />
              </div>

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
                <Label htmlFor="description">Notas / Instrucciones</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleCreateDineInOrder}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? "Creando..." : "Crear Orden y Agregar Productos"}
              </Button>
            </>
          )}

          {/* ==================== DINE-IN: Product Selection (Step 2) ==================== */}
          {orderType === OrderType.DINE_IN && createdOrder && (
            <>
              <div className="space-y-2">
                <ProductPicker
                  products={products}
                  onSelectProduct={handleSelectProductDineIn}
                  label="Agregar Producto"
                  placeholder="Buscar producto..."
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Productos en la Orden ({createdOrder.items.length})
                </Label>
                {createdOrder.items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                    <p>No hay productos en la orden</p>
                    <p className="text-sm mt-1">
                      Busca y selecciona productos arriba
                    </p>
                  </div>
                ) : (
                  <OrderItemsList
                    items={createdOrder.items}
                    onUpdatePrice={handleUpdatePriceDineIn}
                    onUpdateQuantity={handleUpdateQuantityDineIn}
                    onRemoveItem={handleRemoveItemDineIn}
                    disabled={isLoading}
                  />
                )}
              </div>

              {createdOrder.items.length > 0 && (
                <div className="p-4 bg-gray-50 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Subtotal:</span>
                    <span className="text-lg font-bold">
                      $
                      {createdOrder.items
                        .reduce(
                          (sum, item) => sum + item.price * item.quantity,
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ==================== TAKE-AWAY / DELIVERY: Single-Step Flow ==================== */}
          {isSingleStepFlow && (
            <>
              {/* Client Picker */}
              <div className="space-y-2">
                <ClientPicker
                  branchId={branchId}
                  selectedClient={selectedClient}
                  onSelectClient={setSelectedClient}
                  onCreateNew={handleCreateNewClient}
                  label="Cliente"
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
                      <span className="font-medium">Nombre:</span>{" "}
                      {selectedClient.name}
                    </p>
                    {selectedClient.phone && (
                      <p>
                        <span className="font-medium">Teléfono:</span>{" "}
                        {selectedClient.phone}
                      </p>
                    )}
                    {(selectedClient.addressStreet ||
                      selectedClient.addressNumber) && (
                      <p>
                        <span className="font-medium">Dirección:</span>{" "}
                        {selectedClient.addressStreet}{" "}
                        {selectedClient.addressNumber}
                        {selectedClient.addressApartment &&
                          ` - Depto ${selectedClient.addressApartment}`}
                        {selectedClient.addressCity &&
                          `, ${selectedClient.addressCity}`}
                      </p>
                    )}
                    {selectedClient.notes && (
                      <p>
                        <span className="font-medium">Notas:</span>{" "}
                        {selectedClient.notes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Waiter/Staff Picker */}
              <div className="space-y-2">
                <WaiterPicker
                  branchId={branchId}
                  selectedWaiterId={selectedWaiterId}
                  onSelectWaiter={setSelectedWaiterId}
                  label="Atendido por"
                  disabled={isLoading}
                />
              </div>

              {/* Description/Notes */}
              <div className="space-y-2">
                <Label htmlFor="description">Notas / Instrucciones</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Divider */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Productos <span className="text-red-500">*</span>
                </h3>

                {/* Product Picker */}
                <div className="space-y-2 mb-4">
                  <ProductPicker
                    products={products}
                    onSelectProduct={handleSelectProductLocal}
                    label=""
                    placeholder="Buscar producto..."
                    disabled={isLoading}
                  />
                </div>

                {/* Local Items List */}
                {localItems.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 border-2 border-dashed rounded-lg">
                    <p>No hay productos</p>
                    <p className="text-sm mt-1">
                      Agrega al menos un producto para crear la orden
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {localItems.map((item) => (
                      <div
                        key={item.localId}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.itemName}</p>
                          <p className="text-sm text-gray-500">
                            ${item.price.toFixed(2)} c/u
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleUpdateQuantityLocal(
                                item.localId,
                                item.quantity - 1
                              )
                            }
                            disabled={item.quantity <= 1 || isLoading}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleUpdateQuantityLocal(
                                item.localId,
                                item.quantity + 1
                              )
                            }
                            disabled={isLoading}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-right min-w-20">
                          <p className="font-semibold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveItemLocal(item.localId)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtotal */}
                {localItems.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-100 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Subtotal:</span>
                      <span className="text-lg font-bold">
                        ${localSubtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {/* Dine-In Step 2 Footer */}
        {orderType === OrderType.DINE_IN && createdOrder && (
          <div className="border-t p-4 bg-gray-50">
            <Button
              onClick={handleFinishDineInOrder}
              disabled={isLoading || createdOrder.items.length === 0}
              className="w-full"
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              Finalizar Orden
            </Button>
          </div>
        )}

        {/* Take-Away / Delivery Footer */}
        {isSingleStepFlow && (
          <div className="border-t p-4 bg-gray-50">
            <Button
              onClick={handleCreateSingleStepOrder}
              disabled={isLoading || localItems.length === 0}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                "Creando..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Crear Orden
                </>
              )}
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
