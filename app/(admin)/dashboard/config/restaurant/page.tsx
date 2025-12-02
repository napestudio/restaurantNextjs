import { getRestaurant } from "@/actions/Restaurant";
import RestaurantConfigForm from "@/components/dashboard/restaurant-config-form";
import { redirect } from "next/navigation";

export default async function RestaurantConfigPage() {
  const restaurantId = process.env.RESTAURANT_ID || "";

  if (!restaurantId) {
    redirect("/dashboard");
  }

  const result = await getRestaurant(restaurantId);

  if (!result.success || !result.data) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            {result.error || "Error al cargar la información del restaurante"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración del Restaurante</h1>
        <p className="text-sm text-gray-600 mt-1">
          Administra la información de tu restaurante, dirección y redes sociales
        </p>
      </div>

      <RestaurantConfigForm restaurant={result.data} />
    </div>
  );
}
