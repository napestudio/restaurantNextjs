/**
 * Get the day of the week from a date string
 */
export function getDayOfWeek(dateString: string): string {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const date = new Date(dateString + "T00:00:00");
  return days[date.getDay()];
}

/**
 * Formats a 24-hour time string to 12-hour format with AM/PM
 */

export const formatTime = (date: Date | string): string => {
    const d = typeof date === "string" ? new Date(date) : date;
    const hours = d.getUTCHours();
    const minutes = d.getUTCMinutes();
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };