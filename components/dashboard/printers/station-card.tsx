"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Printer, Tag, Trash2 } from "lucide-react";
import type { Station } from "@/app/generated/prisma";
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
import { deleteStation } from "@/actions/Station";
import { useToast } from "@/hooks/use-toast";

type StationWithCounts = Station & {
  _count: {
    printers: number;
    stationCategories: number;
  };
};

interface StationCardProps {
  station: StationWithCounts;
  onClick?: () => void;
  onUpdate: (station: StationWithCounts) => void;
  onDelete: (stationId: string) => void;
}

export function StationCard({ station, onClick, onUpdate, onDelete }: StationCardProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteStation(station.id);

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Estación eliminada exitosamente",
        });
        onDelete(station.id);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Error al eliminar la estación",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al eliminar la estación",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <div
        className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: station.color }}
            >
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-medium">{station.name}</h3>
              {station.description && (
                <p className="text-sm text-muted-foreground">
                  {station.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Printer className="h-4 w-4" />
              <span>Impresoras:</span>
            </div>
            <span className="font-medium">{station._count.printers}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4" />
              <span>Categorías:</span>
            </div>
            <span className="font-medium">
              {station._count.stationCategories}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Badge
              style={{ backgroundColor: station.color }}
              className="text-white"
            >
              {station.color}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteDialogOpen(true);
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la
              estación "{station.name}".
              {station._count.printers > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  Advertencia: Esta estación tiene {station._count.printers}{" "}
                  impresora(s) asignada(s). No podrás eliminarla hasta que las
                  reasignes.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || station._count.printers > 0}
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
