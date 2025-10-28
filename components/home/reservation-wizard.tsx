"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { createReservation } from "@/actions/Reservation";
import { getAvailableTimeSlotsForDate, getTimeSlots } from "@/actions/TimeSlot";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

// Step Components
import { StepPartySize } from "./wizard-steps/step-party-size";
import { StepDateTime } from "./wizard-steps/step-date-time";
import { StepTimeSlot } from "./wizard-steps/step-time-slot";
import { StepCustomerInfo } from "./wizard-steps/step-customer-info";

interface ReservationWizardProps {
  branchId: string;
}

interface WizardData {
  // Step 1
  guests: number;
  // Step 2
  date: string;
  // Step 3
  timeSlotId: string;
  // Step 4
  name: string;
  email: string;
  phone: string;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
  notes: string;
}

export function ReservationWizard({ branchId }: ReservationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [wizardData, setWizardData] = useState<WizardData>({
    guests: 2,
    date: "",
    timeSlotId: "",
    name: "",
    email: "",
    phone: "",
    dietaryRestrictions: "",
    accessibilityNeeds: "",
    notes: "",
  });

  // All time slots (fetched on mount for showing available days)
  const [allTimeSlots, setAllTimeSlots] = useState<
    {
      id: string;
      name: string;
      daysOfWeek: string[];
    }[]
  >([]);

  // Available time slots for selected date (fetched when moving from Step 2 to Step 3)
  const [availableSlots, setAvailableSlots] = useState<
    {
      id: string;
      name: string;
      startTime: Date;
      endTime: Date;
      pricePerPerson: number;
      daysOfWeek: string[];
      moreInfoUrl: string | null;
      notes: string | null;
      capacity: number;
      hasAvailability?: boolean;
    }[]
  >([]);

  const [selectedSlotDetails, setSelectedSlotDetails] = useState<{
    name: string;
    pricePerPerson: number;
    moreInfoUrl: string | null;
    notes: string | null;
  } | null>(null);

  const steps = [
    { title: "Personas", description: "¿Cuántos son?" },
    { title: "Fecha", description: "¿Cuándo?" },
    { title: "Turno", description: "¿A qué hora?" },
    { title: "Datos", description: "Tu información" },
  ];

  // Fetch all time slots on mount to show available days in date picker
  useEffect(() => {
    const fetchAllSlots = async () => {
      const result = await getTimeSlots(branchId);
      if (result.success && result.data) {
        setAllTimeSlots(
          result.data.map((slot) => ({
            id: slot.id,
            name: slot.name,
            daysOfWeek: slot.daysOfWeek,
          }))
        );
      }
    };

    fetchAllSlots();
  }, [branchId]);

  // Update wizard data
  const updateData = (field: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...field }));
  };

  // Validate current step before proceeding
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return wizardData.guests >= 1;
      case 2:
        return wizardData.date !== "";
      case 3:
        return wizardData.timeSlotId !== "";
      case 4:
        return (
          wizardData.name !== "" &&
          wizardData.email !== "" &&
          /\S+@\S+\.\S+/.test(wizardData.email)
        );
      default:
        return false;
    }
  };

  // Handle step transitions
  const handleNext = async () => {
    if (!canProceed()) return;

    // Step 2 → Step 3: Fetch available time slots
    if (currentStep === 2) {
      setIsPending(true);
      try {
        console.log("Fetching time slots for:", {
          branchId,
          date: wizardData.date,
          guests: wizardData.guests,
        });

        const result = await getAvailableTimeSlotsForDate(
          branchId,
          wizardData.date,
          true, // includeAvailability
          wizardData.guests
        );

        console.log("Time slots result:", result);

        if (result.success && result.data) {
          console.log("Setting available slots:", result.data);
          setAvailableSlots(result.data);
        } else {
          console.log("No slots or error:", result.error);
          setAvailableSlots([]);
        }
      } catch (error) {
        console.error("Error fetching time slots:", error);
        setAvailableSlots([]);
      } finally {
        setIsPending(false);
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;

    setIsPending(true);
    try {
      const result = await createReservation({
        branchId,
        customerName: wizardData.name,
        customerEmail: wizardData.email,
        customerPhone: wizardData.phone || undefined,
        date: wizardData.date,
        time: wizardData.timeSlotId,
        guests: wizardData.guests,
        timeSlotId: wizardData.timeSlotId,
        dietaryRestrictions: wizardData.dietaryRestrictions || undefined,
        accessibilityNeeds: wizardData.accessibilityNeeds || undefined,
        notes: wizardData.notes || undefined,
        createdBy: "WEB",
      });

      if (result.success) {
        setIsSuccess(true);
      } else {
        alert(result.error || "Error al crear la reserva");
      }
    } catch (error) {
      console.error("Error creating reservation:", error);
      alert("Error inesperado al crear la reserva");
    } finally {
      setIsPending(false);
    }
  };

  const handleReset = () => {
    setWizardData({
      guests: 2,
      date: "",
      timeSlotId: "",
      name: "",
      email: "",
      phone: "",
      dietaryRestrictions: "",
      accessibilityNeeds: "",
      notes: "",
    });
    setAvailableSlots([]);
    setSelectedSlotDetails(null);
    setCurrentStep(1);
    setIsSuccess(false);
  };

  // Success Screen
  if (isSuccess) {
    return (
      <Card className="max-w-2xl mx-auto p-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="w-20 h-20 text-green-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Reserva Confirmada!
            </h2>
            <p className="text-gray-600">
              Tu reserva ha sido creada exitosamente.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 space-y-3 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Personas</p>
                <p className="font-semibold text-gray-900">
                  {wizardData.guests}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha</p>
                <p className="font-semibold text-gray-900">{wizardData.date}</p>
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
                <p className="font-semibold text-gray-900">
                  {wizardData.email}
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleReset}
            className="bg-red-600 hover:bg-red-700"
            size="lg"
          >
            Hacer otra reserva
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Stepper */}
      <Stepper steps={steps} currentStep={currentStep} />

      {/* Step Content */}
      <Card className="p-8">
        {currentStep === 1 && (
          <StepPartySize
            value={wizardData.guests}
            onChange={(guests) => updateData({ guests })}
          />
        )}

        {currentStep === 2 && (
          <StepDateTime
            value={wizardData.date}
            onChange={(date) => updateData({ date })}
            availableSlots={allTimeSlots}
          />
        )}

        {currentStep === 3 && (
          <StepTimeSlot
            availableSlots={availableSlots}
            selectedSlotId={wizardData.timeSlotId}
            guests={wizardData.guests}
            onSelect={(timeSlotId, slotDetails) => {
              updateData({ timeSlotId });
              setSelectedSlotDetails(slotDetails);
            }}
            isLoading={isPending}
          />
        )}

        {currentStep === 4 && (
          <StepCustomerInfo
            data={{
              name: wizardData.name,
              email: wizardData.email,
              phone: wizardData.phone,
              dietaryRestrictions: wizardData.dietaryRestrictions,
              accessibilityNeeds: wizardData.accessibilityNeeds,
              notes: wizardData.notes,
            }}
            onChange={(field) => updateData(field)}
            selectedSlotDetails={selectedSlotDetails}
            guests={wizardData.guests}
          />
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || isPending}
          size="lg"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atrás
        </Button>

        {currentStep < steps.length ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isPending}
            className="bg-red-600 hover:bg-red-700"
            size="lg"
          >
            {isPending ? "Cargando..." : "Continuar"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || isPending}
            className="bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {isPending ? "Reservando..." : "Confirmar Reserva"}
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
