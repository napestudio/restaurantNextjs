"use client";

import { Edit, Package, AlertTriangle } from "lucide-react";
import type { UnitType, WeightUnit, VolumeUnit, PriceType } from "@/app/generated/prisma";
import { getUnitLabel } from "../lib/units";

// Serialized types for client components
type SerializedProductPrice = {
  id: string;
  productOnBranchId: string;
  type: PriceType;
  price: number;
};

type SerializedProductOnBranch = {
  id: string;
  productId: string;
  branchId: string;
  stock: number;
  minStock: number | null;
  maxStock: number | null;
  lastRestocked: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  prices: SerializedProductPrice[];
};

type SerializedCategory = {
  id: string;
  name: string;
  order: number;
  restaurantId: string;
};

type MenuItemWithRelations = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sku: string | null;
  unitType: UnitType;
  weightUnit: WeightUnit | null;
  volumeUnit: VolumeUnit | null;
  minStockAlert: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  restaurantId: string;
  categoryId: string | null;
  category: SerializedCategory | null;
  branches: SerializedProductOnBranch[];
};

type MenuItemCardProps = {
  item: MenuItemWithRelations;
  branchId: string;
  onEdit: (item: MenuItemWithRelations) => void;
};

export function MenuItemCard({ item, branchId, onEdit }: MenuItemCardProps) {
  // Obtener datos de la sucursal actual
  const branchData = item.branches.find((b) => b.branchId === branchId);
  const stock = branchData ? branchData.stock : 0;
  const dineInPrice = branchData?.prices.find((p) => p.type === "DINE_IN");

  // Verificar si hay alerta de stock bajo
  const hasLowStock =
    item.minStockAlert && stock < item.minStockAlert;
  const isOutOfStock = stock === 0;

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden">
      {/* Imagen del producto */}
      <div className="relative h-48 bg-gray-200">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-400" />
          </div>
        )}

        {/* Badge de estado */}
        {isOutOfStock && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
            Sin Stock
          </div>
        )}
        {!isOutOfStock && hasLowStock && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Stock Bajo
          </div>
        )}

        {/* Categoría */}
        {item.category && (
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-gray-700">
            {item.category.name}
          </div>
        )}
      </div>

      {/* Información del producto */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">
              {item.name}
            </h3>
            {item.sku && (
              <p className="text-xs text-gray-500 mt-0.5">SKU: {item.sku}</p>
            )}
          </div>
          <button
            onClick={() => onEdit(item)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Editar producto"
          >
            <Edit className="w-5 h-5" />
          </button>
        </div>

        {item.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Stock y precio */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-500">Stock</div>
            <div className={`font-semibold ${
              isOutOfStock
                ? "text-red-600"
                : hasLowStock
                ? "text-yellow-600"
                : "text-gray-900"
            }`}>
              {stock} {getUnitLabel(item.unitType, item.weightUnit, item.volumeUnit)}
            </div>
          </div>

          {dineInPrice && (
            <div className="text-right">
              <div className="text-xs text-gray-500">Precio</div>
              <div className="font-semibold text-green-600">
                ${dineInPrice.price.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Alerta de stock mínimo */}
        {item.minStockAlert && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Alerta si &lt; {item.minStockAlert}{" "}
              {getUnitLabel(item.unitType, item.weightUnit, item.volumeUnit)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
