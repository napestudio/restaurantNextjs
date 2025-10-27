import { getBranchStockSummary, getLowStockAlerts } from "@/actions/stock";
import { StockManagementClient } from "./components/stock-management-client";

export default async function StockPage() {
  // TODO: Get branchId from user session/context
  const branchId = process.env.BRANCH_ID || "";

  // Fetch stock summary and low stock alerts
  const [summaryResult, alertsResult] = await Promise.all([
    getBranchStockSummary(branchId),
    getLowStockAlerts(branchId),
  ]);

  const summary = summaryResult.success && summaryResult.data ? summaryResult.data : null;
  const alerts = alertsResult.success && alertsResult.data ? alertsResult.data : [];

  // Serialize Decimal fields to numbers for client components
  const serializedSummary = summary
    ? {
        products: summary.products.map((product) => ({
          ...product,
          stock: Number(product.stock),
          minStock: product.minStock ? Number(product.minStock) : null,
          maxStock: product.maxStock ? Number(product.maxStock) : null,
          lastRestocked: product.lastRestocked
            ? product.lastRestocked.toISOString()
            : null,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString(),
          product: {
            ...product.product,
            minStockAlert: product.product.minStockAlert
              ? Number(product.product.minStockAlert)
              : null,
            createdAt: product.product.createdAt.toISOString(),
            updatedAt: product.product.updatedAt.toISOString(),
          },
          prices: product.prices.map((price) => ({
            ...price,
            price: Number(price.price),
          })),
        })),
        stats: summary.stats,
      }
    : null;

  const serializedAlerts = alerts.map((alert) => ({
    ...alert,
    stock: Number(alert.stock),
    minStock: alert.minStock ? Number(alert.minStock) : null,
    maxStock: alert.maxStock ? Number(alert.maxStock) : null,
    lastRestocked: alert.lastRestocked ? alert.lastRestocked.toISOString() : null,
    createdAt: alert.createdAt.toISOString(),
    updatedAt: alert.updatedAt.toISOString(),
    product: {
      ...alert.product,
      minStockAlert: alert.product.minStockAlert
        ? Number(alert.product.minStockAlert)
        : null,
      createdAt: alert.product.createdAt.toISOString(),
      updatedAt: alert.product.updatedAt.toISOString(),
    },
    prices: alert.prices.map((price) => ({
      ...price,
      price: Number(price.price),
    })),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Stock</h1>
          <p className="mt-2 text-sm text-gray-600">
            Controla el inventario y realiza ajustes de stock
          </p>
        </div>

        <StockManagementClient
          branchId={branchId}
          initialSummary={serializedSummary}
          initialAlerts={serializedAlerts}
        />
      </main>
    </div>
  );
}
