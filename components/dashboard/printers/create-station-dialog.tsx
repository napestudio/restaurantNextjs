"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";
import { createStation } from "@/actions/Station";

interface CreateStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onCreated: (station: any) => void;
}

const PRESET_COLORS = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#10b981" },
  { name: "Naranja", value: "#f59e0b" },
  { name: "Rojo", value: "#ef4444" },
  { name: "Púrpura", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
];

export function CreateStationDialog({
  open,
  onOpenChange,
  branchId,
  onCreated,
}: CreateStationDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateColor = (colorValue: string) => {
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    return colorRegex.test(colorValue);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    if (!validateColor(color)) {
      setError("Color inválido (debe ser formato hex, ej: #3b82f6)");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const result = await createStation({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        branchId,
      });

      if (result.success && result.data) {
        onCreated(result.data);
        resetForm();
      } else {
        setError(result.error || "Error al crear la estación");
      }
    } catch {
      setError("Error al crear la estación");
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setColor("#6366f1");
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Nueva Estación
          </DialogTitle>
          <DialogDescription>
            Crea una nueva estación de trabajo (cocina, bar, postres, etc.)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cocina Principal"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional..."
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="space-y-3">
              <div className="flex gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setColor(preset.value)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      color === preset.value
                        ? "border-gray-900 scale-110"
                        : "border-gray-300"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                    disabled={isPending}
                  />
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-10"
                  disabled={isPending}
                />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-orange-500 hover:bg-orange-600"
            disabled={isPending || !name.trim()}
          >
            {isPending ? "Creando..." : "Crear Estación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
