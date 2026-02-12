"use client";

import { useState, useOptimistic, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Filter, FolderPlus, Download, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getMenuItemsPaginated,
  getCategories,
  deleteMenuItem,
  duplicateProduct,
  exportMenuItemsCSV,
  type PaginationInfo,
} from "@/actions/menuItems";
import { ProductsTable } from "./products-table";
import { ProductDialog } from "./product-dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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

type FilterState = {
  search?: string;
  category?: string;
  stockStatus?: string;
  unitType?: string;
  includeInactive?: boolean;
};

type ProductsProps = {
  initialMenuItems: MenuItemWithRelations[];
  initialPagination: PaginationInfo;
  initialFilters: FilterState;
  categories: SerializedCategory[];
  restaurantId: string;
  branchId: string;
};

export function ProductsClient({
  initialMenuItems,
  initialPagination,
  initialFilters,
  categories: initialCategories,
  restaurantId,
  branchId,
}: ProductsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [menuItems, setMenuItems] = useState(initialMenuItems);
  const [optimisticMenuItems, setOptimisticMenuItems] = useOptimistic(
    menuItems,
    (state: MenuItemWithRelations[], action: OptimisticAction) => {
      switch (action.type) {
        case "create":
          return [...state, action.item];
        case "update":
          return state.map((item) =>
            item.id === action.id ? action.item : item,
          );
        case "delete":
          return state.filter((item) => item.id !== action.id);
        default:
          return state;
      }
    },
  );
  const [pagination, setPagination] =
    useState<PaginationInfo>(initialPagination);
  const [categories, setCategories] = useState(initialCategories);
  const [isPending, startTransition] = useTransition();

  // Filter states
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "");
  const [selectedCategory, setSelectedCategory] = useState(
    initialFilters.category || "all",
  );
  const [stockStatusFilter, setStockStatusFilter] = useState(
    initialFilters.stockStatus || "all",
  );
  const [unitTypeFilter, setUnitTypeFilter] = useState(
    initialFilters.unitType || "all",
  );
  const [showInactive, setShowInactive] = useState(
    initialFilters.includeInactive || false,
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemWithRelations | null>(
    null,
  );
  const [deletingItem, setDeletingItem] =
    useState<MenuItemWithRelations | null>(null);

  // Current page from URL
  const currentPage = parseInt(searchParams.get("page") || "1");

  // Check if filters are active
  const hasActiveFilters =
    searchQuery !== "" ||
    selectedCategory !== "all" ||
    stockStatusFilter !== "all" ||
    unitTypeFilter !== "all" ||
    showInactive;

  const updateFilters = (page: number = 1) => {
    const params = new URLSearchParams();
    params.set("page", page.toString());

    if (searchQuery) params.set("search", searchQuery);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (stockStatusFilter !== "all")
      params.set("stockStatus", stockStatusFilter);
    if (unitTypeFilter !== "all") params.set("unitType", unitTypeFilter);
    if (showInactive) params.set("includeInactive", "true");

    startTransition(async () => {
      const result = await getMenuItemsPaginated({
        restaurantId,
        branchId,
        page,
        pageSize: 20,
        search: searchQuery || undefined,
        categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
        stockStatus:
          stockStatusFilter !== "all" ? stockStatusFilter : undefined,
        unitType: unitTypeFilter !== "all" ? unitTypeFilter : undefined,
        includeInactive: showInactive,
      });

      if (result.success && result.data) {
        setMenuItems(result.data.products);
        setPagination(result.data.pagination);
      }
    });

    router.push(`/dashboard/menu-items?${params.toString()}`, {
      scroll: false,
    });
  };

  const handleSearch = () => {
    updateFilters(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setStockStatusFilter("all");
    setUnitTypeFilter("all");
    setShowInactive(false);

    startTransition(async () => {
      const result = await getMenuItemsPaginated({
        restaurantId,
        branchId,
        page: 1,
        pageSize: 20,
      });

      if (result.success && result.data) {
        setMenuItems(result.data.products);
        setPagination(result.data.pagination);
      }
    });

    router.push("/dashboard/menu-items", { scroll: false });
  };

  const handlePageChange = (page: number) => {
    updateFilters(page);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const result = await exportMenuItemsCSV({
        restaurantId,
        branchId,
        search: searchQuery || undefined,
        categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
        stockStatus:
          stockStatusFilter !== "all" ? stockStatusFilter : undefined,
        unitType: unitTypeFilter !== "all" ? unitTypeFilter : undefined,
        includeInactive: showInactive,
      });

      if (result.success && result.data) {
        const link = document.createElement("a");
        link.href = result.data.dataUrl;
        link.download = result.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "CSV exportado",
          description: `Se descargó el archivo ${result.data.filename}`,
        });
      } else {
        toast({
          title: "Error al exportar",
          description: result.error || "Error al exportar el CSV",
          variant: "destructive",
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

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
          prevItems.filter((i) => i.id !== optimisticDuplicate.id),
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
          prevItems.filter((i) => i.id !== deletingItem.id),
        );
        setDeletingItem(null);
        // Refetch for consistency
        handleSuccess();
      } else {
        // Auto-rollback on error
        setDeletingItem(null);
        toast({
          title: "Error al eliminar",
          description: result.error || "No se pudo eliminar el producto",
          variant: "destructive",
        });
      }
    });
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingItem(null);
  };

  const handleSuccess = (
    savedItem?: MenuItemWithRelations,
    isNewItem?: boolean,
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
              item.id === savedItem.id ? savedItem : item,
            ),
          );
        }
      }

      // Refetch data in background for consistency
      const [menuItemsResult, categoriesResult] = await Promise.all([
        getMenuItemsPaginated({
          restaurantId,
          branchId,
          page: currentPage,
          pageSize: 20,
          search: searchQuery || undefined,
          categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
          stockStatus:
            stockStatusFilter !== "all" ? stockStatusFilter : undefined,
          unitType: unitTypeFilter !== "all" ? unitTypeFilter : undefined,
          includeInactive: showInactive,
        }),
        getCategories(restaurantId),
      ]);

      if (menuItemsResult.success && menuItemsResult.data) {
        setMenuItems(menuItemsResult.data.products);
        setPagination(menuItemsResult.data.pagination);
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

      {/* Enhanced Toolbar */}
      <div className="space-y-4">
        {/* Top row: Search + Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exportando..." : "Exportar CSV"}
            </Button>

            <Button
              onClick={() => setShowCategoryDialog(true)}
              variant="outline"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Categorías</span>
            </Button>

            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nuevo Producto</span>
            </Button>
          </div>
        </div>

        {/* Stats + Filter toggle */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Total: {pagination.totalCount} productos</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showAdvancedFilters ? "Ocultar" : "Mostrar"} filtros
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="uncategorized">Sin categoría</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stock Status */}
              <div className="space-y-2">
                <Label>Estado de Stock</Label>
                <Select
                  value={stockStatusFilter}
                  onValueChange={setStockStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="in_stock">En Stock</SelectItem>
                    <SelectItem value="low_stock">Stock Bajo</SelectItem>
                    <SelectItem value="out_stock">Sin Stock</SelectItem>
                    <SelectItem value="always_available">
                      Siempre Disponible
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Unit Type */}
              <div className="space-y-2">
                <Label>Tipo de Unidad</Label>
                <Select
                  value={unitTypeFilter}
                  onValueChange={setUnitTypeFilter}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="UNIT">Unidades</SelectItem>
                    <SelectItem value="WEIGHT">Peso</SelectItem>
                    <SelectItem value="VOLUME">Volumen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Show Inactive */}
              <div className="space-y-2">
                <Label>Mostrar Inactivos</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Checkbox
                    id="showInactive"
                    checked={showInactive}
                    onCheckedChange={(checked) =>
                      setShowInactive(checked as boolean)
                    }
                  />
                  <label htmlFor="showInactive" className="text-sm">
                    Incluir inactivos
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Aplicar Filtros
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpiar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      {optimisticMenuItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-sm text-gray-600">
              {hasActiveFilters
                ? "Intenta ajustar los filtros de búsqueda"
                : "Comienza agregando tu primer producto"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ProductsTable
          items={optimisticMenuItems}
          branchId={branchId}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    currentPage > 1 && handlePageChange(currentPage - 1)
                  }
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {Array.from(
                { length: pagination.totalPages },
                (_, i) => i + 1,
              ).map((page) => {
                if (
                  page === 1 ||
                  page === pagination.totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    currentPage < pagination.totalPages &&
                    handlePageChange(currentPage + 1)
                  }
                  className={
                    currentPage === pagination.totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Diálogo de crear/editar */}
      {showDialog && (
        <ProductDialog
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
