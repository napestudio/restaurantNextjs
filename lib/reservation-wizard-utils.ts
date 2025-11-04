/**
 * Utility functions and types for the Reservation Wizard
 */

export interface WizardData {
  // Step 1
  guests: number;
  // Step 2
  date: string;
  // Step 3
  timeSlotId: string;
  // Step 4
  exactTime: string;
  // Step 5
  name: string;
  email: string;
  phone: string;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
  notes: string;
}

export interface TimeSlotBasic {
  id: string;
  name: string;
  daysOfWeek: string[];
}

export interface TimeSlotDetailed extends TimeSlotBasic {
  startTime: Date;
  endTime: Date;
  pricePerPerson: number;
  moreInfoUrl: string | null;
  notes: string | null;
  capacity: number;
  hasAvailability?: boolean;
}

export interface SelectedSlotDetails {
  name: string;
  pricePerPerson: number;
  moreInfoUrl: string | null;
  notes: string | null;
}

export const WIZARD_STEPS = [
  { title: "Personas", description: "¿Cuántos son?" },
  { title: "Fecha", description: "¿Cuándo?" },
  { title: "Turno", description: "¿A qué hora?" },
  { title: "Hora exacta", description: "Llegada precisa" },
  { title: "Datos", description: "Tu información" },
];

export const INITIAL_WIZARD_DATA: WizardData = {
  guests: 2,
  date: "",
  timeSlotId: "",
  exactTime: "",
  name: "",
  email: "",
  phone: "",
  dietaryRestrictions: "",
  accessibilityNeeds: "",
  notes: "",
};

/**
 * Validate wizard data for a specific step
 */
export function validateStep(step: number, data: WizardData): boolean {
  switch (step) {
    case 1:
      return data.guests >= 1;
    case 2:
      return data.date !== "";
    case 3:
      return data.timeSlotId !== "";
    case 4:
      return data.exactTime !== "";
    case 5:
      return (
        data.name !== "" && data.email !== "" && /\S+@\S+\.\S+/.test(data.email)
      );
    default:
      return false;
  }
}

/**
 * Format date for display in success screen
 */
export function formatReservationDate(date: string): string {
  return new Date(date).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format time for display in success screen
 */
export function formatReservationTime(exactTime: string): string {
  return new Date(exactTime).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
