import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";
import { getFiscalConfig } from "@/actions/FiscalConfig";
import { FiscalConfigClient } from "./fiscal-config-client";

export default async function FiscalConfigPage() {
  // Only admins can access fiscal config
  await requireRole(UserRole.ADMIN);

  const restaurantId = process.env.RESTAURANT_ID || "";

  // Fetch current fiscal configuration
  const result = await getFiscalConfig(restaurantId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Configuración Fiscal
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Configura los datos fiscales y credenciales AFIP para facturación electrónica
          </p>
        </div>

        <FiscalConfigClient
          initialConfig={result.data || null}
          restaurantId={restaurantId}
        />
      </div>
    </div>
  );
}
