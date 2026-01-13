"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Calculate the total capacity for a time slot based on its assigned tables
 * Returns 0 if no tables are assigned (unlimited - uses all branch tables)
 */
export async function calculateTimeSlotCapacity(
  timeSlotId: string
): Promise<number> {
  const timeSlotTables = await prisma.timeSlotTable.findMany({
    where: { timeSlotId, isExclusive: true }, // NEW: Only count exclusive tables
    include: { table: true },
  });

  if (timeSlotTables.length === 0) {
    return 0; // No exclusive tables = unlimited (shared pool)
  }

  return timeSlotTables
    .filter((tst) => tst.table.isActive) // Only count active tables
    .reduce((sum, tst) => sum + tst.table.capacity, 0);
}

/**
 * Update the capacity field for a time slot
 */
export async function updateTimeSlotCapacity(timeSlotId: string) {
  const capacity = await calculateTimeSlotCapacity(timeSlotId);
  await prisma.timeSlot.update({
    where: { id: timeSlotId },
    data: { capacity },
  });
  return capacity;
}

/**
 * Create a new time slot for a branch
 */
export async function createTimeSlot(data: {
  branchId: string;
  name: string;
  startTime: string; // HH:mm format (e.g., "19:00")
  endTime: string; // HH:mm format (e.g., "20:00")
  daysOfWeek: string[]; // ["monday", "tuesday", etc.]
  pricePerPerson?: number;
  customerLimit?: number | null; // NEW: NULL = no limit (shared pool), >0 = manual limit
  notes?: string;
  moreInfoUrl?: string;
  tableIds?: string[]; // IDs of tables to link to this time slot (will be marked as exclusive)
  isActive?: boolean;
}) {
  try {
    // Convert time strings to Date objects in UTC to avoid timezone issues
    // PostgreSQL TIME type stores time without timezone
    const startTime = new Date(`1970-01-01T${data.startTime}:00.000Z`);
    const endTime = new Date(`1970-01-01T${data.endTime}:00.000Z`);

    const timeSlot = await prisma.timeSlot.create({
      data: {
        branchId: data.branchId,
        name: data.name,
        startTime,
        endTime,
        daysOfWeek: data.daysOfWeek,
        pricePerPerson: data.pricePerPerson ?? 0,
        customerLimit: data.customerLimit ?? null, // NEW
        notes: data.notes,
        moreInfoUrl: data.moreInfoUrl,
        isActive: data.isActive ?? true,
        // Create table relationships if tableIds provided (all marked as exclusive)
        tables: data.tableIds
          ? {
              create: data.tableIds.map((tableId) => ({
                tableId,
                isExclusive: true, // NEW: All selected tables are exclusive
              })),
            }
          : undefined,
      },
      include: {
        tables: {
          include: {
            table: true,
          },
        },
      },
    });

    // Calculate and set the capacity based on assigned tables
    const capacity = await updateTimeSlotCapacity(timeSlot.id);

    revalidatePath("/dashboard/reservations/slots");
    return {
      success: true,
      data: {
        ...timeSlot,
        capacity,
        pricePerPerson: timeSlot.pricePerPerson?.toNumber() || 0,
        startTime: timeSlot.startTime.toISOString(),
        endTime: timeSlot.endTime.toISOString(),
        createdAt: timeSlot.createdAt.toISOString(),
        updatedAt: timeSlot.updatedAt.toISOString(),
        tables: timeSlot.tables.map((tt) => ({
          id: tt.table.id,
          number: tt.table.number,
          name: tt.table.name,
          capacity: tt.table.capacity,
          isActive: tt.table.isActive,
        })),
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
      include: {
        tables: {
          include: {
            table: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return {
      success: true,
      data: timeSlots.map((slot) => ({
        id: slot.id,
        name: slot.name,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        daysOfWeek: slot.daysOfWeek,
        pricePerPerson: slot.pricePerPerson?.toNumber() || 0,
        notes: slot.notes,
        moreInfoUrl: slot.moreInfoUrl,
        isActive: slot.isActive,
        branchId: slot.branchId,
        tables: slot.tables.map((tt) => tt.table),
        createdAt: slot.createdAt.toISOString(),
        updatedAt: slot.updatedAt.toISOString(),
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
    name?: string;
    startTime?: string; // HH:mm format
    endTime?: string; // HH:mm format
    daysOfWeek?: string[];
    pricePerPerson?: number;
    customerLimit?: number | null; // NEW
    notes?: string;
    moreInfoUrl?: string;
    tableIds?: string[]; // Replace table relationships (will be marked as exclusive)
    isActive?: boolean;
  }
) {
  try {
    const updateData: {
      name?: string;
      startTime?: Date;
      endTime?: Date;
      daysOfWeek?: string[];
      pricePerPerson?: number;
      customerLimit?: number | null; // NEW
      notes?: string | null;
      moreInfoUrl?: string | null;
      isActive?: boolean;
    } = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.startTime) {
      updateData.startTime = new Date(`1970-01-01T${data.startTime}:00.000Z`);
    }
    if (data.endTime) {
      updateData.endTime = new Date(`1970-01-01T${data.endTime}:00.000Z`);
    }
    if (data.daysOfWeek !== undefined) {
      updateData.daysOfWeek = data.daysOfWeek;
    }
    if (data.pricePerPerson !== undefined) {
      updateData.pricePerPerson = data.pricePerPerson;
    }
    if (data.customerLimit !== undefined) {
      updateData.customerLimit = data.customerLimit; // NEW
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.moreInfoUrl !== undefined) {
      updateData.moreInfoUrl = data.moreInfoUrl;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    // If tableIds is provided, update the table relationships
    let capacityChanged = false;
    if (data.tableIds !== undefined) {
      // Delete existing relationships and create new ones
      await prisma.timeSlotTable.deleteMany({
        where: { timeSlotId: id },
      });

      if (data.tableIds.length > 0) {
        await prisma.timeSlotTable.createMany({
          data: data.tableIds.map((tableId) => ({
            timeSlotId: id,
            tableId,
            isExclusive: true, // NEW: All selected tables are exclusive
          })),
        });
      }
      capacityChanged = true;
    }

    const timeSlot = await prisma.timeSlot.update({
      where: { id },
      data: updateData,
      include: {
        tables: {
          include: {
            table: true,
          },
        },
      },
    });

    // Recalculate capacity if tables were changed
    let capacity = timeSlot.capacity;
    if (capacityChanged) {
      capacity = await updateTimeSlotCapacity(id);
    }

    revalidatePath("/dashboard/reservations/slots");
    return {
      success: true,
      data: {
        ...timeSlot,
        capacity,
        pricePerPerson: timeSlot.pricePerPerson?.toNumber() || 0,
        startTime: timeSlot.startTime.toISOString(),
        endTime: timeSlot.endTime.toISOString(),
        createdAt: timeSlot.createdAt.toISOString(),
        updatedAt: timeSlot.updatedAt.toISOString(),
        tables: timeSlot.tables.map((tt) => ({
          id: tt.table.id,
          number: tt.table.number,
          name: tt.table.name,
          capacity: tt.table.capacity,
          isActive: tt.table.isActive,
        })),
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
      // console.log("el id es", id);
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
  dateString: string, // YYYY-MM-DD format
  includeAvailability: boolean = false,
  partySize: number = 1
) {
  try {
    // Parse the date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);

    const dayOfWeek = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][localDate.getDay()];

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

    // Serialize the data for client components
    const serializedSlots = await Promise.all(
      timeSlots.map(async (slot) => {
        let hasAvailability = true;

        // If availability check is requested, check capacity
        if (includeAvailability && slot.capacity > 0) {
          // Only check if slot has limited capacity (capacity > 0)
          // capacity = 0 means unlimited (uses all branch tables)

          // Get total booked seats for this time slot on this date
          const bookedSeats = await prisma.reservation.aggregate({
            where: {
              branchId,
              date: localDate,
              timeSlotId: slot.id,
              status: {
                in: ["PENDING", "CONFIRMED"],
              },
            },
            _sum: {
              people: true,
            },
          });

          const totalBooked = bookedSeats._sum.people || 0;
          const remainingCapacity = slot.capacity - totalBooked;
          hasAvailability = remainingCapacity >= partySize;
        }

        return {
          id: slot.id,
          name: slot.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          daysOfWeek: slot.daysOfWeek,
          pricePerPerson: slot.pricePerPerson?.toNumber() || 0,
          notes: slot.notes,
          moreInfoUrl: slot.moreInfoUrl,
          isActive: slot.isActive,
          branchId: slot.branchId,
          createdAt: slot.createdAt,
          updatedAt: slot.updatedAt,
          capacity: slot.capacity,
          hasAvailability: includeAvailability ? hasAvailability : undefined,
        };
      })
    );

    return { success: true, data: serializedSlots };
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

/**
 * Get available tables for a time slot, considering overlapping time slots
 * Returns all tables with their availability status and conflicting time slot info
 */
export async function getAvailableTablesForTimeSlot(params: {
  branchId: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  daysOfWeek: string[];
  excludeTimeSlotId?: string; // For edit mode - exclude this time slot from conflict checking
}) {
  try {
    const { branchId, startTime, endTime, daysOfWeek, excludeTimeSlotId } =
      params;

    // Get all active tables for the branch (shared tables first for better UX)
    const allTables = await prisma.table.findMany({
      where: {
        branchId,
        isActive: true,
      },
      orderBy: [
        { isShared: "desc" }, // Show shared tables first
        { number: "asc" },
      ],
    });

    // Convert time strings to Date objects for comparison
    const requestStartTime = new Date(`1970-01-01T${startTime}:00.000Z`);
    const requestEndTime = new Date(`1970-01-01T${endTime}:00.000Z`);

    // Get all active time slots for this branch that overlap with the requested time/days
    const overlappingTimeSlots = await prisma.timeSlot.findMany({
      where: {
        branchId,
        isActive: true,
        id: excludeTimeSlotId ? { not: excludeTimeSlotId } : undefined,
        // Filter by days that overlap
        daysOfWeek: {
          hasSome: daysOfWeek,
        },
      },
      include: {
        tables: {
          include: {
            table: true,
          },
        },
      },
    });

    // Filter to only slots that actually have time overlap
    const conflictingSlots = overlappingTimeSlots.filter((slot) => {
      // Check if time ranges overlap: start1 < end2 AND start2 < end1
      return requestStartTime < slot.endTime && slot.startTime < requestEndTime;
    });

    // Build a map of table ID to conflicting time slot
    // NEW: Only EXCLUSIVE tables assigned to overlapping slots create conflicts
    const tableConflicts = new Map<
      string,
      { id: string; name: string; startTime: Date; endTime: Date }
    >();

    conflictingSlots.forEach((slot) => {
      slot.tables.forEach((tt) => {
        // NEW: Only add if this is an EXCLUSIVE assignment
        if (tt.isExclusive) {
          // Only add if this table's days actually overlap with requested days
          const hasCommonDay = daysOfWeek.some((day) =>
            slot.daysOfWeek.includes(day)
          );
          if (hasCommonDay) {
            tableConflicts.set(tt.tableId, {
              id: slot.id,
              name: slot.name,
              startTime: slot.startTime,
              endTime: slot.endTime,
            });
          }
        }
      });
    });

    // Map tables with availability info
    const tablesWithAvailability = allTables.map((table) => {
      const conflict = tableConflicts.get(table.id);
      return {
        id: table.id,
        number: table.number,
        name: table.name,
        capacity: table.capacity,
        isActive: table.isActive,
        isShared: table.isShared, // Include isShared flag
        isAvailable: !conflict,
        conflictingTimeSlot: conflict || null,
      };
    });

    return {
      success: true,
      data: tablesWithAvailability,
    };
  } catch (error) {
    console.error("Error getting available tables:", error);
    return {
      success: false,
      error: "Failed to get available tables",
    };
  }
}
