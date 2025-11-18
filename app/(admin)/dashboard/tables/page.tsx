import { getTablesWithStatus } from "@/actions/Table";
import { TablesClientWrapper } from "@/components/dashboard/tables-client-wrapper";

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
    <div className="bg-neutral-50 min-h-screen pt-15">
      {/* <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mesas</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gestiona el estado de las mesas de tu restaurante
        </p>
      </div> */}

      <TablesClientWrapper
        branchId={branchId}
        initialTables={serializedTables}
      />
    </div>
  );
}
