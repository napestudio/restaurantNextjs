import { getCurrentUserBranchId } from "@/lib/user-branch";
import { getPrintersByBranch } from "@/actions/Printer";
import { getStationsByBranch } from "@/actions/Station";
import { getBranch } from "@/actions/Branch";
import { PrintersManager } from "@/components/dashboard/printers-manager";
import { BranchPrinterServerForm } from "@/components/dashboard/printers/branch-printer-server-form";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";

export default async function PrintersPage() {
  await requireRole(UserRole.ADMIN);

  const branchId = (await getCurrentUserBranchId()) || "";

  const [printersResult, stationsResult, branchResult] = await Promise.all([
    getPrintersByBranch(branchId),
    getStationsByBranch(branchId),
    getBranch(branchId),
  ]);

  const printers =
    printersResult.success && printersResult.data ? printersResult.data : [];
  const stations =
    stationsResult.success && stationsResult.data ? stationsResult.data : [];
  const printerServerUrl =
    branchResult.success && branchResult.data
      ? branchResult.data.printerServerUrl
      : null;

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-base font-semibold mb-4">Servidor de impresión</h2>
        <BranchPrinterServerForm
          branchId={branchId}
          initialUrl={printerServerUrl}
        />
      </div>
      <PrintersManager
        branchId={branchId}
        initialPrinters={printers}
        initialStations={stations}
      />
    </div>
  );
}
