"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Settings, Printer, Tag, Loader2 } from "lucide-react";
import {
  updateStation,
  assignCategoriesToStation,
  getStationWithDetails,
  getCategoriesByRestaurant,
} from "@/actions/Station";
import type { Station, Category, PrinterStatus } from "@/app/generated/prisma";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type StationWithCounts = Station & {
  _count: {
    printers: number;
    stationCategories: number;
  };
};

type StationWithDetails = Station & {
  printers: {
    id: string;
    name: string;
    status: PrinterStatus;
    isActive: boolean;
  }[];
  stationCategories: {
    category: {
      id: string;
      name: string;
    };
  }[];
  branch: {
    restaurantId: string;
  };
};

interface StationDetailsSidebarProps {
  station: StationWithCounts | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (station: StationWithCounts) => void;
}

// Default color for stations (not user-configurable)
const DEFAULT_STATION_COLOR = "#6366f1";

export function StationDetailsSidebar({
  station,
  open,
  onClose,
  onUpdate,
}: StationDetailsSidebarProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Full station details
  const [stationDetails, setStationDetails] =
    useState<StationWithDetails | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Category selection state
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Load full station details when station changes
  useEffect(() => {
    if (station && open) {
      setIsLoading(true);
      setError(null);

      Promise.all([
        getStationWithDetails(station.id),
        // We'll get the restaurantId from station details
      ])
        .then(async ([detailsResult]) => {
          if (detailsResult.success && detailsResult.data) {
            setStationDetails(detailsResult.data);

            // Initialize form data
            setFormData({
              name: detailsResult.data.name,
              description: detailsResult.data.description || "",
            });

            // Initialize selected categories
            setSelectedCategoryIds(
              detailsResult.data.stationCategories.map((sc) => sc.category.id)
            );

            // Fetch all categories for this restaurant
            const categoriesResult = await getCategoriesByRestaurant(
              detailsResult.data.branch.restaurantId
            );
            if (categoriesResult.success && categoriesResult.data) {
              setAllCategories(categoriesResult.data);
            }
          } else {
            setError(detailsResult.error || "Error al cargar la estación");
          }
        })
        .catch(() => {
          setError("Error al cargar la estación");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [station, open]);

  // Reset form when sidebar closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setError(null);
    }
  }, [open]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = async () => {
    if (!station) return;

    setIsSaving(true);
    setError(null);

    try {
      // Update station basic info
      const updateResult = await updateStation(station.id, {
        name: formData.name,
        description: formData.description || undefined,
        color: DEFAULT_STATION_COLOR,
      });

      if (!updateResult.success) {
        setError(updateResult.error || "Error al actualizar la estación");
        return;
      }

      // Update category assignments
      const categoriesResult = await assignCategoriesToStation(
        station.id,
        selectedCategoryIds
      );

      if (!categoriesResult.success) {
        setError(categoriesResult.error || "Error al asignar categorías");
        return;
      }

      // Update parent with new counts
      const updatedStation: StationWithCounts = {
        ...station,
        name: formData.name,
        description: formData.description || null,
        color: DEFAULT_STATION_COLOR,
        _count: {
          ...station._count,
          stationCategories: selectedCategoryIds.length,
        },
      };

      onUpdate(updatedStation);
      setIsEditing(false);

      toast({
        title: "Éxito",
        description: "Estación actualizada correctamente",
      });
    } catch {
      setError("Error al actualizar la estación");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (stationDetails) {
      setFormData({
        name: stationDetails.name,
        description: stationDetails.description || "",
      });
      setSelectedCategoryIds(
        stationDetails.stationCategories.map((sc) => sc.category.id)
      );
    }
    setIsEditing(false);
    setError(null);
  };

  if (!station) return null;

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
          "fixed top-0 right-0 h-full w-full sm:w-112.5 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div
          className="text-white p-4 flex items-center justify-between sticky top-0 z-10"
          style={{ backgroundColor: station.color }}
        >
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Detalles de Estación</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">
                Información Básica
              </h3>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={isSaving}
                  />
                ) : (
                  <p className="text-sm font-medium">{station.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                {isEditing ? (
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Descripción de la estación..."
                    rows={3}
                    disabled={isSaving}
                  />
                ) : (
                  <p className="text-sm">
                    {stationDetails?.description || "—"}
                  </p>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categorías Asignadas
              </h3>

              <p className="text-sm text-muted-foreground">
                {isEditing
                  ? "Selecciona las categorías de productos que se preparan en esta estación. Los pedidos con estos productos se imprimirán aquí."
                  : "Estas categorías determinan qué productos se imprimen en las impresoras de esta estación."}
              </p>

              {isEditing ? (
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {allCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay categorías disponibles
                    </p>
                  ) : (
                    allCategories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedCategoryIds.includes(category.id)}
                          onCheckedChange={() =>
                            handleCategoryToggle(category.id)
                          }
                          disabled={isSaving}
                        />
                        <span className="text-sm">{category.name}</span>
                      </label>
                    ))
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stationDetails?.stationCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sin categorías asignadas
                    </p>
                  ) : (
                    stationDetails?.stationCategories.map((sc) => (
                      <Badge
                        key={sc.category.id}
                        variant="secondary"
                        className="text-sm"
                      >
                        {sc.category.name}
                      </Badge>
                    ))
                  )}
                </div>
              )}

              {!isEditing && selectedCategoryIds.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  <strong>Atención:</strong> Sin categorías asignadas, las
                  impresoras de esta estación no recibirán pedidos
                  automáticamente. Edita la estación para asignar categorías.
                </div>
              )}
            </div>

            {/* Printers */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Impresoras Asignadas
              </h3>

              {stationDetails?.printers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay impresoras asignadas a esta estación
                </p>
              ) : (
                <div className="space-y-2">
                  {stationDetails?.printers.map((printer) => (
                    <div
                      key={printer.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {printer.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            printer.status === "ONLINE"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : printer.status === "ERROR"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          )}
                        >
                          {printer.status === "ONLINE"
                            ? "En línea"
                            : printer.status === "ERROR"
                            ? "Error"
                            : "Fuera de línea"}
                        </Badge>
                        {!printer.isActive && (
                          <Badge variant="outline" className="text-xs">
                            Desactivada
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="pt-4 border-t text-xs text-gray-500 space-y-1">
              <p>
                <span className="font-medium">Impresoras:</span>{" "}
                {station._count.printers}
              </p>
              <p>
                <span className="font-medium">Categorías:</span>{" "}
                {selectedCategoryIds.length}
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t p-4">
          {isEditing ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !formData.name.trim()}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              disabled={isLoading}
              className="w-full bg-red-500 hover:bg-red-600"
            >
              Editar Estación
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
