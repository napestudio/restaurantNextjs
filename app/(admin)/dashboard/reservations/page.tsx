import { getReservations } from "@/actions/Reservation";
import { getTimeSlots } from "@/actions/TimeSlot";
import { ReservationsManager } from "@/components/dashboard/reservations-manager";

export default async function ReservationsPage() {
  // TODO: Get branchId from user session/context
  const branchId = process.env.BRANCH_ID || "";
  // Fetch time slots from database
  const timeSlotsResult = await getTimeSlots(branchId);
  const timeSlots = timeSlotsResult.success ? timeSlotsResult.data : [];

  // Fetch reservations from database (already serialized by the action)
  const reservationsResult = await getReservations(branchId);
  const reservations =
    reservationsResult.success && Array.isArray(reservationsResult.data)
      ? reservationsResult.data
      : [];

  // Serialize time slots for client component (convert Dates to strings, Decimals to numbers)
  const serializedTimeSlots = timeSlots?.map((slot) => ({
    ...slot,
    startTime: slot.startTime.toISOString(),
    endTime: slot.endTime.toISOString(),
    pricePerPerson: slot.pricePerPerson ? Number(slot.pricePerPerson) : null,
    createdAt: slot.createdAt.toISOString(),
    updatedAt: slot.updatedAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {serializedTimeSlots && (
          <ReservationsManager
            initialReservations={reservations}
            timeSlots={serializedTimeSlots}
            branchId={branchId}
          />
        )}
      </main>
    </div>
  );
}
