"use client";

import { updateMenuItem } from "@/actions/menus";
import type { SerializedMenuItem } from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

interface EditMenuItemDialogProps {
  item: SerializedMenuItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function EditMenuItemDialog({
  item,
  open,
  onOpenChange,
  onUpdate,
}: EditMenuItemDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [customPrice, setCustomPrice] = useState<string>(
    item.customPrice?.toString() || ""
  );
  const [isAvailable, setIsAvailable] = useState(item.isAvailable);
  const [isFeatured, setIsFeatured] = useState(item.isFeatured);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await updateMenuItem(item.id, {
        customPrice: customPrice ? Number(customPrice) : null,
        isAvailable,
        isFeatured,
      });

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Producto actualizado correctamente",
        });
        onUpdate();
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Error al actualizar el producto",
        });
      }
    });
  };

  const basePrice = item.product?.basePrice;
  const displayPrice = customPrice || basePrice?.toString() || "0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Producto en Menú</DialogTitle>
            <DialogDescription>
              {item.product?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Base Price Info */}
            {basePrice && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">
                  <strong>Precio base del producto:</strong> ${basePrice.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Este es el precio configurado según el tipo de menú. Puedes sobrescribirlo con un precio personalizado.
                </p>
              </div>
            )}

            {/* Custom Price */}
            <div className="space-y-2">
              <Label htmlFor="customPrice">
                Precio Personalizado (opcional)
              </Label>
              <Input
                id="customPrice"
                type="number"
                step="0.01"
                min="0"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={basePrice?.toString() || "0.00"}
              />
              <p className="text-xs text-gray-500">
                Deja vacío para usar el precio base ({basePrice ? `$${basePrice.toFixed(2)}` : "no disponible"})
              </p>
            </div>

            {/* Price Preview */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Precio que se mostrará:</strong> ${Number(displayPrice).toFixed(2)}
              </p>
            </div>

            {/* Available Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isAvailable"
                checked={isAvailable}
                onCheckedChange={(checked) => setIsAvailable(checked as boolean)}
              />
              <Label
                htmlFor="isAvailable"
                className="font-normal cursor-pointer"
              >
                Disponible en el menú
              </Label>
            </div>

            {/* Featured Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFeatured"
                checked={isFeatured}
                onCheckedChange={(checked) => setIsFeatured(checked as boolean)}
              />
              <Label
                htmlFor="isFeatured"
                className="font-normal cursor-pointer"
              >
                Producto destacado
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
