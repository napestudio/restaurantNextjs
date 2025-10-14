"use server";

import prisma from "@/lib/prisma";
import { ReservationStatus } from "@/app/generated/prisma";

/**
 * Get all tables for a branch
 */
export async function getTables(branchId: string) {
  try {
    const tables = await prisma.table.findMany({
      where: {
        branchId,
      },
      orderBy: [{ number: "asc" }],
    });

    return { success: true, data: tables };
  } catch (error) {
    console.error("Error fetching tables:", error);
    return { success: false, error: "Failed to fetch tables" };
  }
}

/**
 * Get all tables for a branch with their current reservation status
 * Shows which tables are occupied, by whom, and how many people
 */
export async function getTablesWithStatus(branchId: string) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tables = await prisma.table.findMany({
      where: {
        branchId,
      },
      include: {
        reservations: {
          where: {
            reservation: {
              date: {
                gte: today,
                lt: tomorrow,
              },
              status: {
                in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
              },
            },
          },
          include: {
            reservation: {
              select: {
                id: true,
                customerName: true,
                people: true,
                status: true,
                date: true,
                timeSlot: {
                  select: {
                    startTime: true,
                    endTime: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ number: "asc" }],
    });

    return { success: true, data: tables };
  } catch (error) {
    console.error("Error fetching tables with status:", error);
    return { success: false, error: "Failed to fetch tables with status" };
  }
}

/**
 * Get a single table by ID
 */
export async function getTableById(id: string) {
  try {
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        branch: true,
      },
    });

    if (!table) {
      return { success: false, error: "Table not found" };
    }

    return { success: true, data: table };
  } catch (error) {
    console.error("Error fetching table:", error);
    return { success: false, error: "Failed to fetch table" };
  }
}

/**
 * Check if a specific table is available for a given date and time slot
 */
export async function isTableAvailable(
  tableId: string,
  date: Date,
  timeSlotId: string
): Promise<boolean> {
  try {
    // Find any conflicting reservations for this table at the same date/time
    const conflict = await prisma.reservationTable.findFirst({
      where: {
        tableId,
        reservation: {
          date,
          timeSlotId,
          status: {
            // Only consider active reservations (exclude CANCELED, NO_SHOW, COMPLETED)
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          },
        },
      },
    });

    return !conflict;
  } catch (error) {
    console.error("Error checking table availability:", error);
    return false;
  }
}

/**
 * Find available tables for a given date, time slot, and party size
 * Returns tables that can accommodate the party (single table or combination)
 */
export async function findAvailableTables(
  branchId: string,
  date: Date,
  timeSlotId: string,
  partySize: number
): Promise<{
  success: boolean;
  data?: { tableIds: string[]; totalCapacity: number };
  error?: string;
}> {
  try {
    // Get all active tables for the branch
    const allTables = await prisma.table.findMany({
      where: {
        branchId,
        isActive: true,
      },
      orderBy: [{ capacity: "asc" }, { number: "asc" }],
    });

    if (allTables.length === 0) {
      return {
        success: false,
        error: "No active tables found for this branch",
      };
    }

    // Get all reservations that conflict with this date/time
    const conflictingReservations = await prisma.reservationTable.findMany({
      where: {
        reservation: {
          branchId,
          date,
          timeSlotId,
          status: {
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          },
        },
      },
      select: {
        tableId: true,
      },
    });

    const occupiedTableIds = new Set(
      conflictingReservations.map((rt) => rt.tableId)
    );

    // Filter to only available tables
    const availableTables = allTables.filter(
      (table) => !occupiedTableIds.has(table.id)
    );

    if (availableTables.length === 0) {
      return {
        success: false,
        error: "No tables available for this date and time",
      };
    }

    // Strategy 1: Try to find a single table that fits
    const singleTable = availableTables.find(
      (table) => table.capacity >= partySize
    );

    if (singleTable) {
      return {
        success: true,
        data: {
          tableIds: [singleTable.id],
          totalCapacity: singleTable.capacity,
        },
      };
    }

    // Strategy 2: Combine multiple tables
    // Sort by capacity to optimize combinations
    const sortedTables = [...availableTables].sort(
      (a, b) => b.capacity - a.capacity
    );

    // Try to find the smallest combination that fits
    const combination = findTableCombination(sortedTables, partySize);

    if (combination) {
      return {
        success: true,
        data: {
          tableIds: combination.map((t) => t.id),
          totalCapacity: combination.reduce((sum, t) => sum + t.capacity, 0),
        },
      };
    }

    return {
      success: false,
      error: `No single table or combination can accommodate ${partySize} guests`,
    };
  } catch (error) {
    console.error("Error finding available tables:", error);
    return {
      success: false,
      error: "Failed to find available tables",
    };
  }
}

/**
 * Helper function to find optimal table combination
 * Uses a greedy approach to minimize number of tables used
 */
