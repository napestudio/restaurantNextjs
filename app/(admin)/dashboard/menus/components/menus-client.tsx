"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SerializedMenu } from "@/actions/menus";
import { MenuCard } from "./menu-card";
import { MenuDialog } from "./menu-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface MenusClientProps {
  initialMenus: SerializedMenu[];
  restaurantId: string;
}

export function MenusClient({ initialMenus, restaurantId }: MenusClientProps) {
  const router = useRouter();
  const [menus, setMenus] = useState(initialMenus);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleCreateMenu = () => {
    setIsCreateDialogOpen(true);
  };

  const handleMenuCreated = (newMenu: SerializedMenu) => {
    setMenus((prev) => [newMenu, ...prev]);
    setIsCreateDialogOpen(false);
    // Redirect to the newly created menu's page
    router.push(`/dashboard/menus/${newMenu.id}`);
  };

  const handleEditMenu = (menuId: string) => {
    router.push(`/dashboard/menus/${menuId}`);
  };

  const handleMenuUpdated = (updatedMenu: SerializedMenu) => {
    setMenus((prev) =>
      prev.map((m) => (m.id === updatedMenu.id ? updatedMenu : m))
    );
  };

  const handleMenuDeleted = (menuId: string) => {
    setMenus((prev) => prev.filter((m) => m.id !== menuId));
  };

  const activeMenus = menus.filter((m) => m.isActive);
  const inactiveMenus = menus.filter((m) => !m.isActive);

  return (
    <div className="space-y-8">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div></div>
        {/* <div className="flex gap-4 text-sm text-gray-600">
          <span>Total: {menus.length}</span>
          <span>Activos: {activeMenus.length}</span>
          <span>Inactivos: {inactiveMenus.length}</span>
        </div> */}
        <Button onClick={handleCreateMenu}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Menú
        </Button>
      </div>

      {/* Active Menus */}
      {activeMenus.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Menús Activos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeMenus.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                onEdit={() => handleEditMenu(menu.id)}
                onDelete={() => handleMenuDeleted(menu.id)}
                onUpdate={handleMenuUpdated}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Menus */}
      {inactiveMenus.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-500 mb-4">
            Menús Inactivos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inactiveMenus.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                onEdit={() => handleEditMenu(menu.id)}
                onDelete={() => handleMenuDeleted(menu.id)}
                onUpdate={handleMenuUpdated}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {menus.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No hay menús creados
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Comienza creando tu primer menú para organizar tus productos
          </p>
          <Button onClick={handleCreateMenu}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Primer Menú
          </Button>
        </div>
      )}

      {/* Create Menu Dialog */}
      <MenuDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        menu={null}
        restaurantId={restaurantId}
        onMenuCreated={handleMenuCreated}
        onMenuUpdated={handleMenuUpdated}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </div>
  );
}
