"use client";

import { useState } from "react";
import { createOrder } from "@/actions/Order";
import { OrderType } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { ClientPicker } from "@/components/dashboard/client-picker";
import { WaiterPicker } from "@/components/dashboard/waiter-picker";
import { CreateClientDialog } from "@/components/dashboard/create-client-dialog";
import { type ClientData } from "@/actions/clients";

interface CreateOrderDialogProps {
  branchId: string;
  tables: Array<{
    id: string;
    number: number;
    name: string | null;
  }>;
  onOrderCreated?: () => void;
}

export function CreateOrderDialog({
  branchId,
  tables,
  onOrderCreated,
}: CreateOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [tableId, setTableId] = useState<string>("");
  const [partySize, setPartySize] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);

  // Create client dialog state
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  const handleCreateOrder = async () => {
    // Validation
    if (orderType === OrderType.DINE_IN && !tableId) {
      alert("Por favor selecciona una mesa para órdenes de comer aquí");
      return;
    }

    if (orderType === OrderType.DELIVERY && !selectedClient) {
      alert("Por favor selecciona un cliente para órdenes de delivery");
      return;
    }

    setIsLoading(true);

    const result = await createOrder({
      branchId,
      type: orderType,
      tableId: orderType === OrderType.DINE_IN ? tableId : null,
      partySize: partySize ? parseInt(partySize) : null,
      clientId: selectedClient?.id || null,
      assignedToId: selectedWaiterId || null,
    });

    setIsLoading(false);

    if (result.success) {
      alert("Orden creada exitosamente");

      // Reset form
      setOrderType(OrderType.DINE_IN);
      setTableId("");
      setPartySize("");
      setSelectedClient(null);
      setSelectedWaiterId(null);

      // Close dialog
      setOpen(false);

      // Notify parent to refresh orders list
      onOrderCreated?.();
    } else {
      alert(result.error || "Error al crear la orden");
    }
  };

  const resetForm = () => {
    setOrderType(OrderType.DINE_IN);
    setTableId("");
    setPartySize("");
    setSelectedClient(null);
    setSelectedWaiterId(null);
    setClientSearchQuery("");
  };

  const handleCreateNewClient = (searchQuery: string) => {
    setClientSearchQuery(searchQuery);
    setShowCreateClientDialog(true);
  };

  const handleClientCreated = (client: ClientData) => {
    setSelectedClient(client);
    setShowCreateClientDialog(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nueva Orden</DialogTitle>
          <DialogDescription>
            Completa los datos para crear una nueva orden
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Type */}
          <div className="space-y-2">
            <Label htmlFor="order-type">
              Tipo de Orden <span className="text-red-500">*</span>
            </Label>
            <Select
              value={orderType}
              onValueChange={(value) => setOrderType(value as OrderType)}
            >
              <SelectTrigger id="order-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OrderType.DINE_IN}>
                  Para Comer Aquí
                </SelectItem>
                <SelectItem value={OrderType.TAKE_AWAY}>Para Llevar</SelectItem>
                <SelectItem value={OrderType.DELIVERY}>Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table Selection - Only for DINE_IN */}
          {orderType === OrderType.DINE_IN && (
            <div className="space-y-2">
              <Label htmlFor="table">
                Mesa <span className="text-red-500">*</span>
              </Label>
              <Select value={tableId} onValueChange={setTableId}>
                <SelectTrigger id="table">
                  <SelectValue placeholder="Seleccionar mesa" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      Mesa {table.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Party Size - Only for DINE_IN */}
          {orderType === OrderType.DINE_IN && (
            <div className="space-y-2">
              <Label htmlFor="party-size">
                Personas <span className="text-red-500">*</span>
              </Label>
              <Input
                id="party-size"
                type="number"
                min="1"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                placeholder="Ej: 4"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Client Picker - Required for DELIVERY, optional for others */}
          <ClientPicker
            branchId={branchId}
            selectedClient={selectedClient}
            onSelectClient={setSelectedClient}
            onCreateNew={handleCreateNewClient}
            label={orderType === OrderType.DELIVERY ? "Cliente *" : "Cliente"}
            disabled={isLoading}
          />

          {/* Waiter Picker - Optional for all types */}
          <WaiterPicker
            branchId={branchId}
            selectedWaiterId={selectedWaiterId}
            onSelectWaiter={setSelectedWaiterId}
            label="Mesero/Cajero"
            disabled={isLoading}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleCreateOrder} disabled={isLoading}>
            {isLoading ? "Creando..." : "Crear Orden"}
          </Button>
        </div>
      </DialogContent>

      {/* Create Client Dialog */}
      <CreateClientDialog
        open={showCreateClientDialog}
        onOpenChange={setShowCreateClientDialog}
        branchId={branchId}
        onSuccess={handleClientCreated}
        initialName={clientSearchQuery}
      />
    </Dialog>
  );
}
