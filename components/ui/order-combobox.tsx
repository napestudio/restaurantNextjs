"use client";

import { useState, useEffect } from "react";
import { getOrdersWithoutInvoice } from "@/actions/Order";
import type { OrderWithoutInvoice } from "@/actions/Order";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderComboboxProps {
  branchId: string;
  value: string;
  onSelect: (orderId: string, order: OrderWithoutInvoice | null) => void;
}

export function OrderCombobox({ branchId, value, onSelect }: OrderComboboxProps) {
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<OrderWithoutInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithoutInvoice | null>(null);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await getOrdersWithoutInvoice({ branchId, search, limit: 20 });
        if (result.success) {
          setOrders(result.data);
        } else {
          setOrders([]);
        }
      } catch (error) {
        console.error("Error loading orders:", error);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, branchId]);

  const handleSelect = (order: OrderWithoutInvoice) => {
    setSelectedOrder(order);
    setSearch(`Pedido #${order.publicCode}`);
    onSelect(order.id, order);
  };

  const handleClear = () => {
    setSelectedOrder(null);
    setSearch("");
    onSelect("", null);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="order-search">Buscar pedido</Label>
      <div className="relative">
        <Input
          id="order-search"
          placeholder="Buscar por código o nombre de cliente..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (selectedOrder) {
              setSelectedOrder(null);
              onSelect("", null);
            }
          }}
        />
        {selectedOrder && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {!selectedOrder && search && (
        <div className="border rounded-md bg-white shadow-sm">
          <ScrollArea className="h-[200px]">
            {isLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : orders.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No hay pedidos sin factura
              </div>
            ) : (
              <div className="p-2">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => handleSelect(order)}
                    className="w-full text-left p-3 rounded hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Pedido #{order.publicCode}</div>
                        <div className="text-sm text-gray-500">
                          {order.table ? (order.table.name || `Mesa ${order.table.number}`) : "Sin mesa"}
                          {order.customerName && ` • ${order.customerName}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${order.total.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          {order.type === "DINE_IN" ? "Local" : order.type === "TAKEAWAY" ? "Para llevar" : "Delivery"}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {selectedOrder && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-blue-900">Pedido #{selectedOrder.publicCode}</div>
              <div className="text-sm text-blue-700">
                {selectedOrder.table ? (selectedOrder.table.name || `Mesa ${selectedOrder.table.number}`) : "Sin mesa"}
                {selectedOrder.customerName && ` • ${selectedOrder.customerName}`}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-blue-900">${selectedOrder.total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
