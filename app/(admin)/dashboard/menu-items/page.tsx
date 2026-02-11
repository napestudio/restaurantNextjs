import { getMenuItemsPaginated, getCategories } from "@/actions/menuItems";
import { MenuItemsClient } from "./components/menu-items-client";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";

type SearchParams = {
  page?: string;
  search?: string;
  category?: string;
  stockStatus?: string;
  unitType?: string;
  includeInactive?: string;
};

export default async function MenuItemsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(UserRole.ADMIN);

  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams;

  // TODO: Get restaurantId and branchId from user session/context
  const restaurantId = process.env.RESTAURANT_ID || "";
  const branchId = process.env.BRANCH_ID || "";

  // Parse filters from URL
  const page = parseInt(params.page || "1");
  const search = params.search;
  const categoryId = params.category || "all";
  const stockStatus = params.stockStatus || "all";
  const unitType = params.unitType || "all";
  const includeInactive = params.includeInactive === "true";

  // Fetch paginated menu items and categories
  const [productsResult, categoriesResult] = await Promise.all([
    getMenuItemsPaginated({
      restaurantId,
      branchId,
      page,
      pageSize: 20,
      search,
      categoryId,
      stockStatus,
      unitType,
      includeInactive,
    }),
    getCategories(restaurantId),
  ]);

  const menuItems =
    productsResult.success && productsResult.data?.products
      ? productsResult.data.products
      : [];
  const pagination =
    productsResult.success && productsResult.data?.pagination
      ? productsResult.data.pagination
      : { page: 1, pageSize: 20, totalPages: 0, totalCount: 0 };
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
          initialPagination={pagination}
          initialFilters={{
            search,
            category: categoryId,
            stockStatus,
            unitType,
            includeInactive,
          }}
          categories={categories}
          restaurantId={restaurantId}
          branchId={branchId}
        />
      </main>
    </div>
  );
}
