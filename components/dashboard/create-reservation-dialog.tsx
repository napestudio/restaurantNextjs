"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimeSlot } from "@/app/(admin)/dashboard/reservations/lib/reservations";
import { formatTime } from "@/app/(admin)/dashboard/reservations/lib/utils";
import { WeekDatePicker } from "../week-date-picker";
import { getAvailableTimeSlotsForDate } from "@/actions/TimeSlot";
import { createReservation } from "@/actions/Reservation";

interface NewReservation {
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
}

interface CreateReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (reservation: NewReservation) => void;
  timeSlots: TimeSlot[];
  isPending?: boolean;
  branchId: string;
}

export function CreateReservationDialog({
  open,
  onOpenChange,
  onCreate,
  isPending,
  branchId,
}: CreateReservationDialogProps) {
  const [newReservation, setNewReservation] = useState<NewReservation>({
    name: "",
    email: "",
    phone: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    guests: "",
    dietaryRestrictions: "",
    accessibilityNeeds: "",
    notes: "",
    status: "confirmed",
  });

  const [availableSlots, setAvailableSlots] = useState<
    {
      id: string;
      startTime: Date;
      endTime: Date;
      pricePerPerson: number;
      daysOfWeek: string[];
    }[]
  >([]);
  const [selectedSlotPrice, setSelectedSlotPrice] = useState(0);

  useEffect(() => {
    if (newReservation.date) {
      const fetchSlots = async () => {
        const result = await getAvailableTimeSlotsForDate(
          branchId,
          new Date(newReservation.date)
        );
        if (result.success && result.data) {
          setAvailableSlots(result.data);
        } else {
          setAvailableSlots([]);
        }
        setNewReservation((prev) => ({ ...prev, time: "" }));
        setSelectedSlotPrice(0);
      };

      fetchSlots();
    }
  }, [newReservation.date, branchId]);

  // Calculate which days have available slots
  const availableDays = useMemo(() => {
    const daysSet = new Set<string>();
    availableSlots.forEach((slot) => {
      slot.daysOfWeek.forEach((day) => daysSet.add(day));
    });
    return Array.from(daysSet);
  }, [availableSlots]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newReservation.name ||
      !newReservation.email ||
      !newReservation.date ||
      !newReservation.time ||
      !newReservation.guests
    ) {
      // toast({
      //   title: "Missing Information",
      //   description: "Please fill in all required fields",
      //   variant: "destructive",
      // });
      return;
    }

    if (
      newReservation.name &&
      newReservation.email &&
      newReservation.date &&
      newReservation.time &&
      newReservation.guests
    ) {
      try {
        //onCreate(newReservation);
        const result = await createReservation({
          branchId,
          customerName: newReservation.name,
          customerEmail: newReservation.email,
          customerPhone: newReservation.phone || undefined,
          date: newReservation.date,
          time: newReservation.time,
          guests: Number.parseInt(newReservation.guests),
          timeSlotId: newReservation.time,
          dietaryRestrictions: newReservation.dietaryRestrictions || undefined,
          accessibilityNeeds: newReservation.accessibilityNeeds || undefined,
          notes: newReservation.notes || undefined,
          createdBy: "WEB",
        });

        if (result.success) {
          // toast({
          //   title: "Reservation Created",
          //   description: "Your reservation has been successfully created!",
          // });
          // Reset form
          setNewReservation({
            name: "",
            email: "",
            phone: "",
            date: "",
            time: "",
            guests: "",
            dietaryRestrictions: "",
            accessibilityNeeds: "",
            notes: "",
            status: "confirmed",
          });
          setSelectedSlotPrice(0);
        }
      } catch (error) {
        // toast({
        //   title: "Error",
        //   description: result.error || "Failed to create reservation",
        //   variant: "destructive",
        // });
      } finally {
        onOpenChange(false);
      }
    }
  };

  const handleTimeSlotChange = (value: string) => {
    setNewReservation((prev) => ({ ...prev, time: value }));
    const slot = availableSlots.find((s) => s.id === value);
    setSelectedSlotPrice(slot?.pricePerPerson || 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Reservation</DialogTitle>
          <DialogDescription>
            Add a new reservation to the system
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-name">Full Name</Label>
              <Input
                id="new-name"
                value={newReservation.name}
                onChange={(e) =>
                  setNewReservation((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newReservation.email}
                onChange={(e) =>
                  setNewReservation((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="new-phone">Phone Number</Label>
            <Input
              id="new-phone"
              value={newReservation.phone}
              onChange={(e) =>
                setNewReservation((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <Label htmlFor="new-date">Date</Label>
            <WeekDatePicker
              value={newReservation.date}
              onChange={(date) =>
                setNewReservation((prev) => ({ ...prev, date: date }))
              }
              availableDays={availableDays}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-time">Time Slot</Label>
              <Select
                value={newReservation.time}
                onValueChange={handleTimeSlotChange}
                disabled={!newReservation.date}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      newReservation.date
                        ? "Select time slot"
                        : "Select a date first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      No hay turnos disponibles
                    </div>
                  ) : (
                    availableSlots.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>
                            {formatTime(slot.startTime)} -{" "}
                            {formatTime(slot.endTime)}
                          </span>
                          {slot.pricePerPerson > 0 && (
                            <span className="text-green-600 font-semibold text-xs">
                              ${slot.pricePerPerson}/persona
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedSlotPrice > 0 && newReservation.guests && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-xs text-green-800">
                    <strong>Reservation Fee:</strong> ${selectedSlotPrice} ×{" "}
                    {newReservation.guests} guests = $
                    {selectedSlotPrice * Number.parseInt(newReservation.guests)}
                  </p>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="new-guests">Number of Guests</Label>
              <Select
                value={newReservation.guests}
                onValueChange={(value) =>
                  setNewReservation((prev) => ({ ...prev, guests: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select guests" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? "Guest" : "Guests"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="new-dietary">Dietary Restrictions (Optional)</Label>
            <Input
              id="new-dietary"
              value={newReservation.dietaryRestrictions}
              onChange={(e) =>
                setNewReservation((prev) => ({
                  ...prev,
                  dietaryRestrictions: e.target.value,
                }))
              }
              placeholder="e.g., Vegetarian, Celiac, Lactose intolerant, Vegan"
            />
            <p className="text-xs text-muted-foreground mt-1">
              List any allergies or dietary restrictions
            </p>
          </div>

          <div>
            <Label htmlFor="new-accessibility">
              Accessibility Needs (Optional)
            </Label>
            <Input
              id="new-accessibility"
              value={newReservation.accessibilityNeeds}
              onChange={(e) =>
                setNewReservation((prev) => ({
                  ...prev,
                  accessibilityNeeds: e.target.value,
                }))
              }
              placeholder="e.g., Wheelchair accessible, Ground floor preferred"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Help us prepare the best seating arrangement
            </p>
          </div>

          <div>
            <Label htmlFor="new-status">Status</Label>
            <Select
              value={newReservation.status}
              onValueChange={(value) =>
                setNewReservation((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="new-notes">
              Special Requests / Notes (Optional)
            </Label>
            <Textarea
              id="new-notes"
              value={newReservation.notes}
              onChange={(e) =>
                setNewReservation((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              placeholder="Special occasions, seating preferences, etc."
              rows={3}
            />
          </div>
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-red-600 hover:bg-red-700"
            disabled={isPending}
          >
            Create Reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
