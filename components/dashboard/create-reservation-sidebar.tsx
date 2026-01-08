"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { ClientPicker } from "@/components/dashboard/client-picker";
import { CreateClientDialog } from "@/components/dashboard/create-client-dialog";
import { type ClientData } from "@/actions/clients";
import { X, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewReservation {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  exactTime: string;
  guests: number;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
  notes: string;
  status: string;
  clientId?: string;
}

interface TimeInterval {
  value: string;
  label: string;
  isPast: boolean;
}

interface CreateReservationSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (reservation: {
    name: string;
    email: string;
    phone: string;
    date: string;
    time: string;
    exactTime: string;
    guests: string;
    dietaryRestrictions: string;
    accessibilityNeeds: string;
    notes: string;
    status: string;
    clientId?: string;
  }) => void;
  timeSlots: TimeSlot[];
  branchId: string;
}

function generateFifteenMinuteIntervals(
  startTime: Date | string,
  endTime: Date | string,
  dateStr: string
): TimeInterval[] {
  const intervals: TimeInterval[] = [];
  const now = new Date();

  // Parse date string as local date (not UTC)
  const [year, month, day] = dateStr.split("-").map(Number);

  // Convert to Date if string (server actions serialize dates as ISO strings)
  const startDate = typeof startTime === "string" ? new Date(startTime) : startTime;
  const endDate = typeof endTime === "string" ? new Date(endTime) : endTime;

  // Extract hours and minutes from slot times using UTC
  const startHour = startDate.getUTCHours();
  const startMin = startDate.getUTCMinutes();
  let endHour = endDate.getUTCHours();
  const endMin = endDate.getUTCMinutes();

  // Handle slots that span midnight (e.g., 23:00 - 00:00)
  // If end hour is less than start hour, it means the slot crosses midnight
  if (endHour < startHour || (endHour === startHour && endMin <= startMin && endHour === 0)) {
    endHour = 24; // Treat as 24:00 for loop purposes
  }

  let currentHour = startHour;
  let currentMin = startMin;

  while (
    currentHour < endHour ||
    (currentHour === endHour && currentMin < endMin)
  ) {
    // Create date in local timezone
    const intervalTime = new Date(year, month - 1, day, currentHour, currentMin, 0, 0);

    intervals.push({
      value: intervalTime.toISOString(),
      label: `${currentHour.toString().padStart(2, "0")}:${currentMin
        .toString()
        .padStart(2, "0")}`,
      isPast: intervalTime < now,
    });

    currentMin += 15;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour += 1;
    }
  }

  return intervals;
}

