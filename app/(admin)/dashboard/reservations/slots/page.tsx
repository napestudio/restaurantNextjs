import { TimeSlotsManager } from "@/components/dashboard/time-slots-manager";
import { getTimeSlots } from "@/actions/TimeSlot";

export default async function TimeSlotsPage() {
  // TODO: Get branchId from user session/context
  const branchId = process.env.BRANCH_ID || ""; // Replace with actual branchId from auth

  const result = await getTimeSlots(branchId);
  const timeSlots = result.success ? result.data : [];
  if (!timeSlots) return;
  // Transform time slots to match the expected format
  const formattedTimeSlots = timeSlots.map((slot) => {
    // Extract time from Date object (HH:mm format)
    const startTime = slot.startTime.toISOString().substring(11, 16);
    const endTime = slot.endTime.toISOString().substring(11, 16);

    return {
      id: slot.id || "",
      timeFrom: startTime,
      timeTo: endTime,
      days: slot.daysOfWeek,
      price: parseFloat(slot.pricePerPerson?.toString() || "0"),
      notes: slot.notes || "",
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <TimeSlotsManager
          initialTimeSlots={formattedTimeSlots}
          branchId={branchId}
        />
      </main>
    </div>
  );
}
