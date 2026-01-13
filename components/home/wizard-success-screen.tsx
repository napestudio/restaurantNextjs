import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import type { WizardData, SelectedSlotDetails } from "@/lib/reservation-wizard-utils";
import {
  formatReservationDate,
  formatReservationTime,
} from "@/lib/reservation-wizard-utils";

interface WizardSuccessScreenProps {
  wizardData: WizardData;
  selectedSlotDetails: SelectedSlotDetails | null;
  isSharedTableOnly?: boolean; // NEW
  onReset: () => void;
}

export const WizardSuccessScreen = memo(function WizardSuccessScreen({
  wizardData,
  selectedSlotDetails,
  isSharedTableOnly = false, // NEW
  onReset,
}: WizardSuccessScreenProps) {
  const isPaidReservation = selectedSlotDetails && selectedSlotDetails.pricePerPerson > 0;

  return (
    <Card className="max-w-2xl mx-auto p-8">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="w-20 h-20 text-green-600" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isPaidReservation ? "¡Reserva Pendiente!" : "¡Reserva Confirmada!"}
          </h2>
          <p className="text-gray-600">
            {isPaidReservation
              ? "Tu solicitud de reserva ha sido recibida."
              : "Tu reserva ha sido creada exitosamente."}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-6 space-y-3 text-left">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Personas</p>
              <p className="font-semibold text-gray-900">{wizardData.guests}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">Fecha y Hora</p>
              <p className="font-semibold text-gray-900">
                {formatReservationDate(wizardData.date)}
                {wizardData.exactTime && (
                  <span className="ml-2">
                    a las {formatReservationTime(wizardData.exactTime)}
                  </span>
                )}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">Turno</p>
              <p className="font-semibold text-gray-900">
                {selectedSlotDetails?.name}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">Nombre</p>
              <p className="font-semibold text-gray-900">{wizardData.name}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-semibold text-gray-900">{wizardData.email}</p>
            </div>
          </div>
        </div>
        {isPaidReservation && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
            <p className="text-sm text-amber-900">
              <strong>Importante:</strong> Tu reserva está pendiente de confirmación.
              El restaurante se pondrá en contacto contigo para coordinar el pago
              de <strong>${selectedSlotDetails.pricePerPerson * wizardData.guests}</strong>
              ({wizardData.guests} persona{wizardData.guests > 1 ? 's' : ''} × ${selectedSlotDetails.pricePerPerson}).
            </p>
          </div>
        )}
        {isSharedTableOnly && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm text-blue-900">
              <strong>Nota:</strong> Tu mesa puede ser compartida con otra reserva durante este turno.
            </p>
          </div>
        )}
        <Button
          onClick={onReset}
          className="bg-red-600 hover:bg-red-700"
          size="lg"
        >
          Hacer otra reserva
        </Button>
      </div>
    </Card>
  );
});
