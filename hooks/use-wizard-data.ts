import { useState, useEffect, useCallback } from "react";
import { getAvailableTimeSlotsForDate, getTimeSlots } from "@/actions/TimeSlot";
import { createReservation } from "@/actions/Reservation";
import type { WizardData } from "@/lib/reservation-wizard-utils";

export function useWizardData(branchId: string) {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch all time slots on mount - memoized
  const fetchAllTimeSlots = useCallback(async () => {
    const result = await getTimeSlots(branchId);
    if (result.success && result.data) {
      return result.data.map((slot) => ({
        id: slot.id,
        name: slot.name,
        daysOfWeek: slot.daysOfWeek,
      }));
    }
    return [];
  }, [branchId]);

  // Fetch available time slots for a specific date - memoized
  const fetchAvailableSlots = useCallback(
    async (date: string, guests: number) => {
      setIsPending(true);
      try {
        console.log("Fetching time slots for:", {
          branchId,
          date,
          guests,
        });

        const result = await getAvailableTimeSlotsForDate(
          branchId,
          date,
          true, // includeAvailability
          guests
        );

        console.log("Time slots result:", result);

        if (result.success && result.data) {
          console.log("Setting available slots:", result.data);
          return result.data;
        }

        console.log("No slots or error:", result.error);
        return [];
      } catch (error) {
        console.error("Error fetching time slots:", error);
        return [];
      } finally {
        setIsPending(false);
      }
    },
    [branchId]
  );

  // Submit reservation - memoized
  const submitReservation = useCallback(
    async (wizardData: WizardData) => {
      setIsPending(true);
      try {
        const result = await createReservation({
          branchId,
          customerName: wizardData.name,
          customerEmail: wizardData.email,
          customerPhone: wizardData.phone || undefined,
          date: wizardData.date,
          time: wizardData.timeSlotId,
          guests: wizardData.guests,
          timeSlotId: wizardData.timeSlotId,
          exactTime: wizardData.exactTime || undefined,
          dietaryRestrictions: wizardData.dietaryRestrictions || undefined,
          accessibilityNeeds: wizardData.accessibilityNeeds || undefined,
          notes: wizardData.notes || undefined,
          createdBy: "WEB",
        });

        if (result.success) {
          setIsSuccess(true);
          return { success: true };
        }

        return { success: false, error: result.error || "Error al crear la reserva" };
      } catch (error) {
        console.error("Error creating reservation:", error);
        return { success: false, error: "Error inesperado al crear la reserva" };
      } finally {
        setIsPending(false);
      }
    },
    [branchId]
  );

  // Reset success state - memoized
  const resetSuccess = useCallback(() => {
    setIsSuccess(false);
  }, []);

  return {
    isPending,
    isSuccess,
    fetchAllTimeSlots,
    fetchAvailableSlots,
    submitReservation,
    resetSuccess,
  };
}
