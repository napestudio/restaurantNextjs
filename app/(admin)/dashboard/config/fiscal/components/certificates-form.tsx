"use client";

import { useState } from "react";
import { FiscalConfigInput, FiscalConfigData, updateFiscalConfig } from "@/actions/FiscalConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

interface CertificatesFormProps {
  initialConfig: FiscalConfigData | null;
  restaurantId: string;
}

export function CertificatesForm({
  initialConfig,
  restaurantId,
}: CertificatesFormProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<FiscalConfigInput>>({
    environment: initialConfig?.environment ?? "test",
    certificatePath: initialConfig?.certificatePath ?? "",
    privateKeyPath: initialConfig?.privateKeyPath ?? "",
    // Include required fields with defaults
    isEnabled: initialConfig?.isEnabled ?? false,
    businessName: initialConfig?.businessName ?? "",
    cuit: initialConfig?.cuit ?? "",
    defaultPtoVta: initialConfig?.defaultPtoVta ?? 1,
    defaultInvoiceType: initialConfig?.defaultInvoiceType ?? 6,
    autoIssue: initialConfig?.autoIssue ?? false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await updateFiscalConfig(
      restaurantId,
      formData as FiscalConfigInput
    );

    if (result.success) {
      toast({
        title: "Configuración guardada",
        description: "Las rutas de certificados se actualizaron correctamente",
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
      {/* Warning about certificate storage */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-900">
            Importante: Almacenamiento de Certificados
          </p>
          <p className="text-amber-800 mt-1">
            Esta configuración almacena solo las <strong>rutas</strong> a los archivos de certificados,
            no el contenido. Los archivos .crt y .key deben estar en el servidor de forma segura.
          </p>
        </div>
      </div>

      {/* Environment Selection */}
      <div>
        <Label htmlFor="environment">Ambiente AFIP</Label>
        <Select
          value={formData.environment}
          onValueChange={(value) =>
            setFormData({ ...formData, environment: value as "test" | "production" })
          }
        >
          <SelectTrigger id="environment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Prueba / Homologación</SelectItem>
            <SelectItem value="production">Producción</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          {formData.environment === "production"
            ? "⚠️ Usará certificados de producción de AFIP"
            : "Usará certificados de prueba de AFIP"}
        </p>
      </div>

      {/* Certificate Path */}
      <div>
        <Label htmlFor="certificatePath">
          Ruta del certificado (.crt)
        </Label>
        <Input
          id="certificatePath"
          value={formData.certificatePath || ""}
          onChange={(e) =>
            setFormData({ ...formData, certificatePath: e.target.value })
          }
          placeholder="/var/certs/production/cert.crt"
        />
        <p className="text-xs text-gray-500 mt-1">
          Ruta absoluta al archivo de certificado en el servidor
        </p>
      </div>

      {/* Private Key Path */}
      <div>
        <Label htmlFor="privateKeyPath">
          Ruta de la clave privada (.key)
        </Label>
        <Input
          id="privateKeyPath"
          value={formData.privateKeyPath || ""}
          onChange={(e) =>
            setFormData({ ...formData, privateKeyPath: e.target.value })
          }
          placeholder="/var/certs/production/key.key"
        />
        <p className="text-xs text-gray-500 mt-1">
          Ruta absoluta al archivo de clave privada en el servidor
        </p>
      </div>

      {/* Information about certificates */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
        <p className="font-semibold">Cómo obtener certificados AFIP:</p>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Accede a la web de AFIP con tu CUIT</li>
          <li>Ve a &quot;Administrador de Relaciones de Clave Fiscal&quot;</li>
          <li>Genera un Certificado Digital para &quot;Facturación Electrónica&quot;</li>
          <li>Descarga el certificado (.crt) y guarda la clave privada (.key)</li>
          <li>Coloca los archivos en el servidor y configura las rutas aquí</li>
        </ol>
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
