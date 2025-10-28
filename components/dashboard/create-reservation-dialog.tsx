"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
import { PartySizePicker } from "@/components/ui/party-size-picker";
import type { TimeSlot } from "@/app/(admin)/dashboard/reservations/lib/reservations";
import { formatTime } from "@/app/(admin)/dashboard/reservations/lib/utils";
import { WeekDatePicker } from "../week-date-picker";
import { getAvailableTimeSlotsForDate } from "@/actions/TimeSlot";

interface NewReservation {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
  notes: string;
  status: string;
}

interface CreateReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (reservation: {
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
  }) => void;
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
    guests: 2,
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

  // Store date separately to prevent re-fetching when other fields change
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Track the last fetched date to prevent duplicate fetches
  const lastFetchedRef = useRef<string>("");
  const isFetchingRef = useRef(false);

  useEffect(() => {
    // Only fetch if:
    // 1. We have a date
    // 2. The date is different from the last fetch
    // 3. We're not already fetching
    if (!selectedDate || selectedDate === lastFetchedRef.current || isFetchingRef.current) {
      return;
    }

    const fetchSlots = async () => {
      isFetchingRef.current = true;
      lastFetchedRef.current = selectedDate;

      try {
        const result = await getAvailableTimeSlotsForDate(
          branchId,
          selectedDate
        );
        if (result.success && result.data) {
          setAvailableSlots(result.data);
        } else {
          setAvailableSlots([]);
        }
        setNewReservation((prev) => ({ ...prev, time: "" }));
        setSelectedSlotPrice(0);
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchSlots();
  }, [selectedDate, branchId]);

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

    // Convert newReservation to the expected format and call onCreate
    onCreate({
      name: newReservation.name,
      email: newReservation.email,
      phone: newReservation.phone,
      date: newReservation.date,
      time: newReservation.time,
      guests: newReservation.guests.toString(),
      dietaryRestrictions: newReservation.dietaryRestrictions,
      accessibilityNeeds: newReservation.accessibilityNeeds,
      notes: newReservation.notes,
      status: newReservation.status,
    });

    // Reset form
    const newDate = new Date().toISOString().split("T")[0];
    setNewReservation({
      name: "",
      email: "",
      phone: "",
      date: newDate,
      time: "",
      guests: 2,
      dietaryRestrictions: "",
      accessibilityNeeds: "",
      notes: "",
      status: "confirmed",
    });
    setSelectedDate(newDate);
    setSelectedSlotPrice(0);
    // Reset fetch tracking
    lastFetchedRef.current = "";
    isFetchingRef.current = false;
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
          <DialogTitle>Crear reserva</DialogTitle>
          <DialogDescription>
            Crear una reserva nueva para un cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-name">Nombre completo</Label>
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
                placeholder="nombre@eejemplo.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="new-phone">Telefono</Label>
            <Input
              id="new-phone"
              value={newReservation.phone}
              onChange={(e) =>
                setNewReservation((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
              placeholder="(+54) 123-4567"
            />
          </div>

          <div>
            <Label htmlFor="new-date">Fecha</Label>
            <WeekDatePicker
              value={selectedDate}
              onChange={(date: string) => {
                setSelectedDate(date);
                setNewReservation((prev) => ({ ...prev, date }));
              }}
              availableDays={availableDays}
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="new-time">Turno</Label>
              <Select
                value={newReservation.time}
                onValueChange={handleTimeSlotChange}
                disabled={!newReservation.date}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      newReservation.date
                        ? "Turno"
                        : "Se debe seleccionar una fecha primero"
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
                    <strong>Costo de la reserva:</strong> ${selectedSlotPrice} ×{" "}
                    {newReservation.guests} personas = $
                    {selectedSlotPrice * newReservation.guests}
                  </p>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="new-guests">Personas</Label>
              <PartySizePicker
                value={newReservation.guests}
                onChange={(size) =>
                  setNewReservation((prev) => ({ ...prev, guests: size }))
                }
                min={1}
                max={20}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="new-dietary">
              Restricciones alimentarias (Opcional)
            </Label>
            <Input
              id="new-dietary"
              value={newReservation.dietaryRestrictions}
              onChange={(e) =>
                setNewReservation((prev) => ({
                  ...prev,
                  dietaryRestrictions: e.target.value,
                }))
              }
              placeholder="ej, Vegetarianismo, Celiaquia"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lorem ipsum dolor sit amet.
            </p>
          </div>

          <div>
            <Label htmlFor="new-accessibility">Accesibilidad (Opcional)</Label>
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
              Ayudanos a prepararnos para tu visita.
            </p>
          </div>

          <div>
            <Label htmlFor="new-status">Estado</Label>
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
                <SelectItem value="confirmed">Confirmada</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="new-notes">
              Pedidos especialas / Notas (Opcional)
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
              placeholder="Ocación especial, Cumpleaños, etc."
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
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-red-600 hover:bg-red-700"
            disabled={isPending}
          >
            Reservar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
