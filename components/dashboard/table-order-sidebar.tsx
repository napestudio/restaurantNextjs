"use client";

import {
  addOrderItem,
  createTableOrder,
  getAvailableTablesForMove,
  moveOrderToTable,
  removeOrderItem,
  updateDiscount,
} from "@/actions/Order";
import { type ClientData } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProducts } from "@/contexts/products-context";
import { useOrdersData } from "@/hooks/use-orders-data";
import {
  ArrowRightLeft,
  DollarSign,
  Percent,
  Printer,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ClientPicker } from "./client-picker";
import { CloseTableDialog } from "./close-table-dialog";
import { CommittedOrderItemsList } from "./committed-order-items-list";
import { CreateClientDialog } from "./create-client-dialog";
import { EditOrderDialog } from "./edit-order-dialog";
import { MoveOrderDialog } from "./move-order-dialog";
import { OrderTabs } from "./order-tabs";
import { PreOrderItemsList, type PreOrderItem } from "./pre-order-items-list";
import { ProductPicker } from "./product-picker";
import { WaiterPicker } from "./waiter-picker";

interface TableOrderSidebarProps {
  tableId: string | null;
  tableNumber: number | null;
  tableIsShared?: boolean;
  tableSectorId?: string | null;
  branchId: string;
  onClose: () => void;
  onOrderUpdated: (tableId: string) => void;
}

type Product = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: { name: string } | null;
  price: number;
};

