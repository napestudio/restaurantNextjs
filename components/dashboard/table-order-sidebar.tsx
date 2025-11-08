"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Printer, DollarSign } from "lucide-react";
import { ProductPicker } from "./product-picker";
import { OrderItemsList, type OrderItemType } from "./order-items-list";
import {
  createTableOrder,
  getTableOrder,
  getTableOrders,
  addOrderItem,
  updateOrderItemPrice,
  removeOrderItem,
  updatePartySize,
  closeTable,
  getAvailableProductsForOrder,
} from "@/actions/Order";

interface TableOrderSidebarProps {
  tableId: string | null;
  tableNumber: number | null;
  tableIsShared?: boolean;
  branchId: string;
  onClose: () => void;
  onOrderUpdated: () => void;
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
    price: any;
    originalPrice: any;
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
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load order and products when table is selected
  useEffect(() => {
    if (tableId) {
      // Reset state when switching tables
      setOrder(null);
      setPartySize("");
      setActiveOrdersCount(0);

      loadTableOrder();
      loadProducts();
      if (tableIsShared) {
        loadActiveOrdersCount();
      }
    }
  }, [tableId, tableIsShared]);

  const loadActiveOrdersCount = async () => {
    if (!tableId) return;

    const result = await getTableOrders(tableId);
    if (result.success && result.data) {
      setActiveOrdersCount(result.data.length);
    }
  };

  const loadTableOrder = async () => {
    if (!tableId) return;

    const result = await getTableOrder(tableId);
    if (result.success && result.data) {
      setOrder(result.data);
      setPartySize(result.data.partySize?.toString() || "");
    }
  };

  const loadProducts = async () => {
    const availableProducts = await getAvailableProductsForOrder(branchId);
    // Products already have number prices from server action
    setProducts(availableProducts);
  };

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
      setOrder(result.data);
      if (tableIsShared) {
        await loadActiveOrdersCount();
      }
      onOrderUpdated();
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
    if (!order) return;

    setIsLoading(true);
    const result = await addOrderItem(order.id, {
      productId: product.id,
      itemName: product.name,
      quantity: 1,
      price: Number(product.price),
      originalPrice: Number(product.price),
    });

    if (result.success) {
      await loadTableOrder();
      onOrderUpdated();
    } else {
      alert(result.error || "Error al agregar el producto");
    }
    setIsLoading(false);
  };

  const handleUpdatePrice = async (itemId: string, price: number) => {
    setIsLoading(true);
    const result = await updateOrderItemPrice(itemId, price);

    if (result.success) {
      await loadTableOrder();
    } else {
      alert(result.error || "Error al actualizar el precio");
    }
    setIsLoading(false);
  };

  const handleRemoveItem = async (itemId: string) => {
    setIsLoading(true);
    const result = await removeOrderItem(itemId);

    if (result.success) {
      await loadTableOrder();
      onOrderUpdated();
    } else {
      alert(result.error || "Error al eliminar el producto");
    }
    setIsLoading(false);
  };

  const handleCloseTable = async () => {
    if (!order) return;

    if (order.items.length === 0) {
      alert("No se puede cerrar una mesa sin productos en la orden");
      return;
    }

    if (!confirm("¿Cerrar esta orden y completarla?")) {
      return;
    }

    setIsLoading(true);
    const result = await closeTable(order.id);

    if (result.success) {
      if (tableIsShared) {
        // For shared tables, check if there are more orders
        await loadActiveOrdersCount();
        await loadTableOrder();
        if (activeOrdersCount > 1) {
          alert("Orden cerrada. Esta mesa compartida tiene más órdenes activas.");
        } else {
          alert("Orden cerrada exitosamente");
          onClose();
        }
      } else {
        alert("Mesa cerrada exitosamente");
        onClose();
      }
      onOrderUpdated();
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
    alert(`Cuenta de Mesa ${tableNumber}\n\nTotal: $${total.toFixed(2)}\n\nVer consola para detalles completos`);
  };

  if (!tableId) {
    return null;
  }

  return (
    <Card className="h-full flex flex-col">
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
          {tableIsShared && activeOrdersCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {activeOrdersCount} {activeOrdersCount === 1 ? "orden activa" : "órdenes activas"}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-6">
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
