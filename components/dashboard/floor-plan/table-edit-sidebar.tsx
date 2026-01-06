"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Trash2,
  Users,
  LayoutGrid,
  Circle,
  Square,
  RectangleHorizontal,
  RectangleVertical,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { FloorTable } from "@/lib/floor-plan-utils";
import type { TableShapeType } from "@/types/table";

interface TableEditSidebarProps {
  table: FloorTable | null;
  open: boolean;
  onClose: () => void;
  onUpdateCapacity: (tableId: string, capacity: number) => void;
  onUpdateShape: (tableId: string, shape: TableShapeType) => void;
  onUpdateIsShared: (tableId: string, isShared: boolean) => void;
  onDelete: (tableId: string) => void;
}

export function TableEditSidebar({
  table,
  open,
  onClose,
  onUpdateCapacity,
  onUpdateShape,
  onUpdateIsShared,
  onDelete,
}: TableEditSidebarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!table) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      onDelete(table.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleCapacityChange = (value: string) => {
    onUpdateCapacity(table.id, Number.parseInt(value));
  };

  const handleShapeChange = (value: TableShapeType) => {
    onUpdateShape(table.id, value);
  };

  const handleIsSharedChange = (checked: boolean) => {
    onUpdateIsShared(table.id, checked);
  };

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
          "fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="bg-red-500 text-white p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Mesa {table.number}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-amber-600"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Shape */}
          <div className="space-y-2">
            <Label
              htmlFor="edit-shape"
              className="text-sm text-muted-foreground"
            >
              Forma de la Mesa
            </Label>
            <Select value={table.shape} onValueChange={handleShapeChange}>
              <SelectTrigger id="edit-shape" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CIRCLE">
                  <div className="flex items-center space-x-2">
                    <Circle className="h-4 w-4" />
                    <span>Círculo</span>
                  </div>
                </SelectItem>
                <SelectItem value="SQUARE">
                  <div className="flex items-center space-x-2">
                    <Square className="h-4 w-4" />
                    <span>Cuadrada</span>
                  </div>
                </SelectItem>
                <SelectItem value="RECTANGLE">
                  <div className="flex items-center space-x-2">
                    <RectangleHorizontal className="h-4 w-4" />
                    <span>Rectangular</span>
                  </div>
                </SelectItem>
                <SelectItem value="WIDE">
                  <div className="flex items-center space-x-2">
                    <RectangleVertical className="h-4 w-4" />
                    <span>Barra</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label
              htmlFor="edit-capacity"
              className="text-sm text-muted-foreground"
            >
              Capacidad
            </Label>
            <Select
              value={table.capacity.toString()}
              onValueChange={handleCapacityChange}
            >
              <SelectTrigger id="edit-capacity" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>
                        {num} {num === 1 ? "comensal" : "comensales"}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Numero maximo de comensales
            </p>
          </div>

          {/* Is Shared */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="edit-is-shared"
              checked={table.isShared}
              onCheckedChange={(checked) =>
                handleIsSharedChange(checked === true)
              }
            />
            <Label
              htmlFor="edit-is-shared"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Mesa compartida (puede tener múltiples reservas)
            </Label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t p-4">
          <Button
            onClick={() => setDeleteDialogOpen(true)}
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Mesa
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar mesa {table.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. La mesa sera eliminada
              permanentemente del plano de planta.
              {table.isShared && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Esta es una mesa compartida y puede tener reservas asociadas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
