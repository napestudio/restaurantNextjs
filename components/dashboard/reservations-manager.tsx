"use client";

import {
  cancelReservation,
  createReservation,
  getReservations,
  updateReservationStatus,
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
  timeSlots: TimeSlot[];
  branchId: string;
}

export function ReservationsManager({
  initialReservations,
  timeSlots,
  branchId,
}: ReservationsManagerProps) {
  const [reservations, setReservations] = useState(initialReservations);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filteredReservations, setFilteredReservations] =
    useState(initialReservations);
  const [isPending, startTransition] = useTransition();
  const [selectedReservation, setSelectedReservation] =
    useState<SerializedReservation | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Memoized callback to prevent infinite loops
  const handleFilteredReservationsChange = useCallback(
    (filtered: SerializedReservation[]) => {
      setFilteredReservations(filtered);
    },
    []
  );

  // Refetch data helper
  const mutate = () => {
    startTransition(async () => {
      const result = await getReservations(branchId);
      if (result.success && result.data) {
        setReservations(result.data);
      }
    });
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    // console.log(status, "status");
    startTransition(async () => {
      const result = await updateReservationStatus(
        id,
        status.toUpperCase() as ReservationStatus
      );

      if (result.success) {
        mutate();
      } else {
        console.error("Failed to update reservation status:", result.error);
        // TODO: Show error toast/notification
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
          // TODO: Show error toast/notification
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
      // newReservation.time is actually the timeSlotId from the select
      const result = await createReservation({
        branchId,
        customerName: newReservation.name,
        customerEmail: newReservation.email,
        customerPhone: newReservation.phone,
        date: newReservation.date,
        time: newReservation.time,
        guests: Number.parseInt(newReservation.guests),
        timeSlotId: newReservation.time, // This is the timeSlot ID
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
        // TODO: Show error toast/notification
      }
    });
  };

  return (
    <div className="space-y-6 relative">
      {/* Loading overlay during refetch */}
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

      {/* <div className="mb-8">
        <ReservationStatsOverview reservations={filteredReservations} />
      </div> */}

      <ReservationsTable
        reservations={reservations}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onStatusUpdate={handleStatusUpdate}
        onView={handleView}
        onCancel={handleCancelClick}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onFilteredReservationsChange={handleFilteredReservationsChange}
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
