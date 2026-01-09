"use client";

import { useState, useEffect } from "react";
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
import { Pencil, Wifi, Usb, RefreshCw, Loader2 } from "lucide-react";
import { updatePrinter, discoverUsbPrinters } from "@/actions/Printer";
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

type PrinterWithStation = Printer & {
  station: { id: string; name: string; color: string } | null;
  _count: { printJobs: number };
};

interface EditPrinterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printer: PrinterWithStation;
  stations: Station[];
  onUpdated: (printer: Printer) => void;
}

export function EditPrinterDialog({
  open,
  onOpenChange,
  printer,
  stations,
  onUpdated,
}: EditPrinterDialogProps) {
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

  // Ticket customization
  const [ticketHeader, setTicketHeader] = useState("");
  const [ticketHeaderSize, setTicketHeaderSize] = useState("2");
  const [ticketFooter, setTicketFooter] = useState("");
  const [ticketFooterSize, setTicketFooterSize] = useState("1");

  // Control ticket formatting
  const [controlTicketFontSize, setControlTicketFontSize] = useState("1");
  const [controlTicketSpacing, setControlTicketSpacing] = useState("1");

  // State
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (printer && open) {
      setConnectionType(printer.connectionType);
      setName(printer.name);
      setDescription(printer.description || "");
      // Network config
      setIpAddress(printer.ipAddress || "");
      setPort(printer.port.toString());
      // USB config
      setUsbPath(printer.usbPath || "");
      setBaudRate(printer.baudRate.toString());
      // Other fields
      setModel(printer.model || "");
      setStationId(printer.stationId || undefined);
      setAutoPrint(printer.autoPrint);
      setPrintMode(printer.printMode);
      setPrintCopies(printer.printCopies.toString());
      setPaperWidth(printer.paperWidth === 58 ? "58" : "80");
      setCharactersPerLine(printer.charactersPerLine.toString());
      // Ticket customization
      setTicketHeader(printer.ticketHeader || "");
      setTicketHeaderSize((printer.ticketHeaderSize ?? 2).toString());
      setTicketFooter(printer.ticketFooter || "");
      setTicketFooterSize((printer.ticketFooterSize ?? 1).toString());
      // Control ticket formatting
      setControlTicketFontSize((printer.controlTicketFontSize ?? 1).toString());
      setControlTicketSpacing((printer.controlTicketSpacing ?? 1).toString());
      setError(null);
      setDiscoveredPrinters([]);
    }
  }, [printer, open]);

  const validateIP = (ip: string) => {
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  const handleDiscoverPrinters = async () => {
    setIsDiscovering(true);
    setError(null);

    try {
      const result = await discoverUsbPrinters();
      if (result.success) {
        setDiscoveredPrinters(result.printers);
        if (result.printers.length === 0) {
          setError(
            "No se encontraron impresoras USB. Asegúrate de que el servicio de impresión esté activo."
          );
        }
      } else {
        setError(
          result.error ||
            "Error al buscar impresoras. Verifica que el servicio de impresión esté activo."
        );
      }
    } catch {
      setError("Error al conectar con el servicio de impresión");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleUpdate = async () => {
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
      const result = await updatePrinter(printer.id, {
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
        stationId: stationId === "none" ? null : stationId,
        autoPrint,
        printMode,
        printCopies: copies,
        paperWidth,
        charactersPerLine: charsPerLine,
        ticketHeader: ticketHeader.trim() || null,
        ticketHeaderSize: parseInt(ticketHeaderSize),
        ticketFooter: ticketFooter.trim() || null,
        ticketFooterSize: parseInt(ticketFooterSize),
        controlTicketFontSize: parseInt(controlTicketFontSize),
        controlTicketSpacing: parseInt(controlTicketSpacing),
      });

      if (result.success && result.data) {
        onUpdated(result.data);
        onOpenChange(false);
      } else {
        setError(result.error || "Error al actualizar la impresora");
      }
    } catch {
      setError("Error al actualizar la impresora");
    } finally {
      setIsPending(false);
    }
  };

  const isFormValid =
    name.trim() &&
    (connectionType === "NETWORK" ? ipAddress.trim() : usbPath.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Impresora
          </DialogTitle>
          <DialogDescription>
            Modifica la configuración de la impresora
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
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Impresora Cocina 1"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción opcional..."
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-station">Estación</Label>
              <Select
                value={stationId || "none"}
                onValueChange={(value) =>
                  setStationId(value === "none" ? undefined : value)
                }
                disabled={isPending}
              >
                <SelectTrigger id="edit-station">
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
                Asigna la impresora a una estación de trabajo. Sin estación =
                impresora de control.
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
                    <Label htmlFor="edit-ipAddress">Dirección IP *</Label>
                    <Input
                      id="edit-ipAddress"
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                      placeholder="192.168.1.100"
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-port">Puerto</Label>
                    <Input
                      id="edit-port"
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
                    <Label htmlFor="edit-usbPath">Puerto USB *</Label>
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
                      <SelectTrigger id="edit-usbPath">
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
                      id="edit-usbPath"
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
                  <Label htmlFor="edit-baudRate">Baud Rate</Label>
                  <Select
                    value={baudRate}
                    onValueChange={setBaudRate}
                    disabled={isPending}
                  >
                    <SelectTrigger id="edit-baudRate">
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
              <Label htmlFor="edit-model">Modelo</Label>
              <Input
                id="edit-model"
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
                <Label htmlFor="edit-paperWidth">Ancho del Papel (mm)</Label>
                <Select
                  value={paperWidth}
                  onValueChange={(value: "58" | "80") => {
                    setPaperWidth(value);
                    setCharactersPerLine(value === "58" ? "32" : "48");
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger id="edit-paperWidth">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58">58mm</SelectItem>
                    <SelectItem value="80">80mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-charactersPerLine">
                  Caracteres por Línea
                </Label>
                <Input
                  id="edit-charactersPerLine"
                  type="number"
                  value={charactersPerLine}
                  onChange={(e) => setCharactersPerLine(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-printCopies">Número de Copias</Label>
              <Input
                id="edit-printCopies"
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
                <Label
                  htmlFor="edit-autoPrint"
                  className="text-base cursor-pointer"
                >
                  Impresión Automática
                </Label>
                <p className="text-xs text-muted-foreground">
                  Imprimir automáticamente cuando se agreguen items a una orden
                </p>
              </div>
              <Switch
                id="edit-autoPrint"
                checked={autoPrint}
                onCheckedChange={setAutoPrint}
                disabled={isPending}
              />
            </div>

            {autoPrint && (
              <div className="space-y-2">
                <Label htmlFor="edit-printMode">Modo de Impresión</Label>
                <Select
                  value={printMode}
                  onValueChange={(value: PrintMode) => setPrintMode(value)}
                  disabled={isPending}
                >
                  <SelectTrigger id="edit-printMode">
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
          </div>

          {/* Ticket Customization */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium text-sm">Personalización del Ticket</h3>

            <div className="space-y-2">
              <Label htmlFor="edit-ticketHeader">Encabezado del Ticket</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-ticketHeader"
                  value={ticketHeader}
                  onChange={(e) => setTicketHeader(e.target.value)}
                  placeholder="Ej: RESTAURANTE LA COCINA"
                  disabled={isPending}
                  className="flex-1"
                />
                <Select
                  value={ticketHeaderSize}
                  onValueChange={setTicketHeaderSize}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Pequeño</SelectItem>
                    <SelectItem value="1">Normal</SelectItem>
                    <SelectItem value="2">Mediano</SelectItem>
                    <SelectItem value="3">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Texto que aparece al inicio del ticket
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-ticketFooter">Pie del Ticket</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-ticketFooter"
                  value={ticketFooter}
                  onChange={(e) => setTicketFooter(e.target.value)}
                  placeholder="Ej: ¡Gracias por su visita!"
                  disabled={isPending}
                  className="flex-1"
                />
                <Select
                  value={ticketFooterSize}
                  onValueChange={setTicketFooterSize}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Pequeño</SelectItem>
                    <SelectItem value="1">Normal</SelectItem>
                    <SelectItem value="2">Mediano</SelectItem>
                    <SelectItem value="3">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Texto que aparece al final del ticket
              </p>
            </div>

            {/* Control Ticket Formatting */}
            <div className="space-y-4 pt-4 border-t border-dashed">
              <h4 className="font-medium text-sm text-muted-foreground">
                Formato del Ticket de Control
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-controlTicketFontSize">
                    Tamaño de Fuente
                  </Label>
                  <Select
                    value={controlTicketFontSize}
                    onValueChange={setControlTicketFontSize}
                    disabled={isPending}
                  >
                    <SelectTrigger id="edit-controlTicketFontSize">
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
                  <Label htmlFor="edit-controlTicketSpacing">Espaciado</Label>
                  <Select
                    value={controlTicketSpacing}
                    onValueChange={setControlTicketSpacing}
                    disabled={isPending}
                  >
                    <SelectTrigger id="edit-controlTicketSpacing">
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
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpdate}
            className="bg-orange-500 hover:bg-orange-600"
            disabled={isPending || !isFormValid}
          >
            {isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
