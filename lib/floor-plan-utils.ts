import type { TableShapeType, TableStatus } from "@/types/table";
import { shapeDefaults } from "@/lib/floor-plan-constants";

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
 * Map frontend status to Prisma enum
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
  status: TableStatus;
  currentGuests: number;
  isShared: boolean;
  hasWaiter?: boolean; // True if any order has an assigned waiter
  waiterName?: string; // Name of the assigned waiter (first one if multiple orders)
}

/**
 * TableWithReservations interface - represents a table from the database with reservations
 */
export interface TableWithReservations {
  id: string;
  number: number;
  capacity: number;
  positionX: number | null;
  positionY: number | null;
  width: number | null;
  height: number | null;
  rotation: number | null;
  shape: string | null;
  status: string | null;
  isActive: boolean;
  isShared: boolean;
  sectorId: string | null;
  name?: string | null;
  reservations: Array<{
    reservation: {
      customerName: string;
      people: number;
      status: string;
      date: string;
      timeSlot: {
        startTime: string;
        endTime: string;
      } | null;
    };
  }>;
  orders?: Array<{
    id: string;
    partySize: number | null;
    status: string;
    assignedTo: {
      id: string;
      name: string | null;
    } | null;
  }>;
}

/**
 * Check if the current time falls within a reservation's time slot
 */
function isWithinTimeSlot(
  timeSlot: { startTime: string; endTime: string } | null,
  now: Date = new Date()
): boolean {
  if (!timeSlot) {
    // If no time slot is assigned, treat as all-day reservation
    return true;
  }

  const startTime = new Date(timeSlot.startTime);
  const endTime = new Date(timeSlot.endTime);

  return now >= startTime && now <= endTime;
}

/**
 * Calculate table status based on reservations, orders, and manual status
 */
export function calculateTableStatus(
  dbTable: TableWithReservations
): {
  status: TableStatus;
  currentGuests: number;
  hasWaiter: boolean;
  waiterName?: string;
} {
  let status: TableStatus = "empty";
  let currentGuests = 0;
  let hasWaiter = false;
  let waiterName: string | undefined;

  // First, check if there are active orders (highest priority for current guests)
  if (dbTable.orders && dbTable.orders.length > 0) {
    // Sum up party sizes from all active orders (for shared tables)
    currentGuests = dbTable.orders.reduce(
      (sum, order) => sum + (order.partySize || 0),
      0
    );
    // If there are active orders, table is occupied
    status = "occupied";

    // Check if any order has a waiter assigned
    const orderWithWaiter = dbTable.orders.find(order => order.assignedTo);
    if (orderWithWaiter?.assignedTo) {
      hasWaiter = true;
      waiterName = orderWithWaiter.assignedTo.name || undefined;
    }
  } else if (dbTable.status) {
    // Use manual status from database
    status = statusMap[dbTable.status] || "empty";
  } else if (dbTable.reservations.length > 0) {
    // Calculate status from reservations
    const reservation = dbTable.reservations[0].reservation;
    currentGuests = reservation.people;

    const reservationDate = new Date(reservation.date);
    const today = new Date();
    const isToday =
      reservationDate.getDate() === today.getDate() &&
      reservationDate.getMonth() === today.getMonth() &&
      reservationDate.getFullYear() === today.getFullYear();

    if (isToday && isWithinTimeSlot(reservation.timeSlot)) {
      // Only show as reserved/occupied if current time is within the time slot
      status = reservation.status === "CONFIRMED" ? "occupied" : "reserved";
    } else if (!isToday) {
      // Future reservations show as reserved
      status = "reserved";
    }
    // If isToday but NOT within time slot, status remains "empty"
  }

  // Fallback: Set currentGuests from reservations if no orders and reservations exist
  if (currentGuests === 0 && dbTable.reservations.length > 0) {
    currentGuests = dbTable.reservations[0].reservation.people;
  }

  return { status, currentGuests, hasWaiter, waiterName };
}

/**
 * Transform database table to FloorTable format
 * Database stores top-left position, FloorTable uses center position
 */
export function transformTableToFloorTable(
  dbTable: TableWithReservations
): FloorTable {
  const { status, currentGuests, hasWaiter, waiterName } = calculateTableStatus(dbTable);

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
