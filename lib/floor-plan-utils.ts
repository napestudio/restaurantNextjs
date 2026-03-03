import type { TableShapeType, TableStatus, FloorTableStatus } from "@/types/table";
import type { TableWithReservations } from "@/types/tables-client";
import { shapeDefaults } from "@/lib/floor-plan-constants";
export type { TableWithReservations };

// Re-export shapeDefaults for backwards compatibility
export { shapeDefaults };

/**
 * Map Prisma status enum to frontend status type
 */
export const statusMap: Record<string, TableStatus> = {
  EMPTY: "empty",
  OCCUPIED: "occupied",
  RESERVED: "reserved",
  CLEANING: "cleaning",
};

/**
 * Map frontend DB status to Prisma enum (only covers manually-settable statuses)
 */
export const reverseStatusMap: Record<
  TableStatus,
  "EMPTY" | "OCCUPIED" | "RESERVED" | "CLEANING"
> = {
  empty: "EMPTY",
  occupied: "OCCUPIED",
  reserved: "RESERVED",
  cleaning: "CLEANING",
};

/**
 * FloorTable interface - represents a table in the floor plan UI
 * Position (x, y) represents the CENTER of the table, not top-left
 */
export interface FloorTable {
  id: string;
  number: number;
  x: number; // Center X coordinate
  y: number; // Center Y coordinate
  width: number;
  height: number;
  rotation: number;
  shape: TableShapeType;
  capacity: number;
  status: FloorTableStatus;
  currentGuests: number;
  isShared: boolean;
  hasWaiter?: boolean; // True if any order has an assigned waiter
  waiterName?: string; // Name of the assigned waiter (first one if multiple orders)
  reservationInfo?: {
    customerName: string;
    people: number;
    minutesUntil: number; // negative = overdue
  };
}

/**
 * Extract the time-of-day in minutes from a DB Time field (stored as 1970-01-01T{time}Z)
 * and build a comparable Date for today at that time using local hours/minutes.
 */
function toTodayLocalTime(timeString: string): Date {
  const t = new Date(timeString);
  const today = new Date();
  today.setHours(t.getUTCHours(), t.getUTCMinutes(), 0, 0);
  return today;
}

/**
 * Get minutes from now until a reservation reference time.
 * Positive = reservation is in the future. Negative = reservation is in the past.
 * Uses exactTime when available; falls back to timeSlot.startTime.
 */
function minutesUntilReservation(
  exactTime: Date | string | null,
  timeSlot: { startTime: string; endTime: string } | null,
  now: Date
): number | null {
  if (exactTime) {
    const refTime = exactTime instanceof Date ? exactTime : new Date(exactTime);
    return (refTime.getTime() - now.getTime()) / 60000;
  }
  if (timeSlot) {
    const refTime = toTodayLocalTime(timeSlot.startTime);
    return (refTime.getTime() - now.getTime()) / 60000;
  }
  return null;
}

/**
 * Calculate table status based on active orders, today's reservations (time-aware),
 * and the manual DB status override. Priority order:
 *  1. Active orders → "occupied"
 *  2. SEATED reservation → "occupied"
 *  3. PENDING reservation today → "pending_payment"
 *  4. CONFIRMED reservation: overdue (>30 min past) → "late"
 *  5. CONFIRMED reservation: window now (≤30 min past or ≤5 min away) → "reserved"
 *  6. CONFIRMED reservation: arriving soon (5–60 min away) → "upcoming"
 *  7. Manual DB status CLEANING → "cleaning"
 *  8. Default → "empty"
 */
