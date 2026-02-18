import type { UnitType, WeightUnit, VolumeUnit, PriceType } from "@/app/generated/prisma";

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
