"use client";

import { Edit, AlertTriangle, Trash2 } from "lucide-react";
import type {
  UnitType,
  WeightUnit,
  VolumeUnit,
  PriceType,
} from "@/app/generated/prisma";
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
  trackStock: boolean;
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
  onDelete: (item: MenuItemWithRelations) => void;
};

export function MenuItemCard({
  item,
  branchId,
  onEdit,
  onDelete,
}: MenuItemCardProps) {
  // Obtener datos de la sucursal actual
  const branchData = item.branches.find((b) => b.branchId === branchId);
  const stock = branchData ? branchData.stock : 0;
  const dineInPrice = branchData?.prices.find((p) => p.type === "DINE_IN");

  // Verificar si hay alerta de stock bajo (solo para productos con trackStock = true)
  const hasLowStock =
    item.trackStock && item.minStockAlert && stock < item.minStockAlert;
  const isOutOfStock = item.trackStock && stock === 0;
  const isAlwaysAvailable = !item.trackStock;

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Información principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-gray-900 text-base truncate">
              {item.name}
            </h3>

            {/* Badges de estado */}
            {isAlwaysAvailable && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Siempre Disponible
              </span>
            )}
            {!isAlwaysAvailable && isOutOfStock && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                Sin Stock
              </span>
            )}
            {!isAlwaysAvailable && !isOutOfStock && hasLowStock && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                <AlertTriangle className="w-3 h-3" />
                Stock Bajo
              </span>
            )}
          </div>

          {item.category && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="inline-flex items-center">
                {item.category.name}
              </span>
            </div>
          )}

          {item.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-1">
              {item.description}
            </p>
          )}
        </div>

        {/* Stock */}
        <div className="text-right min-w-25">
          <div className="text-xs text-gray-500 mb-0.5">Stock</div>
          {isAlwaysAvailable ? (
            <div className="font-semibold text-sm text-green-600">N/A</div>
          ) : (
            <div
              className={`font-semibold text-sm ${
                isOutOfStock
                  ? "text-red-600"
                  : hasLowStock
                  ? "text-yellow-600"
                  : "text-gray-900"
              }`}
            >
              {stock}{" "}
              {getUnitLabel(item.unitType, item.weightUnit, item.volumeUnit)}
            </div>
          )}
        </div>

        {/* Precio */}
        {dineInPrice && (
          <div className="text-right min-w-25">
            <div className="text-xs text-gray-500 mb-0.5">Precio</div>
            <div className="font-semibold text-sm text-green-600">
              ${dineInPrice.price.toFixed(2)}
            </div>
          </div>
        )}

        {/* Botón editar */}
        <button
          onClick={() => onEdit(item)}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Editar producto"
        >
          <Edit className="w-5 h-5" />
        </button>

        {/* Botón eliminar */}
        <button
          onClick={() => onDelete(item)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Eliminar producto"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
