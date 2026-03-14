/**
 * Calculates the discount amount based on the discount value and type.
 * - PERCENTAGE: discountPercentage is treated as a percentage (0-100)
 * - FIXED: discountPercentage is treated as a fixed currency amount
 */
export function calculateDiscountAmount(
  subtotal: number,
  discountPercentage: number,
  discountType: "PERCENTAGE" | "FIXED" = "PERCENTAGE",
): number {
  if (discountType === "FIXED") {
    return Math.min(discountPercentage, subtotal);
  }
  return subtotal * (discountPercentage / 100);
}

/**
 * Returns a human-readable label for the discount.
 * E.g. "10%" or "$500.00"
 */
export function formatDiscountLabel(
  discountPercentage: number,
  discountType: "PERCENTAGE" | "FIXED" = "PERCENTAGE",
): string {
  if (discountType === "FIXED") {
    return `$${discountPercentage.toFixed(2)}`;
  }
  return `${discountPercentage}%`;
}
