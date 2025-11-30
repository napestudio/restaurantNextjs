"use client";

import { useState } from "react";
import type { SerializedMenu } from "@/actions/menus";
import {
  createMenuSection,
  updateMenuSection,
  deleteMenuSection,
  reorderMenuSections,
} from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Plus, Trash2, Pencil, Check, X, ChevronUp, ChevronDown } from "lucide-react";
import { MenuItemsManager } from "./menu-items-manager";

interface MenuSectionsEditorProps {
  menu: SerializedMenu;
  restaurantId: string;
  onUpdate: () => void;
}

export function MenuSectionsEditor({
  menu,
  restaurantId,
  onUpdate,
}: MenuSectionsEditorProps) {
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(
    null
  );
  // All sections expanded by default to show products
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(
    new Set()
  );

  // New section form
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");

  // Edit section form
  const [editSectionName, setEditSectionName] = useState("");
  const [editSectionDescription, setEditSectionDescription] = useState("");

  const sections = menu.menuSections || [];

  const handleAddSection = async () => {
    if (!newSectionName.trim()) {
      alert("El nombre de la sección es obligatorio");
      return;
    }

    const result = await createMenuSection({
      menuId: menu.id,
      name: newSectionName.trim(),
      description: newSectionDescription.trim() || undefined,
      order: sections.length,
    });

    if (result.success) {
      setNewSectionName("");
      setNewSectionDescription("");
      setIsAddingSection(false);
      onUpdate();
    } else {
      alert(result.error || "Error al crear la sección");
    }
  };

  const handleStartEdit = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (section) {
      setEditSectionName(section.name);
      setEditSectionDescription(section.description || "");
      setEditingSectionId(sectionId);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSectionId || !editSectionName.trim()) return;

    const result = await updateMenuSection(editingSectionId, {
      name: editSectionName.trim(),
      description: editSectionDescription.trim() || undefined,
    });

    if (result.success) {
      setEditingSectionId(null);
      onUpdate();
    } else {
      alert(result.error || "Error al actualizar la sección");
    }
  };

  const handleCancelEdit = () => {
    setEditingSectionId(null);
    setEditSectionName("");
    setEditSectionDescription("");
  };

  const handleDeleteSection = async () => {
    if (!deletingSectionId) return;

    const result = await deleteMenuSection(deletingSectionId);
    if (result.success) {
      setDeletingSectionId(null);
      onUpdate();
    } else {
      alert(result.error || "Error al eliminar la sección");
    }
  };

  const handleToggleSection = (sectionId: string) => {
    setCollapsedSectionIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const isSectionExpanded = (sectionId: string) =>
    !collapsedSectionIds.has(sectionId);

  const handleMoveUp = async (sectionId: string) => {
    const currentIndex = sections.findIndex((s) => s.id === sectionId);
    if (currentIndex <= 0) return; // Already at the top

    const newSections = [...sections];
    const temp = newSections[currentIndex];
    newSections[currentIndex] = newSections[currentIndex - 1];
    newSections[currentIndex - 1] = temp;

    // Update order values
    const updates = newSections.map((section, index) => ({
      id: section.id,
      order: index,
    }));

    const result = await reorderMenuSections(updates);
    if (result.success) {
      onUpdate();
    }
  };

  const handleMoveDown = async (sectionId: string) => {
    const currentIndex = sections.findIndex((s) => s.id === sectionId);
    if (currentIndex >= sections.length - 1) return; // Already at the bottom

    const newSections = [...sections];
    const temp = newSections[currentIndex];
    newSections[currentIndex] = newSections[currentIndex + 1];
    newSections[currentIndex + 1] = temp;

    // Update order values
    const updates = newSections.map((section, index) => ({
      id: section.id,
      order: index,
    }));

    const result = await reorderMenuSections(updates);
    if (result.success) {
      onUpdate();
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Section Button - Always visible at top */}

      {/* Sections List */}
      {sections.length === 0 && !isAddingSection && (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-sm">
            No hay secciones en este menú. Haz clic en `&quot;`Agregar Nueva
            Sección`&quot;` para comenzar.
          </p>
        </div>
      )}

      {sections.map((section, index) => (
        <Card key={section.id}>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveUp(section.id)}
                  disabled={index === 0}
                  title="Mover arriba"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveDown(section.id)}
                  disabled={index === sections.length - 1}
                  title="Mover abajo"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1">
                {editingSectionId === section.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editSectionName}
                      onChange={(e) => setEditSectionName(e.target.value)}
                      placeholder="Nombre de la sección"
                    />
                    <Textarea
                      value={editSectionDescription}
                      onChange={(e) =>
                        setEditSectionDescription(e.target.value)
                      }
                      placeholder="Descripción (opcional)"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Check className="mr-1 h-3 w-3" />
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="mr-1 h-3 w-3" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-base">{section.name}</CardTitle>
                    {section.description && (
                      <CardDescription className="mt-1">
                        {section.description}
                      </CardDescription>
                    )}
                    <div className="text-sm text-gray-500 mt-2">
                      {section.menuItems?.length || 0} producto
                      {section.menuItems?.length !== 1 ? "s" : ""}
                    </div>
                  </>
                )}
              </div>

              {editingSectionId !== section.id && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleStartEdit(section.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600"
                    onClick={() => setDeletingSectionId(section.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          {editingSectionId !== section.id && (
            <CardContent>
              {isSectionExpanded(section.id) && (
                <div className="mb-4">
                  <MenuItemsManager
                    section={section}
                    restaurantId={restaurantId}
                    onUpdate={onUpdate}
                  />
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleSection(section.id)}
                className="w-full text-gray-600"
              >
                {isSectionExpanded(section.id)
                  ? "Ocultar Productos"
                  : "Mostrar Productos"}
              </Button>
            </CardContent>
          )}
        </Card>
      ))}
      {!isAddingSection && (
        <Button
          onClick={() => setIsAddingSection(true)}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Agregar Nueva Sección
        </Button>
      )}

      {/* Add New Section Form */}
      {isAddingSection && (
        <Card className="border-2 border-blue-500">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-base text-blue-900">
              Nueva Sección del Menú
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-2">
              <Label htmlFor="sectionName">Nombre de la Sección *</Label>
              <Input
                id="sectionName"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="ej. Entradas, Platos Principales, Postres"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sectionDescription">Descripción (opcional)</Label>
              <Textarea
                id="sectionDescription"
                value={newSectionDescription}
                onChange={(e) => setNewSectionDescription(e.target.value)}
                placeholder="Agrega una descripción para esta sección"
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleAddSection} className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                Crear Sección
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingSection(false);
                  setNewSectionName("");
                  setNewSectionDescription("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingSectionId}
        onOpenChange={() => setDeletingSectionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sección?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la sección y todos los productos asociados.
              No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSection}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
