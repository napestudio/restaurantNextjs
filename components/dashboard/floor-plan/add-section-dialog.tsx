"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { createSection } from "@/actions/Section";
import { useToast } from "@/hooks/use-toast";

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onSectionAdded?: () => void;
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

export function AddSectionDialog({
  open,
  onOpenChange,
  branchId,
  onSectionAdded,
}: AddSectionDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLORS[0].value);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
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
      const result = await createSection({
        name: name.trim(),
        color,
        branchId,
      });

      if (result.success) {
        toast({
          title: "Sección creada",
          description: `La sección "${name}" ha sido creada exitosamente`,
        });
        setName("");
        setColor(DEFAULT_COLORS[0].value);
        onOpenChange(false);
        onSectionAdded?.();
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al crear la sección",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating section:", error);
      toast({
        title: "Error",
        description: "Error inesperado al crear la sección",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Nueva Sección</DialogTitle>
          <DialogDescription>
            Crea una nueva sección para organizar tus mesas (ej: Patio, Bar,
            Segundo Piso)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="section-name">Nombre de la Sección *</Label>
            <Input
              id="section-name"
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
            <p className="text-xs text-muted-foreground mt-2">
              Selecciona un color para identificar visualmente esta sección
            </p>
          </div>

          <div>
            <Label htmlFor="custom-color">Color Personalizado (Opcional)</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="custom-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 h-10 cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">{color}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
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
            {isLoading ? "Creando..." : "Agregar Sección"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
