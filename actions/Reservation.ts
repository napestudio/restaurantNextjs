"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ReservationStatus } from "@/app/generated/prisma";
import {
  findAvailableTables,
  setTablesReserved,
  updateTableStatusForReservation,
} from "./Table";
import { sendReservationNotificationEmail } from "@/lib/send-reservation-email";

/**
 * Helper function to serialize reservation data for client components
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeReservation(reservation: any) {
  return {
    ...reservation,
    date: reservation.date.toISOString(),
    exactTime: reservation.exactTime
      ? reservation.exactTime.toISOString()
      : null,
    createdAt: reservation.createdAt.toISOString(),
    timeSlot: reservation.timeSlot
      ? {
          ...reservation.timeSlot,
          startTime: reservation.timeSlot.startTime.toISOString(),
          endTime: reservation.timeSlot.endTime.toISOString(),
          pricePerPerson: reservation.timeSlot.pricePerPerson?.toNumber() || 0,
          createdAt: reservation.timeSlot.createdAt.toISOString(),
          updatedAt: reservation.timeSlot.updatedAt.toISOString(),
        }
      : null,
    tables: reservation.tables
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reservation.tables.map((rt: any) => ({
          ...rt,
          table: rt.table,
        }))
      : undefined,
  };
}

/**
 * Create a new reservation with automatic table assignment
 */
export async function createReservation(data: {
  branchId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: string; // ISO date string
  time: string; // Time slot value "HH:mm-HH:mm"
  guests: number;
  timeSlotId?: string;
  exactTime?: string; // ISO string for precise arrival time
  dietaryRestrictions?: string;
  accessibilityNeeds?: string;
  notes?: string;
  status?: ReservationStatus;
  createdBy?: string;
  autoAssignTables?: boolean; // Option to enable/disable auto-assignment
}) {
  // console.log("creating reservation", data);
  try {
    // Parse the date
    const reservationDate = new Date(data.date);

    // Validate that we have a time slot for table assignment
    if (!data.timeSlotId) {
      return {
        success: false,
        error: "Time slot is required for reservations",
      };
    }

    // Step 1: Create the reservation with PENDING status initially
    const reservation = await prisma.reservation.create({
      data: {
        branchId: data.branchId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        date: reservationDate,
        people: data.guests,
        timeSlotId: data.timeSlotId,
        exactTime: data.exactTime ? new Date(data.exactTime) : null,
        dietaryRestrictions: data.dietaryRestrictions,
        accessibilityNeeds: data.accessibilityNeeds,
        notes: data.notes,
        status: ReservationStatus.PENDING,
        createdBy: data.createdBy || "ANON",
      },
      include: {
        timeSlot: true,
        branch: true,
      },
    });

    // Step 2: Try to auto-assign tables (default behavior unless explicitly disabled)
    const shouldAutoAssign = data.autoAssignTables !== false;
    let assignmentResult = null;
    let finalStatus: ReservationStatus = ReservationStatus.PENDING;

    if (shouldAutoAssign) {
      assignmentResult = await findAvailableTables(
        data.branchId,
        reservationDate,
        data.timeSlotId,
        data.guests
      );

      if (assignmentResult.success && assignmentResult.data) {
        // Assign the tables
        try {
          await prisma.reservationTable.createMany({
            data: assignmentResult.data.tableIds.map((tableId) => ({
              reservationId: reservation.id,
              tableId,
            })),
          });

          // Check if this is a paid reservation (pricePerPerson > 0)
          const isPaidReservation =
            reservation.timeSlot &&
            (reservation.timeSlot.pricePerPerson?.toNumber() ?? 0) > 0;

          // Only confirm reservation if it's not a paid reservation
          // Paid reservations must remain PENDING until payment is coordinated
          if (!isPaidReservation) {
            await prisma.reservation.update({
              where: { id: reservation.id },
              data: { status: ReservationStatus.CONFIRMED },
            });

            // Automatically set table status to RESERVED
            await setTablesReserved(assignmentResult.data.tableIds);

            finalStatus = ReservationStatus.CONFIRMED;

            // console.log(
            //   `✅ Auto-assigned ${assignmentResult.data.tableIds.length} table(s) to reservation ${reservation.id} and CONFIRMED`
            // );
          } else {
            // console.log(
            //   `✅ Auto-assigned ${assignmentResult.data.tableIds.length} table(s) to reservation ${reservation.id} but keeping as PENDING (paid reservation)`
            // );
          }
        } catch (assignError) {
          // console.error("Error assigning tables:", assignError);
          // Keep as PENDING if assignment fails
        }
      } else {
        // console.log(
        //   `⚠️  No tables available for reservation ${reservation.id}. Keeping as PENDING for manual assignment.`
        // );
      }
    }

    // Fetch the final reservation with all relations
    const finalReservation = await prisma.reservation.findUnique({
      where: { id: reservation.id },
      include: {
        timeSlot: true,
        branch: true,
        tables: {
          include: {
            table: true,
          },
        },
      },
    });

    // Send email notification (only for web reservations)
    if (data.createdBy === "WEB" && finalReservation) {
      try {
        const assignedTableNames =
          finalReservation.tables
            ?.map((rt) => rt.table.name)
            .filter((name): name is string => name !== null) || [];

        await sendReservationNotificationEmail({
          customerName: finalReservation.customerName,
          customerEmail: finalReservation.customerEmail,
          customerPhone: finalReservation.customerPhone || undefined,
          date: finalReservation.date,
          time: data.time,
          guests: finalReservation.people,
          branchName: finalReservation.branch.name,
          timeSlotName: finalReservation.timeSlot?.name,
          exactTime: finalReservation.exactTime || undefined,
          dietaryRestrictions:
            finalReservation.dietaryRestrictions || undefined,
          accessibilityNeeds: finalReservation.accessibilityNeeds || undefined,
          notes: finalReservation.notes || undefined,
          status: finalStatus,
          autoAssigned: finalStatus === ReservationStatus.CONFIRMED,
          assignedTables: assignedTableNames,
          pricePerPerson:
            finalReservation.timeSlot?.pricePerPerson?.toNumber() || 0,
        });
        console
          .log
          // `📧 Email notification sent for reservation ${reservation.id}`
          ();
      } catch (emailError) {
        // Log the error but don't fail the reservation
        console.error("Failed to send email notification:", emailError);
      }
    }

    revalidatePath("/dashboard/reservations");

    return {
      success: true,
      data: serializeReservation(finalReservation),
      message:
        finalStatus === ReservationStatus.CONFIRMED
          ? "Reservation confirmed with table assignment"
          : "Reservation created - pending table assignment",
      autoAssigned: finalStatus === ReservationStatus.CONFIRMED,
    };
  } catch (error) {
    console.error("Error creating reservation:", error);
    return { success: false, error: "Failed to create reservation" };
  }
}

