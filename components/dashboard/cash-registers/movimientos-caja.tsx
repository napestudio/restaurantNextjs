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
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  CashRegisterWithStatus,
  MOVEMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/types/cash-register";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AddMovementDialog,
  type OptimisticMovement,
} from "./add-movement-dialog";
import { MovementDetailsSidebar } from "./movement-details-sidebar";

interface Movement {
  id: string;
  type: "INCOME" | "EXPENSE" | "CORRECTION";
  paymentMethod: string;
  amount: number;
  description: string | null;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  sessionId: string;
  cashRegister: {
    id: string;
    name: string;
  };
  isOptimistic?: boolean;
}

interface MovimientosCajaProps {
  branchId: string;
  cashRegisters: CashRegisterWithStatus[];
  userRole: string;
}

type FilterType = "today" | "history" | "dateRange";
type SortBy = "date" | "amount";
type SortOrder = "asc" | "desc";

export function MovimientosCaja({
  branchId,
  cashRegisters,
  userRole,
}: MovimientosCajaProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterCashRegister, setFilterCashRegister] = useState<string>("all");
  const [filterMovementType, setFilterMovementType] = useState<string>("all");
  const [searchDescription, setSearchDescription] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(
    null,
  );
  const [detailsSidebarOpen, setDetailsSidebarOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 50;

  // Debounce timer ref
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate today's date for filters
  const today = useMemo(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  }, []);

  // Load movements based on current filter state
  const loadMovements = useCallback(
    async (pageNum: number = 0) => {
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

        const result = await getManualMovements({
          branchId,
          dateFrom: fromDate,
          dateTo: toDate,
          cashRegisterId:
            filterCashRegister !== "all" ? filterCashRegister : undefined,
          type:
            filterMovementType !== "all"
              ? (filterMovementType as "INCOME" | "EXPENSE" | "CORRECTION")
              : undefined,
          description: searchDescription.trim() || undefined,
          sortBy,
          sortOrder,
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
    },
    [
      branchId,
      dateFrom,
      dateTo,
      filterCashRegister,
      filterMovementType,
      filterType,
      searchDescription,
      sortBy,
      sortOrder,
      today,
    ],
  );

  // Auto-trigger loadMovements with debounce when filters change
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      loadMovements(0);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterType,
    dateFrom,
    dateTo,
    filterCashRegister,
    filterMovementType,
    searchDescription,
    sortBy,
    sortOrder,
  ]);

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
    setSearchDescription("");
  };

  const handleRowClick = (movement: Movement) => {
    if (movement.isOptimistic) return;
    setSelectedMovement(movement);
    setDetailsSidebarOpen(true);
  };

  const handleSortColumn = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Optimistic update handlers
  const handleMovementAdded = (optimistic: OptimisticMovement) => {
    setMovements((prev) => [optimistic as Movement, ...prev]);
    setTotal((prev) => prev + 1);
  };

  const handleMovementFailed = (tempId: string) => {
    setMovements((prev) => prev.filter((m) => m.id !== tempId));
    setTotal((prev) => Math.max(0, prev - 1));
  };

  const handleMovementConfirmed = (
    tempId: string,
    real: OptimisticMovement,
  ) => {
    setMovements((prev) =>
      prev.map((m) =>
        m.id === tempId ? { ...real, isOptimistic: false } : m,
      ),
    );
    // Reload to get fresh data from server
    loadMovements(0);
  };

  // Format helpers
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
    filterMovementType !== "all" ||
    searchDescription !== "";

  const SortIcon = ({ column }: { column: SortBy }) => {
    if (sortBy !== column)
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 ml-1" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 ml-1" />
    );
  };

  const getMovementBadge = (movement: Movement) => {
    if (movement.type === "CORRECTION") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <ArrowLeftRight className="h-3 w-3" />
          {MOVEMENT_TYPE_LABELS.CORRECTION}
        </span>
      );
    }
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          movement.type === "INCOME"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700",
        )}
      >
        {movement.type === "INCOME" ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {MOVEMENT_TYPE_LABELS[movement.type]}
      </span>
    );
  };

  const getAmountDisplay = (movement: Movement) => {
    if (movement.type === "CORRECTION") {
      const isPositive = movement.amount >= 0;
      return (
        <span
          className={cn(
            "font-medium",
            isPositive ? "text-green-600" : "text-red-600",
          )}
        >
          {isPositive ? "+" : ""}
          {formatCurrency(movement.amount)}
        </span>
      );
    }
    return (
      <span
        className={cn(
          "font-medium",
          movement.type === "INCOME" ? "text-green-600" : "text-red-600",
        )}
      >
        {movement.type === "INCOME" ? "+" : "-"}
        {formatCurrency(movement.amount)}
      </span>
    );
  };

  const getRowBorderClass = (movement: Movement) => {
    if (movement.type === "CORRECTION") return "border-l-4 border-l-yellow-400";
    return movement.type === "INCOME"
      ? "border-l-4 border-l-green-500"
      : "border-l-4 border-l-red-500";
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Movimientos de Caja
          </h2>
        </div>
        <AddMovementDialog
          cashRegisters={cashRegisters}
          onMovementAdded={handleMovementAdded}
          onMovementFailed={handleMovementFailed}
          onMovementConfirmed={handleMovementConfirmed}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
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
              className="w-35"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-35"
            />
          </div>
        )}

        {/* Cash Register Filter */}
        <Select
          value={filterCashRegister}
          onValueChange={setFilterCashRegister}
        >
          <SelectTrigger className="w-40">
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
          <SelectTrigger className="w-38">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="INCOME">Ingresos</SelectItem>
            <SelectItem value="EXPENSE">Egresos</SelectItem>
            <SelectItem value="CORRECTION">Correcciones</SelectItem>
          </SelectContent>
        </Select>

        {/* Description Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchDescription}
            onChange={(e) => setSearchDescription(e.target.value)}
            placeholder="Buscar descripción..."
            className="pl-8 w-48"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="ml-auto"
          >
            <X className="h-4 w-4 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Pagination info */}
        {total > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
            Mostrando {page * pageSize + 1} -{" "}
            {Math.min((page + 1) * pageSize, total)} de {total} movimientos
          </div>
        )}
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                <button
                  className="flex items-center hover:text-gray-900 transition-colors"
                  onClick={() => handleSortColumn("date")}
                >
                  Fecha y Hora
                  <SortIcon column="date" />
                </button>
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
                <button
                  className="flex items-center ml-auto hover:text-gray-900 transition-colors"
                  onClick={() => handleSortColumn("amount")}
                >
                  Monto
                  <SortIcon column="amount" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 mx-auto mb-2" />
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
                    "transition-colors",
                    getRowBorderClass(movement),
                    movement.isOptimistic
                      ? "opacity-60 cursor-default"
                      : "hover:bg-gray-50 cursor-pointer",
                  )}
                >
                  {/* Date/Time */}
                  <td className="px-4 py-3 text-sm">
                    {formatDateTime(movement.createdAt)}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">{getMovementBadge(movement)}</td>

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
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-50 truncate">
                    {movement.description || "—"}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 text-right">
                    {getAmountDisplay(movement)}
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

      {/* Movement Details Sidebar */}
      <MovementDetailsSidebar
        open={detailsSidebarOpen}
        onClose={() => setDetailsSidebarOpen(false)}
        movement={selectedMovement}
        cashRegisters={cashRegisters}
        onMovementUpdated={() => loadMovements(0)}
        userRole={userRole}
      />
    </div>
  );
}
