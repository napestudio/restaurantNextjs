import { getOrders, getAvailableProductsForOrder } from "@/actions/Order";
import { OrdersClient } from "./orders-client";
import prisma from "@/lib/prisma";
import { ProductsProvider } from "@/contexts/products-context";
import { OrderType } from "@/app/generated/prisma";

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
  const pageSize = 5;

  // Fetch orders, tables, and products in parallel for faster loading
  const [ordersResult, tables, products] = await Promise.all([
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
    getAvailableProductsForOrder(branchId, orderType ?? OrderType.DINE_IN),
  ]);

  const rawOrders =
    ordersResult.success && ordersResult.data ? ordersResult.data : [];

  // Serialize Decimal fields for client components
  const orders = rawOrders.map((order) => ({
    ...order,
    discountPercentage: Number(order.discountPercentage),
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
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ordenes</h1>
        </div>

        <ProductsProvider
          branchId={branchId}
          orderType={orderType ?? OrderType.DINE_IN}
          initialProducts={products}
        >
          <OrdersClient
            branchId={branchId}
            initialOrders={orders}
            tables={tables}
            initialPagination={pagination}
            initialTab={activeTab}
            initialSearch={searchParam || ""}
          />
        </ProductsProvider>
      </main>
    </div>
  );
}
