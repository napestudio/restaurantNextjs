"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type {
  SerializedMenuSection,
  SerializedMenuItem,
  SerializedMenuItemGroup,
} from "@/actions/menus";
import {
  addMenuItem,
  getAvailableProducts,
  createMenuItemGroup,
  deleteMenuItemGroup,
  reorderSectionContent,
} from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, FolderPlus } from "lucide-react";
import { SortableItem } from "./sortable-item";
import { SortableGroup } from "./sortable-group";

interface SectionContentManagerProps {
  section: SerializedMenuSection;
  restaurantId: string;
  onUpdate: () => void;
}

// Union type for items that can be in the sortable list
type SectionElement =
  | { type: "item"; data: SerializedMenuItem }
  | { type: "group"; data: SerializedMenuItemGroup };

export function SectionContentManager({
  section,
  restaurantId,
  onUpdate,
}: SectionContentManagerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Only render DndContext on client to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Build a unified list of items and groups sorted by order
  const buildSortedElements = useCallback((): SectionElement[] => {
    const elements: SectionElement[] = [];

    // Add ungrouped items
    (section.menuItems || []).forEach((item) => {
      elements.push({ type: "item", data: item });
    });

    // Add groups
    (section.menuItemGroups || []).forEach((group) => {
      elements.push({ type: "group", data: group });
    });

    // Sort by order
    return elements.sort((a, b) => a.data.order - b.data.order);
  }, [section]);

  const [elements, setElements] = useState<SectionElement[]>(buildSortedElements);
  const [activeElement, setActiveElement] = useState<SectionElement | null>(null);

  // Sync elements when section changes
  useEffect(() => {
    setElements(buildSortedElements());
  }, [buildSortedElements]);

  // Dialog states
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  // Add item form state
  const [availableProducts, setAvailableProducts] = useState<
    Array<{
      id: string;
      name: string;
      description: string | null;
      categoryId: string | null;
      category: { name: string } | null;
    }>
  >([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // Add group form state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get all product IDs already in this section
  const getAllSectionItemIds = useCallback(() => {
    const ids = new Set<string>();
    section.menuItems?.forEach((item) => ids.add(item.productId));
    section.menuItemGroups?.forEach((g) => {
      g.menuItems?.forEach((item) => ids.add(item.productId));
    });
    return ids;
  }, [section]);

  const loadAvailableProducts = useCallback(async () => {
    const products = await getAvailableProducts(restaurantId);
    const alreadyAdded = getAllSectionItemIds();
    setAvailableProducts(products.filter((p) => !alreadyAdded.has(p.id)));
  }, [restaurantId, getAllSectionItemIds]);

  useEffect(() => {
    if (isAddItemDialogOpen) {
      loadAvailableProducts();
    }
  }, [isAddItemDialogOpen, loadAvailableProducts]);

  // Get the ID for sorting (prefixed to distinguish items from groups)
  const getElementId = (el: SectionElement) =>
    el.type === "item" ? `item-${el.data.id}` : `group-${el.data.id}`;

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const element = elements.find((el) => getElementId(el) === active.id);
    setActiveElement(element || null);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveElement(null);

    if (!over || active.id === over.id) return;

    const oldIndex = elements.findIndex((el) => getElementId(el) === active.id);
    const newIndex = elements.findIndex((el) => getElementId(el) === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newElements = arrayMove(elements, oldIndex, newIndex);
    setElements(newElements);

    // Save the new order
    startTransition(async () => {
      const items = newElements
        .filter((el): el is { type: "item"; data: SerializedMenuItem } => el.type === "item")
        .map((el, index) => ({
          id: el.data.id,
          order: index,
          menuItemGroupId: el.data.menuItemGroupId,
        }));

      const groups = newElements
        .filter((el): el is { type: "group"; data: SerializedMenuItemGroup } => el.type === "group")
        .map((el) => ({
          id: el.data.id,
          order: newElements.findIndex((e) => e === el),
        }));

      const result = await reorderSectionContent({ items, groups });
      if (result.success) {
        onUpdate();
      }
    });
  };

  // Add item handler
  const handleAddItem = async () => {
    if (!selectedProductId) {
      alert("Selecciona un producto");
      return;
    }

    startTransition(async () => {
      const result = await addMenuItem({
        menuSectionId: section.id,
        productId: selectedProductId,
        order: elements.length,
        isAvailable: true,
        isFeatured,
        customPrice: customPrice ? Number(customPrice) : undefined,
      });

      if (result.success) {
        setIsAddItemDialogOpen(false);
        setSelectedProductId("");
        setSearchQuery("");
        setCustomPrice("");
        setIsFeatured(false);
        onUpdate();
      } else {
        alert(result.error || "Error al agregar el producto");
      }
    });
  };

  // Add group handler
  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      alert("El nombre del grupo es obligatorio");
      return;
    }

    startTransition(async () => {
      const result = await createMenuItemGroup({
        menuSectionId: section.id,
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        order: elements.length,
      });

      if (result.success) {
        setIsAddGroupDialogOpen(false);
        setNewGroupName("");
        setNewGroupDescription("");
        onUpdate();
      } else {
        alert(result.error || "Error al crear el grupo");
      }
    });
  };

  // Delete group handler
  const handleDeleteGroup = async () => {
    if (!deletingGroupId) return;

    startTransition(async () => {
      const result = await deleteMenuItemGroup(deletingGroupId);
      if (result.success) {
        setDeletingGroupId(null);
        onUpdate();
      } else {
        alert(result.error || "Error al eliminar el grupo");
      }
    });
  };

  const filteredProducts = availableProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Sortable content */}
      {!isMounted ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          Cargando...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
        <SortableContext
          items={elements.map(getElementId)}
          strategy={verticalListSortingStrategy}
        >
          {elements.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded-lg">
              <p>No hay contenido en esta seccion</p>
              <p className="text-xs mt-1">
                Agrega productos o grupos usando los botones de abajo
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {elements.map((element) =>
                element.type === "item" ? (
                  <SortableItem
                    key={getElementId(element)}
                    id={getElementId(element)}
                    item={element.data}
                    onUpdate={onUpdate}
                    isPending={isPending}
                  />
                ) : (
                  <SortableGroup
                    key={getElementId(element)}
                    id={getElementId(element)}
                    group={element.data}
                    section={section}
                    restaurantId={restaurantId}
                    onUpdate={onUpdate}
                    onDelete={() => setDeletingGroupId(element.data.id)}
                    isPending={isPending}
                  />
                )
              )}
            </div>
          )}
        </SortableContext>

        {/* Drag overlay */}
        <DragOverlay>
          {activeElement ? (
            <div className="bg-white shadow-lg rounded-lg border-2 border-blue-500 opacity-90">
              {activeElement.type === "item" ? (
                <div className="p-3 text-sm font-medium">
                  {activeElement.data.product?.name || "Producto"}
                </div>
              ) : (
                <div className="p-3 text-sm font-medium text-purple-700">
                  {activeElement.data.name}
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddItemDialogOpen(true)}
          className="flex-1 border-green-600 text-green-700 hover:bg-green-50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar Producto
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddGroupDialogOpen(true)}
          className="flex-1 border-purple-600 text-purple-700 hover:bg-purple-50"
        >
          <FolderPlus className="mr-2 h-4 w-4" />
          Agregar Grupo
        </Button>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Producto</DialogTitle>
            <DialogDescription>
              Selecciona un producto para agregar a {section.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">
                Producto <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="product"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                    setSelectedProductId("");
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Buscar producto..."
                  autoComplete="off"
                />

                {showSuggestions && searchQuery && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">
                        No se encontraron productos
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedProductId(product.id);
                            setSearchQuery(product.name);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-sm">{product.name}</div>
                          {product.category && (
                            <div className="text-xs text-gray-500">
                              {product.category.name}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedProductId && (
                <p className="text-xs text-green-600">Producto seleccionado</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customPrice">Precio Personalizado (opcional)</Label>
              <Input
                id="customPrice"
                type="number"
                step="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Deja vacio para usar precio base"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={isFeatured}
                onCheckedChange={(checked) => setIsFeatured(checked as boolean)}
              />
              <Label htmlFor="featured" className="font-normal cursor-pointer">
                Marcar como producto destacado
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddItemDialogOpen(false);
                setSelectedProductId("");
                setSearchQuery("");
                setCustomPrice("");
                setIsFeatured(false);
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddItem} disabled={isPending || !selectedProductId}>
              {isPending ? "Agregando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Group Dialog */}
      <Dialog open={isAddGroupDialogOpen} onOpenChange={setIsAddGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Grupo de Productos</DialogTitle>
            <DialogDescription>
              Los grupos permiten organizar productos relacionados dentro de una seccion
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">
                Nombre del Grupo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="groupName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="ej. Gyozas, Rolls, Ramen"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupDescription">Descripcion (opcional)</Label>
              <Textarea
                id="groupDescription"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Descripcion del grupo"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddGroupDialogOpen(false);
                setNewGroupName("");
                setNewGroupDescription("");
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddGroup} disabled={isPending || !newGroupName.trim()}>
              {isPending ? "Creando..." : "Crear Grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={!!deletingGroupId} onOpenChange={() => setDeletingGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Los productos del grupo quedaran sin agrupar en la seccion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
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
