import { getDeliveryConfig, getMenusForBranch } from "@/actions/DeliveryConfig";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";
import DeliveryConfigClient from "./delivery-config-client";

export default async function DeliveryConfigPage() {
  await requireRole(UserRole.ADMIN);

  const branchId = process.env.BRANCH_ID || "";

  if (!branchId) {
    return <p className="p-4 text-red-500">Error: Branch ID no configurado</p>;
  }

  // Fetch delivery config and available menus
  const [configResult, menusResult] = await Promise.all([
    getDeliveryConfig(branchId),
    getMenusForBranch(branchId),
  ]);

  const config = (configResult.success && configResult.data) ? configResult.data : null;
  const menus = (menusResult.success && menusResult.data) ? menusResult.data : [];

  return (
    <div className="bg-gray-50 w-full min-h-screen">
      <div className="px-4 sm:px-6 lg:px-8 py-16 w-full">
        <DeliveryConfigClient
          branchId={branchId}
          initialConfig={config}
          availableMenus={menus || []}
        />
      </div>
    </div>
  );
}
