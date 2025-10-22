"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSector, deleteSector } from "@/actions/Sector";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

interface Sector {
  id: string;
  name: string;
  color: string;
  order: number;
  width: number;
  height: number;
  _count: {
    tables: number;
  };
}

interface EditSectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sector: Sector | null;
  onSectorUpdated?: () => void;
}

const DEFAULT_COLORS = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#10b981" },
  { name: "Ámbar", value: "#f59e0b" },
  { name: "Rojo", value: "#ef4444" },
  { name: "Púrpura", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Índigo", value: "#6366f1" },
];

export function EditSectorDialog({
  open,
  onOpenChange,
  sector,
  onSectorUpdated,
}: EditSectorDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLORS[0].value);
  const [width, setWidth] = useState("1200");
  const [height, setHeight] = useState("800");
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const { toast } = useToast();

  // Update form when sector changes
  useEffect(() => {
    if (sector) {
      setName(sector.name);
      setColor(sector.color);
      setWidth(sector.width.toString());
      setHeight(sector.height.toString());
    }
  }, [sector]);

  const handleSubmit = async () => {
    if (!sector) return;

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del sector es requerido",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateSector(sector.id, {
        name: name.trim(),
        color,
        width: parseInt(width) || 1200,
        height: parseInt(height) || 800,
      });

      if (result.success) {
        toast({
          title: "Sector actualizado",
          description: `El sector ha sido actualizado exitosamente`,
        });
        onOpenChange(false);
        onSectorUpdated?.();
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al actualizar el sector",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating sector:", error);
      toast({
        title: "Error",
        description: "Error inesperado al actualizar el sector",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sector) return;

    setIsLoading(true);

    try {
      const result = await deleteSector(sector.id);

      if (result.success) {
        toast({
          title: "Sector eliminado",
          description: `El sector "${sector.name}" ha sido eliminado`,
        });
        setShowDeleteAlert(false);
        onOpenChange(false);
        onSectorUpdated?.();
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al eliminar el sector",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting sector:", error);
      toast({
        title: "Error",
        description: "Error inesperado al eliminar el sector",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowDeleteAlert(false);
    }
  };

  if (!sector) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sector</DialogTitle>
            <DialogDescription>
              Modifica los detalles del sector o elimínalo si ya no lo
              necesitas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="sector-name-edit">Nombre del Sector *</Label>
              <Input
                id="sector-name-edit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Patio, Bar, Segundo Piso"
                required
              />
            </div>

            <div>
              <Label>Color de Identificación</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {DEFAULT_COLORS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setColor(colorOption.value)}
                    className={`h-10 rounded-md border-2 transition-all ${
                      color === colorOption.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:border-muted-foreground"
                    }`}
                    style={{ backgroundColor: colorOption.value }}
                    title={colorOption.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="custom-color-edit">
                Color Personalizado (Opcional)
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="custom-color-edit"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{color}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sector-width-edit">Ancho del Plano (px)</Label>
                <Input
                  id="sector-width-edit"
                  type="number"
                  min="400"
                  max="5000"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="1200"
                />
              </div>
              <div>
                <Label htmlFor="sector-height-edit">Alto del Plano (px)</Label>
                <Input
                  id="sector-height-edit"
                  type="number"
                  min="400"
                  max="5000"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="800"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Mesas en este sector:
                </span>
                <span className="font-semibold">{sector._count.tables}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAlert(true)}
              disabled={isLoading || sector._count.tables > 0}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar Sector
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-red-600 hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </DialogFooter>
          {sector._count.tables > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              * No se puede eliminar un sector que tiene mesas asignadas
            </p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              sector &quot;{sector.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
