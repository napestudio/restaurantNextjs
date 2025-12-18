"use client";

import { useState } from "react";
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
import { UserPlus } from "lucide-react";
import { createUser } from "@/actions/users";
import {
  userRegistrationSchema,
  UserRegistrationInput,
} from "@/lib/validations/user";
import { UserRole } from "@/app/generated/prisma";
import { USER_ROLE_LABELS } from "@/types/user";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  branchId: string;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
  branchId,
}: CreateUserDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UserRegistrationInput>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      branchId,
    },
  });

  const selectedRole = watch("role");

  // Convert name to username format (lowercase, spaces to underscores, remove special chars)
  const nameToUsername = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/[^a-z0-9_]/g, ""); // Remove invalid characters
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("name", name);

    // Auto-generate username if not manually edited
    if (!usernameManuallyEdited) {
      setValue("username", nameToUsername(name));
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove whitespaces from username
    const username = e.target.value.replace(/\s/g, "");
    setValue("username", username);
    setUsernameManuallyEdited(true);
  };

  const onSubmit = async (data: UserRegistrationInput) => {
    setIsPending(true);
    setError(null);

    const result = await createUser({ ...data, branchId });

    if (result.success) {
      reset();
      onOpenChange(false);
      onCreated();
    } else {
      setError(result.error || "Error al crear usuario");
    }

    setIsPending(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      setError(null);
      setUsernameManuallyEdited(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Crear Usuario
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo usuario a la plataforma.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                {...register("name", { onChange: handleNameChange })}
                placeholder="Juan Perez"
                disabled={isPending}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Usuario *</Label>
              <Input
                id="username"
                {...register("username", { onChange: handleUsernameChange })}
                placeholder="juan_perez"
                disabled={isPending}
              />
              {errors.username && (
                <p className="text-sm text-red-600">{errors.username.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Se genera automáticamente del nombre. Solo letras, números y guiones bajos (_)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder="********"
                disabled={isPending}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres, mayúsculas, minúsculas y números.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
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
              {isPending ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
