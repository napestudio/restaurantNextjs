import { getCashRegistersByBranch } from "@/actions/CashRegister";
import { getSectorsByBranch } from "@/actions/Sector";
import { CashRegistersManager } from "@/components/dashboard/cash-registers/cash-registers-manager";
import { BRANCH_ID } from "@/lib/constants";

export default async function CashRegistersConfigPage() {
  const branchId = BRANCH_ID || "";

  const [cashRegistersResult, sectorsResult] = await Promise.all([
    getCashRegistersByBranch(branchId),
    getSectorsByBranch(branchId),
  ]);

  const cashRegisters =
    cashRegistersResult.success && cashRegistersResult.data
      ? cashRegistersResult.data
      : [];

  const sectors =
    sectorsResult.success && sectorsResult.data ? sectorsResult.data : [];

  // Add hasOpenSession flag to each register
  const registersWithStatus = cashRegisters.map((register) => ({
    ...register,
    hasOpenSession: register.sessions.length > 0,
  }));

  return (
    <CashRegistersManager
      branchId={branchId}
      initialCashRegisters={registersWithStatus}
      sectors={sectors}
    />
  );
}
