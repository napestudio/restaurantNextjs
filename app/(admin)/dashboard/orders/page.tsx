import {
  getOrders,
  getActiveOrderCounts,
} from "@/actions/Order";
import { OrdersClient } from "./orders-client";
import prisma from "@/lib/prisma";
import { ProductsProvider } from "@/contexts/products-context";
import { OrderType, UserRole } from "@/app/generated/prisma";
import { requireRole } from "@/lib/permissions/middleware";

type SearchParams = Promise<{
  type?: string;
  page?: string;
  search?: string;
}>;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(UserRole.WAITER);

  const params = await searchParams;
  // TODO: Get branchId from user session/context
  const branchId = process.env.BRANCH_ID || "";

  // Parse search params
  const typeParam = params.type;
  const pageParam = params.page;
  const searchParam = params.search;

  // Validate and set order type (default to DINE_IN)
  const validTypes = ["DINE_IN", "TAKE_AWAY", "DELIVERY", "ALL"];
  const orderType =
    typeParam && validTypes.includes(typeParam)
      ? typeParam === "ALL"
        ? undefined
        : (typeParam as OrderType)
      : OrderType.DINE_IN;

  // Validate and set page number
  const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;
  const pageSize = 15; // Match client-side pagination expectations

  // Fetch orders, tables, and order counts in parallel
  // Products are NOT fetched here — they load lazily when the Create Order sidebar is opened
  const [ordersResult, tables, orderCounts] = await Promise.all([
    getOrders({
      branchId,
      type: orderType,
      page,
      pageSize,
      search: searchParam,
    }),
    prisma.table.findMany({
      where: {
        branchId,
        isActive: true,
      },
      select: {
        id: true,
        number: true,
        name: true,
      },
      orderBy: {
        number: "asc",
      },
    }),
    getActiveOrderCounts(branchId),
  ]);

  const rawOrders =
    ordersResult.success && ordersResult.data ? ordersResult.data : [];

  // Serialize Decimal fields for client components
  const orders = rawOrders.map((order) => ({
    ...order,
    discountPercentage: Number(order.discountPercentage),
    deliveryFee: Number(order.deliveryFee),
    cashMovements: order.cashMovements?.map((m) => ({
      paymentMethod: m.paymentMethod,
      amount: Number(m.amount),
    })),
  }));

  const pagination = ordersResult.pagination || {
    page: 1,
    pageSize: 15,
    totalCount: 0,
    totalPages: 0,
  };

  // Determine active tab from URL or default to DINE_IN
  const activeTab =
    typeParam && validTypes.includes(typeParam) ? typeParam : "DINE_IN";

  return (
    <div className="min-h-svh bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ordenes</h1>
        </div>

        <ProductsProvider
          branchId={branchId}
          orderType={orderType ?? OrderType.DINE_IN}
        >
          <OrdersClient
            branchId={branchId}
            initialOrders={orders}
            tables={tables}
            initialPagination={pagination}
            initialTab={activeTab}
            initialSearch={searchParam || ""}
            activeOrderCounts={orderCounts}
          />
        </ProductsProvider>
      </main>
    </div>
  );
}
