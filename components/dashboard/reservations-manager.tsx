"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type {
  Reservation,
  TimeSlot,
} from "@/app/(admin)/dashboard/reservations/lib/reservations";
import { ReservationStatsOverview } from "./reservation-stats-overview";
import { ReservationsTable } from "./reservations-table";
import { ViewReservationDialog } from "./view-reservation-dialog";
import { CreateReservationDialog } from "./create-reservation-dialog";
import { CancelReservationDialog } from "./cancel-reservation-dialog";

interface ReservationsManagerProps {
  initialReservations: Reservation[];
  timeSlots: TimeSlot[];
}

export function ReservationsManager({
  initialReservations,
  timeSlots,
}: ReservationsManagerProps) {
  const [reservations, setReservations] = useState(initialReservations);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<number | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleStatusUpdate = (id: number, status: string) => {
    setReservations((prev) =>
      prev.map((res) => (res.id === id ? { ...res, status } : res))
    );
  };

  const handleView = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setViewDialogOpen(true);
  };

  const handleCancelClick = (id: number) => {
    setReservationToCancel(id);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = () => {
    if (reservationToCancel) {
      setReservations((prev) =>
        prev.filter((res) => res.id !== reservationToCancel)
      );
      setCancelDialogOpen(false);
      setReservationToCancel(null);
    }
  };

  const handleCreate = (newReservation: {
    name: string;
    email: string;
    phone: string;
    date: string;
    time: string;
    guests: string;
    notes: string;
    status: string;
  }) => {
    const newRes: Reservation = {
      id: Math.max(...reservations.map((r) => r.id)) + 1,
      name: newReservation.name,
      email: newReservation.email,
      phone: newReservation.phone,
      date: newReservation.date,
      time: newReservation.time,
      guests: Number.parseInt(newReservation.guests),
      status: newReservation.status,
      notes: newReservation.notes,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setReservations((prev) => [...prev, newRes]);
    setCreateDialogOpen(false);
  };

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reservation Management
          </h1>
          <p className="text-gray-600">
            View and manage all restaurant reservations
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Reservation
        </Button>
      </div>

      <div className="mb-8">
        <ReservationStatsOverview reservations={reservations} />
      </div>

      <ReservationsTable
        reservations={reservations}
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
      />

      <CancelReservationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancelConfirm}
      />
    </>
  );
}
