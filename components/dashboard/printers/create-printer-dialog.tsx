"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Printer as PrinterIcon,
  Wifi,
  Usb,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { createPrinter } from "@/actions/Printer";
import { useQzTrayOptional } from "@/contexts/qz-tray-context";
import type {
  Station,
  Printer,
  PrintMode,
  PrinterConnectionType,
} from "@/app/generated/prisma";

interface DiscoveredPrinter {
  name: string;
  path: string;
  type: string;
  manufacturer?: string;
}

interface CreatePrinterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  stations: Station[];
  onCreated: (printer: Printer) => void;
}

export function CreatePrinterDialog({
  open,
  onOpenChange,
  branchId,
  stations,
  onCreated,
}: CreatePrinterDialogProps) {
  // QZ Tray context for printer discovery
  const qz = useQzTrayOptional();

  // Connection type
  const [connectionType, setConnectionType] =
    useState<PrinterConnectionType>("NETWORK");

  // Basic info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("");
  const [stationId, setStationId] = useState<string | undefined>(undefined);

  // Network configuration
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("9100");

  // USB configuration
  const [usbPath, setUsbPath] = useState("");
  const [baudRate, setBaudRate] = useState("9600");
  const [discoveredPrinters, setDiscoveredPrinters] = useState<
    DiscoveredPrinter[]
  >([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Print settings
  const [autoPrint, setAutoPrint] = useState(true);
  const [printMode, setPrintMode] = useState<PrintMode>("STATION_ITEMS");
  const [printCopies, setPrintCopies] = useState("1");
  const [paperWidth, setPaperWidth] = useState<"58" | "80">("80");
  const [charactersPerLine, setCharactersPerLine] = useState("48");

  // Control ticket formatting
  const [controlTicketFontSize, setControlTicketFontSize] = useState("1");
  const [controlTicketSpacing, setControlTicketSpacing] = useState("1");

  // State
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateIP = (ip: string) => {
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  const handleDiscoverPrinters = async () => {
    setIsDiscovering(true);
    setError(null);

    try {
      // Use QZ Tray for printer discovery (client-side)
      if (!qz) {
        setError(
          "QZ Tray no está disponible. Asegúrate de que esté instalado y ejecutándose."
        );
        return;
      }

      // Connect to QZ Tray if not connected
      if (!qz.isConnected) {
        const connectResult = await qz.connect();
        if (connectResult.state !== "connected") {
          setError(
            connectResult.error ||
              "No se pudo conectar a QZ Tray. ¿Está ejecutándose?"
          );
          return;
        }
      }

      // Refresh printer list from QZ Tray
      await qz.refreshPrinters();

      // Convert QZ Tray printer format to our format
      const qzPrinters = qz.printers.map((p) => ({
        name: p.name,
        path: p.name, // Use printer name as path for USB/local printers
        type: p.connection || "USB",
        manufacturer: p.driver,
      }));

      setDiscoveredPrinters(qzPrinters);

      if (qzPrinters.length === 0) {
        setError(
          "No se encontraron impresoras. Asegúrate de que las impresoras estén instaladas en el sistema."
        );
      }
    } catch {
      setError("Error al buscar impresoras con QZ Tray");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    // Validate based on connection type
    if (connectionType === "NETWORK") {
      if (!ipAddress.trim()) {
        setError("La dirección IP es requerida");
        return;
      }
      if (!validateIP(ipAddress)) {
        setError("Dirección IP inválida");
        return;
      }
      const portNum = parseInt(port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        setError("Puerto inválido (1-65535)");
        return;
      }
    } else {
      if (!usbPath.trim()) {
        setError("El puerto USB es requerido");
        return;
      }
    }

    const copies = parseInt(printCopies);
    if (isNaN(copies) || copies < 1 || copies > 5) {
      setError("Número de copias inválido (1-5)");
      return;
    }

    const charsPerLine = parseInt(charactersPerLine);
    if (isNaN(charsPerLine) || charsPerLine < 32 || charsPerLine > 48) {
      setError("Caracteres por línea inválido (32-48)");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const result = await createPrinter({
        name: name.trim(),
        description: description.trim() || undefined,
        connectionType,
        // Network config
        ipAddress: connectionType === "NETWORK" ? ipAddress.trim() : null,
        port: connectionType === "NETWORK" ? parseInt(port) : 9100,
        // USB config
        usbPath: connectionType === "USB" ? usbPath.trim() : null,
        baudRate: connectionType === "USB" ? parseInt(baudRate) : 9600,
        // Other fields
        model: model.trim() || undefined,
        branchId,
        stationId: stationId === "none" ? null : stationId,
        autoPrint,
        printMode,
        printCopies: copies,
        paperWidth,
        charactersPerLine: charsPerLine,
        controlTicketFontSize: parseInt(controlTicketFontSize),
        controlTicketSpacing: parseInt(controlTicketSpacing),
      });

      if (result.success && result.data) {
        onCreated(result.data);
        resetForm();
      } else {
        setError(result.error || "Error al crear la impresora");
      }
    } catch {
      setError("Error al crear la impresora");
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    setConnectionType("NETWORK");
    setName("");
    setDescription("");
    setIpAddress("");
    setPort("9100");
    setUsbPath("");
    setBaudRate("9600");
    setDiscoveredPrinters([]);
    setModel("");
    setStationId(undefined);
    setAutoPrint(true);
    setPrintMode("STATION_ITEMS");
    setPrintCopies("1");
    setPaperWidth("80");
    setCharactersPerLine("48");
    setControlTicketFontSize("1");
    setControlTicketSpacing("1");
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const isFormValid =
    name.trim() &&
    (connectionType === "NETWORK" ? ipAddress.trim() : usbPath.trim());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PrinterIcon className="h-5 w-5" />
            Nueva Impresora
          </DialogTitle>
          <DialogDescription>
            Configura una nueva impresora térmica para tu sucursal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Connection Type Selection */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Tipo de Conexión</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setConnectionType("NETWORK")}
                disabled={isPending}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                  connectionType === "NETWORK"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Wifi
                  className={`h-6 w-6 ${
                    connectionType === "NETWORK"
                      ? "text-orange-500"
                      : "text-gray-400"
                  }`}
                />
                <div className="text-left">
                  <p className="font-medium">Red (TCP/IP)</p>
                  <p className="text-xs text-muted-foreground">
                    Impresora conectada a la red
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConnectionType("USB")}
                disabled={isPending}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                  connectionType === "USB"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Usb
                  className={`h-6 w-6 ${
                    connectionType === "USB"
                      ? "text-orange-500"
                      : "text-gray-400"
                  }`}
                />
                <div className="text-left">
                  <p className="font-medium">USB / Serial</p>
                  <p className="text-xs text-muted-foreground">
                    Impresora conectada por USB
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium text-sm">Información Básica</h3>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Impresora Cocina 1"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción opcional..."
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="station">Estación</Label>
              <Select
                value={stationId || "none"}
                onValueChange={(value) =>
                  setStationId(value === "none" ? undefined : value)
                }
                disabled={isPending}
              >
                <SelectTrigger id="station">
                  <SelectValue placeholder="Sin estación asignada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin estación</SelectItem>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Asigna la impresora a una estación de trabajo
              </p>
            </div>
          </div>

          {/* Connection Configuration */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium text-sm">
              {connectionType === "NETWORK"
                ? "Configuración de Red"
                : "Configuración USB"}
            </h3>

            {connectionType === "NETWORK" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ipAddress">Dirección IP *</Label>
                    <Input
                      id="ipAddress"
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                      placeholder="192.168.1.100"
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="port">Puerto</Label>
                    <Input
                      id="port"
                      type="number"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="9100"
                      disabled={isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Por defecto: 9100
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="usbPath">Puerto USB *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDiscoverPrinters}
                      disabled={isPending || isDiscovering}
                    >
                      {isDiscovering ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Buscar Impresoras
                    </Button>
                  </div>

                  {discoveredPrinters.length > 0 ? (
                    <Select
                      value={usbPath}
                      onValueChange={setUsbPath}
                      disabled={isPending}
                    >
                      <SelectTrigger id="usbPath">
                        <SelectValue placeholder="Selecciona una impresora" />
                      </SelectTrigger>
                      <SelectContent>
                        {discoveredPrinters.map((printer) => (
                          <SelectItem key={printer.path} value={printer.path}>
                            {printer.name} ({printer.path})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="usbPath"
                      value={usbPath}
                      onChange={(e) => setUsbPath(e.target.value)}
                      placeholder="COM3"
                      disabled={isPending}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Ej: COM3, COM4 (Windows) o /dev/ttyUSB0 (Linux)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baudRate">Baud Rate</Label>
                  <Select
                    value={baudRate}
                    onValueChange={setBaudRate}
                    disabled={isPending}
                  >
                    <SelectTrigger id="baudRate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9600">9600</SelectItem>
                      <SelectItem value="19200">19200</SelectItem>
                      <SelectItem value="38400">38400</SelectItem>
                      <SelectItem value="57600">57600</SelectItem>
                      <SelectItem value="115200">115200</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Velocidad de comunicación (por defecto: 9600)
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Epson TM-T88VI"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Print Settings */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium text-sm">Configuración de Impresión</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paperWidth">Ancho del Papel (mm)</Label>
                <Select
                  value={paperWidth}
                  onValueChange={(value: "58" | "80") => {
                    setPaperWidth(value);
                    setCharactersPerLine(value === "58" ? "32" : "48");
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger id="paperWidth">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58">58mm</SelectItem>
                    <SelectItem value="80">80mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="charactersPerLine">Caracteres por Línea</Label>
                <Input
                  id="charactersPerLine"
                  type="number"
                  value={charactersPerLine}
                  onChange={(e) => setCharactersPerLine(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="printCopies">Número de Copias</Label>
              <Input
                id="printCopies"
                type="number"
                min="1"
                max="5"
                value={printCopies}
                onChange={(e) => setPrintCopies(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Cantidad de copias a imprimir (1-5)
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="autoPrint" className="text-base cursor-pointer">
                  Impresión Automática
                </Label>
                <p className="text-xs text-muted-foreground">
                  Imprimir automáticamente cuando se agreguen items a una orden
                </p>
              </div>
              <Switch
                id="autoPrint"
                checked={autoPrint}
                onCheckedChange={setAutoPrint}
                disabled={isPending}
              />
            </div>

            {autoPrint && (
              <div className="space-y-2">
                <Label htmlFor="printMode">Modo de Impresión</Label>
                <Select
                  value={printMode}
                  onValueChange={(value: PrintMode) => setPrintMode(value)}
                  disabled={isPending}
                >
                  <SelectTrigger id="printMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STATION_ITEMS">
                      Solo items de estación (comanda)
                    </SelectItem>
                    <SelectItem value="FULL_ORDER">
                      Orden completa (ticket de control)
                    </SelectItem>
                    <SelectItem value="BOTH">
                      Ambos (comanda + ticket)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {printMode === "STATION_ITEMS" &&
                    "Imprime solo los items que corresponden a la estación asignada"}
                  {printMode === "FULL_ORDER" &&
                    "Imprime la orden completa con todos los items y totales"}
                  {printMode === "BOTH" &&
                    "Imprime primero la comanda de estación y luego el ticket completo"}
                </p>
              </div>
            )}

            {/* Control Ticket Formatting - Only show for FULL_ORDER or BOTH modes */}
            {(printMode === "FULL_ORDER" || printMode === "BOTH") && (
              <div className="space-y-4 pt-4 border-t border-dashed">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Formato del Ticket de Control
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="controlTicketFontSize">
                      Tamaño de Fuente
                    </Label>
                    <Select
                      value={controlTicketFontSize}
                      onValueChange={setControlTicketFontSize}
                      disabled={isPending}
                    >
                      <SelectTrigger id="controlTicketFontSize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Pequeño</SelectItem>
                        <SelectItem value="1">Normal</SelectItem>
                        <SelectItem value="2">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="controlTicketSpacing">Espaciado</Label>
                    <Select
                      value={controlTicketSpacing}
                      onValueChange={setControlTicketSpacing}
                      disabled={isPending}
                    >
                      <SelectTrigger id="controlTicketSpacing">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Pequeño</SelectItem>
                        <SelectItem value="1">Normal</SelectItem>
                        <SelectItem value="2">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configura el tamaño de fuente y espaciado entre secciones del
                  ticket de control
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-orange-500 hover:bg-orange-600"
            disabled={isPending || !isFormValid}
          >
            {isPending ? "Creando..." : "Crear Impresora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
