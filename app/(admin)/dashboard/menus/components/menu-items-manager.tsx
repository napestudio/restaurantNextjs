"use client";

import { useState, useEffect, useCallback, useOptimistic, useTransition } from "react";
import type { SerializedMenuSection, SerializedMenuItem } from "@/actions/menus";
import {
  addMenuItem,
  updateMenuItem,
  removeMenuItem,
  getAvailableProducts,
} from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Star, Eye, EyeOff, Pencil } from "lucide-react";
import { EditMenuItemDialog } from "./edit-menu-item-dialog";

interface MenuItemsManagerProps {
  section: SerializedMenuSection;
  restaurantId: string;
  onUpdate: () => void;
}

type OptimisticAction =
  | { type: "add"; item: SerializedMenuItem }
  | { type: "update"; itemId: string; data: Partial<SerializedMenuItem> }
  | { type: "delete"; itemId: string };

export function MenuItemsManager({
  section,
  restaurantId,
  onUpdate,
}: MenuItemsManagerProps) {
  const [isPending, startTransition] = useTransition();

  // Only show ungrouped items (menuItemGroupId is null)
  const menuItems = (section.menuItems || []).filter(
    (item) => !item.menuItemGroupId
  );

  // Optimistic state
  const [optimisticItems, addOptimisticAction] = useOptimistic(
    menuItems,
    (state: SerializedMenuItem[], action: OptimisticAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.item];
        case "update":
          return state.map((item) =>
            item.id === action.itemId ? { ...item, ...action.data } : item
          );
        case "delete":
          return state.filter((item) => item.id !== action.itemId);
        default:
          return state;
      }
    }
  );

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SerializedMenuItem | null>(null);
  const [availableProducts, setAvailableProducts] = useState<
    Array<{
      id: string;
      name: string;
      description: string | null;
      categoryId: string | null;
      category: { name: string } | null;
    }>
  >([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // Get all items already in this section (including in groups)
  const getAllSectionItemIds = useCallback(() => {
    const ids = new Set<string>();
    // Items directly in section
    section.menuItems?.forEach((item) => ids.add(item.productId));
    // Items in all groups
    section.menuItemGroups?.forEach((g) => {
      g.menuItems?.forEach((item) => ids.add(item.productId));
    });
    return ids;
  }, [section]);

  const loadAvailableProducts = useCallback(async () => {
    const products = await getAvailableProducts(restaurantId);
    // Filter out products already in this section (including groups)
    const alreadyAdded = getAllSectionItemIds();
    setAvailableProducts(products.filter((p) => !alreadyAdded.has(p.id)));
  }, [restaurantId, getAllSectionItemIds]);

  useEffect(() => {
    if (isAddDialogOpen) {
      loadAvailableProducts();
    }
  }, [isAddDialogOpen, loadAvailableProducts]);

  const handleAddProduct = async () => {
    if (!selectedProductId) {
      alert("Selecciona un producto");
      return;
    }

    const selectedProduct = availableProducts.find(
      (p) => p.id === selectedProductId
    );

    const tempId = `temp-${Date.now()}`;
    const optimisticItem: SerializedMenuItem = {
      id: tempId,
      menuSectionId: section.id,
      menuItemGroupId: null,
      productId: selectedProductId,
      order: optimisticItems.length,
      isAvailable: true,
      isFeatured,
      customPrice: customPrice ? Number(customPrice) : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      product: selectedProduct
        ? {
            id: selectedProduct.id,
            name: selectedProduct.name,
            description: selectedProduct.description,
            imageUrl: null,
            categoryId: selectedProduct.categoryId,
            basePrice: null,
          }
        : undefined,
    };

    startTransition(async () => {
      addOptimisticAction({ type: "add", item: optimisticItem });

      const result = await addMenuItem({
        menuSectionId: section.id,
        productId: selectedProductId,
        order: menuItems.length,
        isAvailable: true,
        isFeatured,
        customPrice: customPrice ? Number(customPrice) : undefined,
      });

      if (result.success) {
        setIsAddDialogOpen(false);
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

  const handleSelectProduct = (product: (typeof availableProducts)[0]) => {
    setSelectedProductId(product.id);
    setSearchQuery(product.name);
    setShowSuggestions(false);
  };

  const filteredProducts = availableProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleAvailability = async (
    itemId: string,
    isAvailable: boolean
  ) => {
    startTransition(async () => {
      addOptimisticAction({
        type: "update",
        itemId,
        data: { isAvailable: !isAvailable },
      });

      const result = await updateMenuItem(itemId, {
        isAvailable: !isAvailable,
      });

      if (result.success) {
        onUpdate();
      }
    });
  };

  const handleToggleFeatured = async (itemId: string, isFeatured: boolean) => {
    startTransition(async () => {
      addOptimisticAction({
        type: "update",
        itemId,
        data: { isFeatured: !isFeatured },
      });

      const result = await updateMenuItem(itemId, {
        isFeatured: !isFeatured,
      });

      if (result.success) {
        onUpdate();
      }
    });
  };

  const handleRemoveProduct = async (itemId: string) => {
    if (!confirm("Eliminar este producto de la seccion?")) return;

    startTransition(async () => {
      addOptimisticAction({ type: "delete", itemId });

      const result = await removeMenuItem(itemId);
      if (result.success) {
        onUpdate();
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Items List */}
      {optimisticItems.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-sm">
          No hay productos sin agrupar en esta seccion
        </div>
      ) : (
        <div className="space-y-2">
          {optimisticItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg ${
                isPending && item.id.startsWith("temp-") ? "opacity-50" : ""
              }`}
            >
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {item.product?.name || "Producto desconocido"}
                </div>
                {item.product?.description && (
                  <div className="text-xs text-gray-500 mt-1">
                    {item.product.description}
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  {item.isFeatured && (
                    <Badge variant="default" className="text-xs bg-amber-500">
                      <Star className="mr-1 h-3 w-3" />
                      Destacado
                    </Badge>
                  )}
                  {!item.isAvailable && (
                    <Badge variant="secondary" className="text-xs">
                      No disponible
                    </Badge>
                  )}
                  {item.customPrice && (
                    <Badge variant="outline" className="text-xs">
                      Precio: ${item.customPrice}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleToggleFeatured(item.id, item.isFeatured)}
                  disabled={isPending}
                  title={
                    item.isFeatured
                      ? "Quitar destacado"
                      : "Marcar como destacado"
                  }
                >
                  <Star
                    className={`h-4 w-4 ${
                      item.isFeatured ? "fill-amber-500 text-amber-500" : ""
                    }`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    handleToggleAvailability(item.id, item.isAvailable)
                  }
                  disabled={isPending}
                  title={
                    item.isAvailable
                      ? "Marcar como no disponible"
                      : "Marcar como disponible"
                  }
                >
                  {item.isAvailable ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-600"
                  onClick={() => setEditingItem(item)}
                  disabled={isPending}
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600"
                  onClick={() => handleRemoveProduct(item.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingItem && (
        <EditMenuItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onUpdate={onUpdate}
        />
      )}

      {/* Add Product Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsAddDialogOpen(true)}
        className="w-full border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800 hover:border-green-700"
      >
        <Plus className="mr-2 h-4 w-4" />
        Agregar Producto a esta Sección
      </Button>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Producto</DialogTitle>
            <DialogDescription>
              Selecciona un producto para agregar a {section.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Product Selection with Autocomplete */}
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
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  placeholder="Buscar producto..."
                  autoComplete="off"
                />

                {showSuggestions && searchQuery && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">
                        {availableProducts.length === 0
                          ? "No hay productos disponibles"
                          : "No se encontraron productos"}
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent blur
                            handleSelectProduct(product);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-sm">
                            {product.name}
                          </div>
                          {product.category && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {product.category.name}
                            </div>
                          )}
                          {product.description && (
                            <div className="text-xs text-gray-400 truncate mt-0.5">
                              {product.description}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {!selectedProductId && searchQuery && (
                <p className="text-xs text-amber-600">
                  Selecciona un producto de las sugerencias
                </p>
              )}
              {selectedProductId && (
                <p className="text-xs text-green-600">
                  ✓ Producto seleccionado
                </p>
              )}
            </div>

            {/* Custom Price */}
            <div className="space-y-2">
              <Label htmlFor="customPrice">
                Precio Personalizado (opcional)
              </Label>
              <Input
                id="customPrice"
                type="number"
                step="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Deja vacío para usar precio base"
              />
              <p className="text-xs text-gray-500">
                Útil para promociones o precios especiales de este menú
              </p>
            </div>

            {/* Featured */}
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
                setIsAddDialogOpen(false);
                setSelectedProductId("");
                setSearchQuery("");
                setCustomPrice("");
                setIsFeatured(false);
                setShowSuggestions(false);
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddProduct} disabled={isPending}>
              {isPending ? "Agregando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
