"use client";

import type { SerializedMenu } from "@/actions/menus";
import { createMenu, getMenu, updateMenu } from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SITE_URL } from "@/lib/constants";
import { ArrowLeft, Eye, Layers, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MenuSectionsEditor } from "../../components/menu-sections-editor";

interface MenuEditorClientProps {
  menu: SerializedMenu | null;
}

export function MenuEditorClient({ menu: initialMenu }: MenuEditorClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [menu, setMenu] = useState<SerializedMenu | null>(initialMenu);

  // Form state
  const [name, setName] = useState(initialMenu?.name || "");
  const [slug, setSlug] = useState(initialMenu?.slug || "");
  const [description, setDescription] = useState(
    initialMenu?.description || ""
  );
  const [isActive, setIsActive] = useState(initialMenu?.isActive ?? true);
  const [showPrices, setShowPrices] = useState(initialMenu?.showPrices ?? true);

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

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El nombre y el slug son obligatorios",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (menu) {
        // Update existing menu (slug cannot be changed after creation)
        const result = await updateMenu(menu.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          isActive,
          showPrices,
        });

        if (result.success && result.menu) {
          // Fetch updated menu with sections
          const updatedFull = await getMenu(menu.id);
          if (updatedFull) {
            setMenu(updatedFull);
          }
          toast({
            title: "Éxito",
            description: "Menú actualizado correctamente",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "Error al actualizar el menú",
          });
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
        });

        if (result.success && result.menu) {
          // Fetch full menu data
          const newFull = await getMenu(result.menu.id);
          if (newFull) {
            setMenu(newFull);
            toast({
              title: "Éxito",
              description: "Menú creado correctamente",
            });
            // Redirect to the new menu's edit page
            router.push(`/dashboard/menus/${result.menu.id}`);
          }
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "Error al crear el menú",
          });
        }
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al guardar el menú",
      });
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
      {/* Main Content - Dashboard Style */}
      <div className="px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Editor Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Settings */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="space-y-6">
                {/* Header Section */}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {menu ? "Editar Menú" : "Crear Nuevo Menú"}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {menu
                      ? `Configuración del menú "${name}"`
                      : "Configura tu nuevo menú y agrega productos"}
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200"></div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Configuración
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
                {/* <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="menu-principal"
                  disabled={!!menu}
                  className={menu ? "bg-gray-100 cursor-not-allowed" : ""}
                />
                <p className="text-xs text-gray-500">
                  URL: /carta/{slug || "..."}
                  {menu && " (no se puede modificar una vez creado)"}
                </p>
              </div> */}

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
                    onCheckedChange={(checked) =>
                      setIsActive(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="isActive"
                    className="font-normal cursor-pointer"
                  >
                    Menú activo
                  </Label>
                </div>

                {/* Show Prices */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showPrices"
                    checked={showPrices}
                    onCheckedChange={(checked) =>
                      setShowPrices(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="showPrices"
                    className="font-normal cursor-pointer"
                  >
                    Mostrar precios
                  </Label>
                </div>

                {/* <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>Disponibilidad:</strong> Este menú estará disponible
                    24/7 para todos los días de la semana.
                  </p>
                </div> */}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard/menus")}
                    className="w-full justify-start"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver a Menús
                  </Button>
                  {menu && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(menuUrl, "_blank")}
                      className="w-full justify-start"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Vista Previa
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full"
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
              </div>
            </div>
          </div>

          {/* Right Panel - Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Secciones y Productos
                </h2>

                {!menu ? (
                  <div className="py-12 text-center">
                    <Layers className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 font-medium">
                      Guarda el menú para comenzar a agregar secciones y
                      productos
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Completa la configuración básica y haz clic en Guardar
                    </p>
                  </div>
                ) : (
                  <MenuSectionsEditor
                    menu={menu}
                    restaurantId={menu.restaurantId}
                    onUpdate={handleMenuSectionsUpdated}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
