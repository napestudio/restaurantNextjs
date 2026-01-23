import { TimeSlotsManager } from "@/components/dashboard/time-slots-manager";
import { getTimeSlots } from "@/actions/TimeSlot";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";

export default async function TimeSlotsPage() {
  await requireRole(UserRole.ADMIN);

  // TODO: Get branchId from user session/context
  const branchId = process.env.BRANCH_ID || ""; // Replace with actual branchId from auth

  // Fetch time slots (already serialized by the action)
  const result = await getTimeSlots(branchId);
  const timeSlots = result.success && result.data ? result.data : [];
  if (!timeSlots) return;

  return (
    <div className="bg-gray-50 w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-16 w-full ">
        <TimeSlotsManager initialTimeSlots={timeSlots} branchId={branchId} />
      </div>
    </div>
  );
}
