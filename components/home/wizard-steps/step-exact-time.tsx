"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeSlot {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
}

interface StepExactTimeProps {
  selectedSlot: TimeSlot;
  selectedDate: string;
  value: string;
  onChange: (exactTime: string) => void;
}

interface TimeInterval {
  value: string;
  label: string;
  isPast: boolean;
}

function generateFifteenMinuteIntervals(
  startTime: Date,
  endTime: Date,
  dateStr: string
): TimeInterval[] {
  const intervals: TimeInterval[] = [];
  const selectedDate = new Date(dateStr);
  const now = new Date();

  // Extract hours and minutes from slot times
  const startHour = startTime.getHours();
  const startMin = startTime.getMinutes();
  const endHour = endTime.getHours();
  const endMin = endTime.getMinutes();

  // Generate 15-min intervals
  let currentHour = startHour;
  let currentMin = startMin;

  while (
    currentHour < endHour ||
    (currentHour === endHour && currentMin < endMin)
  ) {
    const intervalTime = new Date(selectedDate);
    intervalTime.setHours(currentHour, currentMin, 0, 0);

    intervals.push({
      value: intervalTime.toISOString(),
      label: `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`,
      isPast: intervalTime < now,
    });

    // Increment by 15 minutes
    currentMin += 15;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour += 1;
    }
  }

  return intervals;
}

export function StepExactTime({
  selectedSlot,
  selectedDate,
  value,
  onChange,
}: StepExactTimeProps) {
  const intervals = generateFifteenMinuteIntervals(
    selectedSlot.startTime,
    selectedSlot.endTime,
    selectedDate
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          ¿A qué hora llegarás?
        </h2>
        <p className="text-gray-600">
          Turno seleccionado: <strong>{selectedSlot.name}</strong>
        </p>
        <p className="text-sm text-gray-500">
          Selecciona tu hora de llegada aproximada
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
        {intervals.map((interval) => (
          <Button
            key={interval.value}
            variant={value === interval.value ? "default" : "outline"}
            onClick={() => onChange(interval.value)}
            disabled={interval.isPast}
            className={cn(
              "h-16 text-lg font-semibold transition-all duration-200",
              {
                "bg-red-600 hover:bg-red-700 text-white":
                  value === interval.value,
                "hover:border-red-300 hover:bg-red-50":
                  value !== interval.value && !interval.isPast,
                "opacity-40 cursor-not-allowed": interval.isPast,
              }
            )}
          >
            {interval.label}
          </Button>
        ))}
      </div>

      {intervals.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No hay horarios disponibles para este turno.
          </p>
        </div>
      )}

      {value && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-sm text-green-800">
            <strong>Hora de llegada:</strong>{" "}
            {new Date(value).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
