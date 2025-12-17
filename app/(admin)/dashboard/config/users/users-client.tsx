"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import {
  CreateUserDialog,
  EditUserDialog,
  DeleteUserDialog,
} from "@/components/dashboard/users";
import { UserWithBranches, USER_ROLE_LABELS } from "@/types/user";
import { getUsers } from "@/actions/users";

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

  const refreshUsers = async () => {
    const result = await getUsers();
    if (result.success && result.data) {
      setUsers(result.data);
    }
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

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Usuarios</h1>
          <p className="mt-2 text-sm text-gray-700">
            Administración de acceso a la aplicación.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Agregar Usuario
          </Button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {users.length === 0 ? (
                <div className="bg-white px-4 py-12 text-center">
                  <p className="text-sm text-gray-500">
                    No hay usuarios registrados.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Crear primer usuario
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      {/* <TableHead>Sucursal</TableHead> */}
                      <TableHead>Rol</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const primaryBranch = user.userOnBranches[0];
                      const isCurrentUser = user.id === currentUserId;

                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.username}
                          </TableCell>
                          <TableCell>{user.name || "-"}</TableCell>
                          <TableCell>{user.email || "-"}</TableCell>
                          {/* <TableCell>
                            {primaryBranch ? (
                              <span className="text-sm">
                                {primaryBranch.restaurant.name} -{" "}
                                {primaryBranch.name}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell> */}
                          <TableCell>
                            {primaryBranch ? (
                              <Badge
                                variant={getRoleBadgeVariant(
                                  primaryBranch.role
                                )}
                              >
                                {USER_ROLE_LABELS[primaryBranch.role]}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell className="text-right">
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={refreshUsers}
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
    </>
  );
}
