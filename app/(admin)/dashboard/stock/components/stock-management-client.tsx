"use client";

import { getBranchStockSummary, getLowStockAlerts } from "@/actions/stock";
import type {
  PriceType,
  UnitType,
  VolumeUnit,
  WeightUnit,
} from "@/app/generated/prisma";
import LoadingToast from "@/components/dashboard/loading-toast";
import { downloadCSV, generateCSV } from "@/lib/csv/csv-export";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
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
  trackStock: boolean;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Extract unique categories from products (before early return to satisfy Rules of Hooks)
  const categories = useMemo(() => {
    if (!summary) return [];
    const uniqueCategories = new Map<string, string>();
    summary.products.forEach((product) => {
      if (product.product.category) {
        uniqueCategories.set(
          product.product.category.id,
          product.product.category.name,
        );
      }
    });
    return Array.from(uniqueCategories.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [summary]);

  // Filtrar productos según la vista seleccionada, búsqueda y categoría
  const filteredProducts = useMemo(() => {
    if (!summary) return [];
    return summary.products.filter((product) => {
      const stock = product.stock;
      const minAlert = product.product.minStockAlert;
      const trackStock = product.product.trackStock;

      // Filter by stock status
      if (filterView === "out") {
        if (!(trackStock && stock === 0)) return false;
      } else if (filterView === "low") {
        if (!(trackStock && minAlert && stock < minAlert && stock > 0))
          return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.product.name.toLowerCase().includes(query);
        const matchesSKU = product.product.sku?.toLowerCase().includes(query);
        if (!matchesName && !matchesSKU) return false;
      }

      // Filter by category
      if (selectedCategory !== "all") {
        if (product.product.categoryId !== selectedCategory) return false;
      }

      return true;
    });
  }, [summary, filterView, searchQuery, selectedCategory]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = useMemo(
    () => filteredProducts.slice(startIndex, endIndex),
    [filteredProducts, startIndex, endIndex]
  );

  // Reset to page 1 when filters change
  const resetPagination = () => setCurrentPage(1);

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

  const handleExportCSV = () => {
    const csv = generateCSV(filteredProducts, [
      {
        header: "Producto",
        accessor: (row) => row.product.name,
      },
      {
        header: "SKU",
        accessor: (row) => row.product.sku || "",
      },
      {
        header: "Categoría",
        accessor: (row) => row.product.category?.name || "Sin categoría",
      },
      {
        header: "Stock Actual",
        accessor: (row) =>
          row.product.trackStock
            ? formatStock(
                row.stock,
                row.product.unitType,
                row.product.weightUnit,
                row.product.volumeUnit,
              )
            : "N/A",
      },
      {
        header: "Alerta Stock Mínimo",
        accessor: (row) =>
          row.product.trackStock && row.product.minStockAlert
            ? formatStock(
                row.product.minStockAlert,
                row.product.unitType,
                row.product.weightUnit,
                row.product.volumeUnit,
              )
            : "-",
      },
      {
        header: "Precio Comedor",
        accessor: (row) => {
          const price = row.prices.find((p) => p.type === "DINE_IN");
          return price ? price.price.toFixed(2) : "-";
        },
      },
      {
        header: "Precio Para Llevar",
        accessor: (row) => {
          const price = row.prices.find((p) => p.type === "TAKE_AWAY");
          return price ? price.price.toFixed(2) : "-";
        },
      },
      {
        header: "Precio Delivery",
        accessor: (row) => {
          const price = row.prices.find((p) => p.type === "DELIVERY");
          return price ? price.price.toFixed(2) : "-";
        },
      },
      {
        header: "Seguimiento de Stock",
        accessor: (row) => (row.product.trackStock ? "Sí" : "No"),
      },
      {
        header: "Estado",
        accessor: (row) => (row.isActive ? "Activo" : "Inactivo"),
      },
    ]);

    const date = new Date().toISOString().split("T")[0];
    downloadCSV(csv, `stock-${date}.csv`);
  };

  return (
    <div className="space-y-6 relative">
      {/* Loading overlay durante refetch */}
      {isPending && <LoadingToast />}

      {/* Estadísticas */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </div> */}

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

      {/* Búsqueda, Filtros y Exportar */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                resetPagination();
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              resetPagination();
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {/* Export button */}
          <button
            onClick={handleExportCSV}
            disabled={filteredProducts.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Exportar CSV
          </button>
        </div>

        {/* Stock status filter buttons and items per page */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFilterView("all");
                resetPagination();
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterView === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => {
                setFilterView("low");
                resetPagination();
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterView === "low"
                  ? "bg-yellow-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Stock Bajo ({stats.lowStockCount})
            </button>
            <button
              onClick={() => {
                setFilterView("out");
                resetPagination();
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterView === "out"
                  ? "bg-red-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Sin Stock ({stats.outOfStockCount})
            </button>
          </div>

          {/* Items per page selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Mostrar:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                resetPagination();
              }}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-600">por página</span>
          </div>
        </div>

        {/* Results count */}
        {(searchQuery || selectedCategory !== "all") && (
          <div className="text-sm text-gray-600">
            Mostrando {filteredProducts.length} de {products.length} productos
          </div>
        )}
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
                  Alerta Stock
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
              {paginatedProducts.map((product) => {
                const stock = product.stock;
                const minAlert = product.product.minStockAlert;
                const trackStock = product.product.trackStock;
                const isLowStock =
                  trackStock && minAlert && stock < minAlert && stock > 0;
                const isOutOfStock = trackStock && stock === 0;
                const isAlwaysAvailable = !trackStock;
                const dineInPrice = product.prices.find(
                  (p) => p.type === "DINE_IN",
                );

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
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
                        {isAlwaysAvailable && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Siempre Disponible
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {product.product.category?.name || "Sin categoría"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {isAlwaysAvailable ? (
                        <span className="font-semibold text-green-600">
                          N/A
                        </span>
                      ) : (
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
                            product.product.volumeUnit,
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                      {isAlwaysAvailable
                        ? "-"
                        : product.product.minStockAlert
                          ? formatStock(
                              product.product.minStockAlert,
                              product.product.unitType,
                              product.product.weightUnit,
                              product.product.volumeUnit,
                            )
                          : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {dineInPrice ? `$${dineInPrice.price.toFixed(2)}` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {trackStock ? (
                        <button
                          onClick={() => handleAdjustStock(product)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Ajustar
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          No requiere ajuste
                        </span>
                      )}
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

        {/* Pagination controls */}
        {filteredProducts.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {startIndex + 1} a{" "}
                {Math.min(endIndex, filteredProducts.length)} de{" "}
                {filteredProducts.length} productos
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first page, last page, current page, and pages around current
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
                      const showEllipsisBefore =
                        index > 0 && page - array[index - 1] > 1;

                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsisBefore && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === page
                                ? "bg-blue-600 text-white"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
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
