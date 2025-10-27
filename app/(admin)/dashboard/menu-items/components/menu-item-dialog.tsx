"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { createMenuItem, updateMenuItem, setProductOnBranch } from "@/actions/menuItems";
import type { UnitType, WeightUnit, VolumeUnit, PriceType } from "@/app/generated/prisma";
import {
  UNIT_TYPE_OPTIONS,
  WEIGHT_UNIT_OPTIONS,
  VOLUME_UNIT_OPTIONS,
  PRICE_TYPE_OPTIONS,
} from "../lib/units";

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

type MenuItemDialogProps = {
  item: MenuItemWithRelations | null;
  categories: SerializedCategory[];
  restaurantId: string;
  branchId: string;
  onClose: () => void;
  onSuccess: () => void;
};

type FormData = {
  name: string;
  description: string;
  imageUrl: string;
  sku: string;
  unitType: UnitType;
  weightUnit: WeightUnit | "";
  volumeUnit: VolumeUnit | "";
  minStockAlert: string;
  categoryId: string;
  isActive: boolean;
  // Datos de sucursal
  stock: string;
  minStock: string;
  maxStock: string;
  prices: {
    dineIn: string;
    takeAway: string;
    delivery: string;
  };
};

export function MenuItemDialog({
  item,
  categories,
  restaurantId,
  branchId,
  onClose,
  onSuccess,
}: MenuItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<"basic" | "stock">("basic");

  // Obtener datos de la sucursal si estamos editando
  const branchData = item?.branches.find((b) => b.branchId === branchId);
  const existingPrices = {
    dineIn: branchData?.prices.find((p) => p.type === "DINE_IN"),
    takeAway: branchData?.prices.find((p) => p.type === "TAKE_AWAY"),
    delivery: branchData?.prices.find((p) => p.type === "DELIVERY"),
  };

  const [formData, setFormData] = useState<FormData>({
    name: item?.name ?? "",
    description: item?.description ?? "",
    imageUrl: item?.imageUrl ?? "",
    sku: item?.sku ?? "",
    unitType: item?.unitType ?? "UNIT",
    weightUnit: item?.weightUnit ?? "",
    volumeUnit: item?.volumeUnit ?? "",
    minStockAlert: item?.minStockAlert ? item.minStockAlert.toString() : "",
    categoryId: item?.categoryId ?? "",
    isActive: item?.isActive ?? true,
    stock: branchData?.stock ? branchData.stock.toString() : "0",
    minStock: branchData?.minStock ? branchData.minStock.toString() : "",
    maxStock: branchData?.maxStock ? branchData.maxStock.toString() : "",
    prices: {
      dineIn: existingPrices.dineIn?.price ? existingPrices.dineIn.price.toString() : "",
      takeAway: existingPrices.takeAway?.price ? existingPrices.takeAway.price.toString() : "",
      delivery: existingPrices.delivery?.price ? existingPrices.delivery.price.toString() : "",
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name.startsWith("price_")) {
      // Convert DINE_IN -> dineIn, TAKE_AWAY -> takeAway, DELIVERY -> delivery
      const priceTypeEnum = name.replace("price_", "");
      let priceTypeKey: keyof FormData["prices"];

      if (priceTypeEnum === "DINE_IN") {
        priceTypeKey = "dineIn";
      } else if (priceTypeEnum === "TAKE_AWAY") {
        priceTypeKey = "takeAway";
      } else {
        priceTypeKey = "delivery";
      }

      setFormData((prev) => ({
        ...prev,
        prices: { ...prev.prices, [priceTypeKey]: value },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleUnitTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnitType = e.target.value as UnitType;
    setFormData((prev) => ({
      ...prev,
      unitType: newUnitType,
      weightUnit: newUnitType === "WEIGHT" ? "KILOGRAM" : "",
      volumeUnit: newUnitType === "VOLUME" ? "LITER" : "",
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return "El nombre del producto es requerido";
    }

    if (formData.unitType === "WEIGHT" && !formData.weightUnit) {
      return "Debe seleccionar una unidad de peso";
    }

    if (formData.unitType === "VOLUME" && !formData.volumeUnit) {
      return "Debe seleccionar una unidad de volumen";
    }

    // Validar que al menos un precio esté definido
    if (!formData.prices.dineIn && !formData.prices.takeAway && !formData.prices.delivery) {
      return "Debe definir al menos un precio";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // 1. Crear o actualizar el producto
      let productId = item?.id;

      if (item) {
        // Actualizar producto existente
        const result = await updateMenuItem({
          id: item.id,
          name: formData.name,
          description: formData.description || undefined,
          imageUrl: formData.imageUrl || undefined,
          sku: formData.sku || undefined,
          unitType: formData.unitType,
          weightUnit: formData.weightUnit || undefined,
          volumeUnit: formData.volumeUnit || undefined,
          minStockAlert: formData.minStockAlert ? parseFloat(formData.minStockAlert) : undefined,
          categoryId: formData.categoryId || undefined,
          isActive: formData.isActive,
        });

        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        // Crear nuevo producto
        const result = await createMenuItem({
          name: formData.name,
          description: formData.description || undefined,
          imageUrl: formData.imageUrl || undefined,
          sku: formData.sku || undefined,
          unitType: formData.unitType,
          weightUnit: formData.weightUnit || undefined,
          volumeUnit: formData.volumeUnit || undefined,
          minStockAlert: formData.minStockAlert ? parseFloat(formData.minStockAlert) : undefined,
          categoryId: formData.categoryId || undefined,
          restaurantId,
          isActive: formData.isActive,
        });

        if (!result.success || !result.data) {
          throw new Error(result.error);
        }

        productId = result.data.id;
      }

      // 2. Configurar el producto en la sucursal con precios
      if (productId) {
        const prices = [];
        if (formData.prices.dineIn) {
          prices.push({ type: "DINE_IN" as const, price: parseFloat(formData.prices.dineIn) });
        }
        if (formData.prices.takeAway) {
          prices.push({ type: "TAKE_AWAY" as const, price: parseFloat(formData.prices.takeAway) });
        }
        if (formData.prices.delivery) {
          prices.push({ type: "DELIVERY" as const, price: parseFloat(formData.prices.delivery) });
        }

        const branchResult = await setProductOnBranch({
          productId,
          branchId,
          stock: parseFloat(formData.stock) || 0,
          minStock: formData.minStock ? parseFloat(formData.minStock) : undefined,
          maxStock: formData.maxStock ? parseFloat(formData.maxStock) : undefined,
          isActive: formData.isActive,
          prices,
        });

        if (!branchResult.success) {
          throw new Error(branchResult.error);
        }
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el producto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {item ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setCurrentTab("basic")}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              currentTab === "basic"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Información Básica
          </button>
          <button
            onClick={() => setCurrentTab("stock")}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              currentTab === "stock"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Stock y Precios
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Tab: Información Básica */}
            {currentTab === "basic" && (
              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Hamburguesa de carne"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción del producto..."
                  />
                </div>

                {/* SKU y Categoría */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Código único"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría
                    </label>
                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* URL de Imagen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de Imagen
                  </label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                </div>

                {/* Tipo de Unidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Unidad *
                  </label>
                  <select
                    name="unitType"
                    value={formData.unitType}
                    onChange={handleUnitTypeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {UNIT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unidad de Peso (si aplica) */}
                {formData.unitType === "WEIGHT" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidad de Peso *
                    </label>
                    <select
                      name="weightUnit"
                      value={formData.weightUnit}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {WEIGHT_UNIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Unidad de Volumen (si aplica) */}
                {formData.unitType === "VOLUME" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidad de Volumen *
                    </label>
                    <select
                      name="volumeUnit"
                      value={formData.volumeUnit}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {VOLUME_UNIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Alerta de Stock Mínimo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alerta de Stock Mínimo
                  </label>
                  <input
                    type="number"
                    name="minStockAlert"
                    value={formData.minStockAlert}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Cantidad mínima antes de alertar"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se mostrará una alerta cuando el stock esté por debajo de este valor
                  </p>
                </div>

                {/* Estado Activo */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Producto activo
                  </label>
                </div>
              </div>
            )}

            {/* Tab: Stock y Precios */}
            {currentTab === "stock" && (
              <div className="space-y-6">
                {/* Stock */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Control de Stock
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock Actual
                      </label>
                      <input
                        type="number"
                        name="stock"
                        value={formData.stock}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock Mínimo
                      </label>
                      <input
                        type="number"
                        name="minStock"
                        value={formData.minStock}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock Máximo
                      </label>
                      <input
                        type="number"
                        name="maxStock"
                        value={formData.maxStock}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Precios */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Precios por Tipo de Servicio
                  </h3>
                  <div className="space-y-4">
                    {PRICE_TYPE_OPTIONS.map((priceType) => {
                      // Map enum values to form keys
                      let priceKey: keyof typeof formData.prices;
                      if (priceType.value === "DINE_IN") {
                        priceKey = "dineIn";
                      } else if (priceType.value === "TAKE_AWAY") {
                        priceKey = "takeAway";
                      } else {
                        priceKey = "delivery";
                      }

                      return (
                        <div key={priceType.value}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {priceType.label}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                              $
                            </span>
                            <input
                              type="number"
                              name={`price_${priceType.value}`}
                              value={formData.prices[priceKey]}
                              onChange={handleChange}
                              step="0.01"
                              min="0"
                              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * Debe definir al menos un precio
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
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
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {item ? "Actualizar" : "Crear"} Producto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
