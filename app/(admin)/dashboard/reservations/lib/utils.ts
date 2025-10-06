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
export function formatTime(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = Number.parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}
