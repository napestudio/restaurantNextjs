"use client";

import { useState, useTransition } from "react";
import { getOrders, type OrderFilters } from "@/actions/Order";
import { OrderStatus, OrderType } from "@/app/generated/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { OrderListView } from "./components/order-list-view";
import { OrderDetailsSidebar } from "@/components/dashboard/order-details-sidebar";

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
  client: {
    id: string;
    name: string;
    email: string | null;
  } | null;
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

export function OrdersClient({ branchId, initialOrders, tables }: OrdersClientProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isPending, startTransition] = useTransition();

  // Filters state
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "ALL">("ALL");
  const [selectedTable, setSelectedTable] = useState<string | "ALL">("ALL");
  const [orderType, setOrderType] = useState<OrderType | "ALL">("ALL");

  // Sidebar state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Apply filters
  const applyFilters = () => {
    startTransition(async () => {
      const filters: OrderFilters = {
        branchId,
        startDate,
        endDate,
      };

      if (selectedStatus !== "ALL") {
        filters.status = selectedStatus as OrderStatus;
      }

      if (selectedTable !== "ALL") {
        filters.tableId = selectedTable;
      }

      if (orderType !== "ALL") {
        filters.type = orderType as OrderType;
      }

      const result = await getOrders(filters);
      if (result.success && result.data) {
        setOrders(result.data);
      }
    });
  };

  // Reset filters
  const resetFilters = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setStartDate(today);
    setEndDate(undefined);
    setSelectedStatus("ALL");
    setSelectedTable("ALL");
    setOrderType("ALL");

    startTransition(async () => {
      const result = await getOrders({
        branchId,
        startDate: today,
      });
      if (result.success && result.data) {
        setOrders(result.data);
      }
    });
  };

  // Filter orders by type for tabs
  const dineInOrders = orders.filter(order => order.type === OrderType.DINE_IN);
  const takeAwayOrders = orders.filter(order => order.type === OrderType.TAKE_AWAY);
  const deliveryOrders = orders.filter(order => order.type === OrderType.DELIVERY);

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
    // Refresh orders after updating client/waiter
    applyFilters();
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Filtros</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              disabled={isPending}
            >
              Limpiar
            </Button>
            <Button
              size="sm"
              onClick={applyFilters}
              disabled={isPending}
            >
              {isPending ? "Aplicando..." : "Aplicar Filtros"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Start Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Fecha Inicio</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP", { locale: es }) : "Seleccionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Fecha Fin</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP", { locale: es }) : "Seleccionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Estado</label>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as OrderStatus | "ALL")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value={OrderStatus.PENDING}>Pendiente</SelectItem>
                <SelectItem value={OrderStatus.IN_PROGRESS}>En Progreso</SelectItem>
                <SelectItem value={OrderStatus.COMPLETED}>Completada</SelectItem>
                <SelectItem value={OrderStatus.CANCELED}>Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Mesa</label>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {tables.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    Mesa {table.number} {table.name ? `- ${table.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Order Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Mostrando {orders.length} {orders.length === 1 ? "orden" : "órdenes"}
        </div>
      </div>

      {/* Order Type Tabs */}
      <Tabs defaultValue="ALL" className="w-full" onValueChange={(value) => setOrderType(value as OrderType | "ALL")}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="ALL">
            Todas ({orders.length})
          </TabsTrigger>
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
          <OrderListView orders={dineInOrders} onOrderClick={handleOrderClick} />
        </TabsContent>

        <TabsContent value={OrderType.TAKE_AWAY} className="mt-6">
          <OrderListView orders={takeAwayOrders} onOrderClick={handleOrderClick} />
        </TabsContent>

        <TabsContent value={OrderType.DELIVERY} className="mt-6">
          <OrderListView orders={deliveryOrders} onOrderClick={handleOrderClick} />
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
    </div>
  );
}
