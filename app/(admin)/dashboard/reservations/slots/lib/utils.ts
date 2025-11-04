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

/**
 * Checks if two time ranges overlap
 * Times overlap if: startTime1 < endTime2 AND startTime2 < endTime1
 */
export function doTimesOverlap(
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string
): boolean {
  const s1 = typeof start1 === 'string' ? new Date(`1970-01-01T${start1}:00.000Z`) : start1;
  const e1 = typeof end1 === 'string' ? new Date(`1970-01-01T${end1}:00.000Z`) : end1;
  const s2 = typeof start2 === 'string' ? new Date(`1970-01-01T${start2}:00.000Z`) : start2;
  const e2 = typeof end2 === 'string' ? new Date(`1970-01-01T${end2}:00.000Z`) : end2;

  return s1 < e2 && s2 < e1;
}

/**
 * Checks if two arrays of days have any common days
 */
export function haveCommonDays(days1: string[], days2: string[]): boolean {
  return days1.some((day) => days2.includes(day));
}

/**
 * Checks if two time slots overlap (same day + overlapping times)
 */
export function doTimeSlotsOverlap(
  slot1: { startTime: Date | string; endTime: Date | string; daysOfWeek: string[] },
  slot2: { startTime: Date | string; endTime: Date | string; daysOfWeek: string[] }
): boolean {
  // Check if they share at least one common day
  if (!haveCommonDays(slot1.daysOfWeek, slot2.daysOfWeek)) {
    return false;
  }

  // Check if their time ranges overlap
  return doTimesOverlap(slot1.startTime, slot1.endTime, slot2.startTime, slot2.endTime);
}
