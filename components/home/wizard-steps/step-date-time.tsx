"use client";

import { WeekDatePicker } from "@/components/week-date-picker";
import { useMemo } from "react";

interface StepDateTimeProps {
  value: string;
  onChange: (value: string) => void;
  availableSlots: {
    daysOfWeek: string[];
  }[];
}

export function StepDateTime({
  value,
  onChange,
  availableSlots,
}: StepDateTimeProps) {
  // Calculate which days have available slots
  const availableDays = useMemo(() => {
    const daysSet = new Set<string>();
    availableSlots.forEach((slot) => {
      slot.daysOfWeek.forEach((day) => daysSet.add(day));
    });
    return Array.from(daysSet);
  }, [availableSlots]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        {/* <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Calendar className="w-8 h-8 text-red-600" />
          </div>
        </div> */}
        <h2 className="text-2xl font-bold text-gray-900">Elegí una fecha</h2>
        <p className="text-gray-600">Selecciona la fecha de tu visita</p>
      </div>

      <div className="flex justify-center pt-4 pb-12">
        <WeekDatePicker
          value={value}
          onChange={onChange}
          availableDays={availableDays}
        />
      </div>

      {/* {value && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Fecha seleccionada:{" "}
            <span className="font-semibold text-gray-900">
              {new Date(value + "T00:00:00").toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </p>
        </div>
      )} */}
    </div>
  );
}
