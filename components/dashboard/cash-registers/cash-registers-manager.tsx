"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  CircleDot,
  CircleOff,
  Building2,
  Pencil,
  Trash2,
} from "lucide-react";
import { CashRegisterWithStatus } from "@/types/cash-register";
import { Sector } from "@/app/generated/prisma";
import { CreateCashRegisterDialog } from "./create-cash-register-dialog";
import { EditCashRegisterDialog } from "./edit-cash-register-dialog";
import { DeleteCashRegisterDialog } from "./delete-cash-register-dialog";
import { cn } from "@/lib/utils";

interface CashRegistersManagerProps {
  branchId: string;
  initialCashRegisters: CashRegisterWithStatus[];
  sectors: (Sector & { _count: { tables: number } })[];
}

export function CashRegistersManager({
  branchId,
  initialCashRegisters,
  sectors,
}: CashRegistersManagerProps) {
  const [cashRegisters, setCashRegisters] =
    useState<CashRegisterWithStatus[]>(initialCashRegisters);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRegister, setEditingRegister] =
    useState<CashRegisterWithStatus | null>(null);
  const [deletingRegister, setDeletingRegister] =
    useState<CashRegisterWithStatus | null>(null);

  const handleCreated = (newRegister: CashRegisterWithStatus) => {
    setCashRegisters((prev) => [...prev, newRegister]);
    setCreateDialogOpen(false);
  };

  const handleUpdated = (updatedRegister: CashRegisterWithStatus) => {
    setCashRegisters((prev) =>
      prev.map((r) => (r.id === updatedRegister.id ? updatedRegister : r))
    );
    setEditingRegister(null);
  };

  const handleDeleted = (deletedId: string) => {
    setCashRegisters((prev) => prev.filter((r) => r.id !== deletedId));
    setDeletingRegister(null);
  };

  const activeRegisters = cashRegisters.filter((r) => r.isActive);
  const inactiveRegisters = cashRegisters.filter((r) => !r.isActive);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cajas</h1>
          <p className="text-muted-foreground">
            Administra las cajas registradoras de tu sucursal
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Caja
        </Button>
      </div>

      {/* Cash Registers List */}
      {activeRegisters.length === 0 && inactiveRegisters.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <h3 className="text-lg font-medium mb-2">
            No hay cajas configuradas
          </h3>
          <p className="text-muted-foreground mb-4">
            Crea tu primera caja para comenzar a gestionar los movimientos de
            efectivo.
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Primera Caja
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Registers */}
          {activeRegisters.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Cajas Activas</h2>
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                        Nombre
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                        Estado
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                        Sector
                      </th>
                      {/* <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                        Sesiones
                      </th> */}
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {activeRegisters.map((register) => (
                      <CashRegisterRow
                        key={register.id}
                        register={register}
                        onEdit={() => setEditingRegister(register)}
                        onDelete={() => setDeletingRegister(register)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Inactive Registers */}
          {inactiveRegisters.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-500">
                Cajas Inactivas
              </h2>
              <div className="bg-white rounded-lg border overflow-hidden opacity-60">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                        Nombre
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                        Estado
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                        Sector
                      </th>
                      {/* <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                        Sesiones
                      </th> */}
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inactiveRegisters.map((register) => (
                      <CashRegisterRow
                        key={register.id}
                        register={register}
                        onEdit={() => setEditingRegister(register)}
                        onDelete={() => setDeletingRegister(register)}
                        inactive
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <CreateCashRegisterDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        branchId={branchId}
        sectors={sectors}
        onCreated={handleCreated}
      />

      {editingRegister && (
        <EditCashRegisterDialog
          open={!!editingRegister}
          onOpenChange={(open) => !open && setEditingRegister(null)}
          register={editingRegister}
          sectors={sectors}
          onUpdated={handleUpdated}
        />
      )}

      {deletingRegister && (
        <DeleteCashRegisterDialog
          open={!!deletingRegister}
          onOpenChange={(open) => !open && setDeletingRegister(null)}
          register={deletingRegister}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

// Cash Register Row Component
interface CashRegisterRowProps {
  register: CashRegisterWithStatus;
  onEdit: () => void;
  onDelete: () => void;
  inactive?: boolean;
}

function CashRegisterRow({ register, onEdit, onDelete }: CashRegisterRowProps) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Name */}
      <td className="px-4 py-3">
        <span className="font-medium">{register.name}</span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        {register.hasOpenSession ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CircleDot className="h-3 w-3" />
            Abierta
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <CircleOff className="h-3 w-3" />
            Cerrada
          </span>
        )}
      </td>

      {/* Sector */}
      <td className="px-4 py-3">
        {register.sector ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{register.sector.name}</span>
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: register.sector.color }}
            />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>

      {/* Sessions count */}
      {/* <td className="px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {register._count.sessions}
        </span>
      </td> */}

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 w-8 p-0"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={register.hasOpenSession}
            className={cn(
              "h-8 w-8 p-0",
              !register.hasOpenSession &&
                "text-red-600 hover:text-red-700 hover:bg-red-50"
            )}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
