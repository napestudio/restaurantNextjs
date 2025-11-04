"use client";

import { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { WIZARD_STEPS } from "@/lib/reservation-wizard-utils";
import { useWizardState } from "@/hooks/use-wizard-state";
import { useWizardData } from "@/hooks/use-wizard-data";
import { WizardSuccessScreen } from "./wizard-success-screen";

// Step Components
import { StepPartySize } from "./wizard-steps/step-party-size";
import { StepDateTime } from "./wizard-steps/step-date-time";
import { StepTimeSlot } from "./wizard-steps/step-time-slot";
import { StepExactTime } from "./wizard-steps/step-exact-time";
import { StepCustomerInfo } from "./wizard-steps/step-customer-info";

interface ReservationWizardProps {
  branchId: string;
}

export function ReservationWizard({ branchId }: ReservationWizardProps) {
  // Custom hooks for state management
  const {
    currentStep,
    wizardData,
    allTimeSlots,
    availableSlots,
    selectedSlotDetails,
    canProceed,
    setAllTimeSlots,
    setAvailableSlots,
    setSelectedSlotDetails,
    updateData,
    handleNext,
    handleBack,
    resetWizard,
  } = useWizardState();

  // Custom hook for data fetching
  const {
    isPending,
    isSuccess,
    fetchAllTimeSlots,
    fetchAvailableSlots,
    submitReservation,
    resetSuccess,
  } = useWizardData(branchId);

  // Fetch all time slots on mount
  useEffect(() => {
    fetchAllTimeSlots().then(setAllTimeSlots);
  }, [fetchAllTimeSlots, setAllTimeSlots]);

  // Handle step transitions with data fetching
  const handleNextWithFetch = useCallback(async () => {
    if (!canProceed) return;

    // Step 2 → Step 3: Fetch available time slots
    if (currentStep === 2) {
      const slots = await fetchAvailableSlots(
        wizardData.date,
        wizardData.guests
      );
      setAvailableSlots(slots);
    }

    handleNext();
  }, [
    canProceed,
    currentStep,
    wizardData.date,
    wizardData.guests,
    fetchAvailableSlots,
    setAvailableSlots,
    handleNext,
  ]);

  // Handle reservation submission
  const handleSubmit = useCallback(async () => {
    if (!canProceed) return;

    const result = await submitReservation(wizardData);

    if (!result.success) {
      alert(result.error);
    }
  }, [canProceed, wizardData, submitReservation]);

  // Handle reset - combines wizard state reset and success reset
  const handleReset = useCallback(() => {
    resetWizard();
    resetSuccess();
  }, [resetWizard, resetSuccess]);

  // Handle time slot selection
  const handleSelectTimeSlot = useCallback(
    (
      timeSlotId: string,
      slotDetails: {
        name: string;
        pricePerPerson: number;
        moreInfoUrl: string | null;
        notes: string | null;
      }
    ) => {
      updateData({ timeSlotId });
      setSelectedSlotDetails(slotDetails);
    },
    [updateData, setSelectedSlotDetails]
  );

  // Success Screen
  if (isSuccess) {
    return (
      <WizardSuccessScreen
        wizardData={wizardData}
        selectedSlotDetails={selectedSlotDetails}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Stepper */}
      {/* <Stepper steps={WIZARD_STEPS} currentStep={currentStep} /> */}

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
            onSelect={handleSelectTimeSlot}
            isLoading={isPending}
          />
        )}

        {currentStep === 4 && wizardData.timeSlotId && (
          <StepExactTime
            selectedSlot={
              availableSlots.find((s) => s.id === wizardData.timeSlotId)!
            }
            selectedDate={wizardData.date}
            value={wizardData.exactTime}
            onChange={(exactTime) => updateData({ exactTime })}
          />
        )}

        {currentStep === 5 && (
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

        {currentStep < WIZARD_STEPS.length ? (
          <Button
            onClick={handleNextWithFetch}
            disabled={!canProceed || isPending}
            className="bg-red-600 hover:bg-red-700"
            size="lg"
          >
            {isPending ? "Cargando..." : "Continuar"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed || isPending}
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
