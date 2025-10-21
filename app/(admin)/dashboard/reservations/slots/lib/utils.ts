import { DAYS } from "./time-slots";

/**
 * Formats a 24-hour time string or Date to 12-hour format with AM/PM
 */
export function formatTime(time: string | Date): string {
  if (!time) return "";

  let timeString: string;

  // If it's a Date object, extract the time portion using UTC to avoid timezone issues
  if (time instanceof Date) {
    const hours = time.getUTCHours().toString().padStart(2, "0");
    const minutes = time.getUTCMinutes().toString().padStart(2, "0");
    timeString = `${hours}:${minutes}`;
  } else if (typeof time === 'string' && time.includes('T')) {
    // If it's an ISO string, extract just the time portion (HH:mm)
    timeString = time.substring(11, 16);
  } else {
    timeString = time;
  }

  const [hours, minutes] = timeString.split(":");
  const hour = Number.parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Converts an array of day values to a human-readable string
 */
export function getDayBadges(days: string[]): string {
  if (days.length === 7) return "Todos los días";
  if (
    days.length === 5 &&
    !days.includes("saturday") &&
    !days.includes("sunday")
  )
    return "Días de semana";
  if (days.length === 2 && days.includes("saturday") && days.includes("sunday"))
    return "Días de semana";

  return days
    .map((day) => DAYS.find((d) => d.value === day)?.short)
    .filter(Boolean)
    .join(", ");
}
