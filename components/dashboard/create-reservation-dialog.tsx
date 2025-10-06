"use client";

import { useState, useEffect } from "react";
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
import { getDayOfWeek, formatTime } from "@/app/(admin)/dashboard/reservations/lib/utils";

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
}

export function CreateReservationDialog({
  open,
  onOpenChange,
  onCreate,
  timeSlots,
}: CreateReservationDialogProps) {
  const [newReservation, setNewReservation] = useState<NewReservation>({
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

  const [availableSlots, setAvailableSlots] = useState<
    { timeFrom: string; timeTo: string; price: number }[]
  >([]);
  const [selectedSlotPrice, setSelectedSlotPrice] = useState(0);

  useEffect(() => {
    if (newReservation.date) {
      const dayOfWeek = getDayOfWeek(newReservation.date);
      const availableForDay = timeSlots.filter((slot) =>
        slot.days.includes(dayOfWeek)
      );
      setAvailableSlots(availableForDay);
      setNewReservation((prev) => ({ ...prev, time: "" }));
      setSelectedSlotPrice(0);
    }
  }, [newReservation.date, timeSlots]);

  const handleCreate = () => {
    if (
      newReservation.name &&
      newReservation.email &&
      newReservation.date &&
      newReservation.time &&
      newReservation.guests
    ) {
      onCreate(newReservation);
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
    }
  };

  const handleTimeSlotChange = (value: string) => {
    setNewReservation((prev) => ({ ...prev, time: value }));
    const slot = availableSlots.find(
      (s) => `${s.timeFrom}-${s.timeTo}` === value
    );
    setSelectedSlotPrice(slot?.price || 0);
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
        <div className="space-y-4 py-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-date">Date</Label>
              <Input
                id="new-date"
                type="date"
                value={newReservation.date}
                onChange={(e) =>
                  setNewReservation((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                min={new Date().toISOString().split("T")[0]}
              />
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
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? "Guest" : "Guests"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
                    No slots available for this day
                  </div>
                ) : (
                  availableSlots.map((slot, index) => (
                    <SelectItem
                      key={index}
                      value={`${slot.timeFrom}-${slot.timeTo}`}
                    >
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>
                          {formatTime(slot.timeFrom)} -{" "}
                          {formatTime(slot.timeTo)}
                        </span>
                        {slot.price > 0 && (
                          <span className="text-green-600 font-semibold text-xs">
                            ${slot.price}/person
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
            <Label htmlFor="new-accessibility">Accessibility Needs (Optional)</Label>
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
            <Label htmlFor="new-notes">Special Requests / Notes (Optional)</Label>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-red-600 hover:bg-red-700"
          >
            Create Reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
