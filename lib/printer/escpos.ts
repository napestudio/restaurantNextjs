/**
 * ESC/POS Thermal Printer Communication Module
 *
 * This module handles communication with thermal printers using the ESC/POS protocol.
 * ESC/POS is a command language used by most thermal receipt printers.
 */

import { Socket } from "net";

export interface PrinterConfig {
  // Connection type
  connectionType?: "NETWORK" | "USB"; // Default: NETWORK

  // System identifier for gg-ez-print (Windows printer name or IP address)
  systemName: string;

  // Paper configuration
  paperWidth: number; // 58 or 80 mm
  charactersPerLine: number;

  // Ticket customization (optional)
  ticketHeader?: string | null;
  ticketHeaderSize?: number; // 0=small, 1=normal, 2=double height, 3=double size
  ticketFooter?: string | null;
  ticketFooterSize?: number; // 0=small, 1=normal, 2=double height, 3=double size

  // Control ticket formatting
  controlTicketFontSize?: number; // 0=small, 1=normal, 2=big
  controlTicketSpacing?: number; // 0=small, 1=normal, 2=big
}

export interface PrintResult {
  success: boolean;
  error?: string;
}

/**
 * ESC/POS Command Constants
 */
const ESC = "\x1B";
const GS = "\x1D";

const Commands = {
  // Initialize printer
  INIT: `${ESC}@`,

  // Code page selection for Spanish/Latin characters
  // CP858 (Western European with Euro) - supports áéíóúñ¿¡
  CODEPAGE_CP858: `${ESC}t${String.fromCharCode(19)}`,
  // CP850 (Western European) - supports áéíóúñ¿¡
  CODEPAGE_CP850: `${ESC}t${String.fromCharCode(2)}`,
  // CP1252 (Windows Latin 1) - supports áéíóúñ¿¡
  CODEPAGE_CP1252: `${ESC}t${String.fromCharCode(16)}`,

  // Text formatting
  BOLD_ON: `${ESC}E${String.fromCharCode(1)}`,
  BOLD_OFF: `${ESC}E${String.fromCharCode(0)}`,
  UNDERLINE_ON: `${ESC}-${String.fromCharCode(1)}`,
  UNDERLINE_OFF: `${ESC}-${String.fromCharCode(0)}`,
  DOUBLE_HEIGHT_ON: `${ESC}!${String.fromCharCode(0x10)}`,
  DOUBLE_WIDTH_ON: `${ESC}!${String.fromCharCode(0x20)}`,
  DOUBLE_SIZE_ON: `${ESC}!${String.fromCharCode(0x30)}`,
  NORMAL_SIZE: `${ESC}!${String.fromCharCode(0)}`,

  // Alignment
  ALIGN_LEFT: `${ESC}a${String.fromCharCode(0)}`,
  ALIGN_CENTER: `${ESC}a${String.fromCharCode(1)}`,
  ALIGN_RIGHT: `${ESC}a${String.fromCharCode(2)}`,

  // Line feed
  FEED_LINE: "\n",
  FEED_LINES: (n: number) => `${ESC}d${String.fromCharCode(n)}`,

  // Cut paper
  CUT_FULL: `${GS}V${String.fromCharCode(0)}`,
  CUT_PARTIAL: `${GS}V${String.fromCharCode(1)}`,

  // Barcode
  BARCODE_HEIGHT: (n: number) => `${GS}h${String.fromCharCode(n)}`,
  BARCODE_WIDTH: (n: number) => `${GS}w${String.fromCharCode(n)}`,

  // QR Code (ESC/POS Model 2)
  QR_CODE: (data: string) => {
    // GS ( k - QR Code command for ESC/POS printers
    const pL = (data.length + 3) % 256; // Length low byte
    const pH = Math.floor((data.length + 3) / 256); // Length high byte

    // Store QR code data (function 180, '1', 'P', '0')
    const storeData = `${GS}(k${String.fromCharCode(
      pL,
      pH,
      49, // '1' - QR Code model
      80, // 'P' - Store data
      48, // '0' - Store to symbol storage area
    )}${data}`;

    // Print QR code (function 181, '1', 'Q', '0')
    const printCmd = `${GS}(k${String.fromCharCode(
      3, // pL (fixed for print command)
      0, // pH
      49, // '1' - QR Code model
      81, // 'Q' - Print symbol data
      48, // '0' - Print from symbol storage area
    )}`;

    // Set QR module size (function 167, '1', 'C', size)
    const setSize = `${GS}(k${String.fromCharCode(
      3, // pL
      0, // pH
      49, // '1'
      67, // 'C' - Set module size
      5, // Size (1-16, 5 is medium)
    )}`;

    // Set error correction level (function 169, '1', 'E', level)
    const setErrorCorrection = `${GS}(k${String.fromCharCode(
      3, // pL
      0, // pH
      49, // '1'
      69, // 'E' - Set error correction
      48, // '0' - Level L (7% recovery)
    )}`;

    // Full command sequence
    return setSize + setErrorCorrection + storeData + printCmd;
  },
};

/**
 * Character mapping from Unicode to CP850/CP858 for Spanish characters
 * CP850 is widely supported by thermal printers
 */
const CP850_MAP: Record<string, number> = {
  // Spanish accented vowels
  á: 0xa0,
  é: 0x82,
  í: 0xa1,
  ó: 0xa2,
  ú: 0xa3,
  Á: 0xb5,
  É: 0x90,
  Í: 0xd6,
  Ó: 0xe0,
  Ú: 0xe9,
  // Spanish special characters
  ñ: 0xa4,
  Ñ: 0xa5,
  ü: 0x81,
  Ü: 0x9a,
  "¿": 0xa8,
  "¡": 0xad,
  // Currency
  "€": 0xd5, // CP858 has Euro at 0xD5
  // Other common symbols
  "°": 0xf8,
  "±": 0xf1,
  "²": 0xfd,
  "½": 0xab,
  "¼": 0xac,
};

