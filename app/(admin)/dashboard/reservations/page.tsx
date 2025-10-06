import { ReservationsManager } from "@/components/dashboard/reservations-manager";
import {
  initialReservations,
  timeSlots,
} from "./lib/reservations";

export default function ReservationsPage() {
  // In the future, fetch reservations from database here
  // const reservations = await getReservations();
  // const timeSlots = await getTimeSlots();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <ReservationsManager
          initialReservations={initialReservations}
          timeSlots={timeSlots}
        />
      </main>
    </div>
  );
}
