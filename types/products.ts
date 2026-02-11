/**
 * Product type returned by getAvailableProductsForOrder()
 * Used across dashboard and delivery ordering
 *
 * This is the single source of truth for product types in order flows.
 * All components should import this type instead of defining their own.
 */
export type OrderProduct = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: {
    name: string;
  } | null;
  price: number;
};
