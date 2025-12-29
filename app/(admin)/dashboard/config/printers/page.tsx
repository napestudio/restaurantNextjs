import { getPrintersByBranch } from "@/actions/Printer";
import { getStationsByBranch } from "@/actions/Station";
import { PrintersManager } from "@/components/dashboard/printers-manager";
import { BRANCH_ID } from "@/lib/constants";

export default async function PrintersPage() {
  const branchId = BRANCH_ID || "";

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
