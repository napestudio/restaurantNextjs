"use client";

import { useState } from "react";
import {
  FiscalConfigInput,
  FiscalConfigData,
  updateFiscalConfig,
  syncSalesPoints,
} from "@/actions/FiscalConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle } from "lucide-react";

interface SalesPointsConfigProps {
  initialConfig: FiscalConfigData | null;
  restaurantId: string;
}

export function SalesPointsConfig({
  initialConfig,
  restaurantId,
}: SalesPointsConfigProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<FiscalConfigInput>>({
    defaultPtoVta: initialConfig?.defaultPtoVta ?? 1,
    // Include required fields with defaults
    isEnabled: initialConfig?.isEnabled ?? false,
    businessName: initialConfig?.businessName ?? "",
    cuit: initialConfig?.cuit ?? "",
    environment: initialConfig?.environment ?? "test",
    defaultInvoiceType: initialConfig?.defaultInvoiceType ?? 6,
    autoIssue: initialConfig?.autoIssue ?? false,
  });

  const [availablePoints, setAvailablePoints] = useState<number[]>(
    (initialConfig?.availablePtoVta as unknown as number[]) || [],
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);

    const result = await syncSalesPoints(restaurantId);

    if (result.success && result.data) {
      setAvailablePoints(result.data);
      toast({
        title: "Sincronización exitosa",
        description: `Se encontraron ${result.data.length} puntos de venta disponibles`,
      });
    } else {
      toast({
        title: "Error al sincronizar",
        description: result.error,
        variant: "destructive",
      });
    }

    setIsSyncing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await updateFiscalConfig(
      restaurantId,
      formData as FiscalConfigInput,
    );

    if (result.success) {
      toast({
        title: "Configuración guardada",
        description:
          "El punto de venta predeterminado se actualizó correctamente",
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
      {/* Default Sales Point */}
      <div>
        <Label htmlFor="defaultPtoVta">
          Punto de venta predeterminado <span className="text-red-500">*</span>
        </Label>
        <Input
          id="defaultPtoVta"
          type="number"
          min="1"
          max="9999"
          value={formData.defaultPtoVta}
          onChange={(e) =>
            setFormData({
              ...formData,
              defaultPtoVta: parseInt(e.target.value) || 1,
            })
          }
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Número de punto de venta que se usará para generar facturas (1-9999)
        </p>
      </div>

      {/* Sync Button */}
      <div>
        <Label>Puntos de venta disponibles en ARCA</Label>
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar con ARCA
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Consulta los puntos de venta autorizados en tu cuenta ARCA
          </p>
        </div>
      </div>

      {/* Available Sales Points List */}
      {availablePoints.length > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-900">
              Puntos de venta encontrados:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availablePoints.map((point) => (
              <span
                key={point}
                className="px-3 py-1 bg-white border border-green-300 rounded-md text-sm font-medium text-green-900"
              >
                {point}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Information */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
        <p className="font-semibold">¿Qué es un punto de venta?</p>
        <p className="mt-2">
          El punto de venta es un número asignado por ARCA que identifica el
          lugar físico o virtual desde donde se emiten las facturas. Cada
          establecimiento puede tener uno o más puntos de venta autorizados.
        </p>
        <p className="mt-2">
          Debes autorizar tus puntos de venta en la web de ARCA antes de poder
          usarlos para emitir facturas electrónicas.
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>
    </form>
  );
}
