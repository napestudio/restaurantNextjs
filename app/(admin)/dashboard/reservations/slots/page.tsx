import { TimeSlotsManager } from "@/components/dashboard/time-slots-manager";
import { getTimeSlots } from "@/actions/TimeSlot";

export default async function TimeSlotsPage() {
  // TODO: Get branchId from user session/context
  const branchId = process.env.BRANCH_ID || ""; // Replace with actual branchId from auth

  // Fetch time slots (already serialized by the action)
  const result = await getTimeSlots(branchId);
  const timeSlots = result.success && result.data ? result.data : [];
  if (!timeSlots) return;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <TimeSlotsManager
          initialTimeSlots={timeSlots}
          branchId={branchId}
        />
      </main>
    </div>
  );
}
