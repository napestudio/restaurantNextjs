"use client";

import { useState, useOptimistic, useTransition } from "react";
import { Plus, Search, Filter, FolderPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getMenuItems,
  getCategories,
  deleteMenuItem,
  duplicateProduct,
} from "@/actions/menuItems";
import { MenuItemCard } from "./menu-item-card";
import { MenuItemDialog } from "./menu-item-dialog";
import { CategoryDialog } from "./category-dialog";
import type {
  UnitType,
  WeightUnit,
  VolumeUnit,
  PriceType,
} from "@/app/generated/prisma";
import LoadingToast from "@/components/dashboard/loading-toast";
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

// Serialized types for client components (Decimal -> number, Date -> string)
type SerializedProductPrice = {
  id: string;
  productOnBranchId: string;
  type: PriceType;
  price: number;
};

type SerializedProductOnBranch = {
  id: string;
  productId: string;
  branchId: string;
  stock: number;
  minStock: number | null;
  maxStock: number | null;
  lastRestocked: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  prices: SerializedProductPrice[];
};

type SerializedCategory = {
  id: string;
  name: string;
  order: number;
  restaurantId: string;
};

type MenuItemWithRelations = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sku: string | null;
  unitType: UnitType;
  weightUnit: WeightUnit | null;
  volumeUnit: VolumeUnit | null;
  minStockAlert: number | null;
  trackStock: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  restaurantId: string;
  categoryId: string | null;
  category: SerializedCategory | null;
  branches: SerializedProductOnBranch[];
};

type OptimisticAction =
  | { type: "delete"; id: string }
  | { type: "create"; tempId: string; item: MenuItemWithRelations }
  | { type: "update"; id: string; item: MenuItemWithRelations };

type MenuItemsClientProps = {
  initialMenuItems: MenuItemWithRelations[];
  categories: SerializedCategory[];
  restaurantId: string;
  branchId: string;
};

