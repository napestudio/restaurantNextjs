"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface StepCustomerInfoProps {
  data: {
    name: string;
    email: string;
    phone: string;
    dietaryRestrictions: string;
    accessibilityNeeds: string;
    notes: string;
  };
  onChange: (field: Record<string, string>) => void;
  selectedSlotDetails: {
    name: string;
    pricePerPerson: number;
  } | null;
  guests: number;
}

export function StepCustomerInfo({ data, onChange }: StepCustomerInfoProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Completá tus datos</h2>
        <p className="text-gray-600">
          Necesitamos esta información para confirmar tu reserva
        </p>
      </div>

      {/* Reservation Summary */}
      {/* {selectedSlotDetails && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 ">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Resumen de tu reserva:
          </p>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Turno:</strong> {selectedSlotDetails.name}
            </p>
            <p>
              <strong>Personas:</strong> {guests}
            </p>
            {selectedSlotDetails.pricePerPerson > 0 && (
              <p>
                <strong>Total:</strong> $
                {selectedSlotDetails.pricePerPerson * guests}
              </p>
            )}
          </div>
        </div>
      )} */}

      {/* Form Fields */}
      <div className="space-y-4 overflow-y-scroll md:overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">
              Nombre completo <span className="text-red-600">*</span>
            </Label>
            <Input
              id="name"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Jerry Seinfeld"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">
              Email <span className="text-red-600">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="email@ejemplo.com"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="(+54) 123-4567"
          />
        </div>

        <div>
          <Label htmlFor="dietary">Restricciones alimentarias (opcional)</Label>
          <Input
            id="dietary"
            value={data.dietaryRestrictions}
            onChange={(e) => onChange({ dietaryRestrictions: e.target.value })}
            placeholder="ej, Vegetarianismo, Celiaquia"
          />
          <p className="text-xs text-gray-500 mt-1">
            Ayúdanos a preparar una mejor experiencia para ti
          </p>
        </div>

        <div>
          <Label htmlFor="accessibility">Accesibilidad (opcional)</Label>
          <Input
            id="accessibility"
            value={data.accessibilityNeeds}
            onChange={(e) => onChange({ accessibilityNeeds: e.target.value })}
            placeholder="ej, Silla de ruedas, Planta baja"
          />
          <p className="text-xs text-gray-500 mt-1">
            Ayúdanos a prepararnos para tu visita
          </p>
        </div>

        <div>
          <Label htmlFor="notes">Pedidos especiales / Notas (opcional)</Label>
          <Textarea
            id="notes"
            value={data.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Ocasión especial, Cumpleaños, etc."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
