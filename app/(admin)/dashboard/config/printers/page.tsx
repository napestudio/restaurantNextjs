import { getCurrentUserBranchId } from "@/lib/user-branch";
import { getPrintersByBranch } from "@/actions/Printer";
import { getStationsByBranch } from "@/actions/Station";
import { PrintersManager } from "@/components/dashboard/printers-manager";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";

export default async function PrintersPage() {
  await requireRole(UserRole.ADMIN);

  const branchId = (await getCurrentUserBranchId()) || "";

  const [printersResult, stationsResult] = await Promise.all([
    getPrintersByBranch(branchId),
    getStationsByBranch(branchId),
  ]);

  const printers =
    printersResult.success && printersResult.data ? printersResult.data : [];
  const stations =
    stationsResult.success && stationsResult.data ? stationsResult.data : [];

  return (
    <PrintersManager
      branchId={branchId}
      initialPrinters={printers}
      initialStations={stations}
    />
  );
}
