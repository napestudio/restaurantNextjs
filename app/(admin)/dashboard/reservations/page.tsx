import { getFilteredReservations } from "@/actions/Reservation";
import { ReservationsManager } from "@/components/dashboard/reservations-manager";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";

export default async function ReservationsPage() {
  await requireRole(UserRole.WAITER);

  // TODO: Get branchId from user session/context
  const branchId = process.env.BRANCH_ID || "";

  // Time slots are NOT fetched here — they load lazily when the Create Reservation dialog opens
  const reservationsResult = await getFilteredReservations(branchId, {
    type: "today",
    limit: 10,
  });

  const reservations =
    reservationsResult.success && reservationsResult.data
      ? reservationsResult.data.reservations
      : [];

  const pagination =
    reservationsResult.success && reservationsResult.data
      ? {
          nextCursor: reservationsResult.data.nextCursor,
          hasMore: reservationsResult.data.hasMore,
          totalCount: reservationsResult.data.totalCount,
        }
      : { nextCursor: null, hasMore: false, totalCount: 0 };
  return (
    <div className="min-h-svh bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-16">
        <ReservationsManager
          initialReservations={reservations}
          initialPagination={pagination}
          branchId={branchId}
        />
      </main>
    </div>
  );
}