/**
 * Convert a string to a Buffer encoded for CP850/CP858 thermal printers
 * This handles Spanish accented characters correctly
 */
function encodeForPrinter(text: string): Buffer {
  const bytes: number[] = [];

  for (const char of text) {
    const code = char.charCodeAt(0);

    // Check if we have a special mapping for this character
    if (CP850_MAP[char] !== undefined) {
      bytes.push(CP850_MAP[char]);
    }
    // ASCII characters (0-127) pass through directly
    else if (code < 128) {
      bytes.push(code);
    }
    // For unmapped characters above 127, use a placeholder
    else {
      bytes.push(0x3f); // '?' as fallback
    }
  }

  return Buffer.from(bytes);
}

/**
 * Format text to fit within printer width
 */
function formatLine(
  text: string,
  width: number,
  align: "left" | "center" | "right" = "left",
): string {
  if (text.length > width) {
    return text.substring(0, width);
  }

  if (align === "center") {
    const padding = Math.floor((width - text.length) / 2);
    return " ".repeat(padding) + text;
  }

  if (align === "right") {
    const padding = width - text.length;
    return " ".repeat(padding) + text;
  }

  return text;
}

/**
 * Format two-column line (left and right aligned)
 */
function formatTwoColumns(left: string, right: string, width: number): string {
  const availableSpace = width - right.length;
  const leftText =
    left.length > availableSpace ? left.substring(0, availableSpace) : left;
  const padding = width - leftText.length - right.length;
  return leftText + " ".repeat(padding) + right;
}

/**
 * Create a separator line
 */
function separator(width: number, char: string = "-"): string {
  return char.repeat(width);
}

/**
 * Get the ESC/POS command for a given text size
 * 0 = small (normal, no emphasis)
 * 1 = normal
 * 2 = double height (mediano)
 * 3 = double width + height (grande)
 */
function getSizeCommand(size: number): string {
  switch (size) {
    case 0:
      return Commands.NORMAL_SIZE; // Small - just normal size
    case 1:
      return Commands.NORMAL_SIZE;
    case 2:
      return Commands.DOUBLE_HEIGHT_ON;
    case 3:
      return Commands.DOUBLE_SIZE_ON;
    default:
      return Commands.NORMAL_SIZE;
  }
}

/**
 * Get the ESC/POS command for control ticket font size
 * 0 = small (normal size)
 * 1 = normal (normal size, standard)
 * 2 = big (double height)
 */
function getControlFontSizeCommand(size: number): string {
  switch (size) {
    case 0:
      return Commands.NORMAL_SIZE; // Small
    case 1:
      return Commands.NORMAL_SIZE; // Normal
    case 2:
      return Commands.DOUBLE_HEIGHT_ON; // Big
    default:
      return Commands.NORMAL_SIZE;
  }
}

/**
 * Get the number of line feeds based on spacing setting
 * 0 = small (0 extra lines)
 * 1 = normal (1 extra line)
 * 2 = big (2 extra lines)
 */
function getSpacingLines(spacing: number): number {
  switch (spacing) {
    case 0:
      return 0; // Small - no extra spacing
    case 1:
      return 1; // Normal - 1 line
    case 2:
      return 2; // Big - 2 lines
    default:
      return 1;
  }
}

/**
 * Prepare ESC/POS data for sending (add codepage and encode)
 * Returns the encoded buffer ready to be sent to printer
 */
export function prepareEscPosData(data: string): Buffer {
  const dataWithCodepage = Commands.CODEPAGE_CP850 + data;
  return encodeForPrinter(dataWithCodepage);
}

/**
 * Prepare ESC/POS data and return as binary string for gg-ez-print
 * This is the primary method for client-side printing
 * Uses latin1 encoding to preserve raw byte values (0-255) in a string
 */
export function prepareEscPosBase64(data: string): string {
  const buffer = prepareEscPosData(data);
  return buffer.toString("latin1");
}

/**
 * Send data to printer via TCP socket (legacy direct connection)
 * Encodes the data using CP850 code page for proper Spanish character support
 *
 * @deprecated Use the print relay service instead for production
 */
async function sendToPrinterDirect(
  ipAddress: string,
  port: number,
  data: string,
): Promise<PrintResult> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let resolved = false;

    const cleanup = (timeout: NodeJS.Timeout) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
      }
    };

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve({
          success: false,
          error: "Tiempo de espera agotado al conectar",
        });
      }
    }, 5000);

    const encodedData = prepareEscPosData(data);

    socket.on("connect", () => {
      socket.write(encodedData, (err) => {
        cleanup(timeoutId);
        if (err) {
          socket.destroy();
          resolve({
            success: false,
            error: `Error al enviar datos: ${err.message}`,
          });
        } else {
          socket.end();
          resolve({ success: true });
        }
      });
    });

    socket.on("error", (err) => {
      cleanup(timeoutId);
      socket.destroy();
      resolve({
        success: false,
        error: `Error de conexión: ${err.message}`,
      });
    });

    socket.on("timeout", () => {
      cleanup(timeoutId);
      socket.destroy();
      resolve({
        success: false,
        error: "Tiempo de espera agotado",
      });
    });

    socket.connect(port, ipAddress);
  });
}

