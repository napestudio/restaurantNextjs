"use client";

import {
  addOrderItem,
  closeTable,
  createTableOrder,
  getTableOrder,
  getTableOrders,
  removeOrderItem,
  updateOrderItemPrice,
  updateOrderItemQuantity,
  updatePartySize,
} from "@/actions/Order";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProducts } from "@/contexts/products-context";
import { DollarSign, Printer, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

type Order = {
  id: string;
  partySize: number | null;
  status: string;
  items: Array<{
    id: string;
    itemName: string;
    quantity: number;
    price: number;
    originalPrice: number | null;
  }>;
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
  const [order, setOrder] = useState<Order | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use cached products from context
  const { products } = useProducts();

  const loadAllOrders = useCallback(async () => {
    if (!tableId) return;

    const result = await getTableOrders(tableId);
    if (result.success && result.data) {
      setAllOrders(result.data);
      // Select the most recent order by default
      if (result.data.length > 0) {
        setSelectedOrderId(result.data[0].id);
      }
    }
  }, [tableId]);

  const loadSingleOrder = useCallback(async () => {
    if (!tableId) return;

    const result = await getTableOrder(tableId);
    if (result.success && result.data) {
      setOrder(result.data);
      setPartySize(result.data.partySize?.toString() || "");
      setAllOrders([result.data]);
      setSelectedOrderId(result.data.id);
    }
  }, [tableId]);

  // Load orders when table is selected
  useEffect(() => {
    if (tableId) {
      // Reset state when switching tables
      setOrder(null);
      setPartySize("");
      setAllOrders([]);
      setSelectedOrderId(null);

      if (tableIsShared) {
        loadAllOrders();
      } else {
        loadSingleOrder();
      }
    }
  }, [tableId, tableIsShared, loadAllOrders, loadSingleOrder]);

  // Update current order when selection changes
  useEffect(() => {
    if (selectedOrderId && allOrders.length > 0) {
      const selected = allOrders.find((o) => o.id === selectedOrderId);
      if (selected) {
        setOrder(selected);
        setPartySize(selected.partySize?.toString() || "");
      }
    }
  }, [selectedOrderId, allOrders]);

  const handleCreateOrder = async () => {
    if (!tableId || !partySize || parseInt(partySize) <= 0) {
      alert("Por favor ingresa el número de comensales");
      return;
    }

    setIsLoading(true);
    const result = await createTableOrder(
      tableId,
      branchId,
      parseInt(partySize)
    );

    if (result.success && result.data) {
      // Reload all orders and select the new one
      if (tableIsShared) {
        await loadAllOrders();
        setSelectedOrderId(result.data.id);
      } else {
        setOrder(result.data);
        setAllOrders([result.data]);
        setSelectedOrderId(result.data.id);
      }
      // Reset party size input for next order
      setPartySize("");
      // Only update the specific table that changed
      onOrderUpdated(tableId);
    } else {
      alert(result.error || "Error al crear la orden");
    }
    setIsLoading(false);
  };

  const handlePartySizeChange = async (newSize: string) => {
    setPartySize(newSize);

    // If order exists, update it
    if (order && newSize && parseInt(newSize) > 0) {
      await updatePartySize(order.id, parseInt(newSize));
    }
  };

  const handleSelectProduct = async (product: Product) => {
    if (!order || !tableId) return;

    // Optimistic update: add item to local state immediately
    const optimisticItem = {
      id: `temp-${Date.now()}`, // Temporary ID
      itemName: product.name,
      quantity: 1,
      price: Number(product.price),
      originalPrice: Number(product.price),
    };

    setOrder((prev) =>
      prev ? { ...prev, items: [...prev.items, optimisticItem] } : prev
    );

    setIsLoading(true);
    const result = await addOrderItem(order.id, {
      productId: product.id,
      itemName: product.name,
      quantity: 1,
      price: Number(product.price),
      originalPrice: Number(product.price),
    });

    if (result.success && result.data) {
      // Replace optimistic item with real data from server
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((item) =>
                item.id === optimisticItem.id
                  ? {
                      id: result.data.id,
                      itemName: result.data.itemName,
                      quantity: result.data.quantity,
                      price: result.data.price,
                      originalPrice: result.data.originalPrice,
                    }
                  : item
              ),
            }
          : prev
      );
      onOrderUpdated(tableId);
    } else {
      // Rollback on error and reload to sync with server
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((item) => item.id !== optimisticItem.id),
            }
          : prev
      );
      if (tableIsShared) {
        await loadAllOrders();
      } else {
        await loadSingleOrder();
      }
      alert(result.error || "Error al agregar el producto");
    }
    setIsLoading(false);
  };

  const handleUpdatePrice = async (itemId: string, price: number) => {
    if (!tableId) return;

    // Optimistic update
    const previousOrder = order;
    setOrder((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((item) =>
              item.id === itemId ? { ...item, price } : item
            ),
          }
        : prev
    );

    setIsLoading(true);
    const result = await updateOrderItemPrice(itemId, price);

    if (result.success) {
      // No need to reload - optimistic update already applied
      onOrderUpdated(tableId);
    } else {
      // Rollback on error and reload to sync with server
      setOrder(previousOrder);
      if (tableIsShared) {
        await loadAllOrders();
      } else {
        await loadSingleOrder();
      }
      alert(result.error || "Error al actualizar el precio");
    }
    setIsLoading(false);
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (!tableId) return;

    // Optimistic update
    const previousOrder = order;
    setOrder((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((item) =>
              item.id === itemId ? { ...item, quantity } : item
            ),
          }
        : prev
    );

    setIsLoading(true);
    const result = await updateOrderItemQuantity(itemId, quantity);

    if (result.success) {
      // No need to reload - optimistic update already applied
      onOrderUpdated(tableId);
    } else {
      // Rollback on error and reload to sync with server
      setOrder(previousOrder);
      if (tableIsShared) {
        await loadAllOrders();
      } else {
        await loadSingleOrder();
      }
      alert(result.error || "Error al actualizar la cantidad");
    }
    setIsLoading(false);
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!tableId) return;

    // Optimistic update
    const previousOrder = order;
    setOrder((prev) =>
      prev
        ? { ...prev, items: prev.items.filter((item) => item.id !== itemId) }
        : prev
    );

    setIsLoading(true);
    const result = await removeOrderItem(itemId);

    if (result.success) {
      // No need to reload - optimistic update already applied
      onOrderUpdated(tableId);
    } else {
      // Rollback on error and reload to sync with server
      setOrder(previousOrder);
      if (tableIsShared) {
        await loadAllOrders();
      } else {
        await loadSingleOrder();
      }
      alert(result.error || "Error al eliminar el producto");
    }
    setIsLoading(false);
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

    setIsLoading(true);
    const result = await closeTable(order.id);

    if (result.success) {
      onOrderUpdated(tableId);

      if (tableIsShared) {
        // Reload all orders to get updated list
        await loadAllOrders();

        // Check if there are more active orders
        const remainingOrders = allOrders.filter((o) => o.id !== order.id);

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
    setIsLoading(false);
  };

  const handlePrintCheck = () => {
    if (!order) return;

    const total = order.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );

    const checkData = {
      tableNumber,
      partySize: order.partySize,
      items: order.items.map((item) => ({
        name: item.itemName,
        quantity: item.quantity,
        price: Number(item.price),
        total: Number(item.price) * item.quantity,
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

  if (!tableId) {
    return null;
  }

  return (
    <Card className="h-full flex flex-col gap-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-xl">
            Mesa {tableNumber}
            {tableIsShared && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                (Compartida)
              </span>
            )}
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-6">
        {/* Order Tabs for Shared Tables */}
        {tableIsShared && allOrders.length > 0 && (
          <OrderTabs
            orders={allOrders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
            onCreateOrder={() => {
              // Reset party size to allow entering new order details
              setPartySize("");
              setOrder(null);
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
              Crear Orden
            </Button>
          )}
        </div>

        {/* Only show product picker and items if order exists */}
        {order && (
          <>
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
              <OrderItemsList
                items={order.items.map((item) => ({
                  ...item,
                  price: Number(item.price),
                  originalPrice: item.originalPrice
                    ? Number(item.originalPrice)
                    : null,
                }))}
                onUpdatePrice={handleUpdatePrice}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                disabled={isLoading}
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-4 border-t">
              <Button
                onClick={handlePrintCheck}
                variant="outline"
                className="w-full"
                disabled={isLoading || order.items.length === 0}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Cuenta
              </Button>

              <Button
                onClick={handleCloseTable}
                className="w-full"
                disabled={isLoading || order.items.length === 0}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Cerrar Mesa
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
