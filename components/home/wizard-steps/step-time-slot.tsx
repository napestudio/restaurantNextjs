"use client";

import { Clock, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface TimeSlot {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  pricePerPerson: number;
  moreInfoUrl: string | null;
  notes: string | null;
  hasAvailability?: boolean;
}

interface StepTimeSlotProps {
  availableSlots: TimeSlot[];
  selectedSlotId: string;
  guests: number;
  onSelect: (
    slotId: string,
    details: {
      name: string;
      pricePerPerson: number;
      moreInfoUrl: string | null;
      notes: string | null;
    }
  ) => void;
  isLoading: boolean;
}

export function StepTimeSlot({
  availableSlots,
  selectedSlotId,
  guests,
  onSelect,
  isLoading,
}: StepTimeSlotProps) {
  const formatTime = (date: Date): string => {
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const selectedSlot = availableSlots.find((s) => s.id === selectedSlotId);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        {/* <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-red-600" />
          </div>
        </div> */}
        <h2 className="text-2xl font-bold text-gray-900">Elegí un turno</h2>
        {/* <p className="text-gray-600">
          Selecciona el turno que mejor se ajuste a tus planes
        </p> */}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando turnos disponibles...</p>
        </div>
      ) : availableSlots.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">
            No hay turnos disponibles para esta fecha.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 py-4">
          {availableSlots.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            const isAvailable = slot.hasAvailability !== false;
            const totalPrice = slot.pricePerPerson * guests;

            return (
              <Card
                key={slot.id}
                className={cn(
                  "p-4 cursor-pointer text-left transition-all duration-200 hover:shadow-md",
                  {
                    "border-2 border-red-600 bg-red-50": isSelected,
                    "border-gray-200 hover:border-red-300": !isSelected,
                    "opacity-50 cursor-not-allowed": !isAvailable,
                  }
                )}
                onClick={() => {
                  if (isAvailable) {
                    onSelect(slot.id, {
                      name: slot.name,
                      pricePerPerson: slot.pricePerPerson,
                      moreInfoUrl: slot.moreInfoUrl,
                      notes: slot.notes,
                    });
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Clock
                        className={cn("w-5 h-5", {
                          "text-red-600": isSelected,
                          "text-gray-400": !isSelected,
                        })}
                      />
                      <div>
                        <p
                          className={cn("font-semibold text-lg", {
                            "text-red-900": isSelected,
                            "text-gray-900": !isSelected && isAvailable,
                            "text-gray-500": !isAvailable,
                          })}
                        >
                          {slot.name}
                        </p>
                        <p
                          className={cn("text-sm", {
                            "text-red-700": isSelected,
                            "text-gray-600": !isSelected && isAvailable,
                            "text-gray-400": !isAvailable,
                          })}
                        >
                          {formatTime(slot.startTime)} -{" "}
                          {formatTime(slot.endTime)}
                        </p>
                      </div>
                    </div>

                    {slot.notes && isAvailable && (
                      <p className="text-sm text-gray-600 mt-2 ml-8">
                        {slot.notes}
                      </p>
                    )}

                    {slot.moreInfoUrl && isAvailable && (
                      <Link
                        href={slot.moreInfoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2 ml-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Más información
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>

                  <div className="text-left">
                    {!isAvailable ? (
                      <span className="text-sm font-semibold text-red-600">
                        Completo
                      </span>
                    ) : slot.pricePerPerson > 0 ? (
                      <div>
                        <p
                          className={cn("text-sm font-semibold", {
                            "text-red-600": isSelected,
                            "text-green-600": !isSelected,
                          })}
                        >
                          ${totalPrice}
                        </p>
                        <p className="text-xs text-gray-500">
                          ${slot.pricePerPerson}/persona
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500"></span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedSlot && selectedSlot.pricePerPerson > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            <strong>Total a pagar:</strong> ${selectedSlot.pricePerPerson} ×{" "}
            {guests} personas = ${selectedSlot.pricePerPerson * guests}
          </p>
        </div>
      )}
    </div>
  );
}
