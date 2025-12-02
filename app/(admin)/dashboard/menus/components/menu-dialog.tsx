"use client";

import { useState, useEffect } from "react";
import type { SerializedMenu } from "@/actions/menus";
import { createMenu, updateMenu, getMenu } from "@/actions/menus";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuSectionsEditor } from "./menu-sections-editor";

interface MenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: SerializedMenu | null;
  restaurantId: string;
  onMenuCreated: (menu: SerializedMenu) => void;
  onMenuUpdated: (menu: SerializedMenu) => void;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { value: "monday", label: "Lunes" },
  { value: "tuesday", label: "Martes" },
  { value: "wednesday", label: "Miércoles" },
  { value: "thursday", label: "Jueves" },
  { value: "friday", label: "Viernes" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

export function MenuDialog({
  open,
  onOpenChange,
  menu,
  restaurantId,
  onMenuCreated,
  onMenuUpdated,
  onClose,
}: MenuDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [fullMenu, setFullMenu] = useState<SerializedMenu | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [showPrices, setShowPrices] = useState(true);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);

  // Load full menu data when editing
  useEffect(() => {
    if (menu && open) {
      // Fetch full menu data with sections
      getMenu(menu.id).then((fullData) => {
        if (fullData) {
          setFullMenu(fullData);
        }
      });

      // Set form fields
      setName(menu.name);
      setSlug(menu.slug);
      setDescription(menu.description || "");
      setIsActive(menu.isActive);
      setShowPrices(menu.showPrices ?? true);
      setDaysOfWeek(menu.daysOfWeek);

      // Format time values
      if (menu.availableFrom) {
        try {
          const date = new Date(menu.availableFrom);
          setAvailableFrom(
            `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
          );
        } catch {
          setAvailableFrom("");
        }
      } else {
        setAvailableFrom("");
      }

      if (menu.availableUntil) {
        try {
          const date = new Date(menu.availableUntil);
          setAvailableUntil(
            `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
          );
        } catch {
          setAvailableUntil("");
        }
      } else {
        setAvailableUntil("");
      }
    } else if (!menu && open) {
      // Reset form for new menu
      setFullMenu(null);
      setName("");
      setSlug("");
      setDescription("");
      setIsActive(true);
      setShowPrices(true);
      setAvailableFrom("");
      setAvailableUntil("");
      setDaysOfWeek([]);
      setActiveTab("basic");
    }
  }, [menu, open]);

  // Auto-generate slug from name (only for edit mode)
  useEffect(() => {
    if (menu && name && !slug) {
      const generatedSlug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generatedSlug);
    }
  }, [name, menu, slug]);

  const handleToggleDay = (day: string) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    setIsSaving(true);
    try {
      if (menu) {
        // Update existing menu
        if (!slug.trim()) {
          alert("El slug es obligatorio");
          setIsSaving(false);
          return;
        }

        const result = await updateMenu(menu.id, {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          isActive,
          showPrices,
          availableFrom: availableFrom || undefined,
          availableUntil: availableUntil || undefined,
          daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : undefined,
        });

        if (result.success && result.menu) {
          // Fetch updated menu with sections
          const updatedFull = await getMenu(menu.id);
          if (updatedFull) {
            onMenuUpdated(updatedFull);
          }
          onClose();
        } else {
          alert(result.error || "Error al actualizar el menú");
        }
      } else {
        // Create new menu - generate unique slug
        const baseSlug = name
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        // Add timestamp to ensure uniqueness
        const uniqueSlug = `${baseSlug}-${Date.now()}`;

        const result = await createMenu({
          restaurantId,
          name: name.trim(),
          slug: uniqueSlug,
          isActive: true, // Always active by default
        });

        if (result.success && result.menu) {
          // Fetch full menu data with sections
          const newFull = await getMenu(result.menu.id);
          if (newFull) {
            onMenuCreated(newFull);
          }
          onClose();
        } else {
          alert(result.error || "Error al crear el menú");
        }
      }
    } catch {
      alert("Error al guardar el menú");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMenuSectionsUpdated = async () => {
    if (menu) {
      // Refresh full menu data
      const updated = await getMenu(menu.id);
      if (updated) {
        setFullMenu(updated);
        onMenuUpdated(updated);
      }
    }
  };

  // Simple create mode - only show name field
  if (!menu) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Menú</DialogTitle>
            <DialogDescription>
              Ingresa el nombre del menú. Podrás configurar los detalles después.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre del Menú <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Menú Principal, Menú Ejecutivo"
                autoFocus
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                {isSaving ? "Creando..." : "Crear Menú"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Edit mode - show full form with tabs
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Menú</DialogTitle>
          <DialogDescription>
            Actualiza la información del menú y gestiona sus secciones
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Información Básica</TabsTrigger>
            <TabsTrigger value="sections">
              Secciones y Productos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre del Menú <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Menú Principal, Menú Ejecutivo"
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="menu-principal"
              />
              <p className="text-xs text-gray-500">
                URL amigable para el menú (ej. /menu-principal)
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del menú para tus clientes"
                rows={3}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked as boolean)}
              />
              <Label htmlFor="isActive" className="font-normal cursor-pointer">
                Menú activo (visible para clientes)
              </Label>
            </div>

            {/* Show Prices */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showPrices"
                checked={showPrices}
                onCheckedChange={(checked) => setShowPrices(checked as boolean)}
              />
              <Label htmlFor="showPrices" className="font-normal cursor-pointer">
                Mostrar precios en el menú público
              </Label>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="availableFrom">Disponible desde</Label>
                <Input
                  id="availableFrom"
                  type="time"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="availableUntil">Disponible hasta</Label>
                <Input
                  id="availableUntil"
                  type="time"
                  value={availableUntil}
                  onChange={(e) => setAvailableUntil(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Deja vacío para disponibilidad todo el día
            </p>

            {/* Days of Week */}
            <div className="space-y-2">
              <Label>Días de la semana</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={day.value}
                      checked={daysOfWeek.includes(day.value)}
                      onCheckedChange={() => handleToggleDay(day.value)}
                    />
                    <Label
                      htmlFor={day.value}
                      className="font-normal cursor-pointer"
                    >
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {daysOfWeek.length === 0
                  ? "Selecciona los días o deja vacío para todos los días"
                  : `Disponible: ${daysOfWeek.length} día${daysOfWeek.length > 1 ? "s" : ""}`}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="sections" className="mt-4">
            {fullMenu && (
              <MenuSectionsEditor
                menu={fullMenu}
                restaurantId={restaurantId}
                onUpdate={handleMenuSectionsUpdated}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
