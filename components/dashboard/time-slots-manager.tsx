"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import type { TimeSlot } from "@/app/(admin)/dashboard/reservations/slots/lib/time-slots";
import { getTimeSlots, createTimeSlot, deleteTimeSlot } from "@/actions/TimeSlot";
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
  const [timeSlots, setTimeSlots] = useState(initialTimeSlots);
  const [isPending, startTransition] = useTransition();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
      {isPending && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
            <p className="text-sm font-medium text-gray-700">
              Actualizando datos...
            </p>
          </div>
        </div>
      )}

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
        <StatsOverview timeSlots={timeSlots} />
      </div>

      <TimeSlotsTable
        timeSlots={timeSlots}
        onDelete={handleDeleteClick}
        onCreateClick={() => setCreateDialogOpen(true)}
      />

      <CreateTimeSlotDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
        isPending={isPending}
        branchId={branchId}
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
