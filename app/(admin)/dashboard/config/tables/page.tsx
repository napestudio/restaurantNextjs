import { getTablesWithStatus } from "@/actions/Table";
import { TablesClientWrapper } from "@/components/dashboard/tables-client-wrapper";
import { BRANCH_ID } from "@/lib/constants";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";
import { getSectorsByBranch } from "@/actions/Sector";

export default async function ConfigTables() {
  await requireRole(UserRole.ADMIN);

  const branchId = BRANCH_ID || "";
  const [tablesResult, sectorsResult] = await Promise.all([
    getTablesWithStatus(branchId),
    getSectorsByBranch(branchId),
  ]);
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
    <div className="pt-3">
      <TablesClientWrapper
        branchId={branchId}
        initialTables={serializedTables}
        editModeOnly={true}
        initialSectors={sectorsResult.data}
      />
    </div>
  );
}
