/**
 * Check if a value is a Prisma Decimal (duck typing)
 */
function isDecimal(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  );
}

/**
 * Recursively serializes Prisma objects for client components.
 * Converts:
 * - Decimal -> number
 * - Date -> ISO string
 * - Nested objects and arrays are processed recursively
 */
export function serializeForClient<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Decimal (duck typing to avoid import issues)
  if (isDecimal(data)) {
    return (data as unknown as { toNumber: () => number }).toNumber() as T;
  }

  // Handle Date
  if (data instanceof Date) {
    return data.toISOString() as T;
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map((item) => serializeForClient(item)) as T;
  }

  // Handle Objects
  if (typeof data === "object") {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeForClient(value);
    }
    return serialized as T;
  }

  // Primitives (string, number, boolean) pass through
  return data;
}

/**
 * Type helper to convert Prisma types to serialized types
 * Decimal -> number
 * Date -> string
 */
export type Serialized<T> = T extends { toNumber: () => number }
  ? number
  : T extends Date
    ? string
    : T extends Array<infer U>
      ? Array<Serialized<U>>
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;
