import { DAYS } from "./time-slots";

/**
 * Formats a 24-hour time string to 12-hour format with AM/PM
 */
export function formatTime(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
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
    return "Weekdays";
  if (days.length === 2 && days.includes("saturday") && days.includes("sunday"))
    return "Weekends";

  return days
    .map((day) => DAYS.find((d) => d.value === day)?.short)
    .filter(Boolean)
    .join(", ");
}
