import type { PermissionGrant, UserRole } from "@/app/generated/prisma";

// Re-export UserRole and PermissionGrant for convenience
export type { PermissionGrant, UserRole };

// Branch info for user display
export interface UserBranchInfo {
  id: string;       // UserOnBranch.id (junction record id)
  branchId: string; // Branch.id (actual branch id)
  name: string;
  role: UserRole;
  restaurant: {
    id: string;
    name: string;
  };
}

// Spanish labels for PermissionGrant values
export const PERMISSION_GRANT_LABELS: Record<PermissionGrant, string> = {
  VIEW_STATISTICS: "Ver Estadísticas",
  VIEW_INVOICES: "Ver Facturas",
  VIEW_CASH_REGISTERS: "Ver Arqueos",
  VIEW_STOCK: "Ver Stock",
  MANAGE_MENU: "Gestionar Cartas",
  MANAGE_PRODUCTS: "Gestionar Productos",
  MANAGE_CONFIG: "Ver Configuración",
};

// User with branch relations for display
export interface UserWithBranches {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: Date | string;
  userOnBranches: UserBranchInfo[];
}

// Form state for creating user
export interface CreateUserForm {
  username: string;
  name: string;
  email?: string;
  password: string;
  role: UserRole;
  branchId: string;
}

// Form state for editing user
export interface EditUserForm {
  username: string;
  name: string;
  email?: string;
  password?: string;
  role: UserRole;
  branchId: string;
}

// User role labels in Spanish
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Administrador",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
  WAITER: "Camarero",
};

// User role descriptions
export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPERADMIN: "Acceso total al sistema",
  ADMIN: "Administración de sucursales",
  MANAGER: "Gestión de operaciones",
  EMPLOYEE: "Operaciones básicas",
  WAITER: "Atención de mesas y pedidos",
};

export type WaiterData = {
  id: string;
  name: string | null;
  username: string;
};
