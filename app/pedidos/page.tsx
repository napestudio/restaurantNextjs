import { getDeliveryConfig } from "@/actions/DeliveryConfig";
import { getAvailableProductsForOrder } from "@/actions/Order";
import { OrderType } from "@/app/generated/prisma";
import { BRANCH_ID } from "@/lib/constants";
import { notFound } from "next/navigation";
import DeliveryPage from "./components/delivery-page-client";

export default async function PedidosPage() {
  if (!BRANCH_ID) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <p className="text-red-500">Error: Branch ID no configurado</p>
      </div>
    );
  }

  // Fetch delivery config
  const configResult = await getDeliveryConfig(BRANCH_ID);

  if (!configResult.success || !configResult.data?.isActive) {
    notFound();
  }

  const config = configResult.data;

  // Fetch products with delivery prices
  const productsResult = await getAvailableProductsForOrder(
    BRANCH_ID,
    OrderType.DELIVERY
  );

  const products = productsResult || [];

  return (
    <DeliveryPage
      branchId={BRANCH_ID}
      config={config}
      products={products}
    />
  );
}
