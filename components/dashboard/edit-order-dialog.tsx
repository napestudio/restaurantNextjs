"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ClientPicker } from "./client-picker";
import { WaiterPicker } from "./waiter-picker";
import { type ClientData } from "@/actions/clients";
import { assignClientToOrder, assignStaffToOrder, updatePartySize } from "@/actions/Order";

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  branchId: string;
  currentPartySize: number;
  currentClientId?: string | null;
  currentClient?: { id: string; name: string; email: string | null } | null;
  currentWaiterId?: string | null;
  onSuccess: () => void;
  disabled?: boolean;
}

export function EditOrderDialog({
  open,
  onOpenChange,
  orderId,
  branchId,
  currentPartySize,
  currentClientId,
  currentClient,
  currentWaiterId,
  onSuccess,
  disabled = false,
}: EditOrderDialogProps) {
  const [partySize, setPartySize] = useState(currentPartySize.toString());
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(
    currentClient ? {
      id: currentClient.id,
      name: currentClient.name,
      email: currentClient.email,
      phone: null,
      birthDate: null,
      taxId: null,
      notes: null,
      addressStreet: null,
      addressNumber: null,
      addressApartment: null,
      addressCity: null,
      discountPercentage: 0,
      preferredPaymentMethod: null,
      hasCurrentAccount: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } : null
  );
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(
    currentWaiterId || null
  );
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPartySize(currentPartySize.toString());
      setSelectedClient(
        currentClient ? {
          id: currentClient.id,
          name: currentClient.name,
          email: currentClient.email,
          phone: null,
          birthDate: null,
          taxId: null,
          notes: null,
          addressStreet: null,
          addressNumber: null,
          addressApartment: null,
          addressCity: null,
          discountPercentage: 0,
          preferredPaymentMethod: null,
          hasCurrentAccount: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } : null
      );
      setSelectedWaiterId(currentWaiterId || null);
    }
  }, [open, currentPartySize, currentClient, currentWaiterId]);

  const handleSave = async () => {
    setIsLoading(true);

    try {
      // Update party size if changed
      const newPartySize = parseInt(partySize);
      if (!isNaN(newPartySize) && newPartySize > 0 && newPartySize !== currentPartySize) {
        const result = await updatePartySize(orderId, newPartySize);
        if (!result.success) {
          alert(result.error || "Error al actualizar el número de personas");
          setIsLoading(false);
          return;
        }
      }

      // Update client if changed
      if (selectedClient?.id !== currentClientId) {
        const result = await assignClientToOrder(orderId, selectedClient?.id || null);
        if (!result.success) {
          alert(result.error || "Error al actualizar el cliente");
          setIsLoading(false);
          return;
        }
      }

      // Update waiter if changed
      if (selectedWaiterId !== currentWaiterId) {
        const result = await assignStaffToOrder(orderId, selectedWaiterId);
        if (!result.success) {
          alert(result.error || "Error al actualizar el camarero");
          setIsLoading(false);
          return;
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Error al actualizar la orden");
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Venta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Party Size */}
          <div className="space-y-2">
            <Label htmlFor="edit-party-size">
              Personas <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-party-size"
              type="number"
              min="1"
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              placeholder="Ej: 4"
              disabled={isLoading || disabled}
            />
          </div>

          {/* Client Picker */}
          <ClientPicker
            branchId={branchId}
            selectedClient={selectedClient}
            onSelectClient={setSelectedClient}
            onCreateNew={() => {}}
            disabled={isLoading || disabled}
          />

          {/* Waiter Picker */}
          <WaiterPicker
            branchId={branchId}
            selectedWaiterId={selectedWaiterId}
            onSelectWaiter={setSelectedWaiterId}
            disabled={isLoading || disabled}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !partySize || parseInt(partySize) <= 0}>
            {isLoading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
