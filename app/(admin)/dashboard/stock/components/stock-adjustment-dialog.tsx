"use client";

import { useState } from "react";
import { X, Plus, Minus, Package, Loader2 } from "lucide-react";
import { adjustStock } from "@/actions/stock";
import { formatStock, getUnitLabel } from "../../menu-items/lib/units";
import type { UnitType, WeightUnit, VolumeUnit } from "@/app/generated/prisma";

// Serialized types for client components
type SerializedCategory = {
  id: string;
  name: string;
  order: number;
  restaurantId: string;
};

type SerializedProduct = {
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
};

type ProductOnBranchWithProduct = {
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
  product: SerializedProduct;
};

type StockAdjustmentDialogProps = {
  productOnBranch: ProductOnBranchWithProduct;
  onClose: () => void;
  onSuccess: () => void;
};

type AdjustmentType = "add" | "subtract" | "set";

const REASON_OPTIONS = {
  add: [
    { value: "Compra", label: "Compra de inventario" },
    { value: "Devolución", label: "Devolución de cliente" },
    { value: "Ajuste positivo", label: "Ajuste de inventario (positivo)" },
    { value: "Corrección", label: "Corrección de error" },
  ],
  subtract: [
    { value: "Venta", label: "Venta" },
    { value: "Merma", label: "Merma o pérdida" },
    { value: "Ajuste negativo", label: "Ajuste de inventario (negativo)" },
    { value: "Uso interno", label: "Uso interno" },
    { value: "Corrección", label: "Corrección de error" },
  ],
  set: [
    { value: "Inventario físico", label: "Inventario físico" },
    { value: "Corrección", label: "Corrección de stock" },
  ],
};

export function StockAdjustmentDialog({
  productOnBranch,
  onClose,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [reference, setReference] = useState("");

  const currentStock = productOnBranch.stock;
  const unit = getUnitLabel(
    productOnBranch.product.unitType,
    productOnBranch.product.weightUnit,
    productOnBranch.product.volumeUnit
  );

  const calculateNewStock = (): number => {
    const qty = parseFloat(quantity) || 0;
    switch (adjustmentType) {
      case "add":
        return currentStock + qty;
      case "subtract":
        return currentStock - qty;
      case "set":
        return qty;
      default:
        return currentStock;
    }
  };

  const newStock = calculateNewStock();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!quantity || parseFloat(quantity) <= 0) {
      setError("Ingresa una cantidad válida");
      return;
    }

    if (!reason) {
      setError("Selecciona un motivo");
      return;
    }

    if (newStock < 0) {
      setError("El stock no puede ser negativo");
      return;
    }

    setLoading(true);

    try {
      const qty = parseFloat(quantity);
      let adjustmentQuantity: number;

      switch (adjustmentType) {
        case "add":
          adjustmentQuantity = qty;
          break;
        case "subtract":
          adjustmentQuantity = -qty;
          break;
        case "set":
          adjustmentQuantity = qty - currentStock;
          break;
        default:
          adjustmentQuantity = 0;
      }

      const result = await adjustStock({
        productOnBranchId: productOnBranch.id,
        quantity: adjustmentQuantity,
        reason,
        notes: notes || undefined,
        reference: reference || undefined,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al ajustar el stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Ajustar Stock
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {productOnBranch.product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Current Stock Display */}
        <div className="bg-blue-50 border-b border-blue-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-sm text-blue-600 font-medium">Stock Actual</div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatStock(
                    currentStock,
                    productOnBranch.product.unitType,
                    productOnBranch.product.weightUnit,
                    productOnBranch.product.volumeUnit
                  )}
                </div>
              </div>
            </div>

            {quantity && !isNaN(parseFloat(quantity)) && (
              <div className="text-right">
                <div className="text-sm text-gray-600 font-medium">Nuevo Stock</div>
                <div
                  className={`text-2xl font-bold ${
                    newStock < 0
                      ? "text-red-600"
                      : newStock > currentStock
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {formatStock(
                    newStock,
                    productOnBranch.product.unitType,
                    productOnBranch.product.weightUnit,
                    productOnBranch.product.volumeUnit
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Tipo de Ajuste */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Ajuste
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType("add")}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  adjustmentType === "add"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Agregar</span>
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType("subtract")}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  adjustmentType === "subtract"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <Minus className="w-5 h-5" />
                <span className="font-medium">Restar</span>
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType("set")}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  adjustmentType === "set"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <Package className="w-5 h-5" />
                <span className="font-medium">Establecer</span>
              </button>
            </div>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {adjustmentType === "set" ? "Nuevo Stock" : "Cantidad"} *
            </label>
            <div className="relative">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                step="0.01"
                min="0"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Ej: 10`}
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                {unit}
              </span>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecciona un motivo</option>
              {REASON_OPTIONS[adjustmentType].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Referencia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia (Opcional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Factura #123, Orden #456"
            />
            <p className="text-xs text-gray-500 mt-1">
              Número de factura, orden, o cualquier referencia
            </p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Información adicional sobre este ajuste..."
            />
          </div>

          {/* Preview del cambio */}
          {quantity && !isNaN(parseFloat(quantity)) && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Resumen del Ajuste
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Stock actual:</span>
                  <span className="font-medium">{currentStock.toFixed(2)} {unit}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    {adjustmentType === "add"
                      ? "Agregando:"
                      : adjustmentType === "subtract"
                      ? "Restando:"
                      : "Estableciendo:"}
                  </span>
                  <span className="font-medium">
                    {adjustmentType === "set" ? "" : adjustmentType === "add" ? "+" : "-"}
                    {parseFloat(quantity).toFixed(2)} {unit}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="font-semibold">Stock final:</span>
                  <span
                    className={`font-bold ${
                      newStock < 0
                        ? "text-red-600"
                        : newStock > currentStock
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {newStock.toFixed(2)} {unit}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || newStock < 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Ajustando...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  Confirmar Ajuste
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
