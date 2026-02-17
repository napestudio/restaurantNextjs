"use client";

import { useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
} from "lucide-react";
import type { SerializedHomePageLink } from "@/actions/HomePageLinks";
import {
  deleteHomePageLink,
  toggleHomePageLinkStatus,
} from "@/actions/HomePageLinks";
import { useToast } from "@/hooks/use-toast";

interface SortableLinkItemProps {
  link: SerializedHomePageLink;
  onEdit: () => void;
  onLinkUpdated: (link: SerializedHomePageLink) => void;
  onLinkDeleted: (id: string) => void;
}

export function SortableLinkItem({
  link,
  onEdit,
  onLinkUpdated,
  onLinkDeleted,
}: SortableLinkItemProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleToggleStatus = () => {
    startTransition(async () => {
      const result = await toggleHomePageLinkStatus(link.id);
      if (result.success && result.data) {
        toast({
          title: "Estado actualizado",
          description: `El enlace está ahora ${!link.isActive ? "activo" : "inactivo"}`,
        });
        // Optimistic update
        onLinkUpdated(result.data);
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al cambiar estado",
          variant: "destructive",
        });
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("¿Eliminar este enlace?")) return;

    // Optimistically remove from UI immediately
    onLinkDeleted(link.id);

    startTransition(async () => {
      const result = await deleteHomePageLink(link.id);
      if (result.success) {
        toast({
          title: "Enlace eliminado",
          description: "El enlace se eliminó correctamente",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al eliminar enlace",
          variant: "destructive",
        });
        // Note: In a production app, you'd want to revert the deletion here
        // by re-fetching or keeping a backup of the deleted item
      }
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "MENU":
        return "Menú";
      case "TIMESLOT":
        return "Horario";
      case "RESERVATION":
        return "Reservas";
      case "PEDIDOS":
        return "Pedidos";
      case "CUSTOM":
        return "Personalizado";
      default:
        return type;
    }
  };

  const getTargetLabel = () => {
    switch (link.type) {
      case "MENU":
        return link.menu?.name || "Sin menú";
      case "TIMESLOT":
        return link.timeSlot?.name || "Sin horario";
      case "RESERVATION":
        return "Página de reservas";
      case "PEDIDOS":
        return "Página de pedidos";
      case "CUSTOM":
        return link.customUrl || "Sin URL";
      default:
        return "";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 bg-white border rounded-lg ${
        isDragging ? "opacity-50 shadow-lg border-blue-500" : "border-gray-200"
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded touch-none"
        disabled={isPending}
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </button>

      {/* Link info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{link.label}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {getTargetLabel()}
        </div>
        <div className="flex gap-1 mt-1">
          <Badge variant="outline" className="text-[10px] h-4">
            {getTypeLabel(link.type)}
          </Badge>
          {!link.isActive && (
            <Badge variant="secondary" className="text-[10px] h-4">
              Inactivo
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
          onClick={handleToggleStatus}
          disabled={isPending}
          title={link.isActive ? "Desactivar" : "Activar"}
        >
          {link.isActive ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-blue-600"
          onClick={onEdit}
          disabled={isPending}
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-600"
          onClick={handleDelete}
          disabled={isPending}
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
