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

// Default color for stations (not user-configurable)
const DEFAULT_STATION_COLOR = "#6366f1";

export function CreateStationDialog({
  open,
  onOpenChange,
  branchId,
  onCreated,
}: CreateStationDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const result = await createStation({
        name: name.trim(),
        description: description.trim() || undefined,
        color: DEFAULT_STATION_COLOR,
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
