import { TimeSlotsManager } from "@/components/dashboard/time-slots-manager";
import { getTimeSlots } from "@/actions/TimeSlot";

export default async function TimeSlotsPage() {
  // TODO: Get branchId from user session/context
  const branchId = process.env.BRANCH_ID || ""; // Replace with actual branchId from auth

  const result = await getTimeSlots(branchId);
  const timeSlots = result.success ? result.data : [];
  if (!timeSlots) return;

  // Serialize time slots for client component (convert Dates to strings, Decimals to numbers)
  const serializedTimeSlots = timeSlots.map((slot) => ({
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
        <TimeSlotsManager
          initialTimeSlots={serializedTimeSlots}
          branchId={branchId}
        />
      </main>
    </div>
  );
}
