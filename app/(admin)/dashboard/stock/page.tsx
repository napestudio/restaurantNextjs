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

  const summary =
    summaryResult.success && summaryResult.data ? summaryResult.data : null;
  const alerts =
    alertsResult.success && alertsResult.data ? alertsResult.data : [];

  // Data is already serialized by the server actions
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Stock</h1>
          <p className="mt-2 text-sm text-gray-600">
            Inventario y ajustes de stock
          </p>
        </div>

        <StockManagementClient
          branchId={branchId}
          initialSummary={summary}
          initialAlerts={alerts}
        />
      </main>
    </div>
  );
}
