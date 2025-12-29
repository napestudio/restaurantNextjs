"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, MapPin, Settings2 } from "lucide-react";
import { createClient, type ClientInput, type ClientData } from "@/actions/clients";
import { PaymentMethod } from "@/app/generated/prisma";

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onSuccess: (client: ClientData) => void;
  initialName?: string;
}

const initialFormState: ClientInput = {
  name: "",
  phone: "",
  email: "",
  birthDate: "",
  taxId: "",
  notes: "",
  addressStreet: "",
  addressNumber: "",
  addressApartment: "",
  addressCity: "",
  discountPercentage: 0,
  preferredPaymentMethod: undefined,
  hasCurrentAccount: false,
};

export function CreateClientDialog({
  open,
  onOpenChange,
  branchId,
  onSuccess,
  initialName = "",
}: CreateClientDialogProps) {
  const [formData, setFormData] = useState<ClientInput>({
    ...initialFormState,
    name: initialName,
  });
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData({ ...initialFormState, name: initialName });
      setError(null);
      setShowMoreInfo(false);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const result = await createClient(branchId, formData);

    if (result.success && result.data) {
      onSuccess(result.data);
      onOpenChange(false);
    } else {
      setError(result.error || "Error al crear cliente");
    }

    setIsPending(false);
  };

  const updateField = <K extends keyof ClientInput>(
    field: K,
    value: ClientInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="uppercase font-bold">Nuevo Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 items-center">
            <Label htmlFor="client-name">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="client-name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder=""
              required
            />

            <Label htmlFor="client-phone">Teléfono</Label>
            <Input
              id="client-phone"
              value={formData.phone || ""}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder=""
            />

            <Label htmlFor="client-email">Email</Label>
            <Input
              id="client-email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder=""
            />

            <Label htmlFor="client-birthdate">Fecha de nacimiento</Label>
            <Input
              id="client-birthdate"
              type="date"
              value={formData.birthDate || ""}
              onChange={(e) => updateField("birthDate", e.target.value)}
            />

            <Label htmlFor="client-taxid">Nro. Tributario</Label>
            <Input
              id="client-taxid"
              value={formData.taxId || ""}
              onChange={(e) => updateField("taxId", e.target.value)}
              placeholder="CUIT"
            />

            <Label htmlFor="client-notes">Comentario</Label>
            <Textarea
              id="client-notes"
              value={formData.notes || ""}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder=""
              rows={3}
            />
          </div>

          {/* Collapsible More Info */}
          <Collapsible open={showMoreInfo} onOpenChange={setShowMoreInfo}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium w-full justify-end"
              >
                Más info
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showMoreInfo ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 pt-4">
              {/* Address Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin className="h-4 w-4" />
                  Dirección
                </div>

                <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 items-center pl-6">
                  <Label htmlFor="client-street">Calle</Label>
                  <Input
                    id="client-street"
                    value={formData.addressStreet || ""}
                    onChange={(e) => updateField("addressStreet", e.target.value)}
                    placeholder=""
                  />

                  <Label htmlFor="client-number">Número</Label>
                  <Input
                    id="client-number"
                    value={formData.addressNumber || ""}
                    onChange={(e) => updateField("addressNumber", e.target.value)}
                    placeholder=""
                  />

                  <Label htmlFor="client-apartment">Departamento</Label>
                  <Input
                    id="client-apartment"
                    value={formData.addressApartment || ""}
                    onChange={(e) =>
                      updateField("addressApartment", e.target.value)
                    }
                    placeholder=""
                  />

                  <Label htmlFor="client-city">Ciudad</Label>
                  <Input
                    id="client-city"
                    value={formData.addressCity || ""}
                    onChange={(e) => updateField("addressCity", e.target.value)}
                    placeholder=""
                  />
                </div>
              </div>

              {/* Preferences Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Settings2 className="h-4 w-4" />
                  Preferencias
                </div>

                <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 items-center pl-6">
                  <Label htmlFor="client-discount">Descuento (%)</Label>
                  <Input
                    id="client-discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.discountPercentage || ""}
                    onChange={(e) =>
                      updateField(
                        "discountPercentage",
                        e.target.value ? parseFloat(e.target.value) : 0
                      )
                    }
                    placeholder=""
                  />

                  <Label htmlFor="client-payment">Medio de pago</Label>
                  <Select
                    value={formData.preferredPaymentMethod || ""}
                    onValueChange={(value) =>
                      updateField(
                        "preferredPaymentMethod",
                        value ? (value as PaymentMethod) : undefined
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Efectivo</SelectItem>
                      <SelectItem value="CARD">Tarjeta</SelectItem>
                      <SelectItem value="TRANSFER">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>

                  <Label htmlFor="client-account">Tiene Cta. Cte.</Label>
                  <div className="flex items-center">
                    <Checkbox
                      id="client-account"
                      checked={formData.hasCurrentAccount || false}
                      onCheckedChange={(checked) =>
                        updateField("hasCurrentAccount", checked === true)
                      }
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !formData.name.trim()}
            className="bg-orange-300 hover:bg-orange-400 text-black"
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
