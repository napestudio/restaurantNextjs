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

  // Serialize Decimal fields to numbers for client components
  const serializedMenuItems = menuItems.map((item) => ({
    ...item,
    minStockAlert: item.minStockAlert ? Number(item.minStockAlert) : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    branches: item.branches.map((branch) => ({
      ...branch,
      stock: Number(branch.stock),
      minStock: branch.minStock ? Number(branch.minStock) : null,
      maxStock: branch.maxStock ? Number(branch.maxStock) : null,
      lastRestocked: branch.lastRestocked ? branch.lastRestocked.toISOString() : null,
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
      prices: branch.prices.map((price) => ({
        ...price,
        price: Number(price.price),
      })),
    })),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Productos del Menú</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gestiona los productos, precios y stock de tu menú
          </p>
        </div>

        <MenuItemsClient
          initialMenuItems={serializedMenuItems}
          categories={categories}
          restaurantId={restaurantId}
          branchId={branchId}
        />
      </main>
    </div>
  );
}
