"use client";

import {
  createTimeSlot,
  deleteTimeSlot,
  getTimeSlots,
  updateTimeSlot,
} from "@/actions/TimeSlot";
import type { TimeSlot } from "@/app/(admin)/dashboard/reservations/slots/lib/time-slots";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { CreateTimeSlotDialog } from "./create-time-slot-dialog";
import { DeleteTimeSlotDialog } from "./delete-time-slot-dialog";
import { EditTimeSlotDialog } from "./edit-time-slot-dialog";
import LoadingToast from "./loading-toast";
import { TimeSlotsTable } from "./time-slots-table";

interface TimeSlotsManagerProps {
  initialTimeSlots: TimeSlot[];
  branchId: string;
}

export function TimeSlotsManager({
  initialTimeSlots,
  branchId,
}: TimeSlotsManagerProps) {
  const [timeSlots, setTimeSlots] = useState(initialTimeSlots);
  const [isPending, startTransition] = useTransition();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [slotToEdit, setSlotToEdit] = useState<TimeSlot | null>(null);
  const [slotToDelete, setSlotToDelete] = useState<{
    id: string;
    dbId?: string;
  } | null>(null);

  // Refetch data helper
  const mutate = () => {
    startTransition(async () => {
      const result = await getTimeSlots(branchId);
      if (result.success && result.data) {
        setTimeSlots(result.data);
      }
    });
  };

  const handleCreate = async (newSlot: {
    timeFrom: string;
    timeTo: string;
    days: string[];
    price: string;
    notes: string;
    name?: string;
    moreInfoUrl?: string;
    tableIds: string[];
  }) => {
    startTransition(async () => {
      const result = await createTimeSlot({
        branchId,
        name: newSlot.name || "Unnamed Slot",
        startTime: newSlot.timeFrom,
        endTime: newSlot.timeTo,
        daysOfWeek: newSlot.days,
        pricePerPerson: newSlot.price ? parseFloat(newSlot.price) : 0,
        notes: newSlot.notes,
        moreInfoUrl: newSlot.moreInfoUrl,
        tableIds: newSlot.tableIds,
      });

      if (result.success) {
        setCreateDialogOpen(false);
        mutate();
      } else {
        // TODO: Show error toast/notification
        console.error("Failed to create time slot:", result.error);
      }
    });
  };

  const handleEditClick = (slotId: string) => {
    // Find the slot to edit
    const slot = timeSlots.find((s) => s.id === slotId);
    if (slot) {
      setSlotToEdit(slot);
      setEditDialogOpen(true);
    }
  };

  const handleEditConfirm = async (
    slotId: string,
    updatedSlot: {
      timeFrom: string;
      timeTo: string;
      days: string[];
      price: string;
      notes: string;
      name?: string;
      moreInfoUrl?: string;
      tableIds: string[];
    }
  ) => {
    startTransition(async () => {
      const result = await updateTimeSlot(slotId, {
        name: updatedSlot.name || "Unnamed Slot",
        startTime: updatedSlot.timeFrom,
        endTime: updatedSlot.timeTo,
        daysOfWeek: updatedSlot.days,
        pricePerPerson: updatedSlot.price ? parseFloat(updatedSlot.price) : 0,
        notes: updatedSlot.notes,
        moreInfoUrl: updatedSlot.moreInfoUrl,
        tableIds: updatedSlot.tableIds,
      });

      if (result.success) {
        setEditDialogOpen(false);
        setSlotToEdit(null);
        mutate();
      } else {
        // TODO: Show error toast/notification
        console.error("Failed to update time slot:", result.error);
      }
    });
  };

  const handleDeleteClick = (slotId: string) => {
    // Find the slot to get its database ID
    const slot = timeSlots.find((s) => s.id === slotId);
    setSlotToDelete({ id: slotId, dbId: slot?.id });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (slotToDelete?.dbId) {
      console.log("hay id", slotToDelete?.dbId);
      startTransition(async () => {
        console.log("el id es", slotToDelete?.dbId);
        const result = await deleteTimeSlot(slotToDelete.dbId!, true); // soft delete

        if (result.success) {
          setDeleteDialogOpen(false);
          setSlotToDelete(null);
          mutate();
        } else {
          // TODO: Show error toast/notification
          console.error("Failed to delete time slot:", result.error);
        }
      });
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Loading overlay during refetch */}
      {isPending && <LoadingToast />}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Administración de Turnos
          </h1>
          <p className="text-gray-600">Crear turnos para reservas.</p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-red-600 hover:bg-red-700"
          disabled={isPending}
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear Turno
        </Button>
      </div>

      <TimeSlotsTable
        timeSlots={timeSlots}
        onDelete={handleDeleteClick}
        onEdit={handleEditClick}
        onCreateClick={() => setCreateDialogOpen(true)}
      />
      {/* <div className="mb-8">
        <StatsOverview timeSlots={timeSlots} />
      </div> */}

      <CreateTimeSlotDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
        isPending={isPending}
        branchId={branchId}
      />

      <EditTimeSlotDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onEdit={handleEditConfirm}
        isPending={isPending}
        branchId={branchId}
        timeSlot={slotToEdit}
      />

      <DeleteTimeSlotDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isPending={isPending}
      />
    </div>
  );
}
