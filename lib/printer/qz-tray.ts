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
    // QZ Tray 2.x expects callbacks with resolve/reject parameters, not functions returning Promises
    // See: https://qz.io/docs/signing
    setCertificatePromise: (
      callback: (resolve: (cert: string) => void, reject: (error: Error) => void) => void
    ) => void;
    setSignatureAlgorithm: (algorithm: string) => void;
    setSignaturePromise: (
      callback: (toSign: string) => (resolve: (sig: string) => void, reject: (error: Error) => void) => void
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
  // Socket API for direct TCP connections (QZ Tray 2.1+)
  socket: {
    open: (host: string, port: number | string) => Promise<void>;
    close: (host: string, port: number | string) => Promise<void>;
    sendData: (host: string, port: number | string, data: string) => Promise<void>;
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
  // Raw socket printing options
  host?: string;
  port?: number;
}

export interface PrintConfig {
  printer: string | null;
  options: PrinterOptions;
}

export interface PrintData {
  type: "raw" | "pixel" | "pdf" | "html" | "image";
  data: string;
  // format: for raw type, use "command", "image", "pdf", "html"
  format?: "command" | "image" | "pdf" | "html" | "base64" | "hex" | "plain" | "file";
  // flavor: encoding of the data - "base64", "file", "hex", "plain", "xml"
  flavor?: "base64" | "file" | "hex" | "plain" | "xml";
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

  // QZ Tray 2.x security callbacks receive resolve/reject parameters
  // For development/testing, we pass empty strings which triggers the "Allow/Block" dialog
  // Once users click "Allow" and check "Remember", it won't show again for that site
  // See: https://qz.io/docs/signing

  // Certificate callback - receives resolve/reject and calls resolve with certificate
  qz.security.setCertificatePromise(function(resolve, reject) {
    resolve(""); // Empty string for unsigned mode (triggers Allow/Block dialog)
  });

  qz.security.setSignatureAlgorithm("SHA512");

  // Signature callback - receives toSign and returns a function with resolve/reject
  qz.security.setSignaturePromise(function(toSign) {
    return function(resolve, reject) {
      resolve(""); // Empty string for unsigned mode
    };
  });
}

/**
 * Wait for QZ Tray websocket to be fully ready
 * Sometimes the connection is established but internal state isn't ready yet
 */
async function waitForQzReady(qz: QzTrayAPI, maxWait: number = 2000): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 100;

  while (Date.now() - startTime < maxWait) {
    try {
      // Try to get version - if this works, QZ is ready
      if (qz.websocket.isActive()) {
        qz.api.getVersion();
        return true;
      }
    } catch {
      // Not ready yet, wait and retry
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  return qz.websocket.isActive();
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

  // Already connected - verify it's fully ready
  if (qz.websocket.isActive()) {
    try {
      const version = qz.api.getVersion();
      return {
        state: "connected",
        version,
      };
    } catch {
      // Connection exists but not ready, try reconnecting
      try {
        await qz.websocket.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
  }

  try {
    await qz.websocket.connect(options);

    // Wait for QZ to be fully ready before returning
    const isReady = await waitForQzReady(qz);

    if (!isReady) {
      return {
        state: "error",
        error: "QZ Tray se conectó pero no responde. Intenta reiniciar QZ Tray.",
      };
    }

    let version: string | undefined;
    try {
      version = qz.api.getVersion();
    } catch {
      // Version call failed but connection is active
    }

    return {
      state: "connected",
      version,
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

    // QZ Tray 2.x uses 'flavor' instead of 'format' for raw data
    const data: PrintData[] = [
      {
        type: "raw",
        data: escPosData,
        flavor: "base64",
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
 * Uses QZ Tray's Socket API for direct TCP connection
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
  console.log("[QZ] printToNetwork called:", { ipAddress, port, dataLength: escPosData.length });

  const qz = getQz();

  if (!qz) {
    console.error("[QZ] QZ Tray not loaded");
    return {
      success: false,
      error: "QZ Tray no está cargado. Recarga la página.",
    };
  }

  if (!qz.websocket.isActive()) {
    console.error("[QZ] QZ Tray websocket not active");
    return {
      success: false,
      error: "QZ Tray no está conectado. Asegúrate de que QZ Tray esté ejecutándose.",
    };
  }

  try {
    console.log("[QZ] Using Socket API for direct TCP connection to:", ipAddress, port);

    // Decode base64 to raw binary string for socket transmission
    const rawData = atob(escPosData);
    console.log("[QZ] Decoded data length:", rawData.length);

    // Use QZ Tray Socket API for direct TCP connection
    // This is more reliable for raw socket printing than qz.print with host/port config
    console.log("[QZ] Opening socket connection...");
    await qz.socket.open(ipAddress, port);
    console.log("[QZ] Socket opened, sending data...");

    await qz.socket.sendData(ipAddress, port, rawData);
    console.log("[QZ] Data sent, closing socket...");

    await qz.socket.close(ipAddress, port);
    console.log("[QZ] Socket closed, print successful");

    return {
      success: true,
      printerId: `${ipAddress}:${port}`,
    };
  } catch (err) {
    console.error("[QZ] Print error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Try to close socket in case of error
    try {
      await qz.socket.close(ipAddress, port);
    } catch {
      // Ignore close errors
    }

    // Provide more helpful error messages
    let friendlyError = errorMessage;
    if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("connection refused")) {
      friendlyError = `No se puede conectar a la impresora en ${ipAddress}:${port}. Verifica que la impresora esté encendida y conectada a la red.`;
    } else if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout")) {
      friendlyError = `Tiempo de espera agotado al conectar con ${ipAddress}:${port}. Verifica la IP y que la impresora esté accesible.`;
    } else if (errorMessage.includes("EHOSTUNREACH")) {
      friendlyError = `No se puede alcanzar la impresora en ${ipAddress}. Verifica que esté en la misma red.`;
    }

    return {
      success: false,
      error: friendlyError,
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
