"use client";

import { useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { MenuItemCard } from "./menu-item-card";
import { MenuItemDialog } from "./menu-item-dialog";
import type { UnitType, WeightUnit, VolumeUnit, PriceType } from "@/app/generated/prisma";

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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  restaurantId: string;
  categoryId: string | null;
  category: SerializedCategory | null;
  branches: SerializedProductOnBranch[];
};

type MenuItemsClientProps = {
  initialMenuItems: MenuItemWithRelations[];
  categories: SerializedCategory[];
  restaurantId: string;
  branchId: string;
};

export function MenuItemsClient({
  initialMenuItems,
  categories,
  restaurantId,
  branchId,
}: MenuItemsClientProps) {
  const [menuItems, setMenuItems] = useState(initialMenuItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemWithRelations | null>(
    null
  );

  // Filtrar items
  const filteredItems = menuItems.filter((item) => {
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

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingItem(null);
  };

  const handleSuccess = () => {
    // Recargar la página para obtener los datos actualizados
    window.location.reload();
  };

  return (
    <div className="space-y-6">
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
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              branchId={branchId}
              onEdit={handleEdit}
            />
          ))}
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
    </div>
  );
}
