/**
 * QZ Tray Client Library
 *
 * Handles communication with QZ Tray for direct printing from browser to local printers.
 * QZ Tray is a background application that bridges web apps to local printers.
 *
 * @see https://qz.io/
 */

declare global {
  interface Window {
    qz?: QzTrayAPI;
  }
}

// QZ Tray API types
export interface QzTrayAPI {
  websocket: {
    connect: (options?: QzConnectOptions) => Promise<void>;
    disconnect: () => Promise<void>;
    isActive: () => boolean;
    getConnectionInfo: () => { host: string; port: string | number };
  };
  security: {
    setCertificatePromise: (
      callback: (resolve: (cert: string) => void) => void
    ) => void;
    setSignatureAlgorithm: (algorithm: string) => void;
    setSignaturePromise: (
      callback: (
        resolve: (signature: string) => void,
        reject: (err: Error) => void,
        toSign: string
      ) => void
    ) => void;
  };
  printers: {
    find: (query?: string) => Promise<string | string[]>;
    getDefault: () => Promise<string>;
    details: (printer?: string) => Promise<PrinterDetails | PrinterDetails[]>;
  };
  print: (config: PrintConfig, data: PrintData[]) => Promise<void>;
  configs: {
    create: (printer: string | null, options?: PrinterOptions) => PrintConfig;
  };
  api: {
    getVersion: () => string;
  };
}

export interface QzConnectOptions {
  host?: string | string[];
  port?: number | number[];
  usingSecure?: boolean;
  keepAlive?: number;
  retries?: number;
  delay?: number;
}

export interface PrinterDetails {
  name: string;
  driver?: string;
  connection?: string;
  default?: boolean;
  raw?: boolean;
  trays?: string[];
}

export interface PrinterOptions {
  copies?: number;
  colorType?: "color" | "grayscale" | "blackwhite";
  duplex?: boolean;
  orientation?: "portrait" | "landscape" | "reverse-portrait" | "reverse-landscape";
  paperThickness?: number;
  printerTray?: string;
  size?: { width: number; height: number };
  units?: "in" | "cm" | "mm";
  margins?: { top?: number; right?: number; bottom?: number; left?: number };
  jobName?: string;
  rasterize?: boolean;
  scaleContent?: boolean;
}

export interface PrintConfig {
  printer: string | null;
  options: PrinterOptions;
}

export interface PrintData {
  type: "raw" | "pixel" | "pdf" | "html" | "image";
  data: string;
  format?: "base64" | "hex" | "plain" | "file" | "image";
  flavor?: "base64" | "file" | "hex" | "plain";
  options?: Record<string, unknown>;
}

// Connection state
export type QzConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface QzConnectionStatus {
  state: QzConnectionState;
  error?: string;
  version?: string;
}

// Result types for operations
export interface QzPrintResult {
  success: boolean;
  error?: string;
  printerId?: string;
}

export interface QzPrinterInfo {
  name: string;
  isDefault: boolean;
  connection?: string;
  driver?: string;
}

/**
 * Check if QZ Tray script is loaded
 */
export function isQzLoaded(): boolean {
  return typeof window !== "undefined" && typeof window.qz !== "undefined";
}

/**
 * Check if QZ Tray is connected
 */
export function isQzConnected(): boolean {
  if (!isQzLoaded()) return false;
  try {
    return window.qz!.websocket.isActive();
  } catch {
    return false;
  }
}

/**
 * Get QZ Tray instance
 */
export function getQz(): QzTrayAPI | null {
  if (!isQzLoaded()) return null;
  return window.qz!;
}

/**
 * Setup QZ Tray security for trusted connections
 * In development, this uses a permissive certificate that allows all connections
 * For production, you should replace with your own signed certificate
 *
 * @see https://qz.io/wiki/2.0-signing-messages
 */
export function setupQzSecurity(): void {
  const qz = getQz();
  if (!qz) return;

  // For development: Use a permissive certificate promise
  // This tells QZ Tray to trust this website
  qz.security.setCertificatePromise((resolve) => {
    // In production, fetch your certificate from your server
    // For development/testing, we return an empty promise which
    // will trigger the "Allow/Block" dialog for first-time users
    // Once they click "Allow" and "Remember", it won't show again
    resolve("");
  });

  // For development: Use a permissive signature promise
  // QZ Tray setSignaturePromise receives a function that takes (resolve, reject, toSign)
  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setSignaturePromise(
    (
      resolve: (signature: string) => void,
      _reject: (err: Error) => void,
      _toSign: string
    ) => {
      // In production, sign the message on your server
      // For development, return empty to use unsigned mode
      resolve("");
    }
  );
}

/**
 * Connect to QZ Tray
 */
