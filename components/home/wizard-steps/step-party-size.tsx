"use client";

import { PartySizePicker } from "@/components/ui/party-size-picker";

interface StepPartySizeProps {
  value: number;
  onChange: (value: number) => void;
}

export function StepPartySize({ value, onChange }: StepPartySizeProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">
          ¿Para cuántas personas?
        </h2>
        <p className="text-gray-600">
          Selecciona el número de personas para tu reserva
        </p>
      </div>

      <div className="flex justify-center py-8">
        <PartySizePicker
          value={value}
          onChange={onChange}
          min={1}
          max={20}
          className="scale-110"
        />
      </div>
    </div>
  );
}