/**
 * Get all reservations for a branch
 */
export async function getReservations(branchId: string) {
  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        branchId,
      },
      include: {
        timeSlot: true,
        tables: {
          include: {
            table: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: reservations.map((r: any) => serializeReservation(r)),
    };
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return { success: false, error: "Failed to fetch reservations" };
  }
}

/**
 * Get a single reservation by ID
 */
export async function getReservationById(id: string) {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        timeSlot: true,
        branch: true,
        tables: {
          include: {
            table: true,
          },
        },
      },
    });

    if (!reservation) {
      return { success: false, error: "Reservation not found" };
    }

    return { success: true, data: serializeReservation(reservation) };
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return { success: false, error: "Failed to fetch reservation" };
  }
}

/**
 * Update an existing reservation
 */
export async function updateReservation(
  id: string,
  data: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    date?: string;
    people?: number;
    timeSlotId?: string;
    dietaryRestrictions?: string;
    accessibilityNeeds?: string;
    notes?: string;
    status?: ReservationStatus;
  }
) {
  try {
    const updateData: {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      date?: Date;
      people?: number;
      timeSlotId?: string;
      dietaryRestrictions?: string;
      accessibilityNeeds?: string;
      notes?: string;
      status?: ReservationStatus;
    } = {};

    if (data.customerName !== undefined) {
      updateData.customerName = data.customerName;
    }
    if (data.customerEmail !== undefined) {
      updateData.customerEmail = data.customerEmail;
    }
    if (data.customerPhone !== undefined) {
      updateData.customerPhone = data.customerPhone;
    }
    if (data.date !== undefined) {
      updateData.date = new Date(data.date);
    }
    if (data.people !== undefined) {
      updateData.people = data.people;
    }
    if (data.timeSlotId !== undefined) {
      updateData.timeSlotId = data.timeSlotId;
    }
    if (data.dietaryRestrictions !== undefined) {
      updateData.dietaryRestrictions = data.dietaryRestrictions;
    }
    if (data.accessibilityNeeds !== undefined) {
      updateData.accessibilityNeeds = data.accessibilityNeeds;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        timeSlot: true,
        branch: true,
      },
    });

    revalidatePath("/dashboard/reservations");
    return { success: true, data: serializeReservation(reservation) };
  } catch (error) {
    console.error("Error updating reservation:", error);
    return { success: false, error: "Failed to update reservation" };
  }
}

/**
 * Update reservation status
 */
export async function updateReservationStatus(
  id: string,
  status: ReservationStatus
) {
  try {
    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status },
      include: {
        timeSlot: true,
        branch: true,
      },
    });

    // Automatically update table status based on reservation status
    await updateTableStatusForReservation(id, status);

    revalidatePath("/dashboard/reservations");
    return { success: true, data: serializeReservation(reservation) };
  } catch (error) {
    console.error("Error updating reservation status:", error);
    return { success: false, error: "Failed to update reservation status" };
  }
}

/**
 * Delete a reservation (cancel)
 */
export async function deleteReservation(id: string) {
  try {
    // First, delete any related ReservationTable entries
    await prisma.reservationTable.deleteMany({
      where: {
        reservationId: id,
      },
    });

    // Then delete the reservation
    await prisma.reservation.delete({
      where: { id },
    });

    revalidatePath("/dashboard/reservations");
    return { success: true, data: null };
  } catch (error) {
    console.error("Error deleting reservation:", error);
    return { success: false, error: "Failed to delete reservation" };
  }
}

