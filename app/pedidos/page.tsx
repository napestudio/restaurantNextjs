import {
  getDeliveryConfig,
  isDeliveryAvailable,
} from "@/actions/DeliveryConfig";
import { getAvailableProductsForOrder } from "@/actions/Order";
import { getRestaurantByBranchId } from "@/actions/Restaurant";
import { OrderType } from "@/app/generated/prisma";
import { BRANCH_ID } from "@/lib/constants";
import { notFound } from "next/navigation";
import DeliveryPage from "./components/delivery-page-client";
import DeliveryClosedPage from "./components/delivery-closed-page";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  if (!BRANCH_ID) {
    return (
      <div className="min-h-svh bg-black text-white flex items-center justify-center p-4">
        <p className="text-red-500">Error: Branch ID no configurado</p>
      </div>
    );
  }

  // Fetch delivery config
  const configResult = await getDeliveryConfig(BRANCH_ID);

  if (!configResult.success || !configResult.data) {
    notFound();
  }

  const config = configResult.data;

  // Check real-time availability (service active + current time within a window)
  const availability = await isDeliveryAvailable(BRANCH_ID, new Date());

  if (!availability.available) {
    return (
      <DeliveryClosedPage
        reason={availability.reason}
        windows={config.deliveryWindows}
      />
    );
  }

  // Fetch products with delivery prices
  const productsResult = await getAvailableProductsForOrder(
    BRANCH_ID,
    OrderType.DELIVERY,
  );

  const products = productsResult || [];

  const restaurant = await getRestaurantByBranchId(BRANCH_ID);
  const phoneNumber = restaurant?.whatsappNumber || restaurant?.phone;
  const whatsappUrl = phoneNumber
    ? `https://api.whatsapp.com/send/?phone=${phoneNumber}&app_absent=0`
    : "";

  return (
    <DeliveryPage
      branchId={BRANCH_ID}
      config={config}
      products={products}
      restaurantName={restaurant?.name ?? ""}
      whatsappUrl={whatsappUrl}
    />
  );
}
