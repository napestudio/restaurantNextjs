"use client";

import { useState, useEffect, useMemo } from "react";
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
import { createReservation } from "@/actions/Reservation";
import { getAvailableTimeSlotsForDate } from "@/actions/TimeSlot";
import { WeekDatePicker } from "../week-date-picker";

interface ReservationFormData {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: string;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
  notes: string;
}

interface ReservationFormProps {
  branchId: string;
}

export function ReservationForm({ branchId }: ReservationFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState<ReservationFormData>({
    name: "",
    email: "",
    phone: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    guests: "",
    dietaryRestrictions: "",
    accessibilityNeeds: "",
    notes: "",
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

  // Fetch available time slots when date changes
  useEffect(() => {
    if (formData.date) {
      const fetchSlots = async () => {
        const result = await getAvailableTimeSlotsForDate(
          branchId,
          new Date(formData.date)
        );
        if (result.success && result.data) {
          setAvailableSlots(result.data);
        } else {
          setAvailableSlots([]);
        }
        setFormData((prev) => ({ ...prev, time: "" }));
        setSelectedSlotPrice(0);
      };

      fetchSlots();
    }
  }, [formData.date, branchId]);

  // Calculate which days have available slots
  const availableDays = useMemo(() => {
    const daysSet = new Set<string>();
    availableSlots.forEach((slot) => {
      slot.daysOfWeek.forEach((day) => daysSet.add(day));
    });
    return Array.from(daysSet);
  }, [availableSlots]);

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const handleTimeSlotChange = (value: string) => {
    setFormData((prev) => ({ ...prev, time: value }));
    const slot = availableSlots.find((s) => s.id === value);
    setSelectedSlotPrice(slot?.pricePerPerson || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.date ||
      !formData.time ||
      !formData.guests
    ) {
      // toast({
      //   title: "Missing Information",
      //   description: "Please fill in all required fields",
      //   variant: "destructive",
      // });
      return;
    }

    setIsPending(true);

    try {
      const result = await createReservation({
        branchId,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone || undefined,
        date: formData.date,
        time: formData.time,
        guests: Number.parseInt(formData.guests),
        timeSlotId: formData.time,
        dietaryRestrictions: formData.dietaryRestrictions || undefined,
        accessibilityNeeds: formData.accessibilityNeeds || undefined,
        notes: formData.notes || undefined,
        createdBy: "WEB",
      });

      if (result.success) {
        // toast({
        //   title: "Reservation Created",
        //   description: "Your reservation has been successfully created!",
        // });
        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          date: "",
          time: "",
          guests: "",
          dietaryRestrictions: "",
          accessibilityNeeds: "",
          notes: "",
        });
        setSelectedSlotPrice(0);
      } else {
        // toast({
        //   title: "Error",
        //   description: result.error || "Failed to create reservation",
        //   variant: "destructive",
        // });
      }
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: "An unexpected error occurred",
      //   variant: "destructive",
      // });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nombre completo *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Jerry Seinfeld"
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="email@ejemplo.com"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="phone">Telefono</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, phone: e.target.value }))
          }
          placeholder="(+54) 123-4567"
        />
      </div>
      <div>
        <Label htmlFor="date">Fecha *</Label>
        <WeekDatePicker
          value={formData.date}
          onChange={(date) => setFormData((prev) => ({ ...prev, date: date }))}
          availableDays={availableDays}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="time">Turno *</Label>
          <Select
            value={formData.time}
            onValueChange={handleTimeSlotChange}
            disabled={!formData.date}
            required
          >
            <SelectTrigger>
              <SelectValue
                placeholder={formData.date ? "Turno" : "Selecciona turno"}
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
          {selectedSlotPrice > 0 && formData.guests && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <p className="text-xs text-green-800">
                <strong>Precio de la reserva:</strong> ${selectedSlotPrice} ×{" "}
                {formData.guests} personas = $
                {selectedSlotPrice * Number.parseInt(formData.guests)}
              </p>
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="guests">Personas *</Label>
          <Select
            value={formData.guests}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, guests: value }))
            }
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Personas" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? "Persona" : "Personas"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="dietary">Restricciones alimentarias (opcional)</Label>
        <Input
          id="dietary"
          value={formData.dietaryRestrictions}
          onChange={(e) =>
            setFormData((prev) => ({
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
        <Label htmlFor="accessibility">Accesibilidad (Opcional)</Label>
        <Input
          id="accessibility"
          value={formData.accessibilityNeeds}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              accessibilityNeeds: e.target.value,
            }))
          }
          placeholder="ej, Silla de ruedas, Planta baja"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Ayudanos a prepararnos para tu visita.
        </p>
      </div>

      <div>
        <Label htmlFor="notes">Pedidos especialas / Notas (Opcional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Ocación especial, Cumpleaños, etc."
          rows={3}
        />
      </div>

      {selectedSlotPrice > 0 ? (
        <Button
          type="button"
          className="w-full bg-green-600 hover:bg-green-700"
          disabled={isPending}
          onClick={() => {
            // TODO: Connect to payment gateway
            console.log("Payment required:", {
              amount: selectedSlotPrice * Number.parseInt(formData.guests),
              guests: formData.guests,
              pricePerPerson: selectedSlotPrice,
            });
          }}
        >
          {isPending
            ? "Procesando pago..."
            : `Pagar reserva ($${
                selectedSlotPrice * Number.parseInt(formData.guests || "0")
              })`}
        </Button>
      ) : (
        <Button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700"
          disabled={isPending}
        >
          {isPending ? "Reservando..." : "Reservar mesa"}
        </Button>
      )}
    </form>
  );
}
