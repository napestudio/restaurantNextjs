import { getReservations } from "@/actions/Reservation";
import { getTimeSlots } from "@/actions/TimeSlot";
import { ReservationsManager } from "@/components/dashboard/reservations-manager";

export default async function ReservationsPage() {
  // TODO: Get branchId from user session/context
  const branchId = process.env.BRANCH_ID || "";

  // Fetch time slots and reservations (both already serialized by actions)
  const timeSlotsResult = await getTimeSlots(branchId);
  const timeSlots =
    timeSlotsResult.success && timeSlotsResult.data ? timeSlotsResult.data : [];

  const reservationsResult = await getReservations(branchId);
  const reservations =
    reservationsResult.success && Array.isArray(reservationsResult.data)
      ? reservationsResult.data
      : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-16">
        <ReservationsManager
          initialReservations={reservations}
          timeSlots={timeSlots}
          branchId={branchId}
        />
      </main>
    </div>
  );
}
