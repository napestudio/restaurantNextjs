"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { updateUser, getBranches } from "@/actions/users";
import { userUpdateSchema, UserUpdateInput } from "@/lib/validations/user";
import { UserRole } from "@/app/generated/prisma";
import { USER_ROLE_LABELS, UserWithBranches } from "@/types/user";

interface Branch {
  id: string;
  name: string;
  restaurant: {
    name: string;
  };
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithBranches;
  onUpdated: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
}: EditUserDialogProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryBranch = user.userOnBranches[0];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UserUpdateInput>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      username: user.username,
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: primaryBranch?.role || UserRole.EMPLOYEE,
      branchId: primaryBranch?.id || "",
    },
  });

  const selectedRole = watch("role");
  // const selectedBranchId = watch("branchId");

  useEffect(() => {
    async function loadBranches() {
      const result = await getBranches();
      if (result.success && result.data) {
        setBranches(result.data);
      }
    }
    if (open) {
      loadBranches();
    }
  }, [open]);

  useEffect(() => {
    if (user && branches.length > 0) {
      const userBranch = user.userOnBranches[0];
      const branchId =
        branches.find(
          (b) =>
            b.name === userBranch?.name &&
            b.restaurant.name === userBranch?.restaurant.name
        )?.id || "";

      reset({
        username: user.username,
        name: user.name || "",
        email: user.email || "",
        password: "",
        role: userBranch?.role || UserRole.EMPLOYEE,
        branchId,
      });
    }
  }, [user, branches, reset]);

  const onSubmit = async (data: UserUpdateInput) => {
    setIsPending(true);
    setError(null);

    const result = await updateUser(user.id, data);

    if (result.success) {
      onOpenChange(false);
      onUpdated();
    } else {
      setError(result.error || "Error al actualizar usuario");
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
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Usuario
          </DialogTitle>
          <DialogDescription>Modifica los datos del usuario.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-username">Usuario *</Label>
              <Input
                id="edit-username"
                {...register("username")}
                placeholder="john_doe"
                disabled={isPending}
              />
              {errors.username && (
                <p className="text-sm text-red-600">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                {...register("name")}
                placeholder="John Doe"
                disabled={isPending}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email (opcional)</Label>
              <Input
                id="edit-email"
                type="email"
                {...register("email")}
                placeholder="john.doe@restaurant.com"
                disabled={isPending}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-password">
                Nueva Contraseña (dejar vacío para mantener)
              </Label>
              <Input
                id="edit-password"
                type="password"
                {...register("password")}
                placeholder="********"
                disabled={isPending}
              />
              {errors.password && (
                <p className="text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Si se completa: mínimo 8 caracteres, mayúsculas, minúsculas y
                números.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Rol *</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setValue("role", value as UserRole)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>
                    {USER_ROLE_LABELS.ADMIN}
                  </SelectItem>
                  <SelectItem value={UserRole.MANAGER}>
                    {USER_ROLE_LABELS.MANAGER}
                  </SelectItem>
                  <SelectItem value={UserRole.EMPLOYEE}>
                    {USER_ROLE_LABELS.EMPLOYEE}
                  </SelectItem>
                  <SelectItem value={UserRole.WAITER}>
                    {USER_ROLE_LABELS.WAITER}
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* <div className="space-y-2">
              <Label htmlFor="edit-branchId">Sucursal *</Label>
              <Select
                value={selectedBranchId}
                onValueChange={(value) => setValue("branchId", value)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.restaurant.name} - {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.branchId && (
                <p className="text-sm text-red-600">{errors.branchId.message}</p>
              )}
            </div> */}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
