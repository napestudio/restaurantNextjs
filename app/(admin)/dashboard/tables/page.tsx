import { getTablesWithStatus } from "@/actions/Table";
import { TablesTabs } from "@/components/dashboard/tables-tabs";
import { TablesSimpleView } from "@/components/dashboard/tables-simple-view";

export default async function TablesPage() {
  // TODO: Get branchId from user session/context
  const branchId = "seed-branch-1"; // Replace with actual branchId from auth

  // Fetch tables with their current reservation status
  const tablesResult = await getTablesWithStatus(branchId);
  const tables = tablesResult.success && tablesResult.data ? tablesResult.data : [];

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
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Vista de Plano de Planta
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Esta funcionalidad estará disponible próximamente.
            </p>
          </div>
        </TablesTabs>
      </main>
    </div>
  );
}
