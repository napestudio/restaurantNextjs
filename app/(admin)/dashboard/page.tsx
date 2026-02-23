import { BRANCH_ID } from "@/lib/constants";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";
import { getOrders, getActiveOrderCounts } from "@/actions/Order";
import { getFilteredReservations } from "@/actions/Reservation";
import { getLowStockAlerts } from "@/actions/stock";
import { getTablesWithStatus } from "@/actions/Table";
import { DashboardHome } from "@/components/dashboard/dashboard-home";

export default async function DashboardPage() {
  await requireRole(UserRole.WAITER);

  const branchId = BRANCH_ID || "";

  const [ordersResult, reservationsResult, stockAlertsResult, orderCounts, tablesResult] =
    await Promise.all([
      getOrders({ branchId, pageSize: 5, page: 1 }),
      getFilteredReservations(branchId, { type: "today", limit: 5 }),
      getLowStockAlerts(branchId),
      getActiveOrderCounts(branchId),
      getTablesWithStatus(branchId),
    ]);

  const recentOrders =
    ordersResult.success && ordersResult.data ? ordersResult.data : [];

  const recentReservations =
    reservationsResult.success && reservationsResult.data
      ? reservationsResult.data.reservations
      : [];

  const stockAlerts =
    stockAlertsResult.success && stockAlertsResult.data ? stockAlertsResult.data : [];

  const tables =
    tablesResult.success && tablesResult.data ? tablesResult.data : [];

  const serializedTables = tables.map((table) => ({
    ...table,
    reservations: table.reservations.map((res) => ({
      ...res,
      reservation: {
        ...res.reservation,
        date: res.reservation.date.toISOString(),
        timeSlot: res.reservation.timeSlot
          ? {
              startTime: res.reservation.timeSlot.startTime.toISOString(),
              endTime: res.reservation.timeSlot.endTime.toISOString(),
            }
          : null,
      },
    })),
  }));

  return (
    <DashboardHome
      recentOrders={recentOrders}
      recentReservations={recentReservations}
      stockAlerts={stockAlerts}
      orderCounts={orderCounts}
      tables={serializedTables}
    />
  );
}
