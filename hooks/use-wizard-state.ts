import { useState, useCallback, useMemo } from "react";
import type {
  WizardData,
  SelectedSlotDetails,
  TimeSlotBasic,
  TimeSlotDetailed,
} from "@/lib/reservation-wizard-utils";
import { INITIAL_WIZARD_DATA, validateStep } from "@/lib/reservation-wizard-utils";

export function useWizardState() {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>(INITIAL_WIZARD_DATA);
  const [allTimeSlots, setAllTimeSlots] = useState<TimeSlotBasic[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlotDetailed[]>([]);
  const [selectedSlotDetails, setSelectedSlotDetails] =
    useState<SelectedSlotDetails | null>(null);

  // Update wizard data - memoized
  const updateData = useCallback((field: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...field }));
  }, []);

  // Validate current step - memoized
  const canProceed = useMemo(() => {
    return validateStep(currentStep, wizardData);
  }, [currentStep, wizardData]);

  // Navigation handlers - memoized
  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  // Reset wizard to initial state - memoized
  const resetWizard = useCallback(() => {
    setWizardData(INITIAL_WIZARD_DATA);
    setAvailableSlots([]);
    setSelectedSlotDetails(null);
    setCurrentStep(1);
  }, []);

  return {
    // State
    currentStep,
    wizardData,
    allTimeSlots,
    availableSlots,
    selectedSlotDetails,

    // Computed
    canProceed,

    // Setters
    setAllTimeSlots,
    setAvailableSlots,
    setSelectedSlotDetails,

    // Actions
    updateData,
    handleNext,
    handleBack,
    resetWizard,
  };
}
