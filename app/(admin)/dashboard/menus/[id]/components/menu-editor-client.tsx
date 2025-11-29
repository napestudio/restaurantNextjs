"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SerializedMenu } from "@/actions/menus";
import { createMenu, updateMenu, getMenu } from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Save,
  Eye,
  Settings,
  Layers,
  Loader2,
} from "lucide-react";
import { MenuSectionsEditor } from "../../components/menu-sections-editor";
import { SITE_URL } from "@/lib/constants";

interface MenuEditorClientProps {
  menu: SerializedMenu | null;
}

const DAYS_OF_WEEK = [
  { value: "monday", label: "Lun" },
  { value: "tuesday", label: "Mar" },
  { value: "wednesday", label: "Mié" },
  { value: "thursday", label: "Jue" },
  { value: "friday", label: "Vie" },
  { value: "saturday", label: "Sáb" },
  { value: "sunday", label: "Dom" },
];

export function MenuEditorClient({ menu: initialMenu }: MenuEditorClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [activePanel, setActivePanel] = useState<"settings" | "content">("settings");
  const [menu, setMenu] = useState<SerializedMenu | null>(initialMenu);

  // Form state
  const [name, setName] = useState(initialMenu?.name || "");
  const [slug, setSlug] = useState(initialMenu?.slug || "");
  const [description, setDescription] = useState(initialMenu?.description || "");
  const [isActive, setIsActive] = useState(initialMenu?.isActive ?? true);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(initialMenu?.daysOfWeek || []);

  // Initialize time values
  useEffect(() => {
    if (initialMenu?.availableFrom) {
      try {
        const date = new Date(initialMenu.availableFrom);
        setAvailableFrom(
          `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
        );
      } catch {
        setAvailableFrom("");
      }
    }

    if (initialMenu?.availableUntil) {
      try {
        const date = new Date(initialMenu.availableUntil);
        setAvailableUntil(
          `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
        );
      } catch {
        setAvailableUntil("");
      }
    }
  }, [initialMenu]);

  // Auto-generate slug from name for new menus
  useEffect(() => {
    if (!initialMenu && name) {
      const generatedSlug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generatedSlug);
    }
  }, [name, initialMenu]);

  const handleToggleDay = (day: string) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      alert("El nombre y el slug son obligatorios");
      return;
    }

    setIsSaving(true);
    try {
      if (menu) {
        // Update existing menu
        const result = await updateMenu(menu.id, {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          isActive,
          availableFrom: availableFrom || undefined,
          availableUntil: availableUntil || undefined,
          daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : undefined,
        });

        if (result.success && result.menu) {
          // Fetch updated menu with sections
          const updatedFull = await getMenu(menu.id);
          if (updatedFull) {
            setMenu(updatedFull);
          }
          alert("Menú actualizado correctamente");
        } else {
          alert(result.error || "Error al actualizar el menú");
        }
      } else {
        // Create new menu - we need restaurant ID
        const restaurantId = process.env.NEXT_PUBLIC_RESTAURANT_ID || "";

        const result = await createMenu({
          restaurantId,
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          isActive,
          availableFrom: availableFrom || undefined,
          availableUntil: availableUntil || undefined,
          daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : undefined,
        });

        if (result.success && result.menu) {
          // Fetch full menu data
          const newFull = await getMenu(result.menu.id);
          if (newFull) {
            setMenu(newFull);
            // Redirect to the new menu's edit page
            router.push(`/dashboard/menus/${result.menu.id}`);
          }
        } else {
          alert(result.error || "Error al crear el menú");
        }
      }
    } catch (error) {
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
        setMenu(updated);
      }
    }
  };

  const menuUrl = menu ? `${SITE_URL}/carta/${menu.slug}` : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar - Similar to Elementor */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/menus")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {menu ? name : "Nuevo Menú"}
              </span>
              {menu && slug && (
                <span className="text-xs text-gray-500">/{slug}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {menu && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(menuUrl, "_blank")}
              >
                <Eye className="h-4 w-4 mr-2" />
                Vista Previa
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
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
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="flex h-[calc(100vh-61px)]">
        {/* Left Sidebar - Panel Selector */}
        <div className="w-16 bg-gray-800 flex flex-col items-center py-4 gap-2">
          <button
            onClick={() => setActivePanel("settings")}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              activePanel === "settings"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
            title="Configuración"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={() => setActivePanel("content")}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              activePanel === "content"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
            title="Contenido"
            disabled={!menu}
          >
            <Layers className="h-5 w-5" />
          </button>
        </div>

        {/* Settings/Content Panel */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          {activePanel === "settings" ? (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Configuración del Menú
                </h2>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Menú Principal"
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
                  URL: /carta/{slug || "..."}
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción del menú"
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
                  Menú activo
                </Label>
              </div>

              {/* Time Range */}
              <div className="space-y-3">
                <Label>Horario de disponibilidad</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="availableFrom" className="text-xs">
                      Desde
                    </Label>
                    <Input
                      id="availableFrom"
                      type="time"
                      value={availableFrom}
                      onChange={(e) => setAvailableFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availableUntil" className="text-xs">
                      Hasta
                    </Label>
                    <Input
                      id="availableUntil"
                      type="time"
                      value={availableUntil}
                      onChange={(e) => setAvailableUntil(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Days of Week */}
              <div className="space-y-3">
                <Label>Días disponibles</Label>
                <div className="grid grid-cols-4 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleToggleDay(day.value)}
                      className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                        daysOfWeek.includes(day.value)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {daysOfWeek.length === 0
                    ? "Disponible todos los días"
                    : `${daysOfWeek.length} día${daysOfWeek.length > 1 ? "s" : ""} seleccionado${daysOfWeek.length > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Secciones y Productos
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Organiza los productos en secciones para estructurar tu menú
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area - Preview/Editor */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
          {activePanel === "content" && menu ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <MenuSectionsEditor
                  menu={menu}
                  restaurantId={menu.restaurantId}
                  onUpdate={handleMenuSectionsUpdated}
                />
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {/* Preview of the menu */}
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {name || "Nombre del Menú"}
                    </h1>
                    {description && (
                      <p className="mt-2 text-gray-600">{description}</p>
                    )}
                  </div>

                  {!menu && (
                    <div className="mt-8 p-8 bg-gray-50 rounded-lg text-center">
                      <Layers className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 font-medium">
                        Guarda el menú para comenzar a agregar secciones y productos
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Completa la configuración básica y haz clic en Guardar
                      </p>
                    </div>
                  )}

                  {menu && menu.menuSections && menu.menuSections.length === 0 && (
                    <div className="mt-8 p-8 bg-gray-50 rounded-lg text-center">
                      <Layers className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 font-medium">
                        No hay secciones en este menú
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Cambia a la pestaña de Contenido para agregar secciones y productos
                      </p>
                    </div>
                  )}

                  {menu && menu.menuSections && menu.menuSections.length > 0 && (
                    <div className="space-y-6 mt-8">
                      {menu.menuSections.map((section) => (
                        <div key={section.id} className="border-b border-gray-200 pb-6">
                          <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            {section.name}
                          </h2>
                          {section.description && (
                            <p className="text-sm text-gray-600 mb-3">
                              {section.description}
                            </p>
                          )}
                          <div className="text-sm text-gray-500">
                            {section.menuItems?.length || 0} producto(s)
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
