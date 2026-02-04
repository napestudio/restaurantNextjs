"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SerializedMenuItem } from "@/actions/menus";
import { updateMenuItem, removeMenuItem } from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Trash2, Star, Eye, EyeOff, Pencil } from "lucide-react";
import { EditMenuItemDialog } from "./edit-menu-item-dialog";

interface SortableItemProps {
  id: string;
  item: SerializedMenuItem;
  onUpdate: () => void;
  isPending?: boolean;
  isInGroup?: boolean;
}

export function SortableItem({
  id,
  item,
  onUpdate,
  isPending: parentPending = false,
  isInGroup = false,
}: SortableItemProps) {
  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const isLoading = isPending || parentPending;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleToggleAvailability = () => {
    startTransition(async () => {
      const result = await updateMenuItem(item.id, {
        isAvailable: !item.isAvailable,
      });
      if (result.success) {
        onUpdate();
      }
    });
  };

  const handleToggleFeatured = () => {
    startTransition(async () => {
      const result = await updateMenuItem(item.id, {
        isFeatured: !item.isFeatured,
      });
      if (result.success) {
        onUpdate();
      }
    });
  };

  const handleRemove = () => {
    if (!confirm("Eliminar este producto?")) return;

    startTransition(async () => {
      const result = await removeMenuItem(item.id);
      if (result.success) {
        onUpdate();
      }
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 bg-white border rounded-lg ${
        isDragging ? "opacity-50 shadow-lg border-blue-500" : "border-gray-200"
      } ${isInGroup ? "ml-4 border-l-2 border-l-purple-300" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded touch-none"
        disabled={isLoading}
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </button>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {item.product?.name || "Producto desconocido"}
        </div>
        {item.product?.description && (
          <div className="text-xs text-gray-500 truncate mt-0.5">
            {item.product.description}
          </div>
        )}
        <div className="flex gap-1 mt-1 flex-wrap">
          {item.isFeatured && (
            <Badge variant="default" className="text-[10px] h-4 bg-amber-500">
              <Star className="mr-0.5 h-2 w-2" />
              Destacado
            </Badge>
          )}
          {!item.isAvailable && (
            <Badge variant="secondary" className="text-[10px] h-4">
              No disponible
            </Badge>
          )}
          {item.product?.basePrice && (
            <Badge variant="outline" className="text-[10px] h-4">
              ${item.customPrice ? item.customPrice : item.product.basePrice}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleToggleFeatured}
          disabled={isLoading}
          title={item.isFeatured ? "Quitar destacado" : "Marcar como destacado"}
        >
          <Star
            className={`h-3.5 w-3.5 ${
              item.isFeatured ? "fill-amber-500 text-amber-500" : ""
            }`}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleToggleAvailability}
          disabled={isLoading}
          title={
            item.isAvailable ? "Marcar no disponible" : "Marcar disponible"
          }
        >
          {item.isAvailable ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-blue-600"
          onClick={() => setIsEditOpen(true)}
          disabled={isLoading}
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-600"
          onClick={handleRemove}
          disabled={isLoading}
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <EditMenuItemDialog
        item={item}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onUpdate={onUpdate}
      />
    </div>
  );
}