export async function connectToQz(
  options?: QzConnectOptions
): Promise<QzConnectionStatus> {
  const qz = getQz();

  if (!qz) {
    return {
      state: "error",
      error: "QZ Tray no está instalado o el script no se ha cargado",
    };
  }

  // Setup security (certificates) before connecting
  setupQzSecurity();

  // Already connected
  if (qz.websocket.isActive()) {
    return {
      state: "connected",
      version: qz.api.getVersion(),
    };
  }

  try {
    await qz.websocket.connect(options);

    return {
      state: "connected",
      version: qz.api.getVersion(),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Error de conexión";

    // Check for common errors
    if (error.includes("Unable to connect")) {
      return {
        state: "error",
        error: "No se puede conectar a QZ Tray. ¿Está ejecutándose?",
      };
    }

    return {
      state: "error",
      error,
    };
  }
}

/**
 * Disconnect from QZ Tray
 */
export async function disconnectFromQz(): Promise<void> {
  const qz = getQz();
  if (qz && qz.websocket.isActive()) {
    await qz.websocket.disconnect();
  }
}

/**
 * List all available printers
 */
export async function listPrinters(): Promise<QzPrinterInfo[]> {
  const qz = getQz();

  if (!qz || !qz.websocket.isActive()) {
    throw new Error("QZ Tray no está conectado");
  }

  try {
    const [printerNames, defaultPrinter] = await Promise.all([
      qz.printers.find() as Promise<string[]>,
      qz.printers.getDefault(),
    ]);

    // Get details for all printers
    const details = await qz.printers.details();
    const detailsArray = Array.isArray(details) ? details : [details];
    const detailsMap = new Map(detailsArray.map((d) => [d.name, d]));

    return printerNames.map((name) => {
      const detail = detailsMap.get(name);
      return {
        name,
        isDefault: name === defaultPrinter,
        connection: detail?.connection,
        driver: detail?.driver,
      };
    });
  } catch (err) {
    throw new Error(
      `Error al listar impresoras: ${err instanceof Error ? err.message : "Unknown"}`
    );
  }
}

/**
 * Find a specific printer by name pattern
 */
export async function findPrinter(namePattern: string): Promise<string | null> {
  const qz = getQz();

  if (!qz || !qz.websocket.isActive()) {
    throw new Error("QZ Tray no está conectado");
  }

  try {
    const result = await qz.printers.find(namePattern);
    if (Array.isArray(result)) {
      return result.length > 0 ? result[0] : null;
    }
    return result || null;
  } catch {
    return null;
  }
}

/**
 * Print raw ESC/POS data to a printer
 *
 * @param printerName - The name of the printer (from listPrinters or printer config)
 * @param escPosData - Base64 encoded ESC/POS data
 * @param copies - Number of copies to print
 */
export async function printRaw(
  printerName: string,
  escPosData: string,
  copies: number = 1
): Promise<QzPrintResult> {
  const qz = getQz();

  if (!qz || !qz.websocket.isActive()) {
    return {
      success: false,
      error: "QZ Tray no está conectado",
    };
  }

  try {
    const config = qz.configs.create(printerName, { copies });

    const data: PrintData[] = [
      {
        type: "raw",
        data: escPosData,
        format: "base64",
      },
    ];

    await qz.print(config, data);

    return {
      success: true,
      printerId: printerName,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al imprimir",
      printerId: printerName,
    };
  }
}

/**
 * Print raw ESC/POS data to a network printer via TCP
 * QZ Tray can send directly to a network address
 *
 * @param ipAddress - Printer IP address
 * @param port - Printer port (usually 9100)
 * @param escPosData - Base64 encoded ESC/POS data
 */
export async function printToNetwork(
  ipAddress: string,
  port: number,
  escPosData: string
): Promise<QzPrintResult> {
  const qz = getQz();

  if (!qz || !qz.websocket.isActive()) {
    return {
      success: false,
      error: "QZ Tray no está conectado",
    };
  }

  try {
    // For network printers, use the host:port format
    const config = qz.configs.create(`${ipAddress}:${port}`);

    const data: PrintData[] = [
      {
        type: "raw",
        data: escPosData,
        format: "base64",
      },
    ];

    await qz.print(config, data);

    return {
      success: true,
      printerId: `${ipAddress}:${port}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al imprimir",
      printerId: `${ipAddress}:${port}`,
    };
  }
}

/**
 * Print to a USB/Serial printer
 * Uses the printer name as registered in the OS
 *
 * @param printerName - The OS-registered printer name or COM port path
 * @param escPosData - Base64 encoded ESC/POS data
 * @param copies - Number of copies
 */
export async function printToUsb(
  printerName: string,
  escPosData: string,
  copies: number = 1
): Promise<QzPrintResult> {
  // USB printers are accessed by their OS name, same as printRaw
  return printRaw(printerName, escPosData, copies);
}

/**
 * Universal print function that routes to the appropriate printer type
 */
export interface PrinterTarget {
  type: "network" | "usb";
  // For network
  ipAddress?: string;
  port?: number;
  // For USB
  printerName?: string;
  usbPath?: string;
  // Common
  copies?: number;
}

export async function printEscPos(
  target: PrinterTarget,
  escPosData: string
): Promise<QzPrintResult> {
  const copies = target.copies || 1;

  if (target.type === "network") {
    if (!target.ipAddress) {
      return { success: false, error: "IP address is required for network printing" };
    }
    return printToNetwork(target.ipAddress, target.port || 9100, escPosData);
  }

  // USB printing - use printerName or usbPath
  const name = target.printerName || target.usbPath;
  if (!name) {
    return { success: false, error: "Printer name or USB path is required" };
  }
  return printRaw(name, escPosData, copies);
}

/**
 * Test printer connection by sending a minimal command
 */
export async function testPrinterConnection(
  target: PrinterTarget
): Promise<QzPrintResult> {
  // ESC @ (initialize printer) - minimal command to test connection
  // This is just the init command, base64 encoded
  const initCommand = Buffer.from("\x1B@").toString("base64");

  return printEscPos(target, initCommand);
}
