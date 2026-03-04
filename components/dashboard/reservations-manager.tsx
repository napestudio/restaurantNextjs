"use client";

import {
  createReservation,
  deleteReservation,
  getFilteredReservations,
  updateReservationStatus,
  type ReservationFilterType,
} from "@/actions/Reservation";
import { getTimeSlots } from "@/actions/TimeSlot";
import type {
  SerializedReservation,
  TimeSlot,
} from "@/app/(admin)/dashboard/reservations/lib/reservations";
import { ReservationStatus } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { CreateReservationSidebar } from "./create-reservation-sidebar";
import { DeleteReservationDialog } from "./delete-reservation-dialog";
import LoadingToast from "./loading-toast";
import { ReservationsTable } from "./reservations-table";
import { ViewReservationDialog } from "./view-reservation-dialog";

interface ReservationsManagerProps {
  initialReservations: SerializedReservation[];
  initialPagination: {
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
  };
  branchId: string;
}

export function ReservationsManager({
  initialReservations,
  initialPagination,
  branchId,
}: ReservationsManagerProps) {
  const router = useRouter();

  // Reservations state
  const [reservations, setReservations] = useState(initialReservations);
  const [pagination, setPagination] = useState(initialPagination);

  // Time slots — loaded lazily when the Create Reservation dialog is opened
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState<string | null>(
    null,
  );

  // Load time slots on demand when the Create Reservation dialog opens
  useEffect(() => {
    if (createDialogOpen && timeSlots.length === 0) {
      getTimeSlots(branchId).then((result) => {
        if (result.success && result.data) setTimeSlots(result.data);
      });
    }
  }, [createDialogOpen, timeSlots.length, branchId]);

  // Fetch reservations with current filters
  const fetchReservations = useCallback(
    async (cursor?: string, append = false) => {
      const result = await getFilteredReservations(branchId, {
        type: filterType,
        dateFrom: filterType === "dateRange" ? dateFrom : undefined,
        dateTo: filterType === "dateRange" ? dateTo : undefined,
        status:
          statusFilter !== "all"
            ? (statusFilter.toUpperCase() as ReservationStatus)
            : undefined,
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
    [branchId, filterType, dateFrom, dateTo, statusFilter],
  );

  // Handle filter changes - reset and fetch
  const handleFilterChange = useCallback(
    (
      newFilterType: ReservationFilterType,
      newDateFrom?: string,
      newDateTo?: string,
    ) => {
      setFilterType(newFilterType);
      if (newDateFrom !== undefined) setDateFrom(newDateFrom);
      if (newDateTo !== undefined) setDateTo(newDateTo);

      startTransition(async () => {
        const result = await getFilteredReservations(branchId, {
          type: newFilterType,
          dateFrom:
            newFilterType === "dateRange"
              ? (newDateFrom ?? dateFrom)
              : undefined,
          dateTo:
            newFilterType === "dateRange" ? (newDateTo ?? dateTo) : undefined,
          status:
            statusFilter !== "all"
              ? (statusFilter.toUpperCase() as ReservationStatus)
              : undefined,
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
    [branchId, dateFrom, dateTo, statusFilter],
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
          status:
            newStatus !== "all"
              ? (newStatus.toUpperCase() as ReservationStatus)
              : undefined,
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
    [branchId, filterType, dateFrom, dateTo],
  );

  // Load more (pagination)
  const handleLoadMore = useCallback(() => {
    if (!pagination.hasMore || !pagination.nextCursor) return;

    startTransition(async () => {
      await fetchReservations(pagination.nextCursor!, true);
    });
  }, [pagination.hasMore, pagination.nextCursor, fetchReservations]);

  const handleStatusUpdate = async (id: string, status: string) => {
    // Store previous state for rollback
    const previousReservations = reservations;
    const newStatus = status.toUpperCase() as ReservationStatus;

    // Optimistic update - immediately update UI
    setReservations((prev) =>
      prev.map((reservation) =>
        reservation.id === id
          ? { ...reservation, status: newStatus }
          : reservation,
      ),
    );

    // Perform server update
    const result = await updateReservationStatus(id, newStatus);

    if (!result.success) {
      // Rollback on failure
      setReservations(previousReservations);
      console.error("Failed to update reservation status:", result.error);
      return;
    }

    // After seating: navigate to floor plan with the table pre-selected so
    // staff can immediately start taking the order, with party size and client
    // pre-filled from the reservation data.
    if (newStatus === ReservationStatus.SEATED) {
      const reservation = reservations.find((r) => r.id === id);
      const tableId = reservation?.tables[0]?.table.id;
      if (tableId) {
        const params = new URLSearchParams({ tableId });
        if (reservation?.people)
          params.set("partySize", String(reservation.people));
        if (reservation?.customerEmail)
          params.set("customerEmail", reservation.customerEmail);
        router.push(`/dashboard/tables?${params.toString()}`);
      }
    }
  };

  const handleView = (reservation: SerializedReservation) => {
    setSelectedReservation(reservation);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setReservationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (reservationToDelete) {
      // Store previous state for rollback
      const previousReservations = reservations;
      const previousPagination = pagination;

      // Optimistic update - immediately remove from UI
      setReservations((prev) =>
        prev.filter((reservation) => reservation.id !== reservationToDelete),
      );
      setPagination((prev) => ({
        ...prev,
        totalCount: Math.max(0, prev.totalCount - 1),
      }));

      // Close dialog immediately for snappy UX
      setDeleteDialogOpen(false);
      setReservationToDelete(null);

      // Perform server delete
      const result = await deleteReservation(reservationToDelete);

      if (!result.success) {
        // Rollback on failure
        setReservations(previousReservations);
        setPagination(previousPagination);
        console.error("Failed to delete reservation:", result.error);
      }
    }
  };

  const handleCreate = async (newReservation: {
    name: string;
    email: string;
    phone: string;
    date: string;
    time: string;
    exactTime: string;
    guests: string;
    dietaryRestrictions: string;
    accessibilityNeeds: string;
    notes: string;
    status: string;
    clientId?: string;
  }) => {
    // Find the selected time slot for optimistic data
    const selectedTimeSlot = timeSlots.find(
      (ts) => ts.id === newReservation.time,
    );
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();

    // Create optimistic reservation object
    const optimisticReservation: SerializedReservation = {
      id: tempId,
      branchId,
      customerName: newReservation.name,
      customerEmail: newReservation.email,
      customerPhone: newReservation.phone || null,
      date: new Date(newReservation.date).toISOString(),
      people: Number.parseInt(newReservation.guests),
      timeSlotId: newReservation.time,
      exactTime: newReservation.exactTime
        ? new Date(newReservation.exactTime).toISOString()
        : null,
      status: newReservation.status.toUpperCase() as ReservationStatus,
      dietaryRestrictions: newReservation.dietaryRestrictions || null,
      accessibilityNeeds: newReservation.accessibilityNeeds || null,
      notes: newReservation.notes || null,
      createdAt: now,
      createdBy: null,
      updatedBy: null,
      timeSlot: selectedTimeSlot
        ? {
            id: selectedTimeSlot.id,
            startTime:
              typeof selectedTimeSlot.startTime === "string"
                ? selectedTimeSlot.startTime
                : selectedTimeSlot.startTime.toISOString(),
            endTime:
              typeof selectedTimeSlot.endTime === "string"
                ? selectedTimeSlot.endTime
                : selectedTimeSlot.endTime.toISOString(),
            daysOfWeek: selectedTimeSlot.daysOfWeek,
            pricePerPerson: selectedTimeSlot.pricePerPerson || 0,
            notes: selectedTimeSlot.notes,
            isActive: selectedTimeSlot.isActive,
            branchId: selectedTimeSlot.branchId,
            createdAt:
              typeof selectedTimeSlot.createdAt === "string"
                ? selectedTimeSlot.createdAt
                : selectedTimeSlot.createdAt.toISOString(),
            updatedAt:
              typeof selectedTimeSlot.updatedAt === "string"
                ? selectedTimeSlot.updatedAt
                : selectedTimeSlot.updatedAt.toISOString(),
          }
        : null,
      tables: [],
    };

    // Store previous state for rollback
    const previousReservations = reservations;
    const previousPagination = pagination;

    // Optimistic update - add to beginning of list
    setReservations((prev) => [optimisticReservation, ...prev]);
    setPagination((prev) => ({
      ...prev,
      totalCount: prev.totalCount + 1,
    }));

    // Close sidebar immediately for snappy UX
    setCreateDialogOpen(false);

    // Perform server create
    const result = await createReservation({
      branchId,
      customerName: newReservation.name,
      customerEmail: newReservation.email,
      customerPhone: newReservation.phone,
      date: newReservation.date,
      time: newReservation.exactTime || newReservation.time,
      guests: Number.parseInt(newReservation.guests),
      timeSlotId: newReservation.time,
      exactTime: newReservation.exactTime || undefined,
      dietaryRestrictions: newReservation.dietaryRestrictions || undefined,
      accessibilityNeeds: newReservation.accessibilityNeeds || undefined,
      notes: newReservation.notes || undefined,
      status: newReservation.status.toUpperCase() as ReservationStatus,
    });

    if (result.success && result.data) {
      // Replace temp reservation with real one from server
      setReservations((prev) =>
        prev.map((r) => (r.id === tempId ? result.data! : r)),
      );

      // NEW: Show warning if assigned to shared table only
      if ((result as { isSharedTableOnly?: boolean }).isSharedTableOnly) {
        setTimeout(() => {
          alert(
            "Nota: Esta reserva fue asignada a una mesa compartida. La mesa puede ser compartida con otros clientes.",
          );
        }, 300);
      }
    } else {
      // Rollback on failure
      setReservations(previousReservations);
      setPagination(previousPagination);
      console.error("Failed to create reservation:", result.error);
    }
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
        onDateRangeChange={(from, to) =>
          handleFilterChange("dateRange", from, to)
        }
        onStatusUpdate={handleStatusUpdate}
        onView={handleView}
        onDelete={handleDeleteClick}
        onLoadMore={handleLoadMore}
      />

      <ViewReservationDialog
        reservation={selectedReservation}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      <CreateReservationSidebar
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
        timeSlots={timeSlots}
        branchId={branchId}
      />

      <DeleteReservationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isPending={isPending}
      />
    </div>
  );
}
