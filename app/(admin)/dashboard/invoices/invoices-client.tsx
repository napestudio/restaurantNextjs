"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InvoiceStatus } from "@/app/generated/prisma";
import { usePrint } from "@/hooks/use-print";
import { useToast } from "@/hooks/use-toast";
import { getInvoices } from "@/actions/Invoice";
import { CreateInvoiceDialog } from "@/components/dashboard/create-invoice-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  FileText,
  Search,
  X,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Invoice = {
  id: string;
  customerName: string;
  customerDocType: number;
  customerDocNumber: string;
  invoiceType: number;
  ptoVta: number;
  invoiceNumber: number;
  invoiceDate: Date;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  cae: string | null;
  caeFchVto: string | null;
  status: InvoiceStatus;
  qrUrl: string | null;
  createdAt: Date;
  order: {
    id: string;
    publicCode: string;
  } | null;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type Filters = {
  search: string;
  status?: string;
  invoiceType?: string;
  dateFrom?: string;
  dateTo?: string;
};

interface InvoicesClientProps {
  branchId: string;
  initialInvoices: Invoice[];
  initialPagination: PaginationInfo;
  initialFilters: Filters;
}

const INVOICE_TYPE_LABELS: Record<number, string> = {
  1: "Factura A",
  6: "Factura B",
  11: "Factura C",
};

const DOC_TYPE_LABELS: Record<number, string> = {
  80: "CUIT",
  86: "CUIL",
  96: "DNI",
  99: "Consumidor Final",
};

const STATUS_CONFIG = {
  [InvoiceStatus.PENDING]: {
    label: "Pendiente",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  [InvoiceStatus.EMITTED]: {
    label: "Emitida",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 border-green-200",
  },
  [InvoiceStatus.CANCELLED]: {
    label: "Cancelada",
    icon: XCircle,
    color: "bg-gray-100 text-gray-800 border-gray-200",
  },
  [InvoiceStatus.FAILED]: {
    label: "Fallida",
    icon: AlertCircle,
    color: "bg-red-100 text-red-800 border-red-200",
  },
};

export function InvoicesClient({
  branchId,
  initialInvoices,
  initialPagination,
  initialFilters,
}: InvoicesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [pagination, setPagination] =
    useState<PaginationInfo>(initialPagination);
  const [, startTransition] = useTransition();
  const { printInvoice, isPrinting } = usePrint();
  const { toast } = useToast();

  // Create invoice dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Filter state
  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const [statusFilter, setStatusFilter] = useState<string>(
    initialFilters.status || "all",
  );
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<string>(
    initialFilters.invoiceType || "all",
  );
  const [dateFromFilter, setDateFromFilter] = useState(
    initialFilters.dateFrom || "",
  );
  const [dateToFilter, setDateToFilter] = useState(initialFilters.dateTo || "");
  const [showFilters, setShowFilters] = useState(false);

  // Current page from URL
  const currentPage = parseInt(searchParams.get("page") || "1");

  // Sync state with props when they change (server re-render)
  useEffect(() => {
    setInvoices(initialInvoices);
    setPagination(initialPagination);
  }, [initialInvoices, initialPagination]);

  // Fetch invoices with given filters
  const fetchInvoices = async (filters: {
    page: number;
    search?: string;
    status?: string;
    invoiceType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const validStatuses = Object.values(InvoiceStatus);
    const statusParam =
      filters.status && validStatuses.includes(filters.status as InvoiceStatus)
        ? (filters.status as InvoiceStatus)
        : undefined;

    const result = await getInvoices({
      branchId,
      page: filters.page,
      pageSize: 20,
      search: filters.search || undefined,
      status: statusParam,
      invoiceType: filters.invoiceType
        ? parseInt(filters.invoiceType)
        : undefined,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    });

    if (result.success && result.data) {
      // Serialize Decimal fields
      const serialized = (
        result.data.invoices as Array<Record<string, unknown>>
      ).map((invoice) => ({
        ...invoice,
        subtotal: Number(invoice.subtotal),
        vatAmount: Number(invoice.vatAmount),
        totalAmount: Number(invoice.totalAmount),
      })) as unknown as Invoice[];

      setInvoices(serialized);
      if (result.data.pagination) {
        setPagination(result.data.pagination);
      }
    }
  };

  // Update URL with filters and fetch data immediately
  const updateFilters = (page: number = 1) => {
    const params = new URLSearchParams();
    params.set("page", page.toString());

    const filters = {
      page,
      search: searchInput.trim() || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      invoiceType: invoiceTypeFilter !== "all" ? invoiceTypeFilter : undefined,
      dateFrom: dateFromFilter || undefined,
      dateTo: dateToFilter || undefined,
    };

    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.status) {
      params.set("status", filters.status);
    }
    if (filters.invoiceType) {
      params.set("invoiceType", filters.invoiceType);
    }
    if (filters.dateFrom) {
      params.set("dateFrom", filters.dateFrom);
    }
    if (filters.dateTo) {
      params.set("dateTo", filters.dateTo);
    }

    // Fetch data immediately with optimistic update
    startTransition(async () => {
      await fetchInvoices(filters);
    });

    // Update URL without full page reload (Next.js handles this efficiently)
    router.push(`/dashboard/invoices?${params.toString()}`, { scroll: false });
  };

  // Handle search
  const handleSearch = () => {
    updateFilters(1); // Reset to page 1 when searching
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchInput("");
    setStatusFilter("all");
    setInvoiceTypeFilter("all");
    setDateFromFilter("");
    setDateToFilter("");

    // Fetch data immediately
    startTransition(async () => {
      await fetchInvoices({ page: 1 });
    });

    router.push("/dashboard/invoices", { scroll: false });
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    updateFilters(page);
  };

  const hasActiveFilters =
    searchInput.trim() ||
    statusFilter !== "all" ||
    invoiceTypeFilter !== "all" ||
    dateFromFilter ||
    dateToFilter;

  // Handle print invoice
  const handlePrintInvoice = async (invoiceId: string) => {
    const success = await printInvoice(invoiceId);
    if (success) {
      toast({
        title: "Impresión enviada",
        description: "La factura se envió a la impresora",
      });
    } else {
      toast({
        title: "Error al imprimir",
        description: "No se pudo enviar la factura a la impresora",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Facturación</h1>

        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Factura
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Filtros</CardTitle>
              <CardDescription>Buscar y filtrar facturas</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por cliente, CAE, número de factura..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value={InvoiceStatus.EMITTED}>
                      Emitidas
                    </SelectItem>
                    <SelectItem value={InvoiceStatus.PENDING}>
                      Pendientes
                    </SelectItem>
                    <SelectItem value={InvoiceStatus.FAILED}>
                      Fallidas
                    </SelectItem>
                    <SelectItem value={InvoiceStatus.CANCELLED}>
                      Canceladas
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice Type Filter */}
              <div className="space-y-2">
                <Label>Tipo de Factura</Label>
                <Select
                  value={invoiceTypeFilter}
                  onValueChange={setInvoiceTypeFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="1">Factura A</SelectItem>
                    <SelectItem value="6">Factura B</SelectItem>
                    <SelectItem value="11">Factura C</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label htmlFor="dateFrom">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Fecha Desde
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label htmlFor="dateTo">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Fecha Hasta
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Mostrando {invoices.length} de {pagination.totalCount} facturas
        </p>
      </div>

      {/* Invoices List */}
      <div className="grid gap-4">
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No se encontraron facturas
              </h3>
              <p className="text-sm text-gray-600">
                {hasActiveFilters
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "Aún no se han generado facturas"}
              </p>
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => {
            const StatusIcon = STATUS_CONFIG[invoice.status].icon;
            return (
              <Card
                key={invoice.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">
                          {INVOICE_TYPE_LABELS[invoice.invoiceType]} N°{" "}
                          {invoice.ptoVta.toString().padStart(4, "0")}-
                          {invoice.invoiceNumber.toString().padStart(8, "0")}
                        </h3>
                        <Badge
                          variant="outline"
                          className={STATUS_CONFIG[invoice.status].color}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STATUS_CONFIG[invoice.status].label}
                        </Badge>
                      </div>

                      {/* Customer Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Cliente</p>
                          <p className="font-medium">{invoice.customerName}</p>
                          <p className="text-gray-500">
                            {DOC_TYPE_LABELS[invoice.customerDocType]}:{" "}
                            {invoice.customerDocNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Fecha</p>
                          <p className="font-medium">
                            {format(new Date(invoice.invoiceDate), "PPP", {
                              locale: es,
                            })}
                          </p>
                          {invoice.order && (
                            <p className="text-gray-500">
                              Orden: #{invoice.order.publicCode}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="flex items-center gap-6 text-sm border-t pt-3">
                        <div>
                          <p className="text-gray-600">Subtotal</p>
                          <p className="font-medium">
                            ${invoice.subtotal.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">IVA</p>
                          <p className="font-medium">
                            ${invoice.vatAmount.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total</p>
                          <p className="font-bold text-lg">
                            ${invoice.totalAmount.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* CAE Info */}
                      {invoice.cae && (
                        <div className="text-sm bg-green-50 p-3 rounded-md border border-green-200">
                          <p className="text-gray-600">CAE</p>
                          <p className="font-mono font-medium">{invoice.cae}</p>
                          {invoice.caeFchVto && (
                            <p className="text-gray-500 text-xs mt-1">
                              Vto: {invoice.caeFchVto.slice(6, 8)}/
                              {invoice.caeFchVto.slice(4, 6)}/
                              {invoice.caeFchVto.slice(0, 4)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      {invoice.qrUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={invoice.qrUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Ver en AFIP
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintInvoice(invoice.id)}
                        disabled={isPrinting}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {isPrinting ? "Imprimiendo..." : "Imprimir"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    currentPage > 1 && handlePageChange(currentPage - 1)
                  }
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {Array.from(
                { length: pagination.totalPages },
                (_, i) => i + 1,
              ).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === pagination.totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    currentPage < pagination.totalPages &&
                    handlePageChange(currentPage + 1)
                  }
                  className={
                    currentPage === pagination.totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        branchId={branchId}
        onSuccess={() => {
          // Refresh invoice list after successful creation
          startTransition(async () => {
            await fetchInvoices({
              page: currentPage,
              search: searchInput || undefined,
              status: statusFilter !== "all" ? statusFilter : undefined,
              invoiceType:
                invoiceTypeFilter !== "all" ? invoiceTypeFilter : undefined,
              dateFrom: dateFromFilter || undefined,
              dateTo: dateToFilter || undefined,
            });
          });
        }}
      />
    </div>
  );
}
