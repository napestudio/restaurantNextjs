import { getMenus } from "@/actions/menus";
import { MenusClient } from "./components/menus-client";

export default async function MenusPage() {
  // TODO: Get restaurantId from user session/context
  const restaurantId = process.env.RESTAURANT_ID || "";

  const menus = await getMenus(restaurantId);

  return (
    <div className=" bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Menús</h1>
          <p className="mt-2 text-sm text-gray-600">
            Organiza tus productos en menús para presentar a tus clientes
          </p>
        </div>

        <MenusClient initialMenus={menus} restaurantId={restaurantId} />
      </main>
    </div>
  );
}
