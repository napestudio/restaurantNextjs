"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrders } from "@/actions/Order";
import { OrderStatus, OrderType } from "@/app/generated/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Plus, ChevronDown, Loader2, UtensilsCrossed, ShoppingBag, Truck, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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

type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

interface OrdersClientProps {
  branchId: string;
  initialOrders: Order[];
  tables: Table[];
  initialPagination: PaginationInfo;
  initialTab: string;
  initialSearch: string;
}

export function OrdersClient({
  branchId,
  initialOrders,
  tables,
  initialPagination,
  initialTab,
  initialSearch,
}: OrdersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
  const [isPending, startTransition] = useTransition();

  // Sidebar state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOrderSidebarOpen, setCreateOrderSidebarOpen] = useState(false);
  const [createOrderType, setCreateOrderType] = useState<OrderType | null>(null);

  // Search state
  const [searchInput, setSearchInput] = useState(initialSearch);

  // Current tab from URL or initial
  const currentTab = searchParams.get("type") || initialTab;
  const currentPage = parseInt(searchParams.get("page") || "1");
  const currentSearch = searchParams.get("search") || "";

  // Sync state with props when they change (server re-render)
  useEffect(() => {
    setOrders(initialOrders);
    setPagination(initialPagination);
  }, [initialOrders, initialPagination]);

  // Update URL and fetch orders
  const updateUrlAndFetch = (type: string, page: number, search?: string) => {
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("page", page.toString());
    if (search) {
      params.set("search", search);
    }
    router.push(`/dashboard/orders?${params.toString()}`);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    // Reset to page 1 when changing tabs, keep search
    updateUrlAndFetch(value, 1, currentSearch);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    updateUrlAndFetch(currentTab, page, currentSearch);
  };

  // Handle search
  const handleSearch = () => {
    if (searchInput.trim()) {
      updateUrlAndFetch(currentTab, 1, searchInput.trim());
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput("");
    updateUrlAndFetch(currentTab, 1);
  };

  // Handle search on enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Refresh orders for current tab and page
  const refreshOrders = () => {
    startTransition(async () => {
      const orderType = currentTab === "ALL" ? undefined : (currentTab as OrderType);
      const result = await getOrders({
        branchId,
        type: orderType,
        page: currentPage,
        pageSize: 15,
        search: currentSearch || undefined,
      });
      if (result.success && result.data) {
        setOrders(result.data);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      }
    });
  };

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
    refreshOrders();
  };

  // Handle create order
  const handleCreateOrder = (type: OrderType) => {
    setCreateOrderType(type);
    setCreateOrderSidebarOpen(true);
  };

  const handleCloseCreateSidebar = () => {
    setCreateOrderSidebarOpen(false);
    setCreateOrderType(null);
  };

  // Handle order created - switch tab, refresh and open the details sidebar
  const handleOrderCreated = async (orderId?: string, createdOrderType?: OrderType) => {
    // Switch to the tab matching the created order type
    const targetTab = createdOrderType || currentTab;

    // Update URL to reflect the new tab (this triggers a re-render with new data)
    if (createdOrderType && createdOrderType !== currentTab) {
      const params = new URLSearchParams();
      params.set("type", createdOrderType);
      params.set("page", "1");
      if (currentSearch) {
        params.set("search", currentSearch);
      }
      router.push(`/dashboard/orders?${params.toString()}`);
    }

    // Fetch orders for the target tab
    const result = await getOrders({
      branchId,
      type: targetTab === "ALL" ? undefined : (targetTab as OrderType),
      page: 1,
      pageSize: 15,
      search: currentSearch || undefined,
    });

    if (result.success && result.data) {
      setOrders(result.data);
      if (result.pagination) {
        setPagination(result.pagination);
      }

      // If we have an order ID, find and open it in the sidebar
      if (orderId) {
        const createdOrder = result.data.find((o) => o.id === orderId);
        if (createdOrder) {
          setSelectedOrder(createdOrder);
          setSidebarOpen(true);
        }
      }
    }
  };

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
      {/* Search and Create Button */}
      <div className="flex items-center justify-between gap-4">
        {/* Search Input */}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Orden
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleCreateOrder(OrderType.TAKE_AWAY)}>
              <ShoppingBag className="h-4 w-4 mr-2" />
              Para Llevar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateOrder(OrderType.DINE_IN)}>
              <UtensilsCrossed className="h-4 w-4 mr-2" />
              Para Comer Aquí
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateOrder(OrderType.DELIVERY)}>
              <Truck className="h-4 w-4 mr-2" />
              Delivery
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Order Type Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="DINE_IN">Para Comer Aquí</TabsTrigger>
          <TabsTrigger value="TAKE_AWAY">Para Llevar</TabsTrigger>
          <TabsTrigger value="DELIVERY">Delivery</TabsTrigger>
          <TabsTrigger value="ALL">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value={currentTab} className="mt-6">
          {isLoadingState ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay órdenes para mostrar
            </div>
          ) : (
            <OrderListView orders={orders} onOrderClick={handleOrderClick} />
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
              )
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
