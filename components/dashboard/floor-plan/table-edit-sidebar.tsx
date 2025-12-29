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
import { X, Trash2, Users, LayoutGrid } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { FloorTable } from "@/lib/floor-plan-utils";

interface TableEditSidebarProps {
  table: FloorTable | null;
  open: boolean;
  onClose: () => void;
  onUpdateCapacity: (tableId: string, capacity: number) => void;
  onDelete: (tableId: string) => void;
}

export function TableEditSidebar({
  table,
  open,
  onClose,
  onUpdateCapacity,
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
        <div className="bg-amber-500 text-white p-4 flex items-center justify-between sticky top-0 z-10">
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
          {/* Table Number */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Numero de Mesa
            </Label>
            <div className="text-2xl font-bold">{table.number}</div>
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
                {[2, 4, 6, 8, 10, 12].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>{num} comensales</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Numero maximo de comensales
            </p>
          </div>

          {/* Table Info */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium text-sm text-muted-foreground">
              Informacion
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Forma:</span>
                <p className="font-medium">
                  {table.shape === "CIRCLE"
                    ? "Circulo"
                    : table.shape === "SQUARE"
                    ? "Cuadrada"
                    : table.shape === "RECTANGLE"
                    ? "Rectangular"
                    : "Barra"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Tamano:</span>
                <p className="font-medium">
                  {table.width}x{table.height}
                </p>
              </div>
              {table.isShared && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">
                    Mesa compartida:
                  </span>
                  <p className="font-medium">Si</p>
                </div>
              )}
            </div>
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