export function TableOrderSidebar({
  tableId,
  tableNumber,
  tableIsShared = false,
  tableSectorId,
  branchId,
  onClose,
  onOrderUpdated,
}: TableOrderSidebarProps) {
  const [partySize, setPartySize] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);
  const [showEditOrderDialog, setShowEditOrderDialog] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [availableTables, setAvailableTables] = useState<
    Array<{
      id: string;
      number: number;
      name: string | null;
      capacity: number;
      isShared: boolean;
      sectorId: string | null;
    }>
  >([]);

  // Pre-order state: items that haven't been confirmed/added to the actual order yet
  const [preOrderItems, setPreOrderItems] = useState<PreOrderItem[]>([]);

  // Use cached products from context
  const { products } = useProducts();

  // Use SWR for order data fetching with auto-refresh
  const {
    orders: allOrders,
    order: singleOrder,
    isLoading: isLoadingOrders,
    refresh,
  } = useOrdersData({
    tableId,
    isShared: tableIsShared,
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true, // Refresh when tab becomes visible
    revalidateOnReconnect: true, // Refresh when network reconnects
  });

  // Derive current order from allOrders (for shared) or singleOrder (for non-shared)
  const order = tableIsShared
    ? (Array.isArray(allOrders)
        ? allOrders.find((o) => o.id === selectedOrderId)
        : null) || null
    : singleOrder;

  // Combined loading state
  const isLoading = isLoadingOrders || isLoadingAction;

  // Reset state when table changes
  useEffect(() => {
    if (tableId) {
      setPartySize("");
      setSelectedOrderId(null);
      setSelectedClient(null);
      setSelectedWaiterId(null);
      setClientSearchQuery("");
    }
  }, [tableId]);

  // Auto-select first order when orders load
  useEffect(() => {
    if (
      tableIsShared &&
      Array.isArray(allOrders) &&
      allOrders.length > 0 &&
      !selectedOrderId
    ) {
      setSelectedOrderId(allOrders[0].id);
    }
  }, [tableIsShared, allOrders, selectedOrderId]);

  // Update party size when order changes
  useEffect(() => {
    if (order) {
      setPartySize(order.partySize?.toString() || "");
    }
  }, [order]);

  const handleCreateOrder = async () => {
    if (!tableId || !partySize || parseInt(partySize) <= 0) {
      alert("Por favor ingresa el número de comensales");
      return;
    }

    setIsLoadingAction(true);
    const result = await createTableOrder(
      tableId,
      branchId,
      parseInt(partySize),
      selectedClient?.id || null,
      selectedWaiterId || null
    );

    if (result.success && result.data) {
      // Refresh orders data with SWR
      await refresh();

      // Select the newly created order
      setSelectedOrderId(result.data.id);

      // Reset form inputs for next order
      setPartySize("");
      setSelectedClient(null);
      setSelectedWaiterId(null);
      setClientSearchQuery("");

      // Update table status
      onOrderUpdated(tableId);
    } else {
      alert(result.error || "Error al crear la orden");
    }
    setIsLoadingAction(false);
  };

  const handleCreateNewClient = (searchQuery: string) => {
    setClientSearchQuery(searchQuery);
    setShowCreateClientDialog(true);
  };

  const handleClientCreated = (client: ClientData) => {
    setSelectedClient(client);
    setShowCreateClientDialog(false);
  };


  const handleSelectProduct = (product: Product) => {
    // Add to pre-order state instead of directly to order
    setPreOrderItems((prev) => [
      ...prev,
      {
        productId: product.id,
        itemName: product.name,
        quantity: 1,
        price: Number(product.price),
        originalPrice: Number(product.price),
        notes: undefined,
      },
    ]);
  };

  const handleUpdatePreOrderItem = (index: number, item: PreOrderItem) => {
    setPreOrderItems((prev) =>
      prev.map((existingItem, i) => (i === index ? item : existingItem))
    );
  };

  const handleRemovePreOrderItem = (index: number) => {
    setPreOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmPreOrder = async () => {
    if (!order || !tableId || preOrderItems.length === 0) return;

    setIsLoadingAction(true);

    // Add all pre-order items to the actual order
    for (const item of preOrderItems) {
      const result = await addOrderItem(order.id, {
        productId: item.productId,
        itemName: item.itemName,
        quantity: item.quantity,
        price: item.price,
        originalPrice: item.originalPrice,
        notes: item.notes,
      });

      if (!result.success) {
        alert(result.error || "Error al agregar el producto");
        setIsLoadingAction(false);
        return;
      }
    }

    // Clear pre-order items after successful confirmation
    setPreOrderItems([]);

    // Refresh to get updated data from server
    await refresh();
    onOrderUpdated(tableId);
    setIsLoadingAction(false);
  };

  // Remove price and quantity editing for committed items - they can only be removed

  const handleRemoveItem = async (itemId: string) => {
    if (!tableId || !order) return;

    setIsLoadingAction(true);
    const result = await removeOrderItem(itemId);

    if (result.success) {
      await refresh();
      onOrderUpdated(tableId);
    } else {
      alert(result.error || "Error al eliminar el producto");
    }
    setIsLoadingAction(false);
  };

  const handleCloseTable = () => {
    if (!order || !tableId) return;

    if (order.items.length === 0) {
      alert("No se puede cerrar una orden sin productos");
      return;
    }

    // Open the close table dialog instead of directly closing
    setShowCloseDialog(true);
  };

  const handleCloseTableSuccess = async (closedTableId: string) => {
    onOrderUpdated(closedTableId);

    if (tableIsShared) {
      // Refresh to get updated orders list
      await refresh();

      // Check if there are more active orders after refresh
      const remainingOrders = Array.isArray(allOrders)
        ? allOrders.filter((o) => o.id !== order?.id)
        : [];

      if (remainingOrders.length > 0) {
        // Switch to the first remaining order
        setSelectedOrderId(remainingOrders[0].id);
        alert("Orden cerrada. Esta mesa compartida tiene más órdenes activas.");
      } else {
        // Last order closed, close sidebar
        alert("Última orden cerrada exitosamente");
        onClose();
      }
    } else {
      // Non-shared table, close sidebar
      // alert("Mesa cerrada exitosamente");
      onClose();
    }
  };

  const handlePrintCheck = () => {
    if (!order) return;

    const total = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const checkData = {
      tableNumber,
      partySize: order.partySize,
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      total,
    };

    console.log("Print Check:", checkData);
    alert(
      `Cuenta de Mesa ${tableNumber}\n\nTotal: $${total.toFixed(
        2
      )}\n\nVer consola para detalles completos`
    );
  };

  const handleOpenMoveDialog = async () => {
    setIsLoadingAction(true);
    const tables = await getAvailableTablesForMove(branchId);
    setAvailableTables(tables);
    setShowMoveDialog(true);
    setIsLoadingAction(false);
  };

  const handleMoveOrder = async (targetTableId: string) => {
    if (!order || !tableId) return;

    setIsLoadingAction(true);
    const result = await moveOrderToTable(order.id, targetTableId);

    if (result.success) {
      alert("Orden movida exitosamente");
      setShowMoveDialog(false);

      // Update both tables
      onOrderUpdated(tableId);
      onOrderUpdated(targetTableId);

      // Close the sidebar since the order is no longer on this table
      onClose();
    } else {
      alert(result.error || "Error al mover la orden");
    }
    setIsLoadingAction(false);
  };

  const handleDiscountEdit = () => {
    if (!order) return;
    setDiscountInput(order.discountPercentage.toString());
    setIsEditingDiscount(true);
  };

  const handleDiscountSave = async () => {
    if (!order) return;

    const newDiscount = parseFloat(discountInput);
    if (isNaN(newDiscount) || newDiscount < 0 || newDiscount > 100) {
      alert("El descuento debe ser un número entre 0 y 100");
      return;
    }

    setIsLoadingAction(true);
    const result = await updateDiscount(order.id, newDiscount);

    if (result.success) {
      setIsEditingDiscount(false);
      refresh(); // Refresh the order data
    } else {
      alert(result.error || "Error al actualizar el descuento");
    }
    setIsLoadingAction(false);
  };

  const handleDiscountCancel = () => {
    setIsEditingDiscount(false);
    setDiscountInput("");
  };

  if (!tableId) {
    return null;
  }

  return (
    <div className="h-full flex flex-col gap-0 bg-neutral-50">
      <div className="flex flex-row items-center justify-between space-y-0 bg-neutral-200 shadow-sm">
        <div className="flex items-center gap-2 px-2 ">
          <div className="text-xl">
            Mesa {tableNumber}
            {tableIsShared && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                (Compartida)
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refresh()}
            disabled={isLoading}
            title="Actualizar datos"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6 p-2 h-full">
        {/* Order Tabs for Shared Tables */}
        {Array.isArray(allOrders) && allOrders.length > 0 && (
          <OrderTabs
            orders={allOrders.map((o) => ({
              id: o.id,
              partySize: o.partySize,
              status: o.status,
              items: o.items.map((item) => ({
                id: item.id,
                itemName: item.product.name,
                quantity: item.quantity,
                price: item.price,
                originalPrice: item.originalPrice,
              })),
            }))}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
            onCreateOrder={() => {
              // Reset to create new order
              setPartySize("");
              setSelectedOrderId(null);
            }}
            disabled={isLoading}
          />
        )}

        {/* Party Size - Only show when no active order */}
        {!order && (
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

        {/* Client Picker - Only show when no active order */}
        {!order && (
          <ClientPicker
            branchId={branchId}
            selectedClient={selectedClient}
            onSelectClient={setSelectedClient}
            onCreateNew={handleCreateNewClient}
            disabled={isLoading}
          />
        )}

        {/* Waiter Picker - Only show when no active order */}
        {!order && (
          <WaiterPicker
            branchId={branchId}
            selectedWaiterId={selectedWaiterId}
            onSelectWaiter={setSelectedWaiterId}
            disabled={isLoading}
          />
        )}

        {/* Open Table Button */}
        {!order && partySize && parseInt(partySize) > 0 && (
          <Button
            onClick={handleCreateOrder}
            disabled={isLoading}
            className="w-full"
          >
            Abrir Mesa
          </Button>
        )}

        {/* Edit Order Button - Show when order exists */}
        {order && (
          <Button
            onClick={() => setShowEditOrderDialog(true)}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            Editar Venta
          </Button>
        )}

        {/* Only show product picker and items if order exists */}
        {order && (
          <div className="flex flex-col flex-1 gap-4">
            {/* Product Picker */}
            <ProductPicker
              products={products}
              onSelectProduct={handleSelectProduct}
              label="ADICIONAR"
              placeholder="Buscar producto..."
              disabled={isLoading}
            />

            {/* Pre-Order Items (editable with notes) */}
            {preOrderItems.length > 0 && (
              <div className="space-y-2">
                <PreOrderItemsList
                  items={preOrderItems}
                  onUpdateItem={handleUpdatePreOrderItem}
                  onRemoveItem={handleRemovePreOrderItem}
                  disabled={isLoading}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPreOrderItems([])}
                    variant="outline"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmPreOrder}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            )}

            {/* Committed Order Items (read-only, can only remove) */}
            {order.items.length > 0 && (
              <div className="space-y-2">
                <CommittedOrderItemsList
                  items={
                    order.items?.map((item) => ({
                      id: item.id,
                      itemName: item.product.name,
                      quantity: item.quantity,
                      price: item.price,
                      originalPrice: item.originalPrice,
                      notes: item.notes,
                    })) || []
                  }
                  onRemoveItem={handleRemoveItem}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        )}

        {/* Action Buttons - Show at bottom when order exists */}
        {order && (
          <div className="flex gap-2 pt-4 border-t flex-wrap">
              <Button
                onClick={handlePrintCheck}
                variant="outline"
                disabled={isLoading || order.items.length === 0}
              >
                <Printer className="h-4 w-4" />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="128"
                  height="128"
                  viewBox="0 0 48 48"
                >
                  <g fill="none" stroke="currentColor" strokeWidth="4">
                    <path
                      strokeLinecap="round"
                      d="M38 20V8a2 2 0 0 0-2-2H12a2 2 0 0 0-2 2v12"
                    />
                    <rect width="36" height="22" x="6" y="20" rx="2" />
                    <path
                      fill="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20 34h15v8H20z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 26h3"
                    />
                  </g>
                </svg>
                {/* Imprimir Cuenta */}
              </Button>

              <Button
                onClick={handleOpenMoveDialog}
                variant="outline"
                disabled={isLoading}
              >
                <ArrowRightLeft className="h-4 w-4" />
                {/* Mover a Otra Mesa */}
              </Button>

              {/* Discount Button/Editor */}
              {isEditingDiscount ? (
                <div className="flex items-center gap-1 bg-white rounded px-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="h-8 w-16 text-sm"
                    placeholder="%"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={handleDiscountSave}
                    disabled={isLoadingAction}
                  >
                    ✓
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={handleDiscountCancel}
                    disabled={isLoadingAction}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleDiscountEdit}
                  variant={Number(order.discountPercentage) > 0 ? "default" : "outline"}
                  disabled={isLoading}
                  title={
                    Number(order.discountPercentage) > 0
                      ? `Descuento: ${order.discountPercentage}%`
                      : "Agregar descuento"
                  }
                >
                  <Percent className="h-4 w-4" />
                  {Number(order.discountPercentage) > 0 && (
                    <span className="ml-1 text-xs">{Number(order.discountPercentage)}%</span>
                  )}
                </Button>
              )}

            <Button
              onClick={handleCloseTable}
              disabled={isLoading || order.items.length === 0}
            >
              <DollarSign className="h-4 w-4" />
              {/* Cerrar Mesa */}
            </Button>
          </div>
        )}
      </div>

      {/* Move Order Dialog */}
      <MoveOrderDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        availableTables={availableTables}
        currentTableNumber={tableNumber}
        onConfirm={handleMoveOrder}
        isLoading={isLoading}
      />

      {/* Close Table Dialog */}
      {order && tableId && tableNumber && (
        <CloseTableDialog
          open={showCloseDialog}
          onOpenChange={setShowCloseDialog}
          order={{
            id: order.id,
            publicCode: order.publicCode,
            partySize: order.partySize,
            discountPercentage: Number(order.discountPercentage),
            items: order.items.map((item) => ({
              id: item.id,
              itemName: item.product?.name,
              quantity: item.quantity,
              price: item.price,
              originalPrice: item.originalPrice,
              product: item.product,
            })),
          }}
          tableNumber={tableNumber}
          branchId={branchId}
          tableId={tableId}
          tableSectorId={tableSectorId}
          onSuccess={handleCloseTableSuccess}
        />
      )}

      {/* Create Client Dialog */}
      <CreateClientDialog
        open={showCreateClientDialog}
        onOpenChange={setShowCreateClientDialog}
        branchId={branchId}
        onSuccess={handleClientCreated}
        initialName={clientSearchQuery}
      />

      {/* Edit Order Dialog */}
      {order && (
        <EditOrderDialog
          open={showEditOrderDialog}
          onOpenChange={setShowEditOrderDialog}
          orderId={order.id}
          branchId={branchId}
          currentPartySize={order.partySize || 1}
          currentClientId={order.clientId}
          currentClient={order.client ? {
            id: order.client.id,
            name: order.client.name,
            email: order.client.email,
          } : null}
          currentWaiterId={order.assignedToId}
          onSuccess={() => {
            refresh();
            if (tableId) onOrderUpdated(tableId);
          }}
          disabled={isLoading}
        />
      )}
    </div>
  );
}