export function CreateReservationSidebar({
  open,
  onOpenChange,
  onCreate,
  branchId,
}: CreateReservationSidebarProps) {
  const [newReservation, setNewReservation] = useState<NewReservation>({
    name: "",
    email: "",
    phone: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    exactTime: "",
    guests: 2,
    dietaryRestrictions: "",
    accessibilityNeeds: "",
    notes: "",
    status: "confirmed",
  });

  const [availableSlots, setAvailableSlots] = useState<
    {
      id: string;
      name?: string;
      startTime: Date | string;
      endTime: Date | string;
      pricePerPerson: number;
      daysOfWeek: string[];
    }[]
  >([]);
  const [selectedSlotPrice, setSelectedSlotPrice] = useState(0);

  // Client state
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

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
    if (
      !selectedDate ||
      selectedDate === lastFetchedRef.current ||
      isFetchingRef.current
    ) {
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
        setNewReservation((prev) => ({ ...prev, time: "", exactTime: "" }));
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

  // Get the selected time slot for time intervals
  const selectedSlot = useMemo(() => {
    return availableSlots.find((s) => s.id === newReservation.time);
  }, [availableSlots, newReservation.time]);

  // Generate time intervals for the selected slot
  const timeIntervals = useMemo(() => {
    if (!selectedSlot) return [];
    return generateFifteenMinuteIntervals(
      selectedSlot.startTime,
      selectedSlot.endTime,
      selectedDate
    );
  }, [selectedSlot, selectedDate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const clientName = selectedClient?.name || newReservation.name;
    const clientEmail = selectedClient?.email || newReservation.email;

    if (
      !clientName ||
      !newReservation.date ||
      !newReservation.time ||
      !newReservation.exactTime ||
      !newReservation.guests
    ) {
      return;
    }

    // Convert newReservation to the expected format and call onCreate
    onCreate({
      name: clientName,
      email: clientEmail,
      phone: selectedClient?.phone || newReservation.phone,
      date: newReservation.date,
      time: newReservation.time,
      exactTime: newReservation.exactTime,
      guests: newReservation.guests.toString(),
      dietaryRestrictions: newReservation.dietaryRestrictions,
      accessibilityNeeds: newReservation.accessibilityNeeds,
      notes: newReservation.notes,
      status: newReservation.status,
      clientId: selectedClient?.id,
    });

    // Reset form
    resetForm();
  };

  const resetForm = () => {
    const newDate = new Date().toISOString().split("T")[0];
    setNewReservation({
      name: "",
      email: "",
      phone: "",
      date: newDate,
      time: "",
      exactTime: "",
      guests: 2,
      dietaryRestrictions: "",
      accessibilityNeeds: "",
      notes: "",
      status: "confirmed",
    });
    setSelectedDate(newDate);
    setSelectedSlotPrice(0);
    setSelectedClient(null);
    setClientSearchQuery("");
    // Reset fetch tracking
    lastFetchedRef.current = "";
    isFetchingRef.current = false;
  };

  const handleTimeSlotChange = (value: string) => {
    setNewReservation((prev) => ({ ...prev, time: value, exactTime: "" }));
    const slot = availableSlots.find((s) => s.id === value);
    setSelectedSlotPrice(slot?.pricePerPerson || 0);
  };

  const handleExactTimeChange = (value: string) => {
    setNewReservation((prev) => ({ ...prev, exactTime: value }));
  };

  const handleClose = () => {
    if (newReservation.time || selectedClient) {
      if (
        confirm("¿Seguro que quieres cerrar? Perderás los datos ingresados.")
      ) {
        resetForm();
        onOpenChange(false);
      }
    } else {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleCreateNewClient = useCallback((searchQuery: string) => {
    setClientSearchQuery(searchQuery);
    setShowCreateClientDialog(true);
  }, []);

  const handleClientCreated = useCallback((client: ClientData) => {
    setSelectedClient(client);
    setShowCreateClientDialog(false);
  }, []);

  const handleSelectClient = useCallback((client: ClientData | null) => {
    setSelectedClient(client);
    if (client) {
      setNewReservation((prev) => ({
        ...prev,
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
      }));
    }
  }, []);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 h-full"
        onClick={handleClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-red-500 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Nueva Reserva</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-red-600"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleCreate} className="space-y-6">
            {/* Client Selection */}
            <div className="space-y-2">
              <ClientPicker
                branchId={branchId}
                selectedClient={selectedClient}
                onSelectClient={handleSelectClient}
                onCreateNew={handleCreateNewClient}
                label="Cliente"
              />
              {!selectedClient && (
                <p className="text-xs text-muted-foreground">
                  Busca un cliente existente o crea uno nuevo
                </p>
              )}
            </div>

            {/* Show selected client info */}
            {selectedClient && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-1">
                <h3 className="font-semibold text-sm text-green-900">
                  Cliente seleccionado
                </h3>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium">Nombre:</span>{" "}
                    {selectedClient.name}
                  </p>
                  {selectedClient.phone && (
                    <p>
                      <span className="font-medium">Teléfono:</span>{" "}
                      {selectedClient.phone}
                    </p>
                  )}
                  {selectedClient.email && (
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {selectedClient.email}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="new-date">Fecha</Label>
              <WeekDatePicker
                value={selectedDate}
                onChange={(date: string) => {
                  setSelectedDate(date);
                  setNewReservation((prev) => ({
                    ...prev,
                    date,
                    time: "",
                    exactTime: "",
                  }));
                }}
                availableDays={availableDays}
              />
            </div>

            {/* Time Slot Selection */}
            <div className="space-y-2">
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
                        ? "Seleccionar turno"
                        : "Selecciona una fecha primero"
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

            {/* Exact Time Selection (15-minute intervals) */}
            {selectedSlot && timeIntervals.length > 0 && (
              <div className="space-y-3">
                <Label>Hora de llegada</Label>
                <p className="text-xs text-muted-foreground">
                  Selecciona la hora exacta dentro del turno
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {timeIntervals.map((interval) => (
                    <Button
                      key={interval.value}
                      type="button"
                      variant={
                        newReservation.exactTime === interval.value
                          ? "default"
                          : "outline"
                      }
                      onClick={() => handleExactTimeChange(interval.value)}
                      disabled={interval.isPast}
                      className={cn(
                        "h-12 text-sm font-semibold transition-all duration-200",
                        {
                          "bg-red-600 hover:bg-red-700 text-white":
                            newReservation.exactTime === interval.value,
                          "hover:border-red-300 hover:bg-red-50":
                            newReservation.exactTime !== interval.value &&
                            !interval.isPast,
                          "opacity-40 cursor-not-allowed": interval.isPast,
                        }
                      )}
                    >
                      {interval.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Party Size */}
            <div className="space-y-2">
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

            {/* Dietary Restrictions */}
            <div className="space-y-2">
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
            </div>

            {/* Accessibility */}
            <div className="space-y-2">
              <Label htmlFor="new-accessibility">
                Accesibilidad (Opcional)
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
                placeholder="e.j., Silla de ruedas, prefiere abajo"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
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

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="new-notes">
                Pedidos especiales / Notas (Opcional)
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
                placeholder="Ocasión especial, Cumpleaños, etc."
                rows={3}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            className="flex-1 bg-red-600 hover:bg-red-700"
            disabled={
              !newReservation.time ||
              !newReservation.exactTime ||
              (!selectedClient && !newReservation.name)
            }
          >
            Reservar
          </Button>
        </div>
      </div>

      {/* Create Client Dialog */}
      <CreateClientDialog
        open={showCreateClientDialog}
        onOpenChange={setShowCreateClientDialog}
        branchId={branchId}
        onSuccess={handleClientCreated}
        initialName={clientSearchQuery}
      />
    </>
  );
}
