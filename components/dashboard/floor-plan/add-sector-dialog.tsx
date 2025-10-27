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
import { createSector } from "@/actions/Sector";
import { useToast } from "@/hooks/use-toast";

interface AddSectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onSectorAdded?: () => void;
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

export function AddSectorDialog({
  open,
  onOpenChange,
  branchId,
  onSectorAdded,
}: AddSectorDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLORS[0].value);
  const [width, setWidth] = useState("1200");
  const [height, setHeight] = useState("800");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
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
      const result = await createSector({
        name: name.trim(),
        color,
        branchId,
        width: parseInt(width) || 1200,
        height: parseInt(height) || 800,
      });

      if (result.success) {
        toast({
          title: "Sector creado",
          description: `El sector "${name}" ha sido creado exitosamente`,
        });
        setName("");
        setColor(DEFAULT_COLORS[0].value);
        setWidth("1200");
        setHeight("800");
        onOpenChange(false);
        onSectorAdded?.();
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al crear el sector",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating sector:", error);
      toast({
        title: "Error",
        description: "Error inesperado al crear el sector",
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
          <DialogTitle>Agregar Nuevo Sector</DialogTitle>
          <DialogDescription>
            Crea un nuevo sector para organizar tus mesas (ej: Patio, Bar,
            Segundo Piso)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="sector-name">Nombre del Sector *</Label>
            <Input
              id="sector-name"
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
              Selecciona un color para identificar visualmente este sector
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sector-width">Ancho del Plano (px)</Label>
              <Input
                id="sector-width"
                type="number"
                min="400"
                max="5000"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="1200"
              />
            </div>
            <div>
              <Label htmlFor="sector-height">Alto del Plano (px)</Label>
              <Input
                id="sector-height"
                type="number"
                min="400"
                max="5000"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="800"
              />
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
            {isLoading ? "Creando..." : "Agregar Sector"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
