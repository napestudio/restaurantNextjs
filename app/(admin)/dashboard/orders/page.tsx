import { getOrders } from "@/actions/Order";
import { OrdersClient } from "./orders-client";
import prisma from "@/lib/prisma";

export default async function OrdersPage() {
  // TODO: Get branchId from user session/context
  const branchId = process.env.BRANCH_ID || "";

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch today's orders by default
  const ordersResult = await getOrders({
    branchId,
    startDate: today,
  });

  const rawOrders =
    ordersResult.success && ordersResult.data ? ordersResult.data : [];

  // Serialize Decimal fields for client components
  const orders = rawOrders.map((order) => ({
    ...order,
    discountPercentage: Number(order.discountPercentage),
  }));

  // Fetch available tables for filter
  const tables = await prisma.table.findMany({
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
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ordenes</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gestiona y visualiza las ordenes de tu restaurante
          </p>
        </div>

        <OrdersClient
          branchId={branchId}
          initialOrders={orders}
          tables={tables}
        />
      </main>
    </div>
  );
}
