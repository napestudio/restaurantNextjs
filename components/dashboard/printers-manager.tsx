"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Printer as PrinterIcon,
  Wifi,
  WifiOff,
  AlertCircle,
  Settings,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Printer, PrinterStatus, Station } from "@/app/generated/prisma";
import { CreatePrinterDialog } from "./printers/create-printer-dialog";
import { PrinterDetailsSidebar } from "./printers/printer-details-sidebar";
import { CreateStationDialog } from "./printers/create-station-dialog";
import { StationDetailsSidebar } from "./printers/station-details-sidebar";
import { deleteStation } from "@/actions/Station";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type PrinterWithStation = Printer & {
  station: { id: string; name: string; color: string } | null;
  _count: { printJobs: number };
};

type StationWithCounts = Station & {
  _count: {
    printers: number;
    stationCategories: number;
  };
};

interface PrintersManagerProps {
  branchId: string;
  initialPrinters: PrinterWithStation[];
  initialStations: StationWithCounts[];
}

const PRINTER_STATUS_LABELS: Record<PrinterStatus, string> = {
  ONLINE: "En línea",
  OFFLINE: "Fuera de línea",
  ERROR: "Error",
};

const PRINTER_STATUS_COLORS: Record<
  PrinterStatus,
  { badge: string; icon: string }
> = {
  ONLINE: { badge: "bg-green-100 text-green-800", icon: "text-green-600" },
  OFFLINE: { badge: "bg-gray-100 text-gray-800", icon: "text-gray-600" },
  ERROR: { badge: "bg-red-100 text-red-800", icon: "text-red-600" },
};

