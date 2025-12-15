"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  CircleDot,
  CircleOff,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
} from "lucide-react";
import { CashRegisterWithStatus } from "@/types/cash-register";
import { OpenRegisterDialog } from "@/components/dashboard/cash-registers/open-register-dialog";
import { CloseRegisterDialog } from "@/components/dashboard/cash-registers/close-register-dialog";
import { cn } from "@/lib/utils";

interface SerializedSession {
  id: string;
  cashRegisterId: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  openedBy: string;
  openingAmount: number;
  closedAt: string | null;
  closedBy: string | null;
  expectedCash: number | null;
  countedCash: number | null;
  variance: number | null;
  closingNotes: string | null;
  createdAt: string;
  updatedAt: string;
  cashRegister: {
    id: string;
    name: string;
  };
  _count: {
    movements: number;
  };
}

interface CashRegistersClientProps {
  branchId: string;
  cashRegisters: CashRegisterWithStatus[];
  initialSessions: SerializedSession[];
}

export function CashRegistersClient({
  branchId,
  cashRegisters,
  initialSessions,
}: CashRegistersClientProps) {
  const [sessions, setSessions] =
    useState<SerializedSession[]>(initialSessions);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<SerializedSession | null>(null);

  // Filters
  const [filterCashRegister, setFilterCashRegister] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Calculate summary stats from open sessions
  const openSessions = sessions.filter((s) => s.status === "OPEN");
  const closedSessions = sessions.filter((s) => s.status === "CLOSED");

  const stats = useMemo(() => {
    const totalSales = closedSessions.reduce(
      (sum, s) => sum + (s.expectedCash || 0) - s.openingAmount,
      0
    );
    const totalIncome = closedSessions.reduce(
      (sum, s) => sum + (s.countedCash || 0),
      0
    );
    const totalExpenses = closedSessions.reduce(
      (sum, s) =>
        sum + Math.max(0, s.openingAmount - (s.countedCash || s.openingAmount)),
      0
    );

    return {
      openCount: openSessions.length,
      totalSales,
      totalIncome,
      totalExpenses,
    };
  }, [openSessions, closedSessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (
        filterCashRegister !== "all" &&
        session.cashRegisterId !== filterCashRegister
      ) {
        return false;
      }
      if (filterStatus !== "all" && session.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [sessions, filterCashRegister, filterStatus]);

  const handleSessionOpened = (newSession: SerializedSession) => {
    setSessions((prev) => [newSession, ...prev]);
    setOpenDialogOpen(false);
  };

  const handleSessionClosed = (closedSession: SerializedSession) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === closedSession.id ? closedSession : s))
    );
    setCloseDialogOpen(false);
    setSelectedSession(null);
  };

  const handleCloseClick = (session: SerializedSession) => {
    setSelectedSession(session);
    setCloseDialogOpen(true);
  };

  // Get registers that can be opened (active and no open session)
  const availableRegisters = cashRegisters.filter(
    (r) => r.isActive && !r.hasOpenSession
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  // Format date/time
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Arqueos de Caja</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gestiona las aperturas y cierres de caja de tu sucursal
          </p>
        </div>
        <Button
          onClick={() => setOpenDialogOpen(true)}
          className="bg-red-600 hover:bg-red-700"
          disabled={availableRegisters.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo arqueo de caja
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Arqueos de Caja</p>
              <p className="text-xs text-muted-foreground">
                Abrí uno para darle seguimiento a las ventas.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo actual</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  openSessions.reduce((sum, s) => sum + s.openingAmount, 0)
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ArrowRightLeft className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de ventas</p>
              <p className="text-2xl font-bold">{formatCurrency(0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Egresos</p>
              <p className="text-2xl font-bold">{formatCurrency(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Select value={filterCashRegister} onValueChange={setFilterCashRegister}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Caja" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las cajas</SelectItem>
              {cashRegisters.map((register) => (
                <SelectItem key={register.id} value={register.id}>
                  {register.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="OPEN">Abierto</SelectItem>
              <SelectItem value="CLOSED">Cerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                Hora de apertura
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                Hora de cierre
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                Caja
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                Sistema
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                Usuario
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                Diferencia
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                Estado
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <p className="text-gray-500">No hay arqueos de caja</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Crea un nuevo arqueo para comenzar
                  </p>
                </td>
              </tr>
            ) : (
              filteredSessions.map((session) => (
                <tr
                  key={session.id}
                  className={cn(
                    "hover:bg-gray-50 transition-colors",
                    session.status === "OPEN" && "border-l-4 border-l-green-500"
                  )}
                >
                  {/* Opening time */}
                  <td className="px-4 py-3 text-sm">
                    {formatDateTime(session.openedAt)}
                  </td>

                  {/* Closing time */}
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {session.closedAt ? formatDateTime(session.closedAt) : "—"}
                  </td>

                  {/* Cash register */}
                  <td className="px-4 py-3 text-sm font-medium">
                    {session.cashRegister.name}
                  </td>

                  {/* System expected */}
                  <td className="px-4 py-3 text-sm">
                    {session.expectedCash !== null
                      ? formatCurrency(session.expectedCash)
                      : formatCurrency(session.openingAmount)}
                  </td>

                  {/* User counted */}
                  <td className="px-4 py-3 text-sm">
                    {session.countedCash !== null
                      ? formatCurrency(session.countedCash)
                      : "—"}
                  </td>

                  {/* Variance */}
                  <td className="px-4 py-3 text-sm">
                    {session.variance !== null ? (
                      <span
                        className={cn(
                          "font-medium px-2 py-1 rounded",
                          session.variance < 0
                            ? "text-red-600 bg-red-50"
                            : session.variance > 0
                            ? "text-green-600 bg-green-50"
                            : "text-gray-600"
                        )}
                      >
                        {formatCurrency(session.variance)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {session.status === "OPEN" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CircleDot className="h-3 w-3" />
                        Abierto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <CircleOff className="h-3 w-3" />
                        Cerrado
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      {session.status === "OPEN" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCloseClick(session)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Cerrar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      <OpenRegisterDialog
        open={openDialogOpen}
        onOpenChange={setOpenDialogOpen}
        cashRegisters={availableRegisters}
        onOpened={handleSessionOpened}
      />

      {selectedSession && (
        <CloseRegisterDialog
          open={closeDialogOpen}
          onOpenChange={(open) => {
            setCloseDialogOpen(open);
            if (!open) setSelectedSession(null);
          }}
          session={selectedSession}
          onClosed={handleSessionClosed}
        />
      )}
    </div>
  );
}
