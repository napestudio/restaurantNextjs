"use server";

import { prisma } from "@/lib/prisma";

/**
 * Mapping of category names to SKU prefixes
 * Spanish category names are used to match the existing system
 */
const CATEGORY_PREFIX_MAP: Record<string, string> = {
  "Entradas": "ENT",
  "Platos Principales": "PLA",
  "Postres": "POS",
  "Bebidas": "BEB",
};

/**
 * Default prefix for uncategorized products or unknown categories
 */
const DEFAULT_PREFIX = "SIN";

/**
 * Maximum number of retry attempts when generating a unique SKU
 */
const MAX_RETRIES = 10;

/**
 * Number of digits in the SKU sequential number (e.g., 3 = "001", "002", etc.)
 */
const SKU_NUMBER_PADDING = 3;

/**
 * Get category prefix for SKU generation
 *
 * @param restaurantId - The restaurant ID for category lookup
 * @param categoryId - Optional category ID
 * @returns Promise<string> - 3-letter category prefix or default "SIN"
 */
async function getCategoryPrefix(
  restaurantId: string,
  categoryId?: string | null
): Promise<string> {
  if (!categoryId) return DEFAULT_PREFIX;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { name: true },
  });

  if (!category) {
    console.warn(
      `[SKU Generator] Category ${categoryId} not found in restaurant ${restaurantId}, using default prefix "${DEFAULT_PREFIX}"`
    );
    return DEFAULT_PREFIX;
  }

  // Return mapped prefix or default if category name not in map
  const prefix = CATEGORY_PREFIX_MAP[category.name];
  if (!prefix) {
    console.warn(
      `[SKU Generator] No prefix mapping for category "${category.name}", using default prefix "${DEFAULT_PREFIX}"`
    );
    return DEFAULT_PREFIX;
  }

  return prefix;
}

/**
 * Generates a unique SKU for a product within a restaurant
 *
 * Format: [CATEGORY_PREFIX]-[SEQUENTIAL_NUMBER]
 * Examples: ENT-001, PLA-023, POS-005, BEB-012, SIN-099
 *
 * @param restaurantId - The restaurant ID for uniqueness scope
 * @param categoryId - Optional category ID for prefix generation
 * @returns Promise<string> - Generated unique SKU
 * @throws Error if unable to generate unique SKU after MAX_RETRIES attempts
 */
export async function generateProductSKU(
  restaurantId: string,
  categoryId?: string | null
): Promise<string> {
  const prefix = await getCategoryPrefix(restaurantId, categoryId);

  // Find highest existing number for this prefix
  const existingSkus = await prisma.product.findMany({
    where: {
      restaurantId,
      sku: { startsWith: `${prefix}-` },
    },
    select: { sku: true },
    orderBy: { sku: "desc" },
  });

  // Extract numbers and find max
  let maxNumber = 0;
  const numberRegex = new RegExp(`^${prefix}-(\\d+)$`);

  for (const { sku } of existingSkus) {
    if (sku) {
      const match = sku.match(numberRegex);
      if (match) {
        const number = parseInt(match[1], 10);
        if (!isNaN(number)) {
          maxNumber = Math.max(maxNumber, number);
        }
      }
    }
  }

  // Generate new SKU with collision retry
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const nextNumber = maxNumber + 1 + attempt;
    const candidate = `${prefix}-${nextNumber.toString().padStart(SKU_NUMBER_PADDING, "0")}`;

    // Paranoid check for collision (should be rare after finding max)
    const existing = await prisma.product.findFirst({
      where: {
        restaurantId,
        sku: candidate,
      },
    });

    if (!existing) {
      console.log(
        `[SKU Generator] Generated SKU "${candidate}" for restaurant ${restaurantId}`
      );
      return candidate;
    }

    console.warn(
      `[SKU Generator] Collision detected for SKU "${candidate}", retrying... (attempt ${attempt + 1}/${MAX_RETRIES})`
    );
  }

  throw new Error(
    `No se pudo generar SKU único después de ${MAX_RETRIES} intentos para el prefijo "${prefix}"`
  );
}
