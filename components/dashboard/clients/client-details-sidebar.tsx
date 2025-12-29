"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, User } from "lucide-react";
import {
  updateClient,
  type ClientData,
  type ClientInput,
} from "@/actions/clients";
import { PaymentMethod } from "@/app/generated/prisma";
import { cn } from "@/lib/utils";

// Payment method labels for Client enum (not Extended)
const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

interface ClientDetailsSidebarProps {
  client: ClientData | null;
  open: boolean;
  onClose: () => void;
  onClientUpdated: (client: ClientData) => void;
}

export function ClientDetailsSidebar({
  client,
  open,
  onClose,
  onClientUpdated,
}: ClientDetailsSidebarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
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

  // Initialize form data when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        phone: client.phone || "",
        email: client.email || "",
        birthDate: client.birthDate
          ? new Date(client.birthDate).toISOString().split("T")[0]
          : "",
        taxId: client.taxId || "",
        notes: client.notes || "",
        addressStreet: client.addressStreet || "",
        addressNumber: client.addressNumber || "",
        addressApartment: client.addressApartment || "",
        addressCity: client.addressCity || "",
        discountPercentage: client.discountPercentage,
        preferredPaymentMethod: client.preferredPaymentMethod || undefined,
        hasCurrentAccount: client.hasCurrentAccount,
      });
      setIsEditing(false);
      setError(null);
    }
  }, [client]);

  // Reset form when sidebar closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setError(null);
    }
  }, [open]);

  const handleSave = async () => {
    if (!client) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await updateClient(client.id, formData);

      if (result.success && result.data) {
        onClientUpdated(result.data);
        setIsEditing(false);
      } else {
        setError(result.error || "Error al actualizar cliente");
      }
    } catch {
      setError("Error al actualizar cliente");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (client) {
      setFormData({
        name: client.name,
        phone: client.phone || "",
        email: client.email || "",
        birthDate: client.birthDate
          ? new Date(client.birthDate).toISOString().split("T")[0]
          : "",
        taxId: client.taxId || "",
        notes: client.notes || "",
        addressStreet: client.addressStreet || "",
        addressNumber: client.addressNumber || "",
        addressApartment: client.addressApartment || "",
        addressCity: client.addressCity || "",
        discountPercentage: client.discountPercentage,
        preferredPaymentMethod: client.preferredPaymentMethod || undefined,
        hasCurrentAccount: client.hasCurrentAccount,
      });
    }
    setIsEditing(false);
    setError(null);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (!client) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-112.5 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="bg-orange-500 text-white p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Detalles del Cliente</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-orange-600"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
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

            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={isSaving}
                />
              ) : (
                <p className="text-sm font-medium">{client.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  disabled={isSaving}
                />
              ) : (
                <p className="text-sm">{client.phone || "—"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={isSaving}
                />
              ) : (
                <p className="text-sm">{client.email || "—"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
              {isEditing ? (
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) =>
                    setFormData({ ...formData, birthDate: e.target.value })
                  }
                  disabled={isSaving}
                />
              ) : (
                <p className="text-sm">{formatDate(client.birthDate)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">DNI/CUIT</Label>
              {isEditing ? (
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) =>
                    setFormData({ ...formData, taxId: e.target.value })
                  }
                  disabled={isSaving}
                />
              ) : (
                <p className="text-sm">{client.taxId || "—"}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">
              Dirección
            </h3>

            <div className="space-y-2">
              <Label htmlFor="addressStreet">Calle</Label>
              {isEditing ? (
                <Input
                  id="addressStreet"
                  value={formData.addressStreet}
                  onChange={(e) =>
                    setFormData({ ...formData, addressStreet: e.target.value })
                  }
                  disabled={isSaving}
                />
              ) : (
                <p className="text-sm">{client.addressStreet || "—"}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="addressNumber">Número</Label>
                {isEditing ? (
                  <Input
                    id="addressNumber"
                    value={formData.addressNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        addressNumber: e.target.value,
                      })
                    }
                    disabled={isSaving}
                  />
                ) : (
                  <p className="text-sm">{client.addressNumber || "—"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressApartment">Piso/Dpto</Label>
                {isEditing ? (
                  <Input
                    id="addressApartment"
                    value={formData.addressApartment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        addressApartment: e.target.value,
                      })
                    }
                    disabled={isSaving}
                  />
                ) : (
                  <p className="text-sm">{client.addressApartment || "—"}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressCity">Ciudad</Label>
              {isEditing ? (
                <Input
                  id="addressCity"
                  value={formData.addressCity}
                  onChange={(e) =>
                    setFormData({ ...formData, addressCity: e.target.value })
                  }
                  disabled={isSaving}
                />
              ) : (
                <p className="text-sm">{client.addressCity || "—"}</p>
              )}
            </div>
          </div>

          {/* Payment & Preferences */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">
              Preferencias
            </h3>

            <div className="space-y-2">
              <Label htmlFor="discountPercentage">Descuento (%)</Label>
              {isEditing ? (
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
                  disabled={isSaving}
                />
              ) : (
                <p className="text-sm">{client.discountPercentage}%</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredPaymentMethod">
                Método de Pago Preferido
              </Label>
              {isEditing ? (
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
                  disabled={isSaving}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Ninguno</option>
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="TRANSFER">Transferencia</option>
                </select>
              ) : (
                <p className="text-sm">
                  {client.preferredPaymentMethod
                    ? PAYMENT_METHOD_LABELS[client.preferredPaymentMethod]
                    : "—"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
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
                      disabled={isSaving}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label
                      htmlFor="hasCurrentAccount"
                      className="cursor-pointer"
                    >
                      Tiene Cuenta Corriente
                    </Label>
                  </>
                ) : (
                  <>
                    <Label>Cuenta Corriente:</Label>
                    <p className="text-sm font-medium">
                      {client.hasCurrentAccount ? "Sí" : "No"}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Notas</h3>

            <div className="space-y-2">
              {isEditing ? (
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Notas adicionales..."
                  rows={4}
                  disabled={isSaving}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {client.notes || "—"}
                </p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t text-xs text-gray-500 space-y-1">
            <p>
              <span className="font-medium">Creado:</span>{" "}
              {formatDate(client.createdAt)}
            </p>
            <p>
              <span className="font-medium">Actualizado:</span>{" "}
              {formatDate(client.updatedAt)}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t p-4">
          {isEditing ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !formData.name.trim()}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {isSaving ? (
                  "Guardando..."
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Editar Cliente
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
