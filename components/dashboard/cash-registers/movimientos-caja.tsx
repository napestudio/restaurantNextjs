"use client";

import { getManualMovements } from "@/actions/CashRegister";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CashRegisterWithStatus,
  MOVEMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/types/cash-register";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddMovementDialog } from "./add-movement-dialog";
import { MovementDetailsDialog } from "./movement-details-dialog";

interface Movement {
  id: string;
  type: "INCOME" | "EXPENSE";
  paymentMethod: string;
  amount: number;
  description: string | null;
  createdAt: string;
  createdBy: string;
  sessionId: string;
  cashRegister: {
    id: string;
    name: string;
  };
}

interface MovimientosCajaProps {
  branchId: string;
  cashRegisters: CashRegisterWithStatus[];
}

type FilterType = "today" | "history" | "dateRange";

export function MovimientosCaja({
  branchId,
  cashRegisters,
}: MovimientosCajaProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterCashRegister, setFilterCashRegister] = useState<string>("all");
  const [filterMovementType, setFilterMovementType] = useState<string>("all");
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(
    null
  );
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 50;

  // Calculate today's date for filters
  const today = useMemo(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  }, []);

  // Load movements based on filter
  const loadMovements = useCallback(async (pageNum: number = 0) => {
    setIsLoading(true);
    try {
      let fromDate: string | undefined;
      let toDate: string | undefined;

      if (filterType === "today") {
        fromDate = today;
        toDate = today;
      } else if (filterType === "dateRange" && dateFrom && dateTo) {
        fromDate = dateFrom;
        toDate = dateTo;
      }
      // For "history" mode, no date filter (show all)

      const result = await getManualMovements({
        branchId,
        dateFrom: fromDate,
        dateTo: toDate,
        cashRegisterId:
          filterCashRegister !== "all" ? filterCashRegister : undefined,
        type:
          filterMovementType !== "all"
            ? (filterMovementType as "INCOME" | "EXPENSE")
            : undefined,
        limit: pageSize,
        offset: pageNum * pageSize,
      });

      if (result.success && result.data) {
        setMovements(result.data as Movement[]);
        setTotal(result.total ?? 0);
        setHasMore(result.hasMore ?? false);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Error loading movements:", error);
    } finally {
      setIsLoading(false);
    }
  }, [branchId, dateFrom, dateTo, filterCashRegister, filterMovementType, filterType, pageSize, today]);

  // Load today's movements on mount only
  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle filter type change
  const handleSetToday = () => {
    setFilterType("today");
    setDateFrom("");
    setDateTo("");
  };

  const handleSetHistory = () => {
    setFilterType("history");
    setDateFrom("");
    setDateTo("");
  };

  const handleSetDateRange = () => {
    setFilterType("dateRange");
    // Set default range to last 7 days
    const from = new Date();
    from.setDate(from.getDate() - 7);
    setDateFrom(from.toISOString().split("T")[0]);
    setDateTo(today);
  };

  const handleClearFilters = () => {
    setFilterType("today");
    setDateFrom("");
    setDateTo("");
    setFilterCashRegister("all");
    setFilterMovementType("all");
  };

  const handleRowClick = (movement: Movement) => {
    setSelectedMovement(movement);
    setDetailsDialogOpen(true);
  };

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasActiveFilters =
    filterType !== "today" ||
    filterCashRegister !== "all" ||
    filterMovementType !== "all";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Movimientos de Caja
          </h2>
        </div>
        <AddMovementDialog cashRegisters={cashRegisters} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Date Filter Tabs */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <Button
            variant={filterType === "today" ? "default" : "ghost"}
            size="sm"
            onClick={handleSetToday}
            className={
              filterType === "today" ? "bg-red-600 hover:bg-red-700" : ""
            }
          >
            <Clock className="h-4 w-4 mr-1" />
            Hoy
          </Button>
          <Button
            variant={filterType === "history" ? "default" : "ghost"}
            size="sm"
            onClick={handleSetHistory}
            className={
              filterType === "history" ? "bg-red-600 hover:bg-red-700" : ""
            }
          >
            <History className="h-4 w-4 mr-1" />
            Historial
          </Button>
          <Button
            variant={filterType === "dateRange" ? "default" : "ghost"}
            size="sm"
            onClick={handleSetDateRange}
            className={
              filterType === "dateRange" ? "bg-red-600 hover:bg-red-700" : ""
            }
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            Rango
          </Button>
        </div>

        {/* Date Range Inputs */}
        {filterType === "dateRange" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[140px]"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[140px]"
            />
          </div>
        )}

        {/* Cash Register Filter */}
        <Select
          value={filterCashRegister}
          onValueChange={setFilterCashRegister}
        >
          <SelectTrigger className="w-[160px]">
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

        {/* Movement Type Filter */}
        <Select
          value={filterMovementType}
          onValueChange={setFilterMovementType}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="INCOME">Ingresos</SelectItem>
            <SelectItem value="EXPENSE">Egresos</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters & Refresh */}
        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpiar filtros
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMovements(0)}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")}
            />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Pagination info */}
        {total > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
            Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, total)} de {total} movimientos
          </div>
        )}
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                Fecha y Hora
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                Tipo
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                Medio de Pago
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                Caja
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                Descripción
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">
                Monto
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Cargando movimientos...</p>
                </td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-gray-500">No hay movimientos</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {filterType === "today"
                      ? "No se registraron movimientos hoy"
                      : "No se encontraron movimientos con los filtros seleccionados"}
                  </p>
                </td>
              </tr>
            ) : (
              movements.map((movement) => (
                <tr
                  key={movement.id}
                  onClick={() => handleRowClick(movement)}
                  className={cn(
                    "hover:bg-gray-50 transition-colors cursor-pointer",
                    movement.type === "INCOME"
                      ? "border-l-4 border-l-green-500"
                      : "border-l-4 border-l-red-500"
                  )}
                >
                  {/* Date/Time */}
                  <td className="px-4 py-3 text-sm">
                    {formatDateTime(movement.createdAt)}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        movement.type === "INCOME"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {movement.type === "INCOME" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {MOVEMENT_TYPE_LABELS[movement.type]}
                    </span>
                  </td>

                  {/* Payment Method */}
                  <td className="px-4 py-3 text-sm">
                    {PAYMENT_METHOD_LABELS[
                      movement.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS
                    ] || movement.paymentMethod}
                  </td>

                  {/* Cash Register */}
                  <td className="px-4 py-3 text-sm font-medium">
                    {movement.cashRegister.name}
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                    {movement.description || "—"}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "font-medium",
                        movement.type === "INCOME"
                          ? "text-green-600"
                          : "text-red-600"
                      )}
                    >
                      {movement.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(movement.amount)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination controls */}
        {total > pageSize && (
          <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Página {page + 1} de {Math.ceil(total / pageSize)}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadMovements(page - 1)}
                disabled={isLoading || page === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadMovements(page + 1)}
                disabled={isLoading || !hasMore}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Movement Details Dialog */}
      <MovementDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        movement={selectedMovement}
      />
    </div>
  );
}
