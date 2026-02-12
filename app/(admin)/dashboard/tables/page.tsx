import { getTablesWithStatus } from "@/actions/Table";
import { getSectorsByBranch } from "@/actions/Sector";
import { TablesClientWrapper } from "@/components/dashboard/tables-client-wrapper";
import { BRANCH_ID } from "@/lib/constants";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";

export default async function TablesPage() {
  await requireRole(UserRole.WAITER);

  // TODO: Get branchId from user session/context
  const branchId = BRANCH_ID || "";

  // Fetch tables and sectors in parallel
  const [tablesResult, sectorsResult] = await Promise.all([
    getTablesWithStatus(branchId),
    getSectorsByBranch(branchId),
  ]);

  if (!tablesResult.success || !tablesResult.data) {
    return <div>Error loading tables</div>;
  }

  if (!sectorsResult.success || !sectorsResult.data) {
    return <div>Error loading sectors</div>;
  }

  const tables = tablesResult.data;

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
        initialSectors={sectorsResult.data}
      />
    </div>
  );
}
