import type { ReservationStatus } from "@/app/generated/prisma";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reservations: any[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}
