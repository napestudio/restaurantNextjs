"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateDeliveryConfig } from "@/actions/DeliveryConfig";
import { DeliveryWindowDialog } from "./components/delivery-window-dialog";
import { DeliveryWindowList } from "./components/delivery-window-list";
import { useToast } from "@/hooks/use-toast";
import { DeliveryWindow } from "./lib/delivery-windows";

type Menu = {
  id: string;
  name: string;
  slug: string;
};

type SerializedDeliveryWindow = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  maxOrders: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type DeliveryConfig = {
  id: string;
  branchId: string;
  menuId: string | null;
  isActive: boolean;
  minOrderAmount: number;
  deliveryFee: number;
  estimatedMinutes: number;
  menu?: Menu | null;
  deliveryWindows: SerializedDeliveryWindow[];
};

interface DeliveryConfigClientProps {
  branchId: string;
  initialConfig: DeliveryConfig | null;
  availableMenus: Menu[];
}

export default function DeliveryConfigClient({
  branchId,
  initialConfig,
  availableMenus,
}: DeliveryConfigClientProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState<DeliveryWindow | null>(null);

  // Form state
  const [isActive, setIsActive] = useState(initialConfig?.isActive ?? true);
  const [selectedMenuId, setSelectedMenuId] = useState<string>(
    initialConfig?.menuId || "__none__"
  );
  const [minOrderAmount, setMinOrderAmount] = useState(
    initialConfig?.minOrderAmount?.toString() || "0"
  );
  const [deliveryFee, setDeliveryFee] = useState(
    initialConfig?.deliveryFee?.toString() || "0"
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    initialConfig?.estimatedMinutes?.toString() || "45"
  );
  const [windows, setWindows] = useState<DeliveryWindow[]>(
    initialConfig?.deliveryWindows?.map((w) => ({
      id: w.id,
      name: w.name,
      startTime: w.startTime.slice(11, 16), // Extract HH:mm from ISO
      endTime: w.endTime.slice(11, 16),
      daysOfWeek: w.daysOfWeek,
      maxOrders: w.maxOrders,
      isActive: w.isActive,
    })) || []
  );

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateDeliveryConfig({
        branchId,
        menuId: selectedMenuId === "__none__" ? null : selectedMenuId,
        isActive,
        minOrderAmount: parseFloat(minOrderAmount) || 0,
        deliveryFee: parseFloat(deliveryFee) || 0,
        estimatedMinutes: parseInt(estimatedMinutes) || 45,
        windows: windows.map((w) => ({
          name: w.name,
          startTime: w.startTime,
          endTime: w.endTime,
          daysOfWeek: w.daysOfWeek,
          maxOrders: w.maxOrders,
          isActive: w.isActive,
        })),
      });

      if (result.success) {
        toast({
          title: "Configuración actualizada",
          description: "La configuración de delivery se guardó correctamente",
        });
      } else {
        toast({
          title: "Error al actualizar",
          description: result.error || "Error al actualizar configuración",
          variant: "destructive",
        });
      }
    });
  };

  const handleAddWindow = (window: DeliveryWindow) => {
    setWindows((prev) => [...prev, { ...window, id: crypto.randomUUID() }]);
    setIsDialogOpen(false);
  };

  const handleEditWindow = (window: DeliveryWindow) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === window.id ? window : w))
    );
    setEditingWindow(null);
    setIsDialogOpen(false);
  };

  const handleDeleteWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const openEditDialog = (window: DeliveryWindow) => {
    setEditingWindow(window);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingWindow(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Configuración de Delivery
        </h1>
        <p className="mt-2 text-gray-600">
          Configura el servicio de delivery, horarios y menú disponible para pedidos.
        </p>
      </div>

      {/* Main Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
          <CardDescription>
            Activa el servicio y configura los parámetros básicos de delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Servicio de Delivery</Label>
              <p className="text-sm text-gray-500">
                Activa o desactiva el servicio de delivery
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Menu Selection */}
          <div className="space-y-2">
            <Label htmlFor="menu">Menú de Delivery</Label>
            <Select value={selectedMenuId} onValueChange={setSelectedMenuId}>
              <SelectTrigger id="menu">
                <SelectValue placeholder="Seleccionar menú" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin menú</SelectItem>
                {availableMenus.map((menu) => (
                  <SelectItem key={menu.id} value={menu.id}>
                    {menu.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Menú que verán los clientes al hacer pedidos
            </p>
          </div>

          {/* Min Order Amount */}
          <div className="space-y-2">
            <Label htmlFor="minOrderAmount">Monto Mínimo de Pedido ($)</Label>
            <Input
              id="minOrderAmount"
              type="number"
              step="0.01"
              min="0"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-sm text-gray-500">
              Monto mínimo requerido para realizar un pedido
            </p>
          </div>

          {/* Delivery Fee */}
          <div className="space-y-2">
            <Label htmlFor="deliveryFee">Cargo por Delivery ($)</Label>
            <Input
              id="deliveryFee"
              type="number"
              step="0.01"
              min="0"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-sm text-gray-500">
              Cargo adicional por el servicio de delivery
            </p>
          </div>

          {/* Estimated Minutes */}
          <div className="space-y-2">
            <Label htmlFor="estimatedMinutes">Tiempo Estimado (minutos)</Label>
            <Input
              id="estimatedMinutes"
              type="number"
              min="1"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder="45"
            />
            <p className="text-sm text-gray-500">
              Tiempo estimado de entrega en minutos
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Windows Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Horarios de Delivery</CardTitle>
              <CardDescription>
                Configura las ventanas horarias en las que se aceptan pedidos.
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              Agregar Horario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DeliveryWindowList
            windows={windows}
            onEdit={openEditDialog}
            onDelete={handleDeleteWindow}
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isPending}
          size="lg"
          className="w-full sm:w-auto"
        >
          {isPending ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>

      {/* Dialog */}
      <DeliveryWindowDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSave={editingWindow ? handleEditWindow : handleAddWindow}
        editingWindow={editingWindow}
      />
    </div>
  );
}
