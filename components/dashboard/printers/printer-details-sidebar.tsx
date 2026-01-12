"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  X,
  Printer as PrinterIcon,
  Wifi,
  WifiOff,
  AlertCircle,
  TestTube,
  Trash2,
  Pencil,
} from "lucide-react";
import { togglePrinterStatus, deletePrinter } from "@/actions/Printer";
import { usePrint } from "@/hooks/use-print";
import { useToast } from "@/hooks/use-toast";
import type {
  Printer,
  PrinterStatus,
  PrintMode,
  Station,
} from "@/app/generated/prisma";
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
import { cn } from "@/lib/utils";
import { EditPrinterDialog } from "./edit-printer-dialog";

type PrinterWithStation = Printer & {
  station: { id: string; name: string; color: string } | null;
  _count: { printJobs: number };
};

interface PrinterDetailsSidebarProps {
  printer: PrinterWithStation | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (printer: PrinterWithStation) => void;
  onDelete: (printerId: string) => void;
  stations: Station[];
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

const PRINT_MODE_LABELS: Record<PrintMode, string> = {
  STATION_ITEMS: "Solo items de estación (comanda)",
  FULL_ORDER: "Orden completa (ticket de control)",
  BOTH: "Ambos (comanda + ticket)",
};

export function PrinterDetailsSidebar({
  printer,
  open,
  onClose,
  onUpdate,
  onDelete,
  stations,
}: PrinterDetailsSidebarProps) {
  const { toast } = useToast();
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // QZ Tray printing
  const { printTest, isPrinting: isTesting, printStatus } = usePrint();

  if (!printer) return null;

  const handlePrinterUpdated = (updatedPrinter: Printer) => {
    // Find the station from the stations list if stationId is set
    const station = updatedPrinter.stationId
      ? stations.find((s) => s.id === updatedPrinter.stationId)
      : null;

    onUpdate({
      ...updatedPrinter,
      station: station
        ? { id: station.id, name: station.name, color: station.color }
        : null,
      _count: printer._count,
    });

    toast({
      title: "Éxito",
      description: "Impresora actualizada correctamente",
    });
  };

  const handleToggleStatus = async () => {
    setIsTogglingStatus(true);
    try {
      const result = await togglePrinterStatus(printer.id, !printer.isActive);

      if (result.success && result.data) {
        toast({
          title: "Éxito",
          description: printer.isActive
            ? "Impresora desactivada"
            : "Impresora activada",
        });
        onUpdate(result.data as PrinterWithStation);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Error al cambiar el estado",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cambiar el estado",
      });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleTestPrint = async () => {
    const success = await printTest(printer.id);

    if (success) {
      toast({
        title: "Éxito",
        description: "Impresión de prueba enviada",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: printStatus.message || "Error al realizar la prueba",
      });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deletePrinter(printer.id);

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Impresora eliminada exitosamente",
        });
        onDelete(printer.id);
        onClose();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Error al eliminar la impresora",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al eliminar la impresora",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

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

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-112.5 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="bg-red-500 text-white p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <PrinterIcon className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Detalles de Impresora</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-red-600"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-red-600"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">
              Información Básica
            </h3>

            <div className="space-y-2">
              <Label>Nombre</Label>
              <p className="text-sm font-medium">{printer.name}</p>
            </div>

            {printer.description && (
              <div className="space-y-2">
                <Label>Descripción</Label>
                <p className="text-sm">{printer.description}</p>
              </div>
            )}

            {printer.model && (
              <div className="space-y-2">
                <Label>Modelo</Label>
                <p className="text-sm">{printer.model}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Estado de Conexión</Label>
              <div className="flex items-center gap-2">
                <StatusIcon status={printer.status} />
                <Badge className={PRINTER_STATUS_COLORS[printer.status].badge}>
                  {PRINTER_STATUS_LABELS[printer.status]}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                    printer.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  )}
                >
                  {printer.isActive ? "Activa" : "Inactiva"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleStatus}
                  disabled={isTogglingStatus}
                >
                  {isTogglingStatus
                    ? "..."
                    : printer.isActive
                    ? "Desactivar"
                    : "Activar"}
                </Button>
              </div>
            </div>
          </div>

          {/* Network Configuration */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">
              Configuración de Red
            </h3>

            <div className="space-y-2">
              <Label>Dirección IP</Label>
              <p className="text-sm font-mono">{printer.ipAddress}</p>
            </div>

            <div className="space-y-2">
              <Label>Puerto</Label>
              <p className="text-sm font-mono">{printer.port}</p>
            </div>
          </div>

          {/* Station */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">
              Estación
            </h3>

            <div className="space-y-2">
              <Label>Estación Asignada</Label>
              {printer.station ? (
                <Badge
                  style={{ backgroundColor: printer.station.color }}
                  className="text-white"
                >
                  {printer.station.name}
                </Badge>
              ) : (
                <p className="text-sm text-gray-500">Sin estación asignada</p>
              )}
            </div>
          </div>

          {/* Print Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">
              Configuración de Impresión
            </h3>

            <div className="space-y-2">
              <Label>Auto-impresión</Label>
              <p className="text-sm">
                {printer.autoPrint ? "Habilitada" : "Deshabilitada"}
              </p>
            </div>

            {printer.autoPrint && (
              <div className="space-y-2">
                <Label>Modo de Impresión</Label>
                <p className="text-sm">
                  {PRINT_MODE_LABELS[printer.printMode]}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Copias</Label>
                <p className="text-sm">{printer.printCopies}</p>
              </div>

              <div className="space-y-2">
                <Label>Ancho de Papel</Label>
                <p className="text-sm">{printer.paperWidth}mm</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Caracteres por Línea</Label>
              <p className="text-sm">{printer.charactersPerLine}</p>
            </div>
          </div>

          {/* Ticket Customization */}
          {(printer.ticketHeader || printer.ticketFooter) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">
                Personalización del Ticket
              </h3>

              {printer.ticketHeader && (
                <div className="space-y-2">
                  <Label>Encabezado</Label>
                  <p className="text-sm">{printer.ticketHeader}</p>
                  <p className="text-xs text-muted-foreground">
                    Tamaño:{" "}
                    {printer.ticketHeaderSize === 0
                      ? "Pequeño"
                      : printer.ticketHeaderSize === 1
                      ? "Normal"
                      : printer.ticketHeaderSize === 2
                      ? "Mediano"
                      : "Grande"}
                  </p>
                </div>
              )}

              {printer.ticketFooter && (
                <div className="space-y-2">
                  <Label>Pie</Label>
                  <p className="text-sm">{printer.ticketFooter}</p>
                  <p className="text-xs text-muted-foreground">
                    Tamaño:{" "}
                    {printer.ticketFooterSize === 0
                      ? "Pequeño"
                      : printer.ticketFooterSize === 1
                      ? "Normal"
                      : printer.ticketFooterSize === 2
                      ? "Mediano"
                      : "Grande"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Statistics */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">
              Estadísticas
            </h3>

            <div className="space-y-2">
              <Label>Trabajos de Impresión</Label>
              <p className="text-sm font-medium">{printer._count.printJobs}</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t text-xs text-gray-500 space-y-1">
            <p>
              <span className="font-medium">Creado:</span>{" "}
              {formatDate(printer.createdAt)}
            </p>
            <p>
              <span className="font-medium">Actualizado:</span>{" "}
              {formatDate(printer.updatedAt)}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t p-4 space-y-2">
          <Button
            onClick={handleTestPrint}
            disabled={!printer.isActive || isTesting}
            className="w-full bg-red-500 hover:bg-red-600"
          >
            {isTesting ? (
              "Enviando prueba..."
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Imprimir Prueba
              </>
            )}
          </Button>

          <Button
            onClick={() => setDeleteDialogOpen(true)}
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Impresora
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar impresora?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la
              impresora &quot;{printer.name}&quot; y todos sus trabajos de
              impresión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditPrinterDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        printer={printer}
        stations={stations}
        onUpdated={handlePrinterUpdated}
      />
    </>
  );
}
