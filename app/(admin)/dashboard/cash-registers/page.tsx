import { getCashRegistersByBranch } from "@/actions/CashRegister";
import { BRANCH_ID } from "@/lib/constants";
import { CashRegistersClient } from "./cash-registers-client";
import prisma from "@/lib/prisma";

export default async function CashRegistersPage() {
  const branchId = BRANCH_ID || "";

  // Fetch cash registers with their current session status
  const cashRegistersResult = await getCashRegistersByBranch(branchId);
  const cashRegisters =
    cashRegistersResult.success && cashRegistersResult.data
      ? cashRegistersResult.data
      : [];

  // Fetch recent sessions (last 30 days) for the history table
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sessions = await prisma.cashRegisterSession.findMany({
    where: {
      cashRegister: {
        branchId,
      },
      openedAt: {
        gte: thirtyDaysAgo,
      },
    },
    include: {
      cashRegister: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          movements: true,
        },
      },
    },
    orderBy: {
      openedAt: "desc",
    },
    take: 50,
  });

  // Serialize Decimal fields for client
  const serializedSessions = sessions.map((session) => ({
    ...session,
    openingAmount: Number(session.openingAmount),
    expectedCash: session.expectedCash ? Number(session.expectedCash) : null,
    countedCash: session.countedCash ? Number(session.countedCash) : null,
    variance: session.variance ? Number(session.variance) : null,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt ? session.closedAt.toISOString() : null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  }));

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
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-16">
        <CashRegistersClient
          branchId={branchId}
          cashRegisters={registersWithStatus}
          initialSessions={serializedSessions}
        />
      </main>
    </div>
  );
}
