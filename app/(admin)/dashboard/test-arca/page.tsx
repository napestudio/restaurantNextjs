import { getCurrentUserBranchId } from "@/lib/user-branch";
import { getPrintersByBranch } from "@/actions/Printer";
import { TestArcaClient } from "./test-arca-client";

export default async function TestArcaPage() {
  // Get current user's branch ID
  const branchId = (await getCurrentUserBranchId()) || "";

  // Fetch printers for the branch
  const printersResult = await getPrintersByBranch(branchId);
  const printers = printersResult.success ? printersResult.data : [];

  return <TestArcaClient printers={printers} />;
}
