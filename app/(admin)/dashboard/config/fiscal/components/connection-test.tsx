"use client";

import { useState } from "react";
import { testFiscalConnection } from "@/actions/FiscalConfig";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Wifi } from "lucide-react";

interface ConnectionTestProps {
  restaurantId: string;
  isConfigured: boolean;
}

export function ConnectionTest({
  restaurantId,
  isConfigured,
}: ConnectionTestProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    const result = await testFiscalConnection(restaurantId);

    if (result.success) {
      setTestResult({
        success: true,
        message: result.data?.message || "Conexión exitosa",
      });
    } else {
      setTestResult({
        success: false,
        message: result.error || "Error desconocido",
      });
    }

    setIsTesting(false);
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Configuration Status Warning */}
      {!isConfigured && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">
              Configuración no habilitada
            </p>
            <p className="text-amber-800 mt-1">
              Debes completar los datos fiscales y habilitar la configuración
              antes de probar la conexión con ARCA.
            </p>
          </div>
        </div>
      )}

      {/* Test Connection Section */}
      <div className="p-6 bg-white border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Probar conexión con ARCA</h3>
        <p className="text-sm text-gray-600 mb-6">
          Verifica que las credenciales y certificados estén configurados
          correctamente y que el servidor pueda conectarse a los servicios de
          ARCA.
        </p>

        <Button
          onClick={handleTest}
          disabled={isTesting || !isConfigured}
          size="lg"
        >
          {isTesting ? (
            <>
              <Wifi className="h-5 w-5 mr-2 animate-pulse" />
              Probando conexión...
            </>
          ) : (
            <>
              <Wifi className="h-5 w-5 mr-2" />
              Probar conexión
            </>
          )}
        </Button>

        {/* Test Result */}
        {testResult && (
          <div
            className={`mt-6 p-4 rounded-lg border ${
              testResult.success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p
                  className={`font-semibold ${
                    testResult.success ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {testResult.success
                    ? "✓ Conexión exitosa"
                    : "✗ Error de conexión"}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    testResult.success ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {testResult.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Information Section */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
        <p className="font-semibold">¿Qué se verifica en esta prueba?</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Conectividad con los servidores de ARCA</li>
          <li>Validez de los certificados (.crt y .key)</li>
          <li>Autenticación con el CUIT configurado</li>
          <li>Permisos para acceder a los servicios de facturación</li>
        </ul>
        <p className="mt-3 font-semibold">Nota importante:</p>
        <p className="mt-1">
          Esta prueba utiliza la configuración activa (base de datos si está
          habilitada, o variables de entorno como fallback). Asegúrate de que la
          configuración que quieres probar esté guardada y habilitada.
        </p>
      </div>

      {/* Troubleshooting Section */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
        <p className="font-semibold">¿La conexión falló?</p>
        <p className="mt-2">Verifica lo siguiente:</p>
        <ul className="list-decimal list-inside mt-2 space-y-1">
          <li>El CUIT configurado es correcto (11 dígitos)</li>
          <li>Las rutas a los certificados son correctas</li>
          <li>Los archivos de certificado existen en el servidor</li>
          <li>Los certificados no están vencidos</li>
          <li>El servidor tiene conexión a internet</li>
          <li>El firewall permite conexiones a los servidores de ARCA</li>
        </ul>
      </div>
    </div>
  );
}
