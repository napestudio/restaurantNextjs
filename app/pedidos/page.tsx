import {
  getDeliveryConfig,
  isDeliveryAvailable,
} from "@/actions/DeliveryConfig";
import { getProductsForDeliveryMenu } from "@/actions/Order";
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

  // Only show products the admin has explicitly added to the delivery menu.
  // If no menu is configured, products and sections remain empty.
  const menuResult = config.menuId
    ? await getProductsForDeliveryMenu(BRANCH_ID, config.menuId, OrderType.DELIVERY)
    : { products: [], sections: [] };

  const { products, sections } = menuResult;

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
      sections={sections}
      restaurantName={restaurant?.name ?? ""}
      whatsappUrl={whatsappUrl}
    />
  );
}
