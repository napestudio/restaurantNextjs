const TZ = "America/Argentina/Buenos_Aires";
const AR_OFFSET_MS = -3 * 60 * 60 * 1000; // UTC-3, no DST

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

// ─── Server-side helpers (safe to use on Vercel UTC) ─────────────────────────

/**
 * "YYYYMMDD" — AFIP/ARCA required date format, Argentina timezone.
 * Use for any invoice date sent to AFIP, including reference dates from DB.
 */
export function toAFIPDateAR(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ })
    .format(typeof date === "string" ? new Date(date) : date)
    .replace(/-/g, "");
}

/** "YYYY-MM-DD" string for today in Argentina. Use for filenames. */
export function todayStringAR(): string {
  const ar = new Date(Date.now() + AR_OFFSET_MS);
  return ar.toISOString().slice(0, 10);
}

/**
 * Day boundaries for Prisma timestamp fields (createdAt, openedAt, etc.).
 * Argentina midnight = 03:00 UTC.
 * Usage: `createdAt: { gte: start, lt: end }`
 */
export function todayBoundsAR(): { start: Date; end: Date } {
  const ar = new Date(Date.now() + AR_OFFSET_MS);
  const y = ar.getUTCFullYear(), m = ar.getUTCMonth(), d = ar.getUTCDate();
  return {
    start: new Date(Date.UTC(y, m, d, 3, 0, 0)),
    end: new Date(Date.UTC(y, m, d + 1, 3, 0, 0)),
  };
}

/**
 * Day boundaries for Prisma date-only fields (e.g. reservation.date),
 * stored as YYYY-MM-DDT00:00:00Z where YYYY-MM-DD = Argentina local date.
 * Usage: `date: { gte: start, lt: end }`
 */
export function todayBoundsARDate(): { start: Date; end: Date } {
  const ar = new Date(Date.now() + AR_OFFSET_MS);
  const y = ar.getUTCFullYear(), m = ar.getUTCMonth(), d = ar.getUTCDate();
  return {
    start: new Date(Date.UTC(y, m, d)),
    end: new Date(Date.UTC(y, m, d + 1)),
  };
}

/**
 * Convert a "YYYY-MM-DD" string from a UI date picker into UTC bounds
 * for Prisma timestamp queries. Usage: `createdAt: { gte: start, lt: end }`
 */
export function dateStringToTimestampBoundsAR(dateStr: string): {
  start: Date;
  end: Date;
} {
  const [y, m, d] = dateStr.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, d, 3, 0, 0)),
    end: new Date(Date.UTC(y, m - 1, d + 1, 3, 0, 0)),
  };
}

// ─── Ticket/receipt display helpers ──────────────────────────────────────────

/** "DD/MM/YYYY" — short date for thermal ticket headers, Argentina timezone. */
export function formatTicketDateAR(isoString: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(isoString));
}

/** "HH:MM:SS" — time with seconds for thermal ticket headers, Argentina timezone. */
export function formatTicketTimeAR(isoString: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(new Date(isoString));
}
