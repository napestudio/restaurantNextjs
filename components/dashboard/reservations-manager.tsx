"use client";

import {
  cancelReservation,
  createReservation,
  getFilteredReservations,
  updateReservationStatus,
  type ReservationFilterType,
  type PaginatedReservationsResult,
} from "@/actions/Reservation";
import type {
  SerializedReservation,
  TimeSlot,
} from "@/app/(admin)/dashboard/reservations/lib/reservations";
import { ReservationStatus } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { CancelReservationDialog } from "./cancel-reservation-dialog";
import { CreateReservationDialog } from "./create-reservation-dialog";
import { ReservationsTable } from "./reservations-table";
import { ViewReservationDialog } from "./view-reservation-dialog";
import LoadingToast from "./loading-toast";

interface ReservationsManagerProps {
  initialReservations: SerializedReservation[];
  initialPagination: {
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
  };
  timeSlots: TimeSlot[];
  branchId: string;
}

export function ReservationsManager({
  initialReservations,
  initialPagination,
  timeSlots,
  branchId,
}: ReservationsManagerProps) {
  // Reservations state
  const [reservations, setReservations] = useState(initialReservations);
  const [pagination, setPagination] = useState(initialPagination);

  // Filter state
  const [filterType, setFilterType] = useState<ReservationFilterType>("today");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // UI state
  const [isPending, startTransition] = useTransition();
  const [selectedReservation, setSelectedReservation] =
    useState<SerializedReservation | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(
    null
  );

  // Fetch reservations with current filters
  const fetchReservations = useCallback(
    async (cursor?: string, append = false) => {
      const result = await getFilteredReservations(branchId, {
        type: filterType,
        dateFrom: filterType === "dateRange" ? dateFrom : undefined,
        dateTo: filterType === "dateRange" ? dateTo : undefined,
        status: statusFilter !== "all" ? (statusFilter.toUpperCase() as ReservationStatus) : undefined,
        cursor,
        limit: 10,
      });

      if (result.success && result.data) {
        if (append) {
          setReservations((prev) => [...prev, ...result.data!.reservations]);
        } else {
          setReservations(result.data.reservations);
        }
        setPagination({
          nextCursor: result.data.nextCursor,
          hasMore: result.data.hasMore,
          totalCount: result.data.totalCount,
        });
      }
    },
    [branchId, filterType, dateFrom, dateTo, statusFilter]
  );

  // Handle filter changes - reset and fetch
  const handleFilterChange = useCallback(
    (newFilterType: ReservationFilterType, newDateFrom?: string, newDateTo?: string) => {
      setFilterType(newFilterType);
      if (newDateFrom !== undefined) setDateFrom(newDateFrom);
      if (newDateTo !== undefined) setDateTo(newDateTo);

      startTransition(async () => {
        const result = await getFilteredReservations(branchId, {
          type: newFilterType,
          dateFrom: newFilterType === "dateRange" ? (newDateFrom ?? dateFrom) : undefined,
          dateTo: newFilterType === "dateRange" ? (newDateTo ?? dateTo) : undefined,
          status: statusFilter !== "all" ? (statusFilter.toUpperCase() as ReservationStatus) : undefined,
          limit: 10,
        });

        if (result.success && result.data) {
          setReservations(result.data.reservations);
          setPagination({
            nextCursor: result.data.nextCursor,
            hasMore: result.data.hasMore,
            totalCount: result.data.totalCount,
          });
        }
      });
    },
    [branchId, dateFrom, dateTo, statusFilter]
  );

  // Handle status filter change
  const handleStatusFilterChange = useCallback(
    (newStatus: string) => {
      setStatusFilter(newStatus);

      startTransition(async () => {
        const result = await getFilteredReservations(branchId, {
          type: filterType,
          dateFrom: filterType === "dateRange" ? dateFrom : undefined,
          dateTo: filterType === "dateRange" ? dateTo : undefined,
          status: newStatus !== "all" ? (newStatus.toUpperCase() as ReservationStatus) : undefined,
          limit: 10,
        });

        if (result.success && result.data) {
          setReservations(result.data.reservations);
          setPagination({
            nextCursor: result.data.nextCursor,
            hasMore: result.data.hasMore,
            totalCount: result.data.totalCount,
          });
        }
      });
    },
    [branchId, filterType, dateFrom, dateTo]
  );

  // Load more (pagination)
  const handleLoadMore = useCallback(() => {
    if (!pagination.hasMore || !pagination.nextCursor) return;

    startTransition(async () => {
      await fetchReservations(pagination.nextCursor!, true);
    });
  }, [pagination.hasMore, pagination.nextCursor, fetchReservations]);

  // Refetch current view (after mutations)
  const mutate = useCallback(() => {
    startTransition(async () => {
      await fetchReservations();
    });
  }, [fetchReservations]);

  const handleStatusUpdate = async (id: string, status: string) => {
    startTransition(async () => {
      const result = await updateReservationStatus(
        id,
        status.toUpperCase() as ReservationStatus
      );

      if (result.success) {
        mutate();
      } else {
        console.error("Failed to update reservation status:", result.error);
      }
    });
  };

  const handleView = (reservation: SerializedReservation) => {
    setSelectedReservation(reservation);
    setViewDialogOpen(true);
  };

  const handleCancelClick = (id: string) => {
    setReservationToCancel(id);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (reservationToCancel) {
      startTransition(async () => {
        const result = await cancelReservation(reservationToCancel);

        if (result.success) {
          setCancelDialogOpen(false);
          setReservationToCancel(null);
          mutate();
        } else {
          console.error("Failed to cancel reservation:", result.error);
        }
      });
    }
  };

  const handleCreate = async (newReservation: {
    name: string;
    email: string;
    phone: string;
    date: string;
    time: string;
    guests: string;
    dietaryRestrictions: string;
    accessibilityNeeds: string;
    notes: string;
    status: string;
  }) => {
    startTransition(async () => {
      const result = await createReservation({
        branchId,
        customerName: newReservation.name,
        customerEmail: newReservation.email,
        customerPhone: newReservation.phone,
        date: newReservation.date,
        time: newReservation.time,
        guests: Number.parseInt(newReservation.guests),
        timeSlotId: newReservation.time,
        dietaryRestrictions: newReservation.dietaryRestrictions || undefined,
        accessibilityNeeds: newReservation.accessibilityNeeds || undefined,
        notes: newReservation.notes || undefined,
        status: newReservation.status.toUpperCase() as ReservationStatus,
      });

      if (result.success) {
        setCreateDialogOpen(false);
        mutate();
      } else {
        console.error("Failed to create reservation:", result.error);
      }
    });
  };

  return (
    <div className="space-y-6 relative">
      {isPending && <LoadingToast />}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Administración de Reservas
          </h1>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-red-600 hover:bg-red-700"
          disabled={isPending}
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear Reserva
        </Button>
      </div>

      <ReservationsTable
        reservations={reservations}
        filterType={filterType}
        statusFilter={statusFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        pagination={pagination}
        isPending={isPending}
        onFilterTypeChange={handleFilterChange}
        onStatusFilterChange={handleStatusFilterChange}
        onDateRangeChange={(from, to) => handleFilterChange("dateRange", from, to)}
        onStatusUpdate={handleStatusUpdate}
        onView={handleView}
        onCancel={handleCancelClick}
        onLoadMore={handleLoadMore}
      />

      <ViewReservationDialog
        reservation={selectedReservation}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      <CreateReservationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
        timeSlots={timeSlots}
        isPending={isPending}
        branchId={branchId}
      />

      <CancelReservationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancelConfirm}
        isPending={isPending}
      />
    </div>
  );
}
