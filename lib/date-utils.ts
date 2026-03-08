const TZ = "America/Argentina/Buenos_Aires";

/**
 * "07 mar 2026" — for date-only DB fields stored as UTC midnight (YYYY-MM-DDT00:00:00Z).
 * Extracts the YYYY-MM-DD portion to avoid UTC midnight shifting to the previous day in UTC-3.
 */
export function formatDateAR(isoString: string): string {
  const [year, month, day] = isoString.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

/**
 * "7 de marzo, 2026" — for date-only DB fields stored as UTC midnight.
 */
export function formatDateLongAR(isoString: string): string {
  const [year, month, day] = isoString.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

/**
 * "07 mar 2026" — for full UTC timestamps (e.g. createdAt).
 * Uses Argentina timezone to convert the UTC instant to local date.
 */
export function formatTimestampDateAR(isoString: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(isoString));
}

/** "20:00" — for full UTC timestamps. */
export function formatTimeAR(isoString: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(isoString));
}

/** "7 de marzo, 2026 20:30" — for full UTC timestamps. */
export function formatDateTimeAR(isoString: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(isoString));
}
