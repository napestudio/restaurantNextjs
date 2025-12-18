"use client";

import { useState, useTransition } from "react";
import { getOrders } from "@/actions/Order";
import { OrderStatus, OrderType } from "@/app/generated/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { OrderListView } from "./components/order-list-view";
import { OrderDetailsSidebar } from "@/components/dashboard/order-details-sidebar";
import { CreateOrderSidebar } from "./components/create-order-sidebar";
import type { ClientData } from "@/lib/serializers";

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

type Table = {
  id: string;
  number: number;
  name: string | null;
};

interface OrdersClientProps {
  branchId: string;
  initialOrders: Order[];
  tables: Table[];
}

export function OrdersClient({
  branchId,
  initialOrders,
  tables,
}: OrdersClientProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [, startTransition] = useTransition();

  // Sidebar state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOrderSidebarOpen, setCreateOrderSidebarOpen] = useState(false);

  // Refresh orders - used after creating/updating orders
  const refreshOrders = () => {
    startTransition(async () => {
      const result = await getOrders({ branchId });
      if (result.success && result.data) {
        setOrders(result.data);
      }
    });
  };

  // Filter orders by type for tabs
  const dineInOrders = orders.filter(
    (order) => order.type === OrderType.DINE_IN
  );
  const takeAwayOrders = orders.filter(
    (order) => order.type === OrderType.TAKE_AWAY
  );
  const deliveryOrders = orders.filter(
    (order) => order.type === OrderType.DELIVERY
  );

  // Handle order click
  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setSelectedOrder(null);
  };

  const handleOrderUpdated = () => {
    // Refresh orders after updating client/waiter/status
    refreshOrders();
  };

  return (
    <div className="space-y-6">
      {/* Order Count and Create Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Mostrando {orders.length} {orders.length === 1 ? "orden" : "órdenes"}
        </div>
        <Button onClick={() => setCreateOrderSidebarOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden
        </Button>
      </div>

      {/* Order Type Tabs */}
      <Tabs defaultValue="ALL" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="ALL">Todas ({orders.length})</TabsTrigger>
          <TabsTrigger value={OrderType.DINE_IN}>
            Para Comer Aquí ({dineInOrders.length})
          </TabsTrigger>
          <TabsTrigger value={OrderType.TAKE_AWAY}>
            Para Llevar ({takeAwayOrders.length})
          </TabsTrigger>
          <TabsTrigger value={OrderType.DELIVERY}>
            Delivery ({deliveryOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ALL" className="mt-6">
          <OrderListView orders={orders} onOrderClick={handleOrderClick} />
        </TabsContent>

        <TabsContent value={OrderType.DINE_IN} className="mt-6">
          <OrderListView
            orders={dineInOrders}
            onOrderClick={handleOrderClick}
          />
        </TabsContent>

        <TabsContent value={OrderType.TAKE_AWAY} className="mt-6">
          <OrderListView
            orders={takeAwayOrders}
            onOrderClick={handleOrderClick}
          />
        </TabsContent>

        <TabsContent value={OrderType.DELIVERY} className="mt-6">
          <OrderListView
            orders={deliveryOrders}
            onOrderClick={handleOrderClick}
          />
        </TabsContent>
      </Tabs>

      {/* Order Details Sidebar */}
      <OrderDetailsSidebar
        order={selectedOrder}
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        branchId={branchId}
        onOrderUpdated={handleOrderUpdated}
      />

      {/* Create Order Sidebar */}
      <CreateOrderSidebar
        branchId={branchId}
        tables={tables}
        open={createOrderSidebarOpen}
        onClose={() => setCreateOrderSidebarOpen(false)}
        onOrderCreated={refreshOrders}
      />
    </div>
  );
}
