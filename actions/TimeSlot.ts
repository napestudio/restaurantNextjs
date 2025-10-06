"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Create a new time slot for a branch
 */
export async function createTimeSlot(data: {
  branchId: string;
  startTime: string; // HH:mm format (e.g., "19:00")
  endTime: string; // HH:mm format (e.g., "20:00")
  daysOfWeek: string[]; // ["monday", "tuesday", etc.]
  pricePerPerson?: number;
  notes?: string;
  isActive?: boolean;
}) {
  try {
    // Convert time strings to Date objects (using a reference date)
    const startTime = new Date(`1970-01-01T${data.startTime}:00`);
    const endTime = new Date(`1970-01-01T${data.endTime}:00`);

    const timeSlot = await prisma.timeSlot.create({
      data: {
        branchId: data.branchId,
        startTime,
        endTime,
        daysOfWeek: data.daysOfWeek,
        pricePerPerson: data.pricePerPerson ?? 0,
        notes: data.notes,
        isActive: data.isActive ?? true,
      },
    });

    revalidatePath("/dashboard/reservations/slots");
    return {
      success: true,
      data: {
        ...timeSlot,
        pricePerPerson: timeSlot.pricePerPerson?.toNumber() || 0,
      },
    };
  } catch (error) {
    console.error("Error creating time slot:", error);
    return { success: false, error: "Failed to create time slot" };
  }
}

/**
 * Get all time slots for a branch
 */
export async function getTimeSlots(branchId: string) {
  try {
    const timeSlots = await prisma.timeSlot.findMany({
      where: {
        branchId,
        isActive: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return {
      success: true,
      data: timeSlots.map((slot) => ({
        ...slot,
        pricePerPerson: slot.pricePerPerson?.toNumber() || 0,
      })),
    };
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return { success: false, error: "Failed to fetch time slots" };
  }
}

/**
 * Get a single time slot by ID
 */
export async function getTimeSlotById(id: string) {
  try {
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id },
      include: {
        branch: true,
        reservations: true,
      },
    });

    if (!timeSlot) {
      return { success: false, error: "Time slot not found" };
    }

    return { success: true, data: timeSlot };
  } catch (error) {
    console.error("Error fetching time slot:", error);
    return { success: false, error: "Failed to fetch time slot" };
  }
}

/**
 * Update an existing time slot
 */
export async function updateTimeSlot(
  id: string,
  data: {
    startTime?: string; // HH:mm format
    endTime?: string; // HH:mm format
    daysOfWeek?: string[];
    pricePerPerson?: number;
    notes?: string;
    isActive?: boolean;
  }
) {
  try {
    const updateData: {
      startTime?: Date;
      endTime?: Date;
      daysOfWeek?: string[];
      pricePerPerson?: number;
      notes?: string | null;
      isActive?: boolean;
    } = {};

    if (data.startTime) {
      updateData.startTime = new Date(`1970-01-01T${data.startTime}:00`);
    }
    if (data.endTime) {
      updateData.endTime = new Date(`1970-01-01T${data.endTime}:00`);
    }
    if (data.daysOfWeek !== undefined) {
      updateData.daysOfWeek = data.daysOfWeek;
    }
    if (data.pricePerPerson !== undefined) {
      updateData.pricePerPerson = data.pricePerPerson;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const timeSlot = await prisma.timeSlot.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/dashboard/reservations/slots");
    return {
      success: true,
      data: {
        ...timeSlot,
        pricePerPerson: timeSlot.pricePerPerson?.toNumber() || 0,
      },
    };
  } catch (error) {
    console.error("Error updating time slot:", error);
    return { success: false, error: "Failed to update time slot" };
  }
}

/**
 * Delete a time slot (soft delete by setting isActive to false)
 */
export async function deleteTimeSlot(id: string, softDelete: boolean = true) {
  try {
    if (softDelete) {
      // Soft delete - just mark as inactive
      console.log("el id es", id);
      const timeSlot = await prisma.timeSlot.update({
        where: { id },
        data: { isActive: false },
      });

      revalidatePath("/dashboard/reservations/slots");
      return {
        success: true,
        data: {
          ...timeSlot,
          pricePerPerson: timeSlot.pricePerPerson?.toNumber() || 0,
        },
      };
    } else {
      // Hard delete - check if there are any reservations using this slot
      const timeSlot = await prisma.timeSlot.findUnique({
        where: { id },
        include: {
          reservations: true,
        },
      });

      if (timeSlot && timeSlot.reservations.length > 0) {
        return {
          success: false,
          error:
            "Cannot delete time slot with existing reservations. Use soft delete instead.",
        };
      }

      await prisma.timeSlot.delete({
        where: { id },
      });

      revalidatePath("/dashboard/reservations/slots");
      return { success: true, data: null };
    }
  } catch (error) {
    console.error("Error deleting time slot:", error);
    return { success: false, error: "Failed to delete time slot" };
  }
}

/**
 * Get available time slots for a specific date
 */
export async function getAvailableTimeSlotsForDate(
  branchId: string,
  date: Date
) {
  try {
    const dayOfWeek = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][date.getDay()];

    const timeSlots = await prisma.timeSlot.findMany({
      where: {
        branchId,
        isActive: true,
        daysOfWeek: {
          has: dayOfWeek,
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return { success: true, data: timeSlots };
  } catch (error) {
    console.error("Error fetching available time slots:", error);
    return { success: false, error: "Failed to fetch available time slots" };
  }
}

/**
 * Toggle time slot active status
 */
export async function toggleTimeSlotStatus(id: string) {
  try {
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id },
    });

    if (!timeSlot) {
      return { success: false, error: "Time slot not found" };
    }

    const updated = await prisma.timeSlot.update({
      where: { id },
      data: {
        isActive: !timeSlot.isActive,
      },
    });

    revalidatePath("/dashboard/reservations/slots");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error toggling time slot status:", error);
    return { success: false, error: "Failed to toggle time slot status" };
  }
}
