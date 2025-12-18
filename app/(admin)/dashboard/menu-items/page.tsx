import { getMenuItems, getCategories } from "@/actions/menuItems";
import { MenuItemsClient } from "./components/menu-items-client";

export default async function MenuItemsPage() {
  // TODO: Get restaurantId and branchId from user session/context
  const restaurantId = process.env.RESTAURANT_ID || "";
  const branchId = process.env.BRANCH_ID || "";

  // Fetch menu items and categories
  const [menuItemsResult, categoriesResult] = await Promise.all([
    getMenuItems(restaurantId),
    getCategories(restaurantId),
  ]);

  const menuItems =
    menuItemsResult.success && menuItemsResult.data ? menuItemsResult.data : [];
  const categories =
    categoriesResult.success && categoriesResult.data
      ? categoriesResult.data
      : [];

  // Data is already serialized by the server action
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="mt-2 text-sm text-gray-600">
            Productos, precios y stock
          </p>
        </div>

        <MenuItemsClient
          initialMenuItems={menuItems}
          categories={categories}
          restaurantId={restaurantId}
          branchId={branchId}
        />
      </main>
    </div>
  );
}
