"use client";

import type {
  PriceType,
  UnitType,
  VolumeUnit,
  WeightUnit,
} from "@/app/generated/prisma";
import { AlertTriangle, Package, RefreshCw, TrendingDown } from "lucide-react";
import { useState, useTransition } from "react";
import { getBranchStockSummary, getLowStockAlerts } from "@/actions/stock";
import { formatStock } from "../../menu-items/lib/units";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";

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

type SerializedProductPrice = {
  id: string;
  productOnBranchId: string;
  type: PriceType;
  price: number;
};

type ProductOnBranchWithRelations = {
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
  prices: SerializedProductPrice[];
};

type StockSummary = {
  products: ProductOnBranchWithRelations[];
  stats: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalStockValue: number;
  };
};

type StockManagementClientProps = {
  branchId: string;
  initialSummary: StockSummary | null;
  initialAlerts: ProductOnBranchWithRelations[];
};

export function StockManagementClient({
  branchId,
  initialSummary,
  initialAlerts,
}: StockManagementClientProps) {
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductOnBranchWithRelations | null>(null);
  const [filterView, setFilterView] = useState<"all" | "low" | "out">("all");
  const [summary, setSummary] = useState<StockSummary | null>(initialSummary);
  const [alerts, setAlerts] =
    useState<ProductOnBranchWithRelations[]>(initialAlerts);
  const [isPending, startTransition] = useTransition();

  if (!summary) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay datos de stock disponibles
        </h3>
        <p className="text-gray-500">Comienza agregando productos al menú</p>
      </div>
    );
  }

  const { products, stats } = summary;

  // Filtrar productos según la vista seleccionada
  const filteredProducts = products.filter((product) => {
    const stock = product.stock;
    const minAlert = product.product.minStockAlert;

    if (filterView === "out") {
      return stock === 0;
    } else if (filterView === "low") {
      return minAlert && stock < minAlert && stock > 0;
    }
    return true;
  });

  const handleAdjustStock = (product: ProductOnBranchWithRelations) => {
    setSelectedProduct(product);
    setShowAdjustmentDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAdjustmentDialog(false);
    setSelectedProduct(null);
  };

  const handleSuccess = () => {
    // Refetch data using branchId for better performance and UX
    startTransition(async () => {
      const [summaryResult, alertsResult] = await Promise.all([
        getBranchStockSummary(branchId),
        getLowStockAlerts(branchId),
      ]);

      // Data is already serialized by the server actions
      if (summaryResult.success && summaryResult.data) {
        setSummary(summaryResult.data);
      }

      if (alertsResult.success && alertsResult.data) {
        setAlerts(alertsResult.data);
      }
    });
  };

  return (
    <div className="space-y-6 relative">
      {/* Loading overlay durante refetch */}
      {isPending && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-gray-700">
              Actualizando datos...
            </p>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total de Productos</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.totalProducts}
              </p>
            </div>
            <Package className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Stock Bajo</p>
              <p className="text-3xl font-bold text-yellow-600">
                {stats.lowStockCount}
              </p>
            </div>
            <AlertTriangle className="w-12 h-12 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Sin Stock</p>
              <p className="text-3xl font-bold text-red-600">
                {stats.outOfStockCount}
              </p>
            </div>
            <TrendingDown className="w-12 h-12 text-red-500" />
          </div>
        </div>
      </div>

      {/* Alertas de Stock Bajo */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">
                Productos con Stock Bajo
              </h3>
              <p className="text-sm text-yellow-800 mb-2">
                Los siguientes productos necesitan reabastecimiento:
              </p>
              <ul className="text-sm text-yellow-800 space-y-1">
                {alerts.slice(0, 5).map((alert) => (
                  <li key={alert.id}>
                    <strong>{alert.product.name}</strong>:{" "}
                    {alert.stock.toFixed(2)} (mínimo:{" "}
                    {alert.product.minStockAlert?.toFixed(2) ?? "N/A"})
                  </li>
                ))}
              </ul>
              {alerts.length > 5 && (
                <p className="text-xs text-yellow-700 mt-2">
                  Y {alerts.length - 5} productos más...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterView("all")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterView === "all"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Todos ({products.length})
        </button>
        <button
          onClick={() => setFilterView("low")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterView === "low"
              ? "bg-yellow-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Stock Bajo ({stats.lowStockCount})
        </button>
        <button
          onClick={() => setFilterView("out")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterView === "out"
              ? "bg-red-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Sin Stock ({stats.outOfStockCount})
        </button>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Actual
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Mínimo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const stock = product.stock;
                const minAlert = product.product.minStockAlert;
                const isLowStock = minAlert && stock < minAlert && stock > 0;
                const isOutOfStock = stock === 0;
                const dineInPrice = product.prices.find(
                  (p) => p.type === "DINE_IN"
                );

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="font-medium text-gray-900">
                            {product.product.name}
                          </div>
                          {product.product.sku && (
                            <div className="text-xs text-gray-500">
                              SKU: {product.product.sku}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {product.product.category?.name || "Sin categoría"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`font-semibold ${
                          isOutOfStock
                            ? "text-red-600"
                            : isLowStock
                            ? "text-yellow-600"
                            : "text-gray-900"
                        }`}
                      >
                        {formatStock(
                          stock,
                          product.product.unitType,
                          product.product.weightUnit,
                          product.product.volumeUnit
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                      {product.minStock
                        ? formatStock(
                            product.minStock,
                            product.product.unitType,
                            product.product.weightUnit,
                            product.product.volumeUnit
                          )
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {dineInPrice ? `$${dineInPrice.price.toFixed(2)}` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleAdjustStock(product)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Ajustar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No hay productos en esta categoría</p>
          </div>
        )}
      </div>

      {/* Diálogo de ajuste de stock */}
      {showAdjustmentDialog && selectedProduct && (
        <StockAdjustmentDialog
          productOnBranch={selectedProduct}
          onClose={handleCloseDialog}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