/**
 * Send data to printer via direct TCP connection
 * @deprecated Use gg-ez-print for all printing. This is kept for backwards compatibility
 * and may not work with the new schema.
 */
async function sendToPrinter(
  config: PrinterConfig,
  data: string,
): Promise<PrintResult> {
  const connectionType = config.connectionType || "NETWORK";

  // Only network printers supported via direct TCP
  if (connectionType === "USB") {
    return {
      success: false,
      error: "USB printing requires gg-ez-print. Use the new printing flow.",
    };
  }

  // For network printers, systemName is the IP address
  if (!config.systemName) {
    return { success: false, error: "Printer system name not configured" };
  }

  return sendToPrinterDirect(config.systemName, 9100, data);
}

/**
 * Print a test page
 */
export async function printTestPage(
  config: PrinterConfig,
): Promise<PrintResult> {
  const width = config.charactersPerLine;
  const fontSize = config.controlTicketFontSize ?? 1;
  const spacing = config.controlTicketSpacing ?? 1;
  const spacingLines = getSpacingLines(spacing);

  // Font size labels
  const fontSizeLabels = ["Pequeño", "Normal", "Grande"];
  const spacingLabels = ["Pequeño", "Normal", "Grande"];

  let content = Commands.INIT;

  // Header
  content += Commands.ALIGN_CENTER;
  content += Commands.DOUBLE_SIZE_ON;
  content += "PRUEBA DE IMPRESION\n";
  content += Commands.NORMAL_SIZE;
  content += Commands.FEED_LINE;

  // Separator
  content += Commands.ALIGN_LEFT;
  content += separator(width) + "\n";

  // Printer info
  content += Commands.BOLD_ON;
  content += "Informacion de Impresora\n";
  content += Commands.BOLD_OFF;
  const connectionType = config.connectionType || "NETWORK";
  content +=
    formatTwoColumns(
      "Tipo:",
      connectionType === "USB" ? "USB" : "Red (TCP/IP)",
      width,
    ) + "\n";
  content += formatTwoColumns("Sistema:", config.systemName, width) + "\n";
  content += formatTwoColumns("Ancho:", `${config.paperWidth}mm`, width) + "\n";
  content +=
    formatTwoColumns(
      "Caracteres:",
      config.charactersPerLine.toString(),
      width,
    ) + "\n";

  content += separator(width) + "\n";

  // Control ticket settings
  content += Commands.BOLD_ON;
  content += "Config. Ticket Control\n";
  content += Commands.BOLD_OFF;
  content +=
    formatTwoColumns(
      "Tam. Fuente:",
      fontSizeLabels[fontSize] || "Normal",
      width,
    ) + "\n";
  content +=
    formatTwoColumns("Espaciado:", spacingLabels[spacing] || "Normal", width) +
    "\n";

  content += separator(width) + "\n";

  // Date/Time
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-AR");
  const timeStr = now.toLocaleTimeString("es-AR", { hour12: false });
  content += formatTwoColumns("Fecha:", dateStr, width) + "\n";
  content += formatTwoColumns("Hora:", timeStr, width) + "\n";

  content += separator(width) + "\n";

  // Font size demonstration
  content += Commands.BOLD_ON;
  content += "Prueba de Tamaños de Fuente\n";
  content += Commands.BOLD_OFF;

  content += "Pequeño (0):\n";
  content += Commands.NORMAL_SIZE;
  content += "  Texto de ejemplo pequeño\n";
  if (spacingLines > 0) content += Commands.FEED_LINES(spacingLines);

  content += "Normal (1):\n";
  content += Commands.NORMAL_SIZE;
  content += "  Texto de ejemplo normal\n";
  if (spacingLines > 0) content += Commands.FEED_LINES(spacingLines);

  content += "Grande (2):\n";
  content += Commands.DOUBLE_HEIGHT_ON;
  content += "  Texto grande\n";
  content += Commands.NORMAL_SIZE;
  if (spacingLines > 0) content += Commands.FEED_LINES(spacingLines);

  content += separator(width) + "\n";

  // Current config preview
  content += Commands.BOLD_ON;
  content += "Vista Previa Config. Actual\n";
  content += Commands.BOLD_OFF;
  content += getControlFontSizeCommand(fontSize);
  content += "Este texto usa tu config:\n";
  content += `Fuente: ${fontSizeLabels[fontSize] || "Normal"}\n`;
  content += `Espaciado: ${spacingLabels[spacing] || "Normal"}\n`;
  content += Commands.NORMAL_SIZE;

  content += separator(width) + "\n";

  // Success message
  content += Commands.ALIGN_CENTER;
  content += Commands.DOUBLE_HEIGHT_ON;
  content += "PRUEBA EXITOSA\n";
  content += Commands.NORMAL_SIZE;
  content += Commands.FEED_LINE;

  content += Commands.ALIGN_LEFT;
  content += separator(width, "=") + "\n";

  // Feed and cut
  content += Commands.FEED_LINES(3);
  content += Commands.CUT_PARTIAL;

  return sendToPrinter(config, content);
}

/**
 * Print order receipt
 */
export interface OrderItem {
  name: string;
  quantity: number;
  notes?: string;
}

export interface OrderData {
  orderNumber: string;
  tableName: string;
  waiterName?: string; // Optional - not shown on station comandas
  stationName?: string;
  items: OrderItem[];
  notes?: string;
}