function findTableCombination(
  tables: { id: string; capacity: number }[],
  targetCapacity: number,
  maxTables: number = 3 // Limit to avoid combining too many tables
): { id: string; capacity: number }[] | null {
  // Try combinations of 2 tables first, then 3
  for (let numTables = 2; numTables <= maxTables; numTables++) {
    const combination = findCombinationOfSize(tables, targetCapacity, numTables);
    if (combination) {
      return combination;
    }
  }
  return null;
}

/**
 * Recursively find combination of specific size
 */
function findCombinationOfSize(
  tables: { id: string; capacity: number }[],
  targetCapacity: number,
  size: number,
  currentIndex: number = 0,
  currentCombination: { id: string; capacity: number }[] = []
): { id: string; capacity: number }[] | null {
  // Base case: we've selected enough tables
  if (currentCombination.length === size) {
    const totalCapacity = currentCombination.reduce(
      (sum, t) => sum + t.capacity,
      0
    );
    return totalCapacity >= targetCapacity ? currentCombination : null;
  }

  // Base case: no more tables to try
  if (currentIndex >= tables.length) {
    return null;
  }

  // Try including current table
  const withCurrent = findCombinationOfSize(
    tables,
    targetCapacity,
    size,
    currentIndex + 1,
    [...currentCombination, tables[currentIndex]]
  );

  if (withCurrent) {
    return withCurrent;
  }

  // Try without current table
  return findCombinationOfSize(
    tables,
    targetCapacity,
    size,
    currentIndex + 1,
    currentCombination
  );
}

/**
 * Get available capacity for a branch at a specific date/time
 */
export async function getAvailableCapacity(
  branchId: string,
  date: Date,
  timeSlotId: string
): Promise<{ success: boolean; data?: number; error?: string }> {
  try {
    // Get all active tables
    const allTables = await prisma.table.findMany({
      where: {
        branchId,
        isActive: true,
      },
    });

    const totalCapacity = allTables.reduce(
      (sum, table) => sum + table.capacity,
      0
    );

    // Get occupied tables
    const occupiedReservations = await prisma.reservationTable.findMany({
      where: {
        reservation: {
          branchId,
          date,
          timeSlotId,
          status: {
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          },
        },
      },
      include: {
        table: true,
      },
    });

    const occupiedCapacity = occupiedReservations.reduce(
      (sum, rt) => sum + rt.table.capacity,
      0
    );

    return {
      success: true,
      data: totalCapacity - occupiedCapacity,
    };
  } catch (error) {
    console.error("Error calculating available capacity:", error);
    return {
      success: false,
      error: "Failed to calculate available capacity",
    };
  }
}

/**
 * Create a new table
 */
export async function createTable(data: {
  branchId: string;
  number: number;
  capacity: number;
  isActive?: boolean;
}) {
  try {
    // Check if table number already exists in this branch
    const existing = await prisma.table.findFirst({
      where: {
        branchId: data.branchId,
        number: data.number,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Table number ${data.number} already exists in this branch`,
      };
    }

    const table = await prisma.table.create({
      data: {
        branchId: data.branchId,
        number: data.number,
        capacity: data.capacity,
        isActive: data.isActive ?? true,
      },
    });

    return { success: true, data: table };
  } catch (error) {
    console.error("Error creating table:", error);
    return { success: false, error: "Failed to create table" };
  }
}

/**
 * Update an existing table
 */
export async function updateTable(
  id: string,
  data: {
    number?: number;
    capacity?: number;
    isActive?: boolean;
  }
) {
  try {
    // If updating number, check for conflicts
    if (data.number !== undefined) {
      const table = await prisma.table.findUnique({ where: { id } });
      if (!table) {
        return { success: false, error: "Table not found" };
      }

      const existing = await prisma.table.findFirst({
        where: {
          branchId: table.branchId,
          number: data.number,
          id: { not: id },
        },
      });

      if (existing) {
        return {
          success: false,
          error: `Table number ${data.number} already exists in this branch`,
        };
      }
    }

    const table = await prisma.table.update({
      where: { id },
      data,
    });

    return { success: true, data: table };
  } catch (error) {
    console.error("Error updating table:", error);
    return { success: false, error: "Failed to update table" };
  }
}

/**
 * Toggle table active status
 */
export async function toggleTableActive(id: string) {
  try {
    const table = await prisma.table.findUnique({ where: { id } });

    if (!table) {
      return { success: false, error: "Table not found" };
    }

    const updated = await prisma.table.update({
      where: { id },
      data: { isActive: !table.isActive },
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error("Error toggling table status:", error);
    return { success: false, error: "Failed to toggle table status" };
  }
}

/**
 * Delete a table (only if no reservations are associated)
 */
export async function deleteTable(id: string) {
  try {
    // Check if table has any reservations
    const hasReservations = await prisma.reservationTable.findFirst({
      where: { tableId: id },
    });

    if (hasReservations) {
      return {
        success: false,
        error:
          "Cannot delete table with existing reservations. Deactivate it instead.",
      };
    }

    await prisma.table.delete({ where: { id } });

    return { success: true, data: null };
  } catch (error) {
    console.error("Error deleting table:", error);
    return { success: false, error: "Failed to delete table" };
  }
}