export function PrintersManager({
  branchId,
  initialPrinters,
  initialStations,
}: PrintersManagerProps) {
  const { toast } = useToast();
  const [printers, setPrinters] = useState<PrinterWithStation[]>(initialPrinters);
  const [stations, setStations] = useState<StationWithCounts[]>(initialStations);
  const [createPrinterOpen, setCreatePrinterOpen] = useState(false);
  const [createStationOpen, setCreateStationOpen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterWithStation | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationWithCounts | null>(null);
  const [printerSidebarOpen, setPrinterSidebarOpen] = useState(false);
  const [stationSidebarOpen, setStationSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteStationDialogOpen, setDeleteStationDialogOpen] = useState(false);
  const [stationToDelete, setStationToDelete] = useState<StationWithCounts | null>(null);
  const [isDeletingStation, setIsDeletingStation] = useState(false);

  const handlePrinterCreated = (newPrinter: Printer) => {
    // Find the station if one was assigned
    const station = newPrinter.stationId
      ? stations.find((s) => s.id === newPrinter.stationId)
      : null;

    const printerWithStation: PrinterWithStation = {
      ...newPrinter,
      station: station
        ? { id: station.id, name: station.name, color: station.color }
        : null,
      _count: { printJobs: 0 },
    };

    setPrinters((prev) => [printerWithStation, ...prev]);
    setCreatePrinterOpen(false);
  };

  const handleStationCreated = (newStation: StationWithCounts) => {
    setStations((prev) => [newStation, ...prev]);
    setCreateStationOpen(false);
  };

  const handlePrinterUpdated = (updatedPrinter: PrinterWithStation) => {
    setPrinters((prev) =>
      prev.map((p) => (p.id === updatedPrinter.id ? updatedPrinter : p))
    );
  };

  const handleStationUpdated = (updatedStation: StationWithCounts) => {
    setStations((prev) =>
      prev.map((s) => (s.id === updatedStation.id ? updatedStation : s))
    );
  };

  const handleStationDeleteClick = (station: StationWithCounts) => {
    setStationToDelete(station);
    setDeleteStationDialogOpen(true);
  };

  const handleConfirmDeleteStation = async () => {
    if (!stationToDelete) return;

    setIsDeletingStation(true);
    try {
      const result = await deleteStation(stationToDelete.id);
      if (result.success) {
        setStations((prev) => prev.filter((s) => s.id !== stationToDelete.id));
        toast({
          title: "Éxito",
          description: "Estación eliminada correctamente",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Error al eliminar la estación",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al eliminar la estación",
      });
    } finally {
      setIsDeletingStation(false);
      setDeleteStationDialogOpen(false);
      setStationToDelete(null);
    }
  };

  const handlePrinterDeleted = (printerId: string) => {
    setPrinters((prev) => prev.filter((p) => p.id !== printerId));
  };

  const handlePrinterClick = (printer: PrinterWithStation) => {
    setSelectedPrinter(printer);
    setPrinterSidebarOpen(true);
  };

  const handleClosePrinterSidebar = () => {
    setPrinterSidebarOpen(false);
    setTimeout(() => setSelectedPrinter(null), 300);
  };

  const handleStationClick = (station: StationWithCounts) => {
    setSelectedStation(station);
    setStationSidebarOpen(true);
  };

  const handleCloseStationSidebar = () => {
    setStationSidebarOpen(false);
    setTimeout(() => setSelectedStation(null), 300);
  };

  const filteredPrinters = printers.filter((printer) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        printer.name.toLowerCase().includes(query) ||
        printer.ipAddress.toLowerCase().includes(query) ||
        printer.model?.toLowerCase().includes(query) ||
        printer.station?.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const StatusIcon = ({ status }: { status: PrinterStatus }) => {
    const iconClass = `h-5 w-5 ${PRINTER_STATUS_COLORS[status].icon}`;
    switch (status) {
      case "ONLINE":
        return <Wifi className={iconClass} />;
      case "OFFLINE":
        return <WifiOff className={iconClass} />;
      case "ERROR":
        return <AlertCircle className={iconClass} />;
    }
  };

  return (
    <div className="p-6">
      <Tabs defaultValue="printers" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Impresoras y Estaciones</h1>
            <p className="text-muted-foreground">
              Administra las impresoras térmicas y estaciones de trabajo
            </p>
          </div>
          <div className="flex gap-2">
            <TabsList>
              <TabsTrigger value="printers">Impresoras</TabsTrigger>
              <TabsTrigger value="stations">Estaciones</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="printers" className="space-y-4">
          {/* Printers Header */}
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, IP, modelo o estación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => setCreatePrinterOpen(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Impresora
            </Button>
          </div>

          {/* Printers List */}
          {filteredPrinters.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <PrinterIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay impresoras</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "No se encontraron impresoras con ese criterio"
                  : "Comienza agregando tu primera impresora térmica"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setCreatePrinterOpen(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Impresora
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Nombre
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      IP / Puerto
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Estado
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Estación
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Auto-impresión
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                      Activa
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPrinters.map((printer) => (
                    <tr
                      key={printer.id}
                      onClick={() => handlePrinterClick(printer)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <PrinterIcon className="h-4 w-4 text-gray-700" />
                          </div>
                          <div>
                            <p className="font-medium">{printer.name}</p>
                            {printer.model && (
                              <p className="text-xs text-muted-foreground">
                                {printer.model}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm">
                          {printer.ipAddress}:{printer.port}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={printer.status} />
                          <Badge
                            className={cn(
                              "text-xs",
                              PRINTER_STATUS_COLORS[printer.status].badge
                            )}
                          >
                            {PRINTER_STATUS_LABELS[printer.status]}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {printer.station ? (
                          <Badge
                            style={{ backgroundColor: printer.station.color }}
                            className="text-white"
                          >
                            {printer.station.name}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">
                          {printer.autoPrint ? "Sí" : "No"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {printer.isActive ? (
                          <Power className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <PowerOff className="h-4 w-4 text-gray-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stations" className="space-y-4">
          {/* Stations Header */}
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              {stations.length} estación{stations.length !== 1 ? "es" : ""}
            </p>
            <Button
              onClick={() => setCreateStationOpen(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Estación
            </Button>
          </div>

          {/* Stations List */}
          {stations.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay estaciones</h3>
              <p className="text-muted-foreground mb-4">
                Las estaciones agrupan impresoras por área de trabajo (cocina, bar,
                etc.)
              </p>
              <Button
                onClick={() => setCreateStationOpen(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Estación
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Nombre
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Impresoras
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Categorías
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stations.map((station) => (
                    <tr
                      key={station.id}
                      onClick={() => handleStationClick(station)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: station.color }}
                          >
                            <Settings className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{station.name}</p>
                            {station.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {station.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">
                          {station._count.printers} impresora{station._count.printers !== 1 ? "s" : ""}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {station._count.stationCategories > 0 ? (
                          <Badge variant="secondary">
                            {station._count.stationCategories} categoría{station._count.stationCategories !== 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <span className="text-xs text-amber-600">
                            Sin categorías
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStationDeleteClick(station);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreatePrinterDialog
        open={createPrinterOpen}
        onOpenChange={setCreatePrinterOpen}
        branchId={branchId}
        stations={stations}
        onCreated={handlePrinterCreated}
      />

      <CreateStationDialog
        open={createStationOpen}
        onOpenChange={setCreateStationOpen}
        branchId={branchId}
        onCreated={handleStationCreated}
      />

      {/* Sidebars */}
      <PrinterDetailsSidebar
        printer={selectedPrinter}
        open={printerSidebarOpen}
        onClose={handleClosePrinterSidebar}
        onUpdate={handlePrinterUpdated}
        onDelete={handlePrinterDeleted}
        stations={stations}
      />

      <StationDetailsSidebar
        station={selectedStation}
        open={stationSidebarOpen}
        onClose={handleCloseStationSidebar}
        onUpdate={handleStationUpdated}
      />

      {/* Delete Station Confirmation */}
      <AlertDialog open={deleteStationDialogOpen} onOpenChange={setDeleteStationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la
              estación &quot;{stationToDelete?.name}&quot;.
              {stationToDelete?._count.printers ? (
                <span className="block mt-2 text-amber-600">
                  Nota: Esta estación tiene {stationToDelete._count.printers} impresora(s) asignada(s).
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingStation}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteStation}
              disabled={isDeletingStation}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingStation ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