export async function printOrder(
  config: PrinterConfig,
  order: OrderData,
): Promise<PrintResult> {
  const width = config.charactersPerLine;

  let content = Commands.INIT;

  // Header with station name if provided
  content += Commands.ALIGN_CENTER;
  content += Commands.DOUBLE_SIZE_ON;
  if (order.stationName) {
    content += `${order.stationName.toUpperCase()}\n`;
  } else {
    content += "ORDEN\n";
  }
  content += Commands.NORMAL_SIZE;
  content += Commands.FEED_LINE;

  // Order info
  content += Commands.ALIGN_LEFT;
  content += separator(width, "=") + "\n";

  content += Commands.DOUBLE_HEIGHT_ON;
  content += formatLine(`MESA ${order.tableName}`, width, "center") + "\n";
  content += Commands.NORMAL_SIZE;

  content += separator(width, "=") + "\n";

  const now = new Date();
  content += formatTwoColumns("Orden:", `#${order.orderNumber}`, width) + "\n";
  content +=
    formatTwoColumns("Fecha:", now.toLocaleDateString("es-AR"), width) + "\n";
  content +=
    formatTwoColumns(
      "Hora:",
      now.toLocaleTimeString("es-AR", { hour12: false }),
      width,
    ) + "\n";
  if (order.waiterName) {
    content += formatTwoColumns("Mozo:", order.waiterName, width) + "\n";
  }

  content += separator(width) + "\n";

  // Items
  content += Commands.BOLD_ON;
  content += "ITEMS\n";
  content += Commands.BOLD_OFF;
  content += separator(width) + "\n";

  for (const item of order.items) {
    content += Commands.DOUBLE_HEIGHT_ON;
    content += `${item.quantity}x ${item.name}\n`;
    content += Commands.NORMAL_SIZE;

    if (item.notes) {
      content += `   Nota: ${item.notes}\n`;
    }
    content += "\n";
  }

  content += separator(width) + "\n";

  // General notes
  if (order.notes) {
    content += Commands.BOLD_ON;
    content += "NOTAS GENERALES:\n";
    content += Commands.BOLD_OFF;
    content += order.notes + "\n";
    content += separator(width) + "\n";
  }

  // Feed and cut
  content += Commands.FEED_LINES(3);
  content += Commands.CUT_PARTIAL;

  return sendToPrinter(config, content);
}

/**
 * Full order data for control ticket (includes prices)
 */
export interface FullOrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface FullOrderData {
  orderNumber: string;
  tableName: string;
  waiterName: string;
  items: FullOrderItem[];
  subtotal: number;
  discountPercentage?: number;
  discountAmount?: number;
  total: number;
  notes?: string;
  orderType?: string;
  customerName?: string;
}

/**
 * Print full order control ticket (with prices and totals)
 */
