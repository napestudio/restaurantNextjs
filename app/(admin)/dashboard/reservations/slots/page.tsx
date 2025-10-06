import { TimeSlotsManager } from "@/components/dashboard/time-slots-manager";
import { initialTimeSlots } from "./lib/time-slots";

export default function TimeSlotsPage() {
  // In the future, fetch time slots from database here
  // const timeSlots = await getTimeSlots();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <TimeSlotsManager initialTimeSlots={initialTimeSlots} />
      </main>
    </div>
  );
}
