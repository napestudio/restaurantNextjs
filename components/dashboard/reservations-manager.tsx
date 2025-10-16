"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type {
  TimeSlot,
  SerializedReservation,
} from "@/app/(admin)/dashboard/reservations/lib/reservations";
import {
  createReservation,
  updateReservationStatus,
  cancelReservation,
} from "@/actions/Reservation";
import { ReservationStatus } from "@/app/generated/prisma";
import { ReservationStatsOverview } from "./reservation-stats-overview";
import { ReservationsTable } from "./reservations-table";
import { ViewReservationDialog } from "./view-reservation-dialog";
import { CreateReservationDialog } from "./create-reservation-dialog";
import { CancelReservationDialog } from "./cancel-reservation-dialog";

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
  const router = useRouter();
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

  const handleStatusUpdate = async (id: string, status: string) => {
    console.log(status, "status");
    startTransition(async () => {
      const result = await updateReservationStatus(
        id,
        status.toUpperCase() as ReservationStatus
      );

      if (result.success) {
        router.refresh();
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
          router.refresh();
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
      // Find the time slot ID based on the time value
      const timeSlot = timeSlots.find(
        (slot) => `${slot.timeFrom}-${slot.timeTo}` === newReservation.time
      );

      const result = await createReservation({
        branchId,
        customerName: newReservation.name,
        customerEmail: newReservation.email,
        customerPhone: newReservation.phone,
        date: newReservation.date,
        time: newReservation.time,
        guests: Number.parseInt(newReservation.guests),
        timeSlotId: timeSlot?.id,
        dietaryRestrictions: newReservation.dietaryRestrictions || undefined,
        accessibilityNeeds: newReservation.accessibilityNeeds || undefined,
        notes: newReservation.notes || undefined,
        status: newReservation.status.toUpperCase() as ReservationStatus,
      });

      if (result.success) {
        setCreateDialogOpen(false);
        router.refresh();
      } else {
        console.error("Failed to create reservation:", result.error);
        // TODO: Show error toast/notification
      }
    });
  };

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Administración de Reservas
          </h1>
          <p className="text-gray-600">
            Administra las reservas desde este panel.
          </p>
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

      <div className="mb-8">
        <ReservationStatsOverview reservations={initialReservations} />
      </div>

      <ReservationsTable
        reservations={initialReservations}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onStatusUpdate={handleStatusUpdate}
        onView={handleView}
        onCancel={handleCancelClick}
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
    </>
  );
}
