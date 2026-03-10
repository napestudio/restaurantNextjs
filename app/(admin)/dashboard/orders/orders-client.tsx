"use client";

import { getOrders } from "@/actions/Order";
import type { PaginationInfo } from "@/types/pagination";
import { OrderType } from "@/app/generated/prisma";
import { OrderDetailsSidebar } from "@/components/dashboard/order-details-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Order } from "@/types/orders";
import {
  ChevronDown,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CreateOrderSidebar } from "./components/create-order-sidebar";
import { OrderListView } from "./components/order-list-view";

type Table = {
  id: string;
  number: number;
  name: string | null;
};

interface OrdersClientProps {
  branchId: string;
  initialOrders: Order[];
  tables: Table[];
  initialPagination: PaginationInfo;
  initialTab: string;
  initialSearch: string;
  initialStartDate: string;
  initialEndDate: string;
  initialPaymentMethod: string;
  initialSortOrder: "asc" | "desc";
  activeOrderCounts: {
    DINE_IN: number;
    TAKE_AWAY: number;
    DELIVERY: number;
  };
  canChangeOrderType: boolean;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  PAYMENT_LINK: "Link de Pago",
  QR_CODE: "QR",
};

function computeOrderTotal(order: Order): number {
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const discount = subtotal * (order.discountPercentage / 100);
  return subtotal - discount + order.deliveryFee;
}

