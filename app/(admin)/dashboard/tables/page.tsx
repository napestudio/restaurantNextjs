import { getTablesWithStatus } from "@/actions/Table";
import { TablesTabs } from "@/components/dashboard/tables-tabs";
import { TablesSimpleView } from "@/components/dashboard/tables-simple-view";
import FloorPlanPage from "@/components/dashboard/floor-plan";

export default async function TablesPage() {
  // TODO: Get branchId from user session/context
  const branchId = process.env.BRANCH_ID || ""; // Replace with actual branchId from auth

  // Fetch tables with their current reservation status
  const tablesResult = await getTablesWithStatus(branchId);
  const tables =
    tablesResult.success && tablesResult.data ? tablesResult.data : [];

  // Serialize dates for client components
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
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mesas</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gestiona el estado de las mesas de tu restaurante
          </p>
        </div>

        <TablesTabs>
          <TablesSimpleView tables={serializedTables} />
          {/* Floor plan view - placeholder for future implementation */}
          <FloorPlanPage branchId={process.env.BRANCH_ID || ""} />
        </TablesTabs>
      </main>
    </div>
  );
}
