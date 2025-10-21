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
import { updateSection, deleteSection } from "@/actions/Section";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

interface Section {
  id: string;
  name: string;
  color: string;
  order: number;
  _count: {
    tables: number;
  };
}

interface EditSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: Section | null;
  onSectionUpdated?: () => void;
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

export function EditSectionDialog({
  open,
  onOpenChange,
  section,
  onSectionUpdated,
}: EditSectionDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLORS[0].value);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const { toast } = useToast();

  // Update form when section changes
  useEffect(() => {
    if (section) {
      setName(section.name);
      setColor(section.color);
    }
  }, [section]);

  const handleSubmit = async () => {
    if (!section) return;

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la sección es requerido",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateSection(section.id, {
        name: name.trim(),
        color,
      });

      if (result.success) {
        toast({
          title: "Sección actualizada",
          description: `La sección ha sido actualizada exitosamente`,
        });
        onOpenChange(false);
        onSectionUpdated?.();
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al actualizar la sección",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating section:", error);
      toast({
        title: "Error",
        description: "Error inesperado al actualizar la sección",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!section) return;

    setIsLoading(true);

    try {
      const result = await deleteSection(section.id);

      if (result.success) {
        toast({
          title: "Sección eliminada",
          description: `La sección "${section.name}" ha sido eliminada`,
        });
        setShowDeleteAlert(false);
        onOpenChange(false);
        onSectionUpdated?.();
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al eliminar la sección",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting section:", error);
      toast({
        title: "Error",
        description: "Error inesperado al eliminar la sección",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowDeleteAlert(false);
    }
  };

  if (!section) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sección</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la sección o elimínala si ya no la
              necesitas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="section-name-edit">Nombre de la Sección *</Label>
              <Input
                id="section-name-edit"
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

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Mesas en esta sección:
                </span>
                <span className="font-semibold">{section._count.tables}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAlert(true)}
              disabled={isLoading || section._count.tables > 0}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar Sección
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
          {section._count.tables > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              * No se puede eliminar una sección que tiene mesas asignadas
            </p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la
              sección &quot;{section.name}&quot;.
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
