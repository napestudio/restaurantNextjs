"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { TimeSlot } from "@/app/(admin)/dashboard/reservations/slots/lib/time-slots";
import { StatsOverview } from "./stats-overview";
import { TimeSlotsTable } from "./time-slots-table";
import { CreateTimeSlotDialog } from "./create-time-slot-dialog";
import { DeleteTimeSlotDialog } from "./delete-time-slot-dialog";

interface TimeSlotsManagerProps {
  initialTimeSlots: TimeSlot[];
}

export function TimeSlotsManager({ initialTimeSlots }: TimeSlotsManagerProps) {
  const [timeSlots, setTimeSlots] = useState(initialTimeSlots);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<number | null>(null);

  const handleCreate = (newSlot: {
    timeFrom: string;
    timeTo: string;
    days: string[];
    price: string;
    notes: string;
  }) => {
    const newTimeSlot: TimeSlot = {
      id: Math.max(0, ...timeSlots.map((s) => s.id)) + 1,
      timeFrom: newSlot.timeFrom,
      timeTo: newSlot.timeTo,
      days: newSlot.days,
      price: newSlot.price ? Number.parseFloat(newSlot.price) : 0,
      notes: newSlot.notes,
    };
    setTimeSlots((prev) => [...prev, newTimeSlot]);
    setCreateDialogOpen(false);
  };

  const handleDeleteClick = (slotId: number) => {
    setSlotToDelete(slotId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (slotToDelete) {
      setTimeSlots((prev) => prev.filter((s) => s.id !== slotToDelete));
      setDeleteDialogOpen(false);
      setSlotToDelete(null);
    }
  };

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Time Slot Management
          </h1>
          <p className="text-gray-600">
            Create time slots with flexible day schedules and pricing
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Time Slot
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
      />

      <DeleteTimeSlotDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
