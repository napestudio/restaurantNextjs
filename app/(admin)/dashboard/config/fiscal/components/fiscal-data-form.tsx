"use client";

import { useState } from "react";
import {
  FiscalConfigInput,
  FiscalConfigData,
  updateFiscalConfig,
} from "@/actions/FiscalConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface FiscalDataFormProps {
  initialConfig: FiscalConfigData | null;
  restaurantId: string;
}

export function FiscalDataForm({
  initialConfig,
  restaurantId,
}: FiscalDataFormProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<FiscalConfigInput>>({
    isEnabled: initialConfig?.isEnabled ?? false,
    businessName: initialConfig?.businessName ?? "",
    cuit: initialConfig?.cuit ?? "",
    address: initialConfig?.address ?? "",
    activityStartDate: initialConfig?.activityStartDate ?? undefined,
    grossIncome: initialConfig?.grossIncome ?? "",
    taxStatus: initialConfig?.taxStatus ?? undefined,
    defaultInvoiceType: initialConfig?.defaultInvoiceType ?? 6,
    autoIssue: initialConfig?.autoIssue ?? false,
    // Include other fields with defaults
    environment: initialConfig?.environment ?? "test",
    certificatePath: initialConfig?.certificatePath ?? "",
    privateKeyPath: initialConfig?.privateKeyPath ?? "",
    defaultPtoVta: initialConfig?.defaultPtoVta ?? 1,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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
        description: "Los datos fiscales se actualizaron correctamente",
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
      {/* Enable/Disable Switch */}
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div>
          <Label htmlFor="isEnabled" className="text-base font-semibold">
            Habilitar facturación electrónica
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            Activa la emisión de facturas electrónicas ARCA
          </p>
        </div>
        <Switch
          id="isEnabled"
          checked={formData.isEnabled}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, isEnabled: checked })
          }
        />
      </div>

      {/* Business Name */}
      <div>
        <Label htmlFor="businessName">
          Razón social <span className="text-red-500">*</span>
        </Label>
        <Input
          id="businessName"
          value={formData.businessName}
          onChange={(e) =>
            setFormData({ ...formData, businessName: e.target.value })
          }
          placeholder="Ej: KIKU SUSHI S.R.L."
          required
        />
      </div>

      {/* CUIT */}
      <div>
        <Label htmlFor="cuit">
          CUIT <span className="text-red-500">*</span>
        </Label>
        <Input
          id="cuit"
          value={formData.cuit}
          onChange={(e) =>
            setFormData({
              ...formData,
              cuit: e.target.value.replace(/\D/g, ""),
            })
          }
          placeholder="20123456789 (11 dígitos)"
          maxLength={11}
          pattern="\d{11}"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Solo números, sin guiones</p>
      </div>

      {/* Address */}
      <div>
        <Label htmlFor="address">Dirección fiscal</Label>
        <Input
          id="address"
          value={formData.address || ""}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
          placeholder="Av. Corrientes 1234, CABA"
        />
      </div>

      {/* Activity Start Date */}
      <div>
        <Label htmlFor="activityStartDate">Inicio de actividad</Label>
        <Input
          id="activityStartDate"
          type="date"
          value={
            formData.activityStartDate
              ? new Date(formData.activityStartDate).toISOString().split("T")[0]
              : ""
          }
          onChange={(e) =>
            setFormData({
              ...formData,
              activityStartDate: e.target.value
                ? new Date(e.target.value)
                : undefined,
            })
          }
        />
      </div>

      {/* Gross Income */}
      <div>
        <Label htmlFor="grossIncome">Ingresos brutos (provincia)</Label>
        <Input
          id="grossIncome"
          value={formData.grossIncome || ""}
          onChange={(e) =>
            setFormData({ ...formData, grossIncome: e.target.value })
          }
          placeholder="Nro de inscripción provincial"
        />
      </div>

      {/* Tax Status */}
      <div>
        <Label htmlFor="taxStatus">Situación ante el impuesto</Label>
        <Select
          value={formData.taxStatus || ""}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              taxStatus: value as typeof formData.taxStatus,
            })
          }
        >
          <SelectTrigger id="taxStatus">
            <SelectValue placeholder="Selecciona situación fiscal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Responsable Inscripto">
              Responsable Inscripto
            </SelectItem>
            <SelectItem value="Monotributo">Monotributo</SelectItem>
            <SelectItem value="Exento">Exento</SelectItem>
            <SelectItem value="No Responsable">No Responsable</SelectItem>
            <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Default Invoice Type */}
      <div>
        <Label htmlFor="defaultInvoiceType">
          Tipo de factura predeterminado
        </Label>
        <Select
          value={formData.defaultInvoiceType?.toString()}
          onValueChange={(value) =>
            setFormData({ ...formData, defaultInvoiceType: parseInt(value) })
          }
        >
          <SelectTrigger id="defaultInvoiceType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Factura A</SelectItem>
            <SelectItem value="6">Factura B</SelectItem>
            <SelectItem value="11">Factura C</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Auto Issue */}
      <div className="flex items-center space-x-2">
        <Switch
          id="autoIssue"
          checked={formData.autoIssue}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, autoIssue: checked })
          }
        />
        <Label htmlFor="autoIssue">
          Generar facturas automáticamente al completar órdenes
        </Label>
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
