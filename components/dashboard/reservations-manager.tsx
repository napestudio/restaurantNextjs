"use client";

import {
  createReservation,
  deleteReservation,
  getFilteredReservations,
  seatReservationWithTable,
  updateReservationStatus,
  type ReservationFilterType,
} from "@/actions/Reservation";
import { createTableOrder } from "@/actions/Order";
import { getClientByEmail } from "@/actions/clients";
import { getTimeSlots } from "@/actions/TimeSlot";
import type {
  SerializedReservation,
  TimeSlot,
} from "@/app/(admin)/dashboard/reservations/lib/reservations";
import { ReservationStatus } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { CreateReservationSidebar } from "./create-reservation-sidebar";
import { DeleteReservationDialog } from "./delete-reservation-dialog";
import LoadingToast from "./loading-toast";
import { ReservationsTable } from "./reservations-table";
import { SeatReservationDialog } from "./seat-reservation-dialog";
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

  // Seating dialog state
  const [seatingDialogOpen, setSeatingDialogOpen] = useState(false);
  const [reservationToSeat, setReservationToSeat] =
    useState<SerializedReservation | null>(null);
  const [isSeating, setIsSeating] = useState(false);
  const { toast } = useToast();

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
      setReservations(previousReservations);
      toast({
        title: "No se puede cambiar el estado",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleSeatingRequested = (reservation: SerializedReservation) => {
    setReservationToSeat(reservation);
    setSeatingDialogOpen(true);
  };

  const handleSeatingConfirm = async (
    reservationId: string,
    selectedTableIds: string[]
  ) => {
    setIsSeating(true);
    const previousReservations = reservations;

    // Optimistic update
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId ? { ...r, status: ReservationStatus.SEATED } : r
      )
    );

    const result = await seatReservationWithTable(reservationId, selectedTableIds);

    if (!result.success) {
      setReservations(previousReservations);
      toast({
        title: "Error al sentar la reserva",
        description: result.error,
        variant: "destructive",
      });
      setIsSeating(false);
      return;
    }

    // Resolve the reservation data from pre-optimistic state
    const seatedReservation = previousReservations.find((r) => r.id === reservationId);

    // Optional: look up registered client by email to attach to the order
    let clientId: string | null = null;
    if (seatedReservation?.customerEmail) {
      const clientResult = await getClientByEmail(branchId, seatedReservation.customerEmail);
      if (clientResult.success && clientResult.data) {
        clientId = clientResult.data.id;
      }
    }

    // Create an order for the table — mirrors "open table" from the floor plan
    await createTableOrder(
      result.data!.tableId,
      branchId,
      seatedReservation?.people ?? 1,
      clientId,
      null,
    );

    // Refresh the list so the "Mesa" column shows the newly assigned table
    await fetchReservations();
    setSeatingDialogOpen(false);
    setIsSeating(false);
    toast({ title: "Reserva sentada correctamente" });
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
        onSeatingRequested={handleSeatingRequested}
        seatingReservationId={isSeating ? (reservationToSeat?.id ?? null) : null}
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

      {reservationToSeat && (
        <SeatReservationDialog
          open={seatingDialogOpen}
          onOpenChange={setSeatingDialogOpen}
          reservation={reservationToSeat}
          branchId={branchId}
          onConfirm={handleSeatingConfirm}
          isLoading={isSeating}
        />
      )}
    </div>
  );
}