export function OrdersClient({
  branchId,
  initialOrders,
  tables,
  initialPagination,
  initialTab,
  initialSearch,
  initialStartDate,
  initialEndDate,
  initialPaymentMethod,
  initialSortOrder,
  activeOrderCounts,
  canChangeOrderType,
}: OrdersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [pagination, setPagination] =
    useState<PaginationInfo>(initialPagination);
  const [isPending, startTransition] = useTransition();

  // Sidebar state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOrderSidebarOpen, setCreateOrderSidebarOpen] = useState(false);
  const [createOrderType, setCreateOrderType] = useState<OrderType | null>(
    null,
  );

  // Search state
  const [searchInput, setSearchInput] = useState(initialSearch);

  // Filter state
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod);
  const [dateSortOrder, setDateSortOrder] = useState<"asc" | "desc">(
    initialSortOrder,
  );
  const [totalSortOrder, setTotalSortOrder] = useState<"none" | "asc" | "desc">(
    "none",
  );

  // Current tab from URL or initial
  const currentTab = searchParams.get("type") || initialTab;
  const currentPage = parseInt(searchParams.get("page") || "1");
  const currentSearch = searchParams.get("search") || "";

  // Sync state with props when they change (server re-render)
  useEffect(() => {
    setOrders(initialOrders);
    setPagination(initialPagination);
  }, [initialOrders, initialPagination]);

  // Build the active filters object for getOrders calls
  const buildFilters = (
    type: string,
    page: number,
    search: string,
    sd: string,
    ed: string,
    pm: string,
    so: "asc" | "desc",
  ) => ({
    branchId,
    type: type === "ALL" ? undefined : (type as OrderType),
    page,
    pageSize: 15,
    search: search || undefined,
    startDate: sd ? new Date(sd) : undefined,
    endDate: ed ? new Date(ed) : undefined,
    paymentMethod: pm || undefined,
    sortOrder: so,
  });

  // Update URL and fetch orders
  const updateUrlAndFetch = (
    type: string,
    page: number,
    search?: string,
    sd?: string,
    ed?: string,
    pm?: string,
    so?: "asc" | "desc",
  ) => {
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("page", page.toString());
    if (search) params.set("search", search);
    if (sd) params.set("startDate", sd);
    if (ed) params.set("endDate", ed);
    if (pm) params.set("paymentMethod", pm);
    if (so && so !== "desc") params.set("sortOrder", so);
    startTransition(() => {
      router.push(`/dashboard/orders?${params.toString()}`);
    });
  };

  const handleTabChange = (value: string) => {
    updateUrlAndFetch(
      value,
      1,
      currentSearch,
      startDate,
      endDate,
      paymentMethod,
      dateSortOrder,
    );
  };

  const handlePageChange = (page: number) => {
    updateUrlAndFetch(
      currentTab,
      page,
      currentSearch,
      startDate,
      endDate,
      paymentMethod,
      dateSortOrder,
    );
  };

  const handleSearch = () => {
    if (searchInput.trim()) {
      updateUrlAndFetch(
        currentTab,
        1,
        searchInput.trim(),
        startDate,
        endDate,
        paymentMethod,
        dateSortOrder,
      );
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    updateUrlAndFetch(
      currentTab,
      1,
      "",
      startDate,
      endDate,
      paymentMethod,
      dateSortOrder,
    );
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    updateUrlAndFetch(
      currentTab,
      1,
      currentSearch,
      value,
      endDate,
      paymentMethod,
      dateSortOrder,
    );
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    updateUrlAndFetch(
      currentTab,
      1,
      currentSearch,
      startDate,
      value,
      paymentMethod,
      dateSortOrder,
    );
  };

  const handlePaymentMethodChange = (value: string) => {
    const pm = value === "ALL" ? "" : value;
    setPaymentMethod(pm);
    updateUrlAndFetch(
      currentTab,
      1,
      currentSearch,
      startDate,
      endDate,
      pm,
      dateSortOrder,
    );
  };

  const handleSortChange = (value: string) => {
    if (value === "date_asc") {
      setDateSortOrder("asc");
      setTotalSortOrder("none");
      updateUrlAndFetch(
        currentTab,
        1,
        currentSearch,
        startDate,
        endDate,
        paymentMethod,
        "asc",
      );
    } else if (value === "date_desc") {
      setDateSortOrder("desc");
      setTotalSortOrder("none");
      updateUrlAndFetch(
        currentTab,
        1,
        currentSearch,
        startDate,
        endDate,
        paymentMethod,
        "desc",
      );
    } else if (value === "total_asc") {
      setTotalSortOrder("asc");
    } else if (value === "total_desc") {
      setTotalSortOrder("desc");
    }
  };

  const currentSortValue =
    totalSortOrder === "asc"
      ? "total_asc"
      : totalSortOrder === "desc"
        ? "total_desc"
        : dateSortOrder === "asc"
          ? "date_asc"
          : "date_desc";

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setPaymentMethod("");
    setDateSortOrder("desc");
    setTotalSortOrder("none");
    updateUrlAndFetch(currentTab, 1, currentSearch, "", "", "", "desc");
  };

  const hasActiveFilters =
    startDate || endDate || paymentMethod || dateSortOrder !== "desc";

  // Refresh orders for current filters
  const refreshOrders = () => {
    startTransition(async () => {
      const result = await getOrders(
        buildFilters(
          currentTab,
          currentPage,
          currentSearch,
          startDate,
          endDate,
          paymentMethod,
          dateSortOrder,
        ),
      );
      if (result.success && result.data) {
        setOrders(result.data);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      }
    });
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setSelectedOrder(null);
  };

  const handleOrderUpdated = () => {
    startTransition(async () => {
      const result = await getOrders(
        buildFilters(
          currentTab,
          currentPage,
          currentSearch,
          startDate,
          endDate,
          paymentMethod,
          dateSortOrder,
        ),
      );
      if (result.success && result.data) {
        setOrders(result.data);
        if (result.pagination) {
          setPagination(result.pagination);
        }
        if (selectedOrder) {
          const updated = result.data.find((o) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    });
  };

  const handleOrderTypeChanged = (newType: OrderType) => {
    handleCloseSidebar();
    if (currentTab !== "ALL") {
      updateUrlAndFetch(
        newType,
        1,
        currentSearch,
        startDate,
        endDate,
        paymentMethod,
        dateSortOrder,
      );
    } else {
      handleOrderUpdated();
    }
  };

  const handleCreateOrder = (type: OrderType) => {
    setCreateOrderType(type);
    setCreateOrderSidebarOpen(true);
  };

  const handleCloseCreateSidebar = () => {
    setCreateOrderSidebarOpen(false);
    setCreateOrderType(null);
  };

  const handleOrderCreated = (
    orderId?: string,
    createdOrderType?: OrderType,
  ) => {
    const targetTab = createdOrderType || currentTab;

    if (createdOrderType && createdOrderType !== currentTab) {
      const params = new URLSearchParams();
      params.set("type", createdOrderType);
      params.set("page", "1");
      if (currentSearch) params.set("search", currentSearch);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (paymentMethod) params.set("paymentMethod", paymentMethod);
      if (dateSortOrder !== "desc") params.set("sortOrder", dateSortOrder);
      startTransition(() => {
        router.push(`/dashboard/orders?${params.toString()}`);
      });
    } else {
      startTransition(async () => {
        const result = await getOrders(
          buildFilters(
            targetTab,
            1,
            currentSearch,
            startDate,
            endDate,
            paymentMethod,
            dateSortOrder,
          ),
        );

        if (result.success && result.data) {
          setOrders(result.data);
          if (result.pagination) {
            setPagination(result.pagination);
          }

          if (orderId) {
            const createdOrder = result.data.find((o) => o.id === orderId);
            if (createdOrder) {
              setSelectedOrder(createdOrder);
              setSidebarOpen(true);
            }
          }
        }
      });
    }
  };

  // Client-side sort by total (within current page)
  const displayedOrders = useMemo(() => {
    if (totalSortOrder === "none") return orders;
    return [...orders].sort((a, b) => {
      const diff = computeOrderTotal(a) - computeOrderTotal(b);
      return totalSortOrder === "asc" ? diff : -diff;
    });
  }, [orders, totalSortOrder]);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const { totalPages } = pagination;
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const isLoadingState = isPending;

  return (
    <div className="space-y-6">
      {/* Search and Action Buttons */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por código..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9 pr-9"
          />
          {(searchInput || currentSearch) && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refreshOrders}
            disabled={isLoadingState}
            title="Actualizar órdenes"
          >
            {isLoadingState ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Orden
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => handleCreateOrder(OrderType.TAKE_AWAY)}
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Para Llevar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleCreateOrder(OrderType.DINE_IN)}
              >
                <UtensilsCrossed className="h-4 w-4 mr-2" />
                Para Comer Aquí
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleCreateOrder(OrderType.DELIVERY)}
              >
                <Truck className="h-4 w-4 mr-2" />
                Delivery
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">
            Desde
          </label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="w-40 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">
            Hasta
          </label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="w-40 text-sm"
          />
        </div>

        <Select
          value={paymentMethod || "ALL"}
          onValueChange={handlePaymentMethodChange}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Medios de pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los medios de pago</SelectItem>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentSortValue} onValueChange={handleSortChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Más reciente</SelectItem>
            <SelectItem value="date_asc">Más antiguo</SelectItem>
            <SelectItem value="total_desc">Mayor precio</SelectItem>
            <SelectItem value="total_asc">Menor precio</SelectItem>
          </SelectContent>
        </Select>

        {(hasActiveFilters || totalSortOrder !== "none") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Order Type Tabs */}
      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="w-full justify-start">
          <TabsTrigger value="DINE_IN">
            <span>Para Comer Aquí</span>
            {activeOrderCounts.DINE_IN > 0 && (
              <Badge variant="destructive" className="ml-1.5">
                {activeOrderCounts.DINE_IN}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="TAKE_AWAY">
            <span>Para Llevar</span>
            {activeOrderCounts.TAKE_AWAY > 0 && (
              <Badge variant="destructive" className="ml-1.5">
                {activeOrderCounts.TAKE_AWAY}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="DELIVERY">
            <span>Delivery</span>
            {activeOrderCounts.DELIVERY > 0 && (
              <Badge variant="destructive" className="ml-1.5">
                {activeOrderCounts.DELIVERY}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ALL">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value={currentTab} className="mt-6">
          {isLoadingState ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : displayedOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay órdenes para mostrar
            </div>
          ) : (
            <OrderListView
              orders={displayedOrders}
              onOrderClick={handleOrderClick}
              activeTab={currentTab}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {!isLoadingState && pagination.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              />
            </PaginationItem>
            {getPageNumbers().map((pageNum, index) =>
              pageNum === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => handlePageChange(pageNum)}
                    isActive={currentPage === pageNum}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Order Details Sidebar */}
      <OrderDetailsSidebar
        order={selectedOrder}
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        branchId={branchId}
        onOrderUpdated={handleOrderUpdated}
        canChangeOrderType={canChangeOrderType}
        onOrderTypeChanged={handleOrderTypeChanged}
      />

      {/* Create Order Sidebar */}
      <CreateOrderSidebar
        branchId={branchId}
        tables={tables}
        open={createOrderSidebarOpen}
        onClose={handleCloseCreateSidebar}
        onOrderCreated={handleOrderCreated}
        initialOrderType={createOrderType}
      />
    </div>
  );
}
