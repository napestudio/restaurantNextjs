export function formatCurrency(
  amount: number,
  options?: Partial<Intl.NumberFormatOptions>,
): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
}
