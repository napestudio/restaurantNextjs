"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import {
  createClient,
  type ClientData,
  type ClientInput,
} from "@/actions/clients";
import { PaymentMethod } from "@/app/generated/prisma";

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: ClientData) => void;
  branchId: string;
}

export function CreateClientDialog({
  open,
  onOpenChange,
  onCreated,
  branchId,
}: CreateClientDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ClientInput>({
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    // Create optimistic client
    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    const optimisticClient: ClientData = {
      id: tempId,
      name: formData.name,
      phone: formData.phone || null,
      email: formData.email || null,
      birthDate: formData.birthDate ? new Date(formData.birthDate) : null,
      taxId: formData.taxId || null,
      notes: formData.notes || null,
      addressStreet: formData.addressStreet || null,
      addressNumber: formData.addressNumber || null,
      addressApartment: formData.addressApartment || null,
      addressCity: formData.addressCity || null,
      discountPercentage: formData.discountPercentage || 0,
      preferredPaymentMethod: formData.preferredPaymentMethod || null,
      hasCurrentAccount: formData.hasCurrentAccount || false,
      branchId,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update - add client and close dialog immediately
    onCreated(optimisticClient);
    resetForm();
    onOpenChange(false);

    // Perform server create
    try {
      const result = await createClient(branchId, formData);

      if (result.success && result.data) {
        // Replace temp client with real one from server
        onCreated(result.data);
      } else {
        // On error, we can't easily rollback from here since dialog is closed
        // The parent should handle removing the temp client
        console.error("Failed to create client:", result.error);
      }
    } catch (err) {
      console.error("Error creating client:", err);
    }
  };

  const resetForm = () => {
    setFormData({
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
    });
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Crear Cliente
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo cliente a tu base de datos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">
                Información Básica
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Juan Pérez"
                    disabled={isPending}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+54 9 11 1234-5678"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="juan@ejemplo.com"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) =>
                      setFormData({ ...formData, birthDate: e.target.value })
                    }
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">DNI/CUIT</Label>
                  <Input
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) =>
                      setFormData({ ...formData, taxId: e.target.value })
                    }
                    placeholder="12345678"
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">
                Dirección
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressStreet">Calle</Label>
                  <Input
                    id="addressStreet"
                    value={formData.addressStreet}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        addressStreet: e.target.value,
                      })
                    }
                    placeholder="Av. Corrientes"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressNumber">Número</Label>
                  <Input
                    id="addressNumber"
                    value={formData.addressNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        addressNumber: e.target.value,
                      })
                    }
                    placeholder="1234"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressApartment">Piso/Dpto</Label>
                  <Input
                    id="addressApartment"
                    value={formData.addressApartment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        addressApartment: e.target.value,
                      })
                    }
                    placeholder="5B"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressCity">Ciudad</Label>
                  <Input
                    id="addressCity"
                    value={formData.addressCity}
                    onChange={(e) =>
                      setFormData({ ...formData, addressCity: e.target.value })
                    }
                    placeholder="Buenos Aires"
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>

            {/* Payment & Preferences */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">
                Preferencias
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discountPercentage">Descuento (%)</Label>
                  <Input
                    id="discountPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.discountPercentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountPercentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredPaymentMethod">
                    Método de Pago Preferido
                  </Label>
                  <select
                    id="preferredPaymentMethod"
                    value={formData.preferredPaymentMethod || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferredPaymentMethod: e.target.value
                          ? (e.target.value as PaymentMethod)
                          : undefined,
                      })
                    }
                    disabled={isPending}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Ninguno</option>
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="TRANSFER">Transferencia</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="hasCurrentAccount"
                      type="checkbox"
                      checked={formData.hasCurrentAccount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hasCurrentAccount: e.target.checked,
                        })
                      }
                      disabled={isPending}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label
                      htmlFor="hasCurrentAccount"
                      className="cursor-pointer"
                    >
                      Tiene Cuenta Corriente
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">
                Notas
              </h3>

              <div className="space-y-2">
                <Label htmlFor="notes">Comentarios adicionales</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Información adicional sobre el cliente..."
                  rows={3}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || !formData.name.trim()}
              className="bg-red-500 hover:bg-red-600"
            >
              {isPending ? "Creando..." : "Crear Cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