export function calculateTableStatus(dbTable: TableWithReservations): {
  status: FloorTableStatus;
  currentGuests: number;
  hasWaiter: boolean;
  waiterName?: string;
  reservationInfo?: FloorTable["reservationInfo"];
} {
  let status: FloorTableStatus = "empty";
  let currentGuests = 0;
  let hasWaiter = false;
  let waiterName: string | undefined;
  let reservationInfo: FloorTable["reservationInfo"] = undefined;

  // Priority 1: Active orders (highest priority — customer is already there)
  if (dbTable.orders && dbTable.orders.length > 0) {
    currentGuests = dbTable.orders.reduce(
      (sum, order) => sum + (order.partySize || 0),
      0
    );
    status = "occupied";
    const orderWithWaiter = dbTable.orders.find((order) => order.assignedTo);
    if (orderWithWaiter?.assignedTo) {
      hasWaiter = true;
      waiterName = orderWithWaiter.assignedTo.name || undefined;
    }
    return { status, currentGuests, hasWaiter, waiterName };
  }

  // Priority 2–6: Check today's reservations (already filtered to today in the query)
  if (dbTable.reservations.length > 0) {
    const now = new Date();

    // SEATED reservation → occupied (manual, no active order)
    const seatedRes = dbTable.reservations.find(
      (rt) => rt.reservation.status === "SEATED"
    );
    if (seatedRes) {
      currentGuests = seatedRes.reservation.people;
      return { status: "occupied", currentGuests, hasWaiter, waiterName };
    }

    // PENDING reservation today → paid reservation awaiting payment
    const pendingRes = dbTable.reservations.find(
      (rt) => rt.reservation.status === "PENDING"
    );
    if (pendingRes) {
      reservationInfo = {
        customerName: pendingRes.reservation.customerName,
        people: pendingRes.reservation.people,
        minutesUntil:
          minutesUntilReservation(
            pendingRes.reservation.exactTime,
            pendingRes.reservation.timeSlot,
            now
          ) ?? 0,
      };
      return { status: "pending_payment", currentGuests, hasWaiter, waiterName, reservationInfo };
    }

    // CONFIRMED reservations: find the most relevant one by time proximity
    const confirmedReservations = dbTable.reservations
      .filter((rt) => rt.reservation.status === "CONFIRMED")
      .map((rt) => ({
        rt,
        mins: minutesUntilReservation(
          rt.reservation.exactTime,
          rt.reservation.timeSlot,
          now
        ),
      }))
      .filter((r) => r.mins !== null) as {
        rt: (typeof dbTable.reservations)[0];
        mins: number;
      }[];

    if (confirmedReservations.length > 0) {
      // Pick the one closest to now (smallest absolute distance)
      const closest = confirmedReservations.reduce((a, b) =>
        Math.abs(a.mins) <= Math.abs(b.mins) ? a : b
      );

      reservationInfo = {
        customerName: closest.rt.reservation.customerName,
        people: closest.rt.reservation.people,
        minutesUntil: closest.mins,
      };

      if (closest.mins < -30) {
        // More than 30 min past the reservation time — customer hasn't shown up
        status = "late";
      } else if (closest.mins <= 5) {
        // Arriving imminently (≤5 min away) or just past the start (≤30 min ago)
        status = "reserved";
      } else if (closest.mins <= 60) {
        // Arriving in the next 5–60 minutes
        status = "upcoming";
      }
      // > 60 min away: leave as "empty" (too far in the future to block the table visually)
    }
  }

  // Priority 7: Manual CLEANING override (only if no reservations drove the status)
  if (status === "empty" && dbTable.status === "CLEANING") {
    status = "cleaning";
  }

  return { status, currentGuests, hasWaiter, waiterName, reservationInfo };
}

/**
 * Transform database table to FloorTable format
 * Database stores top-left position, FloorTable uses center position
 */
export function transformTableToFloorTable(
  dbTable: TableWithReservations
): FloorTable {
  const { status, currentGuests, hasWaiter, waiterName, reservationInfo } =
    calculateTableStatus(dbTable);

  const width = dbTable.width ?? 80;
  const height = dbTable.height ?? 80;
  const topLeftX = dbTable.positionX ?? 100;
  const topLeftY = dbTable.positionY ?? 100;

  return {
    id: dbTable.id,
    number: dbTable.number,
    // Convert top-left to center
    x: topLeftX + width / 2,
    y: topLeftY + height / 2,
    width,
    height,
    rotation: dbTable.rotation ?? 0,
    shape: (dbTable.shape ?? "SQUARE") as TableShapeType,
    capacity: dbTable.capacity,
    status,
    currentGuests,
    isShared: dbTable.isShared,
    hasWaiter,
    waiterName,
    reservationInfo,
  };
}

/**
 * Transform array of database tables to FloorTable format
 */
export function transformTables(
  dbTables: TableWithReservations[]
): FloorTable[] {
  return dbTables.map(transformTableToFloorTable);
}

/**
 * Calculate the bounding box of a rotated rectangle
 */
export function getRotatedBounds(
  width: number,
  height: number,
  rotation: number
) {
  const angleRad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angleRad));
  const sin = Math.abs(Math.sin(angleRad));

  const boundingWidth = width * cos + height * sin;
  const boundingHeight = width * sin + height * cos;

  return { width: boundingWidth, height: boundingHeight };
}

/**
 * Snap coordinate to grid
 */
export function snapToGrid(value: number, gridSize = 100): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Constrain value to bounds
 */
export function constrainToBounds(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, value));
}
