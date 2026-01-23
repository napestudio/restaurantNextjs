import { getCashRegistersByBranch } from "@/actions/CashRegister";
import { getSectorsByBranch } from "@/actions/Sector";
import { CashRegistersManager } from "@/components/dashboard/cash-registers/cash-registers-manager";
import { BRANCH_ID } from "@/lib/constants";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";

export default async function CashRegistersConfigPage() {
  await requireRole(UserRole.ADMIN);

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

  // Serialize registers - need to handle nested sessions with Decimal fields
  const registersWithStatus = cashRegisters.map((register) => ({
    ...register,
    hasOpenSession: register.sessions.length > 0,
    // Serialize sessions inside each register (contains Decimal fields)
    sessions: register.sessions.map((session) => ({
      ...session,
      openingAmount: Number(session.openingAmount),
      expectedCash: session.expectedCash ? Number(session.expectedCash) : null,
      countedCash: session.countedCash ? Number(session.countedCash) : null,
      variance: session.variance ? Number(session.variance) : null,
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt ? session.closedAt.toISOString() : null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    })),
  }));

  return (
    <CashRegistersManager
      branchId={branchId}
      initialCashRegisters={registersWithStatus}
      sectors={sectors}
    />
  );
}
