import { getFilteredReservations } from "@/actions/Reservation";
import { getTimeSlots } from "@/actions/TimeSlot";
import { ReservationsManager } from "@/components/dashboard/reservations-manager";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";

export default async function ReservationsPage() {
  await requireRole(UserRole.WAITER);

  // TODO: Get branchId from user session/context
  const branchId = process.env.BRANCH_ID || "";

  // Fetch time slots and reservations in parallel for faster loading
  const [timeSlotsResult, reservationsResult] = await Promise.all([
    getTimeSlots(branchId),
    getFilteredReservations(branchId, {
      type: "today",
      limit: 10,
    }),
  ]);

  const timeSlots =
    timeSlotsResult.success && timeSlotsResult.data ? timeSlotsResult.data : [];

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
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-16">
        <ReservationsManager
          initialReservations={reservations}
          initialPagination={pagination}
          timeSlots={timeSlots}
          branchId={branchId}
        />
      </main>
    </div>
  );
}