/**
 * Cancel a reservation (soft delete - update status to CANCELED)
 */
export async function cancelReservation(id: string) {
  try {
    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELED,
      },
      include: {
        timeSlot: true,
        branch: true,
      },
    });

    revalidatePath("/dashboard/reservations");
    return { success: true, data: serializeReservation(reservation) };
  } catch (error) {
    console.error("Error canceling reservation:", error);
    return { success: false, error: "Failed to cancel reservation" };
  }
}

/**
 * Get reservations by date range
 */
export async function getReservationsByDateRange(
  branchId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        branchId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        timeSlot: true,
        tables: {
          include: {
            table: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return {
      success: true,
      data: reservations.map((r) => serializeReservation(r)),
    };
  } catch (error) {
    console.error("Error fetching reservations by date range:", error);
    return {
      success: false,
      error: "Failed to fetch reservations by date range",
    };
  }
}

/**
 * Get reservations by status
 */
export async function getReservationsByStatus(
  branchId: string,
  status: ReservationStatus
) {
  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        branchId,
        status,
      },
      include: {
        timeSlot: true,
        tables: {
          include: {
            table: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return {
      success: true,
      data: reservations.map((r) => serializeReservation(r)),
    };
  } catch (error) {
    console.error("Error fetching reservations by status:", error);
    return {
      success: false,
      error: "Failed to fetch reservations by status",
    };
  }
}

/**
 * Filter types for reservations
 */
export type ReservationFilterType = "today" | "past" | "dateRange";

export interface ReservationFilters {
  type: ReservationFilterType;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  status?: ReservationStatus;
  cursor?: string; // For pagination - reservation ID
  limit?: number;
}

export interface PaginatedReservationsResult {
  reservations: ReturnType<typeof serializeReservation>[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

/**
 * Get reservations with filters and pagination
 * Optimized for the common case: loading today's reservations first
 */
export async function getFilteredReservations(
  branchId: string,
  filters: ReservationFilters
): Promise<{
  success: boolean;
  data?: PaginatedReservationsResult;
  error?: string;
}> {
  try {
    const limit = filters.limit || 10;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Build the where clause based on filter type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { branchId };

    switch (filters.type) {
      case "today":
        whereClause.date = {
          gte: todayStart,
          lt: todayEnd,
        };
        break;
      case "past":
        whereClause.date = {
          lt: todayStart,
        };
        break;
      case "dateRange":
        if (filters.dateFrom || filters.dateTo) {
          whereClause.date = {};
          if (filters.dateFrom) {
            whereClause.date.gte = new Date(filters.dateFrom);
          }
          if (filters.dateTo) {
            const endDate = new Date(filters.dateTo);
            endDate.setDate(endDate.getDate() + 1);
            whereClause.date.lt = endDate;
          }
        }
        break;
    }

    // Add status filter if provided
    // When no status filter is specified, exclude canceled reservations by default
    if (filters.status) {
      whereClause.status = filters.status;
    } else {
      whereClause.status = {
        not: ReservationStatus.CANCELED,
      };
    }

    // Get total count for this filter
    const totalCount = await prisma.reservation.count({ where: whereClause });

    // Fetch reservations with optional cursor-based pagination
    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      include: {
        timeSlot: true,
        tables: {
          include: {
            table: true,
          },
        },
      },
      orderBy: [
        { date: filters.type === "past" ? "desc" : "asc" },
        { createdAt: "desc" },
      ],
      take: limit + 1, // Take one extra to check if there are more
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });

    // Check if there are more results
    const hasMore = reservations.length > limit;
    const resultReservations = hasMore ? reservations.slice(0, limit) : reservations;
    const nextCursor = hasMore ? resultReservations[resultReservations.length - 1].id : null;

    return {
      success: true,
      data: {
        reservations: resultReservations.map((r) => serializeReservation(r)),
        nextCursor,
        hasMore,
        totalCount,
      },
    };
  } catch (error) {
    console.error("Error fetching filtered reservations:", error);
    return { success: false, error: "Failed to fetch reservations" };
  }
}

/**
 * Assign tables to a reservation
 */
export async function assignTablesToReservation(
  reservationId: string,
  tableIds: string[]
) {
  try {
    // First, remove existing table assignments
    await prisma.reservationTable.deleteMany({
      where: {
        reservationId,
      },
    });

    // Then create new assignments
    const assignments = await prisma.reservationTable.createMany({
      data: tableIds.map((tableId) => ({
        reservationId,
        tableId,
      })),
    });

    // Get reservation status to set appropriate table status
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { status: true },
    });

    if (reservation) {
      // Update table status based on reservation status
      await updateTableStatusForReservation(reservationId, reservation.status);
    }

    revalidatePath("/dashboard/reservations");
    return { success: true, data: assignments };
  } catch (error) {
    console.error("Error assigning tables to reservation:", error);
    return {
      success: false,
      error: "Failed to assign tables to reservation",
    };
  }
}
