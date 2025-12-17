"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, User } from "lucide-react";
import { deleteUser } from "@/actions/users";
import { UserWithBranches, USER_ROLE_LABELS } from "@/types/user";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithBranches;
  onDeleted: () => void;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onDeleted,
}: DeleteUserDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryBranch = user.userOnBranches[0];

  const handleDelete = async () => {
    setIsPending(true);
    setError(null);

    const result = await deleteUser(user.id);

    if (result.success) {
      onOpenChange(false);
      onDeleted();
    } else {
      setError(result.error || "Error al eliminar usuario");
    }

    setIsPending(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Usuario
          </DialogTitle>
          <DialogDescription>
            Esta acción eliminará el usuario permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg mb-4">
            <div className="p-2 bg-gray-200 rounded-lg">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium">{user.name || user.username}</p>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              {primaryBranch && (
                <p className="text-sm text-muted-foreground">
                  {USER_ROLE_LABELS[primaryBranch.role]} en{" "}
                  {primaryBranch.restaurant.name} - {primaryBranch.name}
                </p>
              )}
            </div>
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <p className="font-medium mb-1">Eliminación permanente</p>
            <p>
              Se eliminarán todos los datos del usuario, incluyendo sus
              asignaciones de sucursales y sesiones. Esta acción no se puede
              deshacer.
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Eliminando..." : "Eliminar Usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
