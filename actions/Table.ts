"use server";

import prisma from "@/lib/prisma";
import { ReservationStatus, Table } from "@/app/generated/prisma";
import { TableShapeType } from "@/types/table";

/**
 * Batch calculate remaining capacity for multiple tables
 * This avoids N+1 queries by fetching all reservations in a single query
 */
async function batchGetRemainingCapacity(
  tables: Pick<Table, "id" | "capacity" | "isShared">[],
  date: Date,
  timeSlotId: string
): Promise<Map<string, number>> {
  const tableIds = tables.map((t) => t.id);

  // Single query to get all reservations for all tables
  const reservations = await prisma.reservationTable.findMany({
    where: {
      tableId: { in: tableIds },
      reservation: {
        date,
        timeSlotId,
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        },
      },
    },
    include: {
      reservation: {
        select: { people: true },
      },
    },
  });

  // Group reservations by tableId
  const reservationsByTable = new Map<string, number>();
  for (const rt of reservations) {
    const current = reservationsByTable.get(rt.tableId) || 0;
    reservationsByTable.set(rt.tableId, current + rt.reservation.people);
  }

  // Calculate remaining capacity for each table
  const capacityMap = new Map<string, number>();
  for (const table of tables) {
    const occupiedSeats = reservationsByTable.get(table.id) || 0;

    if (!table.isShared) {
      // For non-shared tables: 0 if any reservation, full capacity if none
      capacityMap.set(table.id, occupiedSeats > 0 ? 0 : table.capacity);
    } else {
      // For shared tables: remaining capacity
      capacityMap.set(table.id, Math.max(0, table.capacity - occupiedSeats));
    }
  }

  return capacityMap;
}

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
        orders: {
          where: {
            status: {
              in: ["PENDING", "IN_PROGRESS"],
            },
          },
          select: {
            id: true,
            partySize: true,
            status: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
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
 * Get a single table with its current reservation status
 * More efficient than fetching all tables when only one needs updating
 */
export async function getTableWithStatus(tableId: string) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const table = await prisma.table.findUnique({
      where: { id: tableId },
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
        orders: {
          where: {
            status: {
              in: ["PENDING", "IN_PROGRESS"],
            },
          },
          select: {
            id: true,
            partySize: true,
            status: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!table) {
      return { success: false, error: "Table not found" };
    }

    return { success: true, data: table };
  } catch (error) {
    console.error("Error fetching table with status:", error);
    return { success: false, error: "Failed to fetch table with status" };
  }
}

/**
 * Get remaining capacity for a table (handles both shared and regular tables)
 * For regular tables: returns 0 if occupied, full capacity if available
 * For shared tables: returns remaining capacity after accounting for existing reservations
 */
export async function getRemainingCapacity(
  tableId: string,
  date: Date,
  timeSlotId: string
): Promise<number> {
  try {
    // Get the table details
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: { capacity: true, isShared: true },
    });

    if (!table) {
      return 0;
    }

    // Get all active reservations for this table at the same date/time
    const reservations = await prisma.reservationTable.findMany({
      where: {
        tableId,
        reservation: {
          date,
          timeSlotId,
          status: {
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          },
        },
      },
      include: {
        reservation: {
          select: { people: true },
        },
      },
    });

    // For regular (non-shared) tables
    if (!table.isShared) {
      // If there are any reservations, the table is fully occupied
      return reservations.length > 0 ? 0 : table.capacity;
    }

    // For shared tables: calculate remaining capacity
    const occupiedSeats = reservations.reduce(
      (sum, rt) => sum + rt.reservation.people,
      0
    );

    return Math.max(0, table.capacity - occupiedSeats);
  } catch (error) {
    console.error("Error calculating remaining capacity:", error);
    return 0;
  }
}

/**
 * Check if a specific table is available for a given date and time slot
 * For shared tables, checks if there's any remaining capacity
 * For regular tables, checks if it's completely unoccupied
 */
export async function isTableAvailable(
  tableId: string,
  date: Date,
  timeSlotId: string,
  requiredCapacity: number = 1
): Promise<boolean> {
  try {
    const remainingCapacity = await getRemainingCapacity(
      tableId,
      date,
      timeSlotId
    );
    return remainingCapacity >= requiredCapacity;
  } catch (error) {
    console.error("Error checking table availability:", error);
    return false;
  }
}

/**
 * Find available tables for a given date, time slot, and party size
 * Handles both shared and regular tables with capacity-based logic
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
    // First, check if the time slot has specific tables assigned
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      include: {
        tables: {
          include: {
            table: true,
          },
        },
      },
    });

    if (!timeSlot) {
      return {
        success: false,
        error: "Time slot not found",
      };
    }

    // Determine which tables to use based on TimeSlot configuration
    let allTables;

    if (timeSlot.tables.length > 0) {
      // Use only the tables explicitly assigned to this time slot
      allTables = timeSlot.tables
        .map((tst) => tst.table)
        .filter((table) => table.isActive);

      if (allTables.length === 0) {
        return {
          success: false,
          error: "No active tables available for this time slot",
        };
      }
    } else {
      // Fall back to all active tables in the branch if no specific tables are assigned
      allTables = await prisma.table.findMany({
        where: {
          branchId,
          isActive: true,
        },
        orderBy: [{ isShared: "desc" }, { capacity: "asc" }, { number: "asc" }],
      });

      if (allTables.length === 0) {
        return {
          success: false,
          error: "No active tables found for this branch",
        };
      }
    }

    // Calculate remaining capacity for all tables in a single batch query
    const capacityMap = await batchGetRemainingCapacity(allTables, date, timeSlotId);

    // Map tables with their remaining capacity
    const tablesWithCapacity = allTables.map((table) => ({
      ...table,
      remainingCapacity: capacityMap.get(table.id) ?? 0,
    }));

    // Filter to only tables with available capacity AND not manually occupied/reserved/cleaning
    const availableTables = tablesWithCapacity.filter(
      (table) =>
        table.remainingCapacity > 0 &&
        // Respect manual status: only allow EMPTY or null (unset) status
        (!table.status || table.status === "EMPTY")
    );

    if (availableTables.length === 0) {
      return {
        success: false,
        error: "No tables available for this date and time",
      };
    }

    // Strategy 1: Try to find a single shared table with enough remaining capacity
    const sharedTable = availableTables.find(
      (table) => table.isShared && table.remainingCapacity >= partySize
    );

    if (sharedTable) {
      return {
        success: true,
        data: {
          tableIds: [sharedTable.id],
          totalCapacity: sharedTable.capacity,
        },
      };
    }

    // Strategy 2: Try to find a single regular table that fits
    const singleRegularTable = availableTables.find(
      (table) => !table.isShared && table.remainingCapacity >= partySize
    );

    if (singleRegularTable) {
      return {
        success: true,
        data: {
          tableIds: [singleRegularTable.id],
          totalCapacity: singleRegularTable.capacity,
        },
      };
    }

    // Strategy 3: Combine multiple REGULAR tables (don't combine shared tables)
    const regularTables = availableTables.filter((t) => !t.isShared);

    if (regularTables.length > 0) {
      // Sort by capacity to optimize combinations
      const sortedTables = [...regularTables].sort(
        (a, b) => b.capacity - a.capacity
      );

      // Try to find the smallest combination that fits
      const combination = findTableCombination(
        sortedTables.map((t) => ({ id: t.id, capacity: t.capacity })),
        partySize
      );

      if (combination) {
        return {
          success: true,
          data: {
            tableIds: combination.map((t) => t.id),
            totalCapacity: combination.reduce((sum, t) => sum + t.capacity, 0),
          },
        };
      }
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
    const combination = findCombinationOfSize(
      tables,
      targetCapacity,
      numTables
    );
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
  name?: string;
  capacity: number;
  isActive?: boolean;
  isShared?: boolean;
  sectorId?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  rotation?: number;
  shape?: TableShapeType;
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

    // If name is not provided, use the number as name
    const tableName = data.name || data.number.toString();

    const table = await prisma.table.create({
      data: {
        branchId: data.branchId,
        number: data.number,
        name: tableName,
        capacity: data.capacity,
        isActive: data.isActive ?? true,
        isShared: data.isShared ?? false,
        sectorId: data.sectorId,
        positionX: data.positionX,
        positionY: data.positionY,
        width: data.width,
        height: data.height,
        rotation: data.rotation,
        shape: data.shape,
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
    name?: string;
    capacity?: number;
    isActive?: boolean;
    isShared?: boolean;
  }
) {
  try {
    // If updating number, check for conflicts
    if (data.number !== undefined) {
      const table = await prisma.table.findUnique({ where: { id } });
      if (!table) {
        return { success: false, error: "Mesa no encontrada" };
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
          error: `La mesa nro ${data.number} ya existe`,
        };
      }
    }

    // If name is being set to empty, use the number (or current number if not being updated)
    const updateData = { ...data };
    if (updateData.name === "") {
      const currentTable = await prisma.table.findUnique({ where: { id } });
      const numberToUse = updateData.number ?? currentTable?.number ?? 0;
      updateData.name = numberToUse.toString();
    }

    const table = await prisma.table.update({
      where: { id },
      data: updateData,
    });

    // If capacity changed, update all related TimeSlot capacities
    if (data.capacity !== undefined) {
      const timeSlotTables = await prisma.timeSlotTable.findMany({
        where: { tableId: id },
        select: { timeSlotId: true },
      });

      // Update capacity for each affected time slot
      const { updateTimeSlotCapacity } = await import("./TimeSlot");
      await Promise.all(
        timeSlotTables.map((tst) => updateTimeSlotCapacity(tst.timeSlotId))
      );
    }

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

/**
 * Update table floor plan position and visual properties
 */
export async function updateTableFloorPlan(
  id: string,
  data: {
    positionX?: number;
    positionY?: number;
    width?: number;
    height?: number;
    rotation?: number;
    shape?: "SQUARE" | "RECTANGLE" | "CIRCLE";
    status?: "EMPTY" | "OCCUPIED" | "RESERVED" | "CLEANING";
  }
) {
  try {
    const table = await prisma.table.update({
      where: { id },
      data,
    });

    return { success: true, data: table };
  } catch (error) {
    console.error("Error updating table floor plan:", error);
    return { success: false, error: "Failed to update table floor plan" };
  }
}

/**
 * Batch update multiple tables' floor plan positions
 * Useful for saving entire floor plan layout at once
 */
export async function updateFloorPlanBatch(
  tables: Array<{
    id: string;
    positionX?: number;
    positionY?: number;
    width?: number;
    height?: number;
    rotation?: number;
    shape?: TableShapeType;
  }>
) {
  try {
    // Use a transaction to update all tables atomically
    await prisma.$transaction(
      tables.map((table) =>
        prisma.table.update({
          where: { id: table.id },
          data: {
            positionX: table.positionX,
            positionY: table.positionY,
            width: table.width,
            height: table.height,
            rotation: table.rotation,
            shape: table.shape,
          },
        })
      )
    );

    return { success: true };
  } catch (error) {
    console.error("Error updating floor plan batch:", error);
    return { success: false, error: "Failed to update floor plan" };
  }
}

/**
 * Automatically set table status to RESERVED when reservation is created/confirmed
 * Call this after assigning tables to a reservation
 */
export async function setTablesReserved(tableIds: string[]) {
  try {
    await prisma.table.updateMany({
      where: {
        id: { in: tableIds },
      },
      data: {
        status: "RESERVED",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error setting tables as reserved:", error);
    return { success: false, error: "Failed to set tables as reserved" };
  }
}

/**
 * Set table status to OCCUPIED when customer is seated
 * Call this when a reservation is being seated or a walk-in arrives
 */
export async function setTablesOccupied(tableIds: string[]) {
  try {
    await prisma.table.updateMany({
      where: {
        id: { in: tableIds },
      },
      data: {
        status: "OCCUPIED",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error setting tables as occupied:", error);
    return { success: false, error: "Failed to set tables as occupied" };
  }
}

/**
 * Set table status to EMPTY when customers leave
 * Call this when a reservation is completed or cancelled
 */
export async function setTablesEmpty(tableIds: string[]) {
  try {
    await prisma.table.updateMany({
      where: {
        id: { in: tableIds },
      },
      data: {
        status: "EMPTY",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error setting tables as empty:", error);
    return { success: false, error: "Failed to set tables as empty" };
  }
}

/**
 * Automatically manage table status based on reservation status change
 * This is a convenience function to handle all status transitions
 */
export async function updateTableStatusForReservation(
  reservationId: string,
  newStatus: ReservationStatus
) {
  try {
    // Get all tables for this reservation
    const reservationTables = await prisma.reservationTable.findMany({
      where: { reservationId },
      select: { tableId: true },
    });

    const tableIds = reservationTables.map((rt) => rt.tableId);

    if (tableIds.length === 0) {
      return { success: true, message: "No tables to update" };
    }

    // Update table status based on reservation status
    switch (newStatus) {
      case ReservationStatus.CONFIRMED:
      case ReservationStatus.PENDING:
        await setTablesReserved(tableIds);
        break;

      case ReservationStatus.SEATED:
        await setTablesOccupied(tableIds);
        break;

      case ReservationStatus.COMPLETED:
      case ReservationStatus.CANCELED:
      case ReservationStatus.NO_SHOW:
        await setTablesEmpty(tableIds);
        break;

      default:
        console.warn(`Unhandled reservation status: ${newStatus}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating table status for reservation:", error);
    return {
      success: false,
      error: "Failed to update table status for reservation",
    };
  }
}
