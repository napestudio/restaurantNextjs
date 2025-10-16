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

export const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };