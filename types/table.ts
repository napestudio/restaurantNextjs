export type TableShapeType = "CIRCLE" | "SQUARE" | "RECTANGLE" | "WIDE";

/** Statuses that map directly to the DB TableStatus enum (manually settable) */
export type TableStatus = "empty" | "occupied" | "reserved" | "cleaning";

/** Extended statuses used only in the floor plan display (computed from time + reservations) */
export type FloorTableStatus =
  | TableStatus
  | "upcoming" // CONFIRMED reservation arriving in <60 min
  | "late" // CONFIRMED reservation overdue (customer not yet seated)
  | "pending_payment"; // PENDING (paid) reservation today
