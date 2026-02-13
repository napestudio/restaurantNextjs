"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, UserPlus, Search, X, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CreateUserDialog,
  EditUserDialog,
  DeleteUserDialog,
} from "@/components/dashboard/users";
import { UserWithBranches, USER_ROLE_LABELS, UserRole } from "@/types/user";
import { getUsers } from "@/actions/users";
import { useToast } from "@/hooks/use-toast";

interface UsersClientProps {
  initialUsers: UserWithBranches[];
  currentUserId: string;
  branchId: string;
}

export function UsersClient({
  initialUsers,
  currentUserId,
  branchId,
}: UsersClientProps) {
  const [users, setUsers] = useState<UserWithBranches[]>(initialUsers);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithBranches | null>(
    null
  );
  const { toast } = useToast();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");

  const refreshUsers = async () => {
    const result = await getUsers();
    if (result.success && result.data) {
      setUsers(result.data);
    }
  };

  // Optimistic create: immediately add user to list
  const handleOptimisticCreate = (userData: {
    tempId: string;
    username: string;
    name: string;
    role: UserRole;
  }) => {
    const optimisticUser: UserWithBranches = {
      id: userData.tempId,
      username: userData.username,
      name: userData.name,
      email: null,
      image: null,
      createdAt: new Date(),
      userOnBranches: [
        {
          id: userData.tempId,
          name: "",
          role: userData.role,
          restaurant: { id: "", name: "" },
        },
      ],
    };
    setUsers((prev) => [optimisticUser, ...prev]);
  };

  // On success: replace temp ID with real ID and show toast
  const handleCreateSuccess = (tempId: string, realId: string) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === tempId ? { ...user, id: realId } : user))
    );
    toast({
      title: "Usuario creado",
      description: "El usuario ha sido creado correctamente.",
    });
    // Refresh to get complete data from server
    refreshUsers();
  };

  // On error: remove optimistic user and show error toast
  const handleCreateError = (tempId: string, error: string) => {
    setUsers((prev) => prev.filter((user) => user.id !== tempId));
    toast({
      variant: "destructive",
      title: "Error al crear usuario",
      description: error,
    });
  };

  const handleEdit = (user: UserWithBranches) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDelete = (user: UserWithBranches) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return "destructive";
      case "ADMIN":
        return "default";
      case "MANAGER":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    // Search filter - search across username, name, and email
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        user.username.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query);

      if (!matchesSearch) return false;
    }

    // Role filter
    if (filterRole !== "all") {
      const primaryBranch = user.userOnBranches[0];
      if (!primaryBranch || primaryBranch.role !== filterRole) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setFilterRole("all");
  };

  const hasActiveFilters = searchQuery.trim() !== "" || filterRole !== "all";

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">
            Administración de acceso a la aplicación.
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-red-500 hover:bg-red-600"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Agregar Usuario
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg border mb-4 p-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por usuario, nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as UserRole | "all")}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring min-w-45"
          >
            <option value="all">Todos los roles</option>
            <option value="SUPERADMIN">Super Admin</option>
            <option value="ADMIN">Administrador</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Empleado</option>
            <option value="WAITER">Camarero</option>
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-500"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Mostrando {filteredUsers.length} de {users.length} usuario
        {users.length !== 1 ? "s" : ""}
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          {users.length === 0 ? (
            <>
              <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay usuarios</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer usuario para comenzar.
              </p>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Crear Primer Usuario
              </Button>
            </>
          ) : (
            <>
              <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No se encontraron resultados
              </h3>
              <p className="text-muted-foreground mb-4">
                Intenta ajustar tus filtros de búsqueda
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Usuario
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Rol
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Creado
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((user) => {
                  const primaryBranch = user.userOnBranches[0];
                  const isCurrentUser = user.id === currentUserId;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-sm">
                          {user.username}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {user.name || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {user.email || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {primaryBranch ? (
                          <Badge
                            variant={getRoleBadgeVariant(primaryBranch.role)}
                          >
                            {USER_ROLE_LABELS[primaryBranch.role]}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">
                          {formatDate(user.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                            title="Editar usuario"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user)}
                            disabled={isCurrentUser}
                            title={
                              isCurrentUser
                                ? "No puedes eliminar tu propio usuario"
                                : "Eliminar usuario"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onOptimisticCreate={handleOptimisticCreate}
        onCreateSuccess={handleCreateSuccess}
        onCreateError={handleCreateError}
        branchId={branchId}
      />

      {selectedUser && (
        <>
          <EditUserDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            user={selectedUser}
            onUpdated={refreshUsers}
          />

          <DeleteUserDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            user={selectedUser}
            onDeleted={refreshUsers}
          />
        </>
      )}
    </div>
  );
}
