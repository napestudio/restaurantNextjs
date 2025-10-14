"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { TimeSlot } from "@/app/(admin)/dashboard/reservations/slots/lib/time-slots";
import { createTimeSlot, deleteTimeSlot } from "@/actions/TimeSlot";
import { StatsOverview } from "./stats-overview";
import { TimeSlotsTable } from "./time-slots-table";
import { CreateTimeSlotDialog } from "./create-time-slot-dialog";
import { DeleteTimeSlotDialog } from "./delete-time-slot-dialog";

interface TimeSlotsManagerProps {
  initialTimeSlots: TimeSlot[];
  branchId: string;
}

export function TimeSlotsManager({
  initialTimeSlots,
  branchId,
}: TimeSlotsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<{
    id: string;
    dbId?: string;
  } | null>(null);

  const handleCreate = async (newSlot: {
    timeFrom: string;
    timeTo: string;
    days: string[];
    price: string;
    notes: string;
  }) => {
    startTransition(async () => {
      const result = await createTimeSlot({
        branchId,
        startTime: newSlot.timeFrom,
        endTime: newSlot.timeTo,
        daysOfWeek: newSlot.days,
        pricePerPerson: newSlot.price ? parseFloat(newSlot.price) : 0,
        notes: newSlot.notes,
      });

      if (result.success) {
        setCreateDialogOpen(false);
        router.refresh();
      } else {
        // TODO: Show error toast/notification
        console.error("Failed to create time slot:", result.error);
      }
    });
  };

  const handleDeleteClick = (slotId: string) => {
    // Find the slot to get its database ID
    const slot = initialTimeSlots.find((s) => s.id === slotId);
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
          router.refresh();
        } else {
          // TODO: Show error toast/notification
          console.error("Failed to delete time slot:", result.error);
        }
      });
    }
  };

  return (
    <>
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

      <div className="mb-8">
        <StatsOverview timeSlots={initialTimeSlots} />
      </div>

      <TimeSlotsTable
        timeSlots={initialTimeSlots}
        onDelete={handleDeleteClick}
        onCreateClick={() => setCreateDialogOpen(true)}
      />

      <CreateTimeSlotDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
        isPending={isPending}
      />

      <DeleteTimeSlotDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isPending={isPending}
      />
    </>
  );
}
