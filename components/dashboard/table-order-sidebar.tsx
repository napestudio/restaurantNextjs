"use client";

import {
  addOrderItem,
  closeTable,
  createTableOrder,
  getAvailableTablesForMove,
  moveOrderToTable,
  removeOrderItem,
  updateOrderItemPrice,
  updateOrderItemQuantity,
  updatePartySize,
} from "@/actions/Order";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProducts } from "@/contexts/products-context";
import { useOrdersData } from "@/hooks/use-orders-data";
import {
  ArrowRightLeft,
  DollarSign,
  Printer,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MoveOrderDialog } from "./move-order-dialog";
import { OrderItemsList } from "./order-items-list";
import { OrderTabs } from "./order-tabs";
import { ProductPicker } from "./product-picker";

interface TableOrderSidebarProps {
  tableId: string | null;
  tableNumber: number | null;
  tableIsShared?: boolean;
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
  branchId,
  onClose,
  onOrderUpdated,
}: TableOrderSidebarProps) {
  const [partySize, setPartySize] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
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
      parseInt(partySize)
    );

    if (result.success && result.data) {
      // Refresh orders data with SWR
      await refresh();

      // Select the newly created order
      setSelectedOrderId(result.data.id);

      // Reset party size input for next order
      setPartySize("");

      // Update table status
      onOrderUpdated(tableId);
    } else {
      alert(result.error || "Error al crear la orden");
    }
    setIsLoadingAction(false);
  };

  const handlePartySizeChange = async (newSize: string) => {
    setPartySize(newSize);

    // If order exists, update it
    if (order && newSize && parseInt(newSize) > 0) {
      await updatePartySize(order.id, parseInt(newSize));
      // Refresh to get updated data
      refresh();
    }
  };

  const handleSelectProduct = async (product: Product) => {
    if (!order || !tableId) return;

    setIsLoadingAction(true);
    const result = await addOrderItem(order.id, {
      productId: product.id,
      itemName: product.name,
      quantity: 1,
      price: Number(product.price),
      originalPrice: Number(product.price),
    });

    if (result.success) {
      // Refresh to get updated data from server
      await refresh();
      onOrderUpdated(tableId);
    } else {
      alert(result.error || "Error al agregar el producto");
    }
    setIsLoadingAction(false);
  };

  const handleUpdatePrice = async (itemId: string, price: number) => {
    if (!tableId || !order) return;

    setIsLoadingAction(true);
    const result = await updateOrderItemPrice(itemId, price);

    if (result.success) {
      await refresh();
      onOrderUpdated(tableId);
    } else {
      alert(result.error || "Error al actualizar el precio");
    }
    setIsLoadingAction(false);
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (!tableId || !order) return;

    setIsLoadingAction(true);
    const result = await updateOrderItemQuantity(itemId, quantity);

    if (result.success) {
      await refresh();
      onOrderUpdated(tableId);
    } else {
      alert(result.error || "Error al actualizar la cantidad");
    }
    setIsLoadingAction(false);
  };

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

  const handleCloseTable = async () => {
    if (!order || !tableId) return;

    if (order.items.length === 0) {
      alert("No se puede cerrar una orden sin productos");
      return;
    }

    if (!confirm("¿Cerrar esta orden y completarla?")) {
      return;
    }

    setIsLoadingAction(true);
    const result = await closeTable(order.id);

    if (result.success) {
      onOrderUpdated(tableId);

      if (tableIsShared) {
        // Refresh to get updated orders list
        await refresh();

        // Check if there are more active orders after refresh
        const remainingOrders = Array.isArray(allOrders)
          ? allOrders.filter((o) => o.id !== order.id)
          : [];

        if (remainingOrders.length > 0) {
          // Switch to the first remaining order
          setSelectedOrderId(remainingOrders[0].id);
          alert(
            "Orden cerrada. Esta mesa compartida tiene más órdenes activas."
          );
        } else {
          // Last order closed, close sidebar
          alert("Última orden cerrada exitosamente");
          onClose();
        }
      } else {
        // Non-shared table, close sidebar
        alert("Mesa cerrada exitosamente");
        onClose();
      }
    } else {
      alert(result.error || "Error al cerrar la orden");
    }
    setIsLoadingAction(false);
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

  if (!tableId) {
    return null;
  }

  return (
    <div className="h-full flex flex-col gap-0 bg-neutral-50">
      <div className="flex flex-row items-center space-y-0 bg-amber-100">
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

        {/* Party Size */}
        <div className="space-y-2">
          <Label htmlFor="party-size">
            Número de Comensales <span className="text-red-500">*</span>
          </Label>
          <Input
            id="party-size"
            type="number"
            min="1"
            value={partySize}
            onChange={(e) => handlePartySizeChange(e.target.value)}
            placeholder="Ej: 4"
            disabled={isLoading}
          />
          {!order && partySize && parseInt(partySize) > 0 && (
            <Button
              onClick={handleCreateOrder}
              disabled={isLoading}
              className="w-full"
            >
              Abrir Mesa
            </Button>
          )}
        </div>

        {/* Only show product picker and items if order exists */}
        {order && (
          <div className="flex flex-col bg-red-300">
            <div className="flex flex-col flex-1">
              {/* Product Picker */}
              <ProductPicker
                products={products}
                onSelectProduct={handleSelectProduct}
                label="Agregar Producto"
                placeholder="Buscar producto..."
                disabled={isLoading}
              />

              {/* Order Items */}
              <div className="space-y-2">
                <Label>Productos en la Orden</Label>
                <div className="bg-amber-500">
                  <OrderItemsList
                    items={order.items?.map((item) => ({
                      id: item.id,
                      itemName: item.product.name,
                      quantity: item.quantity,
                      price: item.price,
                      originalPrice: item.originalPrice,
                    }))}
                    onUpdatePrice={handleUpdatePrice}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="left-0 flex gap-2 w-full items-center justify-end p-2 bg-purple-400 absolute bottom-0">
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

              <Button
                onClick={handleCloseTable}
                disabled={isLoading || order.items.length === 0}
              >
                <DollarSign className="h-4 w-4" />
                {/* Cerrar Mesa */}
              </Button>
            </div>
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
    </div>
  );
}
