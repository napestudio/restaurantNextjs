import type { Reservation as PrismaReservation, TimeSlot as PrismaTimeSlot, Table, ReservationTable, ReservationStatus } from "@/app/generated/prisma";

// Reservation type from database with includes
export type ReservationWithRelations = PrismaReservation & {
  timeSlot: PrismaTimeSlot | null;
  tables: (ReservationTable & {
    table: Table;
  })[];
};

// Serialized version for client components (Dates as strings, Decimals as numbers)
export type SerializedReservation = {
  id: string;
  branchId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  date: string; // ISO string
  people: number;
  timeSlotId: string | null;
  status: ReservationStatus;
  dietaryRestrictions: string | null;
  accessibilityNeeds: string | null;
  notes: string | null;
  createdAt: string; // ISO string
  createdBy: string | null;
  updatedBy: string | null;
  timeSlot: {
    id: string;
    startTime: string; // ISO string
    endTime: string; // ISO string
    daysOfWeek: string[];
    pricePerPerson: number;
    notes: string | null;
    isActive: boolean;
    branchId: string;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
  } | null;
  tables: (ReservationTable & {
    table: Table;
  })[];
};

// Time slot type for UI
export interface TimeSlot {
  id: string;
  timeFrom: string;
  timeTo: string;
  days: string[];
  price: number;
}