export function MenuItemsClient({
  initialMenuItems,
  categories: initialCategories,
  restaurantId,
  branchId,
}: MenuItemsClientProps) {
  const [optimisticMenuItems, setOptimisticMenuItems] = useOptimistic(
    initialMenuItems,
    (state: MenuItemWithRelations[], action: OptimisticAction) => {
      switch (action.type) {
        case "create":
          return [...state, action.item];
        case "update":
          return state.map((item) =>
            item.id === action.id ? action.item : item
          );
        case "delete":
          return state.filter((item) => item.id !== action.id);
        default:
          return state;
      }
    }
  );
  const [menuItems, setMenuItems] = useState(initialMenuItems);
  const [categories, setCategories] = useState(initialCategories);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemWithRelations | null>(
    null
  );
  const [deletingItem, setDeletingItem] =
    useState<MenuItemWithRelations | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Filtrar items
  const filteredItems = optimisticMenuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      (selectedCategory === "uncategorized" && !item.categoryId) ||
      item.categoryId === selectedCategory;

    return matchesSearch && matchesCategory && item.isActive;
  });

  const handleAddNew = () => {
    setEditingItem(null);
    setShowDialog(true);
  };

  const handleEdit = (item: MenuItemWithRelations) => {
    setEditingItem(item);
    setShowDialog(true);
  };

  const handleDelete = (item: MenuItemWithRelations) => {
    setDeletingItem(item);
  };

  const handleDuplicate = async (item: MenuItemWithRelations) => {
    startTransition(async () => {
      // Optimistic update - add duplicate immediately with temp ID
      const optimisticDuplicate: MenuItemWithRelations = {
        ...item,
        id: `temp-${Date.now()}`,
        name: `${item.name} - copia`,
        sku: item.sku ? `${item.sku}_copia` : null,
      };

      setOptimisticMenuItems({
        type: "create",
        tempId: optimisticDuplicate.id,
        item: optimisticDuplicate,
      });

      // Execute server action
      const result = await duplicateProduct(item.id);

      if (result.success && result.data) {
        // Replace optimistic item with real data
        setMenuItems((prevItems) => [
          ...prevItems.filter((i) => i.id !== optimisticDuplicate.id),
          result.data,
        ]);

        // Show success toast
        toast({
          title: "Producto duplicado",
          description: `"${result.data.name}" se creó exitosamente`,
        });

        // Refetch for consistency
        handleSuccess();
      } else {
        // Remove optimistic item and show error
        setMenuItems((prevItems) =>
          prevItems.filter((i) => i.id !== optimisticDuplicate.id)
        );

        toast({
          title: "Error al duplicar",
          description: result.error || "No se pudo duplicar el producto",
          variant: "destructive",
        });
      }
    });
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    startTransition(async () => {
      // Optimistic update - item disappears immediately
      setOptimisticMenuItems({ type: "delete", id: deletingItem.id });

      const result = await deleteMenuItem(deletingItem.id);

      if (result.success) {
        // Update actual state
        setMenuItems((prevItems) =>
          prevItems.filter((i) => i.id !== deletingItem.id)
        );
        setDeletingItem(null);
        // Refetch for consistency
        handleSuccess();
      } else {
        // Auto-rollback on error - show error in AlertDialog
        setDeletingItem(null);
        // TODO: Show error toast instead of alert
        alert(result.error || "Error al eliminar el producto");
      }
    });
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingItem(null);
  };

  const handleSuccess = (
    savedItem?: MenuItemWithRelations,
    isNewItem?: boolean
  ) => {
    // Close dialog immediately
    setShowDialog(false);
    setEditingItem(null);

    // Wrap optimistic updates in startTransition
    startTransition(async () => {
      // Optimistic update if we have the saved item
      if (savedItem) {
        if (isNewItem) {
          // Add new item optimistically
          setOptimisticMenuItems({
            type: "create",
            tempId: savedItem.id,
            item: savedItem,
          });
          // Update actual state
          setMenuItems((prevItems) => [...prevItems, savedItem]);
        } else {
          // Update existing item optimistically
          setOptimisticMenuItems({
            type: "update",
            id: savedItem.id,
            item: savedItem,
          });
          // Update actual state
          setMenuItems((prevItems) =>
            prevItems.map((item) =>
              item.id === savedItem.id ? savedItem : item
            )
          );
        }
      }

      // Refetch data in background for consistency
      const [menuItemsResult, categoriesResult] = await Promise.all([
        getMenuItems(restaurantId),
        getCategories(restaurantId),
      ]);

      if (menuItemsResult.success && menuItemsResult.data) {
        setMenuItems(menuItemsResult.data);
      }

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data);
      }
    });
  };

  return (
    <div className="space-y-6 relative">
      {/* Loading overlay durante refetch */}
      {isPending && <LoadingToast />}

      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las categorías</option>
            <option value="uncategorized">Sin categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowCategoryDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            title="Gestionar categorías"
          >
            <FolderPlus className="w-5 h-5" />
            <span className="hidden sm:inline">Categorías</span>
          </button>

          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total de Productos</div>
          <div className="text-2xl font-bold text-gray-900">
            {filteredItems.length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Categorías</div>
          <div className="text-2xl font-bold text-gray-900">
            {categories.length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Productos Activos</div>
          <div className="text-2xl font-bold text-gray-900">
            {menuItems.filter((item) => item.isActive).length}
          </div>
        </div>
      </div> */}

      {/* Lista de productos */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 mb-2">
            <Filter className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No se encontraron productos
          </h3>
          <p className="text-gray-500">
            {searchQuery || selectedCategory !== "all"
              ? "Intenta cambiar los filtros de búsqueda"
              : "Comienza agregando tu primer producto al menú"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                branchId={branchId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Diálogo de crear/editar */}
      {showDialog && (
        <MenuItemDialog
          item={editingItem}
          categories={categories}
          restaurantId={restaurantId}
          branchId={branchId}
          onClose={handleCloseDialog}
          onSuccess={handleSuccess}
        />
      )}

      {/* Diálogo de gestión de categorías */}
      {showCategoryDialog && (
        <CategoryDialog
          categories={categories}
          restaurantId={restaurantId}
          onClose={() => setShowCategoryDialog(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingItem}
        onOpenChange={() => setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar &quot;{deletingItem?.name}&quot;? Esta
              acción marcará el producto como inactivo y no se mostrará en el
              menú.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