export async function printFullOrder(
  config: PrinterConfig,
  order: FullOrderData,
): Promise<PrintResult> {
  const width = config.charactersPerLine;
  const fontSize = config.controlTicketFontSize ?? 1;
  const spacingLines = getSpacingLines(config.controlTicketSpacing ?? 1);

  // Helper to add section spacing
  const addSpacing = () => {
    if (spacingLines > 0) {
      return Commands.FEED_LINES(spacingLines);
    }
    return "";
  };

  let content = Commands.INIT;

  // Custom header (if configured)
  if (config.ticketHeader) {
    content += Commands.ALIGN_CENTER;
    content += getSizeCommand(config.ticketHeaderSize ?? 2);
    content += Commands.BOLD_ON;
    content += `${config.ticketHeader}\n`;
    content += Commands.BOLD_OFF;
    content += Commands.NORMAL_SIZE;
    content += Commands.FEED_LINE;
  }

  // Header
  content += Commands.ALIGN_CENTER;
  content += getControlFontSizeCommand(fontSize);
  content += "TICKET DE CONTROL\n";
  content += Commands.NORMAL_SIZE;
  content += Commands.FEED_LINE;
  content += addSpacing();

  // Order info
  content += Commands.ALIGN_LEFT;
  content += separator(width, "=") + "\n";

  content += Commands.DOUBLE_HEIGHT_ON;
  content += formatLine(`MESA ${order.tableName}`, width, "center") + "\n";
  content += Commands.NORMAL_SIZE;

  content += separator(width, "=") + "\n";
  content += addSpacing();

  const now = new Date();
  content += getControlFontSizeCommand(fontSize);
  content += formatTwoColumns("Orden:", `#${order.orderNumber}`, width) + "\n";
  content +=
    formatTwoColumns("Fecha:", now.toLocaleDateString("es-AR"), width) + "\n";
  content +=
    formatTwoColumns(
      "Hora:",
      now.toLocaleTimeString("es-AR", { hour12: false }),
      width,
    ) + "\n";
  content += formatTwoColumns("Mozo:", order.waiterName, width) + "\n";
  if (order.customerName) {
    content += formatTwoColumns("Cliente:", order.customerName, width) + "\n";
  }
  if (order.orderType) {
    content += formatTwoColumns("Tipo:", order.orderType, width) + "\n";
  }
  content += Commands.NORMAL_SIZE;

  content += separator(width) + "\n";
  content += addSpacing();

  // Items header
  content += Commands.BOLD_ON;
  content += getControlFontSizeCommand(fontSize);
  content += formatTwoColumns("CANT ITEM", "PRECIO", width) + "\n";
  content += Commands.BOLD_OFF;
  content += Commands.NORMAL_SIZE;
  content += separator(width) + "\n";

  // Items with prices
  content += getControlFontSizeCommand(fontSize);
  for (const item of order.items) {
    const itemTotal = item.quantity * item.price;
    const qtyName = `${item.quantity}x ${item.name}`;
    const priceStr = `$${itemTotal.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
    })}`;

    // If item name is too long, print on two lines
    const maxNameLength = width - priceStr.length - 1;
    if (qtyName.length > maxNameLength) {
      content += qtyName.substring(0, maxNameLength) + "\n";
      content += formatTwoColumns("", priceStr, width) + "\n";
    } else {
      content += formatTwoColumns(qtyName, priceStr, width) + "\n";
    }

    if (item.notes) {
      content += Commands.NORMAL_SIZE;
      content += `   Nota: ${item.notes}\n`;
      content += getControlFontSizeCommand(fontSize);
    }
  }
  content += Commands.NORMAL_SIZE;

  content += separator(width) + "\n";
  content += addSpacing();

  // Totals
  content += getControlFontSizeCommand(fontSize);
  content +=
    formatTwoColumns(
      "Subtotal:",
      `$${order.subtotal.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
      })}`,
      width,
    ) + "\n";

  if (order.discountPercentage && order.discountPercentage > 0) {
    content +=
      formatTwoColumns(
        `Descuento (${order.discountPercentage}%):`,
        `-$${(order.discountAmount || 0).toLocaleString("es-AR", {
          minimumFractionDigits: 2,
        })}`,
        width,
      ) + "\n";
  }
  content += Commands.NORMAL_SIZE;

  content += separator(width) + "\n";
  content += Commands.BOLD_ON;
  content += Commands.DOUBLE_HEIGHT_ON;
  content +=
    formatTwoColumns(
      "TOTAL:",
      `$${order.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
      width,
    ) + "\n";
  content += Commands.NORMAL_SIZE;
  content += Commands.BOLD_OFF;

  content += separator(width) + "\n";
  content += addSpacing();

  // General notes
  if (order.notes) {
    content += Commands.BOLD_ON;
    content += "NOTAS:\n";
    content += Commands.BOLD_OFF;
    content += getControlFontSizeCommand(fontSize);
    content += order.notes + "\n";
    content += Commands.NORMAL_SIZE;
    content += separator(width) + "\n";
  }

  // Custom footer (if configured)
  if (config.ticketFooter) {
    content += Commands.ALIGN_CENTER;
    content += getSizeCommand(config.ticketFooterSize ?? 1);
    content += `${config.ticketFooter}\n`;
    content += Commands.NORMAL_SIZE;
    content += Commands.FEED_LINE;
  }

  // Feed and cut
  content += Commands.FEED_LINES(3);
  content += Commands.CUT_PARTIAL;

  return sendToPrinter(config, content);
}

// ============================================================================
// DATA GENERATION FUNCTIONS (for QZ Tray - returns ESC/POS data without printing)
// ============================================================================

/**
 * Generate test page ESC/POS data (base64 encoded)
 * Used for QZ Tray printing from client
 */
export function generateTestPageData(config: PrinterConfig): string {
  const width = config.charactersPerLine;
  const fontSize = config.controlTicketFontSize ?? 1;
  const spacing = config.controlTicketSpacing ?? 1;
  const spacingLines = getSpacingLines(spacing);

  const fontSizeLabels = ["Pequeño", "Normal", "Grande"];
  const spacingLabels = ["Pequeño", "Normal", "Grande"];

  let content = Commands.INIT;

  // Custom header if configured
  if (config.ticketHeader) {
    content += Commands.ALIGN_CENTER;
    content += getSizeCommand(config.ticketHeaderSize ?? 2);
    content += Commands.BOLD_ON;
    content += `${config.ticketHeader}\n`;
    content += Commands.BOLD_OFF;
    content += Commands.NORMAL_SIZE;
    content += Commands.FEED_LINE;
  }

  content += Commands.ALIGN_CENTER;
  content += Commands.DOUBLE_SIZE_ON;
  content += "PRUEBA DE IMPRESION\n";
  content += Commands.NORMAL_SIZE;
  content += Commands.FEED_LINE;

  content += Commands.ALIGN_LEFT;
  content += separator(width) + "\n";

  content += Commands.BOLD_ON;
  content += "Informacion de Impresora\n";
  content += Commands.BOLD_OFF;
  const connectionTypeGen = config.connectionType || "NETWORK";
  content +=
    formatTwoColumns(
      "Tipo:",
      connectionTypeGen === "USB" ? "USB" : "Red (TCP/IP)",
      width,
    ) + "\n";
  content += formatTwoColumns("Sistema:", config.systemName, width) + "\n";
  content += formatTwoColumns("Ancho:", `${config.paperWidth}mm`, width) + "\n";
  content +=
    formatTwoColumns(
      "Caracteres:",
      config.charactersPerLine.toString(),
      width,
    ) + "\n";

  content += separator(width) + "\n";

  content += Commands.BOLD_ON;
  content += "Config. Ticket Control\n";
  content += Commands.BOLD_OFF;
  content +=
    formatTwoColumns(
      "Tam. Fuente:",
      fontSizeLabels[fontSize] || "Normal",
      width,
    ) + "\n";
  content +=
    formatTwoColumns("Espaciado:", spacingLabels[spacing] || "Normal", width) +
    "\n";

  content += separator(width) + "\n";

  const now = new Date();
  const dateStr = now.toLocaleDateString("es-AR");
  const timeStr = now.toLocaleTimeString("es-AR", { hour12: false });
  content += formatTwoColumns("Fecha:", dateStr, width) + "\n";
  content += formatTwoColumns("Hora:", timeStr, width) + "\n";

  content += separator(width) + "\n";

  content += Commands.BOLD_ON;
  content += "Prueba de Tamaños de Fuente\n";
  content += Commands.BOLD_OFF;

  content += "Pequeño (0):\n";
  content += Commands.NORMAL_SIZE;
  content += "  Texto de ejemplo pequeño\n";
  if (spacingLines > 0) content += Commands.FEED_LINES(spacingLines);

  content += "Normal (1):\n";
  content += Commands.NORMAL_SIZE;
  content += "  Texto de ejemplo normal\n";
  if (spacingLines > 0) content += Commands.FEED_LINES(spacingLines);

  content += "Grande (2):\n";
  content += Commands.DOUBLE_HEIGHT_ON;
  content += "  Texto grande\n";
  content += Commands.NORMAL_SIZE;
  if (spacingLines > 0) content += Commands.FEED_LINES(spacingLines);

  content += separator(width) + "\n";

  content += Commands.BOLD_ON;
  content += "Vista Previa Config. Actual\n";
  content += Commands.BOLD_OFF;
  content += getControlFontSizeCommand(fontSize);
  content += "Este texto usa tu config:\n";
  content += `Fuente: ${fontSizeLabels[fontSize] || "Normal"}\n`;
  content += `Espaciado: ${spacingLabels[spacing] || "Normal"}\n`;
  content += Commands.NORMAL_SIZE;

  content += separator(width) + "\n";

  content += Commands.ALIGN_CENTER;
  content += Commands.DOUBLE_HEIGHT_ON;
  content += "PRUEBA EXITOSA\n";
  content += Commands.NORMAL_SIZE;
  content += Commands.FEED_LINE;

  content += Commands.ALIGN_LEFT;
  content += separator(width, "=") + "\n";

  // Custom footer if configured
  if (config.ticketFooter) {
    content += Commands.ALIGN_CENTER;
    content += getSizeCommand(config.ticketFooterSize ?? 1);
    content += `${config.ticketFooter}\n`;
    content += Commands.NORMAL_SIZE;
    content += Commands.FEED_LINE;
  }

  // Note: Feed and cut commands are handled by gg-ez-print automatically
  // No need to add them here to avoid double cutting

  return prepareEscPosBase64(content);
}

/**
 * Generate order (comanda) ESC/POS data (base64 encoded)
 * Used for station tickets - NO prices, NO waiter
 */
export function generateOrderData(
  config: PrinterConfig,
  order: OrderData,
): string {
  const width = config.charactersPerLine;

  let content = Commands.INIT;

  content += Commands.ALIGN_CENTER;
  content += Commands.DOUBLE_SIZE_ON;
  if (order.stationName) {
    content += `${order.stationName.toUpperCase()}\n`;
  } else {
    content += "ORDEN\n";
  }
  content += Commands.NORMAL_SIZE;
  content += Commands.FEED_LINE;

  content += Commands.ALIGN_LEFT;
  content += separator(width, "=") + "\n";

  content += Commands.DOUBLE_HEIGHT_ON;
  content += formatLine(`MESA ${order.tableName}`, width, "center") + "\n";
  content += Commands.NORMAL_SIZE;

  content += separator(width, "=") + "\n";

  const now = new Date();
  content += formatTwoColumns("Orden:", `#${order.orderNumber}`, width) + "\n";
  content +=
    formatTwoColumns("Fecha:", now.toLocaleDateString("es-AR"), width) + "\n";
  content +=
    formatTwoColumns(
      "Hora:",
      now.toLocaleTimeString("es-AR", { hour12: false }),
      width,
    ) + "\n";
  if (order.waiterName) {
    content += formatTwoColumns("Mozo:", order.waiterName, width) + "\n";
  }

  content += separator(width) + "\n";

  content += Commands.BOLD_ON;
  content += "ITEMS\n";
  content += Commands.BOLD_OFF;
  content += separator(width) + "\n";

  for (const item of order.items) {
    content += Commands.DOUBLE_HEIGHT_ON;
    content += `${item.quantity}x ${item.name}\n`;
    content += Commands.NORMAL_SIZE;

    if (item.notes) {
      content += `   Nota: ${item.notes}\n`;
    }
    content += "\n";
  }

  content += separator(width) + "\n";

  if (order.notes) {
    content += Commands.BOLD_ON;
    content += "NOTAS GENERALES:\n";
    content += Commands.BOLD_OFF;
    content += order.notes + "\n";
    content += separator(width) + "\n";
  }

  // Note: Feed and cut commands are handled by gg-ez-print automatically

  return prepareEscPosBase64(content);
}

/**
 * Generate full order (control ticket) ESC/POS data (base64 encoded)
 * Used for control tickets - WITH prices
 */
export function generateFullOrderData(
  config: PrinterConfig,
  order: FullOrderData,
): string {
  const width = config.charactersPerLine;
  const fontSize = config.controlTicketFontSize ?? 1;
  const spacingLines = getSpacingLines(config.controlTicketSpacing ?? 1);

  const addSpacing = () => {
    if (spacingLines > 0) {
      return Commands.FEED_LINES(spacingLines);
    }
    return "";
  };

  let content = Commands.INIT;

  if (config.ticketHeader) {
    content += Commands.ALIGN_CENTER;
    content += getSizeCommand(config.ticketHeaderSize ?? 2);
    content += Commands.BOLD_ON;
    content += `${config.ticketHeader}\n`;
    content += Commands.BOLD_OFF;
    content += Commands.NORMAL_SIZE;
    content += Commands.FEED_LINE;
  }

  content += Commands.ALIGN_CENTER;
  content += getControlFontSizeCommand(fontSize);
  content += "TICKET DE CONTROL\n";
  content += Commands.NORMAL_SIZE;
  content += Commands.FEED_LINE;
  content += addSpacing();

  content += Commands.ALIGN_LEFT;
  content += separator(width, "=") + "\n";

  content += Commands.DOUBLE_HEIGHT_ON;
  content += formatLine(`MESA ${order.tableName}`, width, "center") + "\n";
  content += Commands.NORMAL_SIZE;

  content += separator(width, "=") + "\n";
  content += addSpacing();

  const now = new Date();
  content += getControlFontSizeCommand(fontSize);
  content += formatTwoColumns("Orden:", `#${order.orderNumber}`, width) + "\n";
  content +=
    formatTwoColumns("Fecha:", now.toLocaleDateString("es-AR"), width) + "\n";
  content +=
    formatTwoColumns(
      "Hora:",
      now.toLocaleTimeString("es-AR", { hour12: false }),
      width,
    ) + "\n";
  content += formatTwoColumns("Mozo:", order.waiterName, width) + "\n";
  if (order.customerName) {
    content += formatTwoColumns("Cliente:", order.customerName, width) + "\n";
  }
  if (order.orderType) {
    content += formatTwoColumns("Tipo:", order.orderType, width) + "\n";
  }
  content += Commands.NORMAL_SIZE;

  content += separator(width) + "\n";
  content += addSpacing();

  content += Commands.BOLD_ON;
  content += getControlFontSizeCommand(fontSize);
  content += formatTwoColumns("CANT ITEM", "PRECIO", width) + "\n";
  content += Commands.BOLD_OFF;
  content += Commands.NORMAL_SIZE;
  content += separator(width) + "\n";

  content += getControlFontSizeCommand(fontSize);
  for (const item of order.items) {
    const itemTotal = item.quantity * item.price;
    const qtyName = `${item.quantity}x ${item.name}`;
    const priceStr = `$${itemTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

    const maxNameLength = width - priceStr.length - 1;
    if (qtyName.length > maxNameLength) {
      content += qtyName.substring(0, maxNameLength) + "\n";
      content += formatTwoColumns("", priceStr, width) + "\n";
    } else {
      content += formatTwoColumns(qtyName, priceStr, width) + "\n";
    }

    if (item.notes) {
      content += Commands.NORMAL_SIZE;
      content += `   Nota: ${item.notes}\n`;
      content += getControlFontSizeCommand(fontSize);
    }
  }
  content += Commands.NORMAL_SIZE;

  content += separator(width) + "\n";
  content += addSpacing();

  content += getControlFontSizeCommand(fontSize);
  content +=
    formatTwoColumns(
      "Subtotal:",
      `$${order.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
      width,
    ) + "\n";

  if (order.discountPercentage && order.discountPercentage > 0) {
    content +=
      formatTwoColumns(
        `Descuento (${order.discountPercentage}%):`,
        `-$${(order.discountAmount || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
        width,
      ) + "\n";
  }
  content += Commands.NORMAL_SIZE;

  content += separator(width) + "\n";
  content += Commands.BOLD_ON;
  content += Commands.DOUBLE_HEIGHT_ON;
  content +=
    formatTwoColumns(
      "TOTAL:",
      `$${order.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
      width,
    ) + "\n";
  content += Commands.NORMAL_SIZE;
  content += Commands.BOLD_OFF;

  content += separator(width) + "\n";
  content += addSpacing();

  if (order.notes) {
    content += Commands.BOLD_ON;
    content += "NOTAS:\n";
    content += Commands.BOLD_OFF;
    content += getControlFontSizeCommand(fontSize);
    content += order.notes + "\n";
    content += Commands.NORMAL_SIZE;
    content += separator(width) + "\n";
  }

  if (config.ticketFooter) {
    content += Commands.ALIGN_CENTER;
    content += getSizeCommand(config.ticketFooterSize ?? 1);
    content += `${config.ticketFooter}\n`;
    content += Commands.NORMAL_SIZE;
    content += Commands.FEED_LINE;
  }

  // Note: Feed and cut commands are handled by gg-ez-print automatically

  return prepareEscPosBase64(content);
}

/**
 * Test printer connectivity via direct TCP connection
 * @deprecated Use gg-ez-print for printing instead. This only works for network printers.
 */
export async function testConnection(
  config: PrinterConfig,
): Promise<PrintResult> {
  const connectionType = config.connectionType || "NETWORK";

  // Only network printers supported via direct TCP
  if (connectionType === "USB") {
    return {
      success: false,
      error:
        "USB printer testing requires gg-ez-print. Use the new printing flow.",
    };
  }

  if (!config.systemName) {
    return { success: false, error: "Printer system name not configured" };
  }

  return new Promise((resolve) => {
    const socket = new Socket();
    let resolved = false;

    const cleanup = (timeout: NodeJS.Timeout) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
      }
    };

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve({
          success: false,
          error: "Tiempo de espera agotado",
        });
      }
    }, 3000);

    socket.on("connect", () => {
      cleanup(timeoutId);
      socket.end();
      resolve({ success: true });
    });

    socket.on("error", (err) => {
      cleanup(timeoutId);
      socket.destroy();
      resolve({
        success: false,
        error: `Error de conexión: ${err.message}`,
      });
    });

    socket.connect(9100, config.systemName);
  });
}

