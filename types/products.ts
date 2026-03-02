import type { UnitType, WeightUnit, VolumeUnit, PriceType, ProductTag } from "@/app/generated/prisma";

// ─── Delivery menu section types ─────────────────────────────────────────────

export type DeliveryProduct = {
  productId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  tags: ProductTag[];
  trackStock: boolean;
  stock: number;
  isFeatured: boolean;
};

export type DeliveryGroup = {
  id: string;
  name: string;
  description: string | null;
  order: number;
  items: DeliveryProduct[];
};

export type DeliveryElement =
  | { type: "item"; order: number; data: DeliveryProduct }
  | { type: "group"; order: number; data: DeliveryGroup };

export type DeliverySection = {
  id: string;
  name: string;
  description: string | null;
  order: number;
  elements: DeliveryElement[];
};

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
  imageUrl: string | null;
  categoryId: string | null;
  category: {
    name: string;
  } | null;
  price: number;
  tags: ProductTag[];
  trackStock: boolean;
  stock: number;
};

export type CreateMenuItemInput = {
  name: string;
  description?: string;
  imageUrl?: string;
  sku?: string;
  unitType: UnitType;
  weightUnit?: WeightUnit;
  volumeUnit?: VolumeUnit;
  minStockAlert?: number;
  trackStock?: boolean;
  categoryId?: string;
  restaurantId: string;
  isActive?: boolean;
  tags?: ProductTag[];
};

export type UpdateMenuItemInput = {
  id: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  sku?: string;
  unitType?: UnitType;
  weightUnit?: WeightUnit;
  volumeUnit?: VolumeUnit;
  minStockAlert?: number;
  trackStock?: boolean;
  categoryId?: string;
  isActive?: boolean;
  tags?: ProductTag[];
};

export type SetProductBranchInput = {
  productId: string;
  branchId: string;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  isActive?: boolean;
  prices: {
    type: PriceType;
    price: number;
  }[];
};
