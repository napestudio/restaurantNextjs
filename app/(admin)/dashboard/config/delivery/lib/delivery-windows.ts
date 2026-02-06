// Delivery window types
export interface DeliveryWindow {
  id?: string;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  daysOfWeek: string[];
  maxOrders: number;
  isActive: boolean;
}

// Day configuration (reused from time-slots)
export const DAYS = [
  { value: "monday", label: "Lunes", short: "L" },
  { value: "tuesday", label: "Martes", short: "M" },
  { value: "wednesday", label: "Miércoles", short: "X" },
  { value: "thursday", label: "Jueves", short: "J" },
  { value: "friday", label: "Viernes", short: "V" },
  { value: "saturday", label: "Sábado", short: "S" },
  { value: "sunday", label: "Domingo", short: "D" },
] as const;

/**
 * Get human-readable day badges from array
 */
export function getDayBadges(days: string[]): string {
  if (days.length === 7) {
    return "Todos los días";
  }

  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const weekend = ["saturday", "sunday"];

  const hasAllWeekdays = weekdays.every((day) => days.includes(day));
  const hasAllWeekend = weekend.every((day) => days.includes(day));

  if (hasAllWeekdays && days.length === 5) {
    return "Días de semana";
  }

  if (hasAllWeekend && days.length === 2) {
    return "Fin de semana";
  }

  // Return short labels
  return days
    .map((day) => DAYS.find((d) => d.value === day)?.short || "")
    .filter(Boolean)
    .join(", ");
}

/**
 * Check if two day arrays have common days
 */
export function haveCommonDays(days1: string[], days2: string[]): boolean {
  return days1.some((day) => days2.includes(day));
}

/**
 * Check if two time ranges overlap
 */
export function doTimesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Convert times to minutes for comparison
  const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);

  // Check if ranges overlap
  return s1 < e2 && s2 < e1;
}

/**
 * Format time from ISO string to HH:mm
 */
export function formatTimeFromISO(isoString: string): string {
  const date = new Date(isoString);
  return date.toTimeString().slice(0, 5); // "HH:mm"
}

/**
 * Validate delivery window data
 */
export function validateDeliveryWindow(window: Partial<DeliveryWindow>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!window.name || window.name.trim() === "") {
    errors.push("El nombre es requerido");
  }

  if (!window.startTime) {
    errors.push("La hora de inicio es requerida");
  }

  if (!window.endTime) {
    errors.push("La hora de fin es requerida");
  }

  if (window.startTime && window.endTime && window.startTime >= window.endTime) {
    errors.push("La hora de fin debe ser posterior a la hora de inicio");
  }

  if (!window.daysOfWeek || window.daysOfWeek.length === 0) {
    errors.push("Debe seleccionar al menos un día");
  }

  if (window.maxOrders !== undefined && window.maxOrders < 1) {
    errors.push("El máximo de órdenes debe ser al menos 1");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
