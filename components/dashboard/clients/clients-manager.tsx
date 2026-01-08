"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Mail,
  Phone,
  CreditCard,
  User,
  Filter,
  X,
} from "lucide-react";
import { type ClientData } from "@/actions/clients";
import { CreateClientDialog } from "./create-client-dialog";
import { ClientDetailsSidebar } from "./client-details-sidebar";
import { PaymentMethod } from "@/app/generated/prisma";
import { cn } from "@/lib/utils";

// Payment method labels for Client enum (not Extended)
const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

interface ClientsManagerProps {
  branchId: string;
  initialClients: ClientData[];
}

export function ClientsManager({
  branchId,
  initialClients,
}: ClientsManagerProps) {
  const [clients, setClients] = useState<ClientData[]>(initialClients);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterHasAccount, setFilterHasAccount] = useState<
    "all" | "yes" | "no"
  >("all");
  const [filterHasDiscount, setFilterHasDiscount] = useState<
    "all" | "yes" | "no"
  >("all");

  const handleCreated = (newClient: ClientData) => {
    setClients((prev) => {
      // Check if this is replacing a temp client (real client from server)
      const tempClientIndex = prev.findIndex(
        (c) => c.id.startsWith("temp-") && c.name === newClient.name
      );
      if (tempClientIndex !== -1) {
        // Replace temp client with real one
        return prev.map((c, idx) => (idx === tempClientIndex ? newClient : c));
      }
      // Otherwise add as new client
      return [newClient, ...prev];
    });
  };

  const handleClientUpdated = (updatedClient: ClientData) => {
    setClients((prev) =>
      prev.map((c) => (c.id === updatedClient.id ? updatedClient : c))
    );
  };

  const handleClientClick = (client: ClientData) => {
    setSelectedClient(client);
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    // Small delay before clearing to allow animation
    setTimeout(() => setSelectedClient(null), 300);
  };

  // Filter clients
  const filteredClients = clients.filter((client) => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        client.name.toLowerCase().includes(query) ||
        client.phone?.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.taxId?.toLowerCase().includes(query);

      if (!matchesSearch) return false;
    }

    // Current account filter
    if (filterHasAccount === "yes" && !client.hasCurrentAccount) return false;
    if (filterHasAccount === "no" && client.hasCurrentAccount) return false;

    // Discount filter
    if (filterHasDiscount === "yes" && client.discountPercentage === 0)
      return false;
    if (filterHasDiscount === "no" && client.discountPercentage > 0)
      return false;

    return true;
  });

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterHasAccount("all");
    setFilterHasDiscount("all");
  };

  const hasActiveFilters =
    searchQuery.trim() ||
    filterHasAccount !== "all" ||
    filterHasDiscount !== "all";

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Administra los clientes de tu sucursal
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-red-500 hover:bg-red-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg border mb-4 p-4 space-y-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, teléfono, email o DNI/CUIT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Toggle Filters Button */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(hasActiveFilters && "border-red-500 text-red-600")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-2 bg-orange-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                !
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-500"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Cuenta Corriente
              </label>
              <select
                value={filterHasAccount}
                onChange={(e) =>
                  setFilterHasAccount(e.target.value as "all" | "yes" | "no")
                }
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Todos</option>
                <option value="yes">Con cuenta corriente</option>
                <option value="no">Sin cuenta corriente</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Descuento
              </label>
              <select
                value={filterHasDiscount}
                onChange={(e) =>
                  setFilterHasDiscount(e.target.value as "all" | "yes" | "no")
                }
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Todos</option>
                <option value="yes">Con descuento</option>
                <option value="no">Sin descuento</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Mostrando {filteredClients.length} de {clients.length} cliente
        {clients.length !== 1 ? "s" : ""}
      </div>

      {/* Clients Table */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          {clients.length === 0 ? (
            <>
              <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay clientes</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer cliente para comenzar a gestionar tu base de
                datos.
              </p>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Cliente
              </Button>
            </>
          ) : (
            <>
              <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No se encontraron resultados
              </h3>
              <p className="text-muted-foreground mb-4">
                Intenta ajustar tus filtros de búsqueda
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Contacto
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    DNI/CUIT
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Descuento
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Cuenta
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Registrado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => handleClientClick(client)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{client.name}</p>
                          {client.preferredPaymentMethod && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {
                                PAYMENT_METHOD_LABELS[
                                  client.preferredPaymentMethod
                                ]
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {client.phone && (
                          <p className="text-sm flex items-center gap-1.5 text-gray-700">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {client.phone}
                          </p>
                        )}
                        {client.email && (
                          <p className="text-xs flex items-center gap-1.5 text-gray-500">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {client.email}
                          </p>
                        )}
                        {!client.phone && !client.email && (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* Tax ID */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {client.taxId || "—"}
                      </span>
                    </td>

                    {/* Discount */}
                    <td className="px-4 py-3">
                      {client.discountPercentage > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {client.discountPercentage}%
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>

                    {/* Current Account */}
                    <td className="px-4 py-3">
                      {client.hasCurrentAccount ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Sí
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>

                    {/* Created At */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {formatDate(client.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateClientDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        branchId={branchId}
        onCreated={handleCreated}
      />

      {/* Sidebar */}
      <ClientDetailsSidebar
        client={selectedClient}
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        onClientUpdated={handleClientUpdated}
      />
    </div>
  );
}