// ============================================================================
// ARCA INVOICE PRINTING (for test-arca page)
// ============================================================================

/**
 * ARCA Invoice Data for Thermal Printing
 */
export interface AfipInvoiceData {
  // Invoice header
  invoiceType: string; // e.g., "FACTURA B"
  invoiceNumber: string; // e.g., "00001-00000123"
  invoiceDate: string; // e.g., "25/01/2026"

  // Issuer information
  businessName?: string; // Optional business name
  cuit: string; // Issuer CUIT formatted (e.g., "20-12345678-9")

  // Customer information
  customerDoc: string; // e.g., "Consumidor Final" or "DNI: 12345678"

  // Line items
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    total: number;
  }>;

  // Totals
  subtotal: number;
  vatBreakdown: Array<{
    rate: number;
    base: number;
    amount: number;
  }>;
  totalVat: number;
  total: number;

  // ARCA authorization
  cae: string; // CAE code (14 digits)
  caeExpiration: string; // CAE expiration date (e.g., "31/01/2026")

  // QR code URL
  qrUrl: string; // ARCA verification URL
}

/**
 * Generate ARCA invoice ESC/POS data for thermal printing
 * Formats electronic invoice according to ARCA requirements with QR code
 */
export function generateAfipInvoiceData(
  invoice: AfipInvoiceData,
  config?: { charactersPerLine?: number },
): string {
  const width = config?.charactersPerLine || 48; // 80mm printer standard

  let content = Commands.INIT;

  // ========== HEADER ==========
  content += Commands.ALIGN_CENTER;

  // Business name if provided
  if (invoice.businessName) {
    content += Commands.DOUBLE_HEIGHT_ON;
    content += Commands.BOLD_ON;
    content += `${invoice.businessName}\n`;
    content += Commands.BOLD_OFF;
    content += Commands.NORMAL_SIZE;
    content += Commands.FEED_LINE;
  }

  // Invoice type (large)
  content += Commands.DOUBLE_SIZE_ON;
  content += Commands.BOLD_ON;
  content += `${invoice.invoiceType}\n`;
  content += Commands.BOLD_OFF;
  content += Commands.NORMAL_SIZE;
  content += Commands.FEED_LINE;

  // Invoice number
  content += Commands.DOUBLE_HEIGHT_ON;
  content += `N° ${invoice.invoiceNumber}\n`;
  content += Commands.NORMAL_SIZE;
  content += Commands.FEED_LINE;

  content += Commands.ALIGN_LEFT;
  content += separator(width, "=") + "\n";

  // ========== INVOICE DETAILS ==========
  content += formatTwoColumns("Fecha:", invoice.invoiceDate, width) + "\n";
  content += formatTwoColumns("CUIT:", invoice.cuit, width) + "\n";
  content += formatTwoColumns("Cliente:", invoice.customerDoc, width) + "\n";

  content += separator(width, "=") + "\n";

  // ========== LINE ITEMS ==========
  content += Commands.BOLD_ON;
  content += "DETALLE\n";
  content += Commands.BOLD_OFF;
  content += separator(width) + "\n";

  // Column headers
  const headerLine =
    formatLine("Cant Descripcion", width - 10, "left") +
    formatLine("Total", 10, "right");
  content += headerLine + "\n";
  content += separator(width) + "\n";

  // Items
  for (const item of invoice.items) {
    const itemLine = `${item.quantity}x ${item.description}`;
    const priceStr = `$${item.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

    // If item name is too long, wrap to next line
    const maxDescLength = width - priceStr.length - 1;
    if (itemLine.length > maxDescLength) {
      content += itemLine.substring(0, maxDescLength) + "\n";
      content += formatTwoColumns("", priceStr, width) + "\n";
    } else {
      content += formatTwoColumns(itemLine, priceStr, width) + "\n";
    }

    // Show unit price and VAT rate on separate line
    const detailLine = `  $${item.unitPrice.toFixed(2)} c/u (IVA ${item.vatRate}%)`;
    content += detailLine + "\n";
  }

  content += separator(width) + "\n";

  // ========== TOTALS ==========
  content +=
    formatTwoColumns(
      "Subtotal:",
      `$${invoice.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
      width,
    ) + "\n";

  // VAT breakdown
  for (const vat of invoice.vatBreakdown) {
    content +=
      formatTwoColumns(
        `IVA ${vat.rate}%:`,
        `$${vat.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
        width,
      ) + "\n";
  }

  content += separator(width) + "\n";

  // Total (bold and large)
  content += Commands.BOLD_ON;
  content += Commands.DOUBLE_HEIGHT_ON;
  content +=
    formatTwoColumns(
      "TOTAL:",
      `$${invoice.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
      width,
    ) + "\n";
  content += Commands.NORMAL_SIZE;
  content += Commands.BOLD_OFF;

  content += separator(width, "=") + "\n";

  // ========== ARCA AUTHORIZATION ==========
  content += Commands.BOLD_ON;
  content += "AUTORIZACION ARCA\n";
  content += Commands.BOLD_OFF;

  content += formatTwoColumns("CAE:", invoice.cae, width) + "\n";
  content += formatTwoColumns("Vto. CAE:", invoice.caeExpiration, width) + "\n";

  content += separator(width) + "\n";

  // ========== QR CODE ==========
  content += Commands.ALIGN_CENTER;
  content += "Codigo QR ARCA\n";
  content += "Escanear para verificar\n";
  content += Commands.FEED_LINE;

  // Try to print QR code using ESC/POS command (Model 2)
  // This works with most ESC/POS compatible printers
  try {
    content += Commands.QR_CODE(invoice.qrUrl);
    content += Commands.FEED_LINE;
  } catch (e) {
    console.warn("QR code generation failed");
  }

  content += Commands.ALIGN_CENTER;
  content += separator(width, "=") + "\n";

  // ========== FOOTER ==========
  content += Commands.ALIGN_CENTER;
  content += Commands.NORMAL_SIZE;
  content += "Documento no valido como factura\n";
  content += "COMPROBANTE DE PRUEBA\n";
  content += Commands.FEED_LINE;

  // Note: Feed and cut commands are handled by gg-ez-print automatically

  return prepareEscPosBase64(content);
}
