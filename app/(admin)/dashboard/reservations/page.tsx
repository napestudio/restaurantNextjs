import { ReservationsManager } from "@/components/dashboard/reservations-manager";
import { getTimeSlots } from "@/actions/TimeSlot";
import { getReservations } from "@/actions/Reservation";
import { ReservationWithRelations } from "./lib/reservations";

export default async function ReservationsPage() {
  // TODO: Get branchId from user session/context
  const branchId = process.env.BRANCH_ID || "";
  // Fetch time slots from database
  const timeSlotsResult = await getTimeSlots(branchId);
  const timeSlots = timeSlotsResult.success ? timeSlotsResult.data : [];

  // Fetch reservations from database
  const reservationsResult = await getReservations(branchId);
  const rawReservations =
    reservationsResult.success && Array.isArray(reservationsResult.data)
      ? reservationsResult.data
      : [];

  // Serialize reservations for client component (convert Dates to strings)
  const reservations = rawReservations.map((reservation) => ({
    ...reservation,
    date: reservation.date.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    timeSlot: reservation.timeSlot
      ? {
          ...reservation.timeSlot,
          startTime: reservation.timeSlot.startTime.toISOString(),
          endTime: reservation.timeSlot.endTime.toISOString(),
          pricePerPerson: Number(reservation.timeSlot.pricePerPerson) || 0,
          createdAt: reservation.timeSlot.createdAt.toISOString(),
          updatedAt: reservation.timeSlot.updatedAt.toISOString(),
        }
      : null,
  }));

  // Format time slots to match the expected format
  const formattedTimeSlots = timeSlots?.map((slot) => ({
    id: slot.id,
    timeFrom: slot.startTime.toISOString().slice(11, 16), // Extract HH:mm
    timeTo: slot.endTime.toISOString().slice(11, 16), // Extract HH:mm
    days: slot.daysOfWeek,
    price: Number(slot.pricePerPerson) || 0,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {formattedTimeSlots && (
          <ReservationsManager
            initialReservations={reservations}
            timeSlots={formattedTimeSlots}
            branchId={branchId}
          />
        )}
      </main>
    </div>
  );
}
