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
import {
  getUserGrantsForBranch,
  setUserPermission,
} from "@/actions/permissions";
import { userUpdateSchema, UserUpdateInput } from "@/lib/validations/user";
import { PermissionGrant, UserRole } from "@/app/generated/prisma";
import type { GrantRecord } from "@/lib/permissions/grant-utils";
import {
  PERMISSION_GRANT_LABELS,
  USER_ROLE_LABELS,
  UserWithBranches,
} from "@/types/user";
import { hasMinimumRole } from "@/lib/permissions/role-utils";

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
  isSuperAdmin: boolean;
}

const ALL_GRANTS = Object.keys(PERMISSION_GRANT_LABELS) as PermissionGrant[];

// Minimum role required to access each grant's section (mirrors dashboard-nav.json)
const GRANT_ROLE_MAP: Partial<Record<PermissionGrant, UserRole>> = {
  VIEW_STATISTICS: UserRole.MANAGER,
  VIEW_INVOICES: UserRole.MANAGER,
  VIEW_CASH_REGISTERS: UserRole.MANAGER,
  VIEW_STOCK: UserRole.MANAGER,
  MANAGE_MENU: UserRole.ADMIN,
  MANAGE_PRODUCTS: UserRole.ADMIN,
  MANAGE_CONFIG: UserRole.ADMIN,
};

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
  isSuperAdmin,
}: EditUserDialogProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedBranchId, setResolvedBranchId] = useState<string>("");
  // Map of permission → explicit override (true=allow, false=deny, undefined=no override)
  const [grantMap, setGrantMap] = useState<Map<PermissionGrant, boolean>>(
    new Map()
  );
  const [grantsPending, setGrantsPending] = useState<PermissionGrant | null>(
    null
  );

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
        userBranch?.branchId ||
        branches.find(
          (b) =>
            b.name === userBranch?.name &&
            b.restaurant.name === userBranch?.restaurant.name
        )?.id ||
        "";

      setResolvedBranchId(branchId);
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

  // Load existing grants when branchId is resolved and user is SUPERADMIN
  useEffect(() => {
    if (!open || !resolvedBranchId || !isSuperAdmin) return;

    async function loadGrants() {
      const result = await getUserGrantsForBranch(user.id, resolvedBranchId);
      if (result.success && result.data) {
        setGrantMap(
          new Map(
            (result.data as GrantRecord[]).map((g) => [g.permission, g.granted])
          )
        );
      }
    }
    loadGrants();
  }, [open, resolvedBranchId, isSuperAdmin, user.id]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setGrantMap(new Map());
      setResolvedBranchId("");
    }
  }, [open]);

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
    if (!open) setError(null);
    onOpenChange(open);
  };

  const handleGrantToggle = async (permission: PermissionGrant) => {
    if (!resolvedBranchId || grantsPending) return;
    setGrantsPending(permission);

    const roleCoversIt =
      hasMinimumRole(
        selectedRole as UserRole,
        GRANT_ROLE_MAP[permission] ?? UserRole.SUPERADMIN
      ) ?? false;

    const explicit = grantMap.get(permission);
    // Effective access = explicit override if set, otherwise role
    const currentAccess = explicit !== undefined ? explicit : roleCoversIt;
    const newAccess = !currentAccess;

    const result = await setUserPermission(
      user.id,
      resolvedBranchId,
      permission,
      newAccess
    );

    if (result.success) {
      setGrantMap((prev) => new Map(prev).set(permission, newAccess));
    }

    setGrantsPending(null);
  };

  const getPermissionState = (permission: PermissionGrant) => {
    const roleCoversIt =
      hasMinimumRole(
        selectedRole as UserRole,
        GRANT_ROLE_MAP[permission] ?? UserRole.SUPERADMIN
      ) ?? false;

    const explicit = grantMap.get(permission);
    const effectiveAccess =
      explicit !== undefined ? explicit : roleCoversIt;

    // Label shown next to checkbox
    let hint: string | null = null;
    if (explicit === true && roleCoversIt) hint = "grant + rol";
    else if (explicit === true && !roleCoversIt) hint = "permiso extra";
    else if (explicit === false) hint = "revocado";
    else if (roleCoversIt) hint = "incluido en rol";

    return { checked: effectiveAccess, hint, hasOverride: explicit !== undefined };
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                  <SelectItem value={UserRole.WAITER}>
                    {USER_ROLE_LABELS.WAITER}
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* Permisos extra — SUPERADMIN only, fully interactive */}
            {isSuperAdmin && resolvedBranchId && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Permisos extra</Label>
                <p className="text-xs text-muted-foreground">
                  Anula el acceso del rol. Activa para otorgar, desactiva para
                  revocar.
                </p>
                <div className="rounded-lg border divide-y">
                  {ALL_GRANTS.map((permission) => {
                    const { checked, hint, hasOverride } =
                      getPermissionState(permission);
                    const isPendingThis = grantsPending === permission;

                    return (
                      <label
                        key={permission}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer select-none transition-colors hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isPendingThis}
                          onChange={() => handleGrantToggle(permission)}
                          className="h-4 w-4 rounded border-gray-300 accent-red-500"
                        />
                        <span className="flex-1">
                          {PERMISSION_GRANT_LABELS[permission]}
                        </span>
                        {isPendingThis ? (
                          <span className="text-xs text-muted-foreground">
                            guardando...
                          </span>
                        ) : hint ? (
                          <span
                            className={`text-xs ${
                              hasOverride && !checked
                                ? "text-red-500"
                                : hasOverride && checked
                                ? "text-green-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {hint}
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
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
