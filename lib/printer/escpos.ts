/**
 * ESC/POS Thermal Printer Communication Module
 *
 * This module handles communication with thermal printers using the ESC/POS protocol.
 * ESC/POS is a command language used by most thermal receipt printers.
 */

import { Socket } from "net";

export interface PrinterConfig {
  ipAddress: string;
  port: number;
  paperWidth: number; // 58 or 80 mm
  charactersPerLine: number;
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

  // QR Code
  QR_CODE: (data: string) => {
    const qrData = `${GS}(k${String.fromCharCode(
      3,
      0,
      49,
      67,
      3
    )}${GS}(k${String.fromCharCode(
      3,
      0,
      49,
      69,
      48
    )}${GS}(k${String.fromCharCode(
      data.length + 3,
      0,
      49,
      80,
      48
    )}${data}${GS}(k${String.fromCharCode(3, 0, 49, 81, 48)}`;
    return qrData;
  },
};

/**
 * Character mapping from Unicode to CP850/CP858 for Spanish characters
 * CP850 is widely supported by thermal printers
 */
const CP850_MAP: Record<string, number> = {
  // Spanish accented vowels
  'á': 0xa0, 'é': 0x82, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3,
  'Á': 0xb5, 'É': 0x90, 'Í': 0xd6, 'Ó': 0xe0, 'Ú': 0xe9,
  // Spanish special characters
  'ñ': 0xa4, 'Ñ': 0xa5,
  'ü': 0x81, 'Ü': 0x9a,
  '¿': 0xa8, '¡': 0xad,
  // Currency
  '€': 0xd5, // CP858 has Euro at 0xD5
  // Other common symbols
  '°': 0xf8,
  '±': 0xf1,
  '²': 0xfd,
  '½': 0xab,
  '¼': 0xac,
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
  align: "left" | "center" | "right" = "left"
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
 * Send data to printer via TCP socket
 * Encodes the data using CP850 code page for proper Spanish character support
 */
async function sendToPrinter(
  config: PrinterConfig,
  data: string
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

    // Prepend code page selection command and encode the data
    const dataWithCodepage = Commands.CODEPAGE_CP850 + data;
    const encodedData = encodeForPrinter(dataWithCodepage);

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

    socket.connect(config.port, config.ipAddress);
  });
}

/**
 * Print a test page
 */
export async function printTestPage(
  config: PrinterConfig
): Promise<PrintResult> {
  const width = config.charactersPerLine;

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
  content += formatTwoColumns("IP:", config.ipAddress, width) + "\n";
  content += formatTwoColumns("Puerto:", config.port.toString(), width) + "\n";
  content += formatTwoColumns("Ancho:", `${config.paperWidth}mm`, width) + "\n";
  content +=
    formatTwoColumns(
      "Caracteres:",
      config.charactersPerLine.toString(),
      width
    ) + "\n";

  content += separator(width) + "\n";

  // Date/Time
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-AR");
  const timeStr = now.toLocaleTimeString("es-AR");
  content += formatTwoColumns("Fecha:", dateStr, width) + "\n";
  content += formatTwoColumns("Hora:", timeStr, width) + "\n";

  content += separator(width) + "\n";

  // Test patterns
  content += Commands.BOLD_ON;
  content += "Prueba de Formatos\n";
  content += Commands.BOLD_OFF;

  content += "Normal: ABCDEFGabcdefg 0123456789\n";
  content += Commands.BOLD_ON;
  content += "Negrita: ABCDEFGabcdefg 0123456789\n";
  content += Commands.BOLD_OFF;
  content += Commands.UNDERLINE_ON;
  content += "Subrayado: ABCDEFGabcdefg\n";
  content += Commands.UNDERLINE_OFF;

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
  order: OrderData
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
    formatTwoColumns("Hora:", now.toLocaleTimeString("es-AR"), width) + "\n";
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
  order: FullOrderData
): Promise<PrintResult> {
  const width = config.charactersPerLine;

  let content = Commands.INIT;

  // Header
  content += Commands.ALIGN_CENTER;
  content += Commands.DOUBLE_SIZE_ON;
  content += "TICKET DE CONTROL\n";
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
    formatTwoColumns("Hora:", now.toLocaleTimeString("es-AR"), width) + "\n";
  content += formatTwoColumns("Mozo:", order.waiterName, width) + "\n";

  if (order.orderType) {
    content += formatTwoColumns("Tipo:", order.orderType, width) + "\n";
  }

  if (order.customerName) {
    content += formatTwoColumns("Cliente:", order.customerName, width) + "\n";
  }

  content += separator(width) + "\n";

  // Items header
  content += Commands.BOLD_ON;
  content += formatTwoColumns("CANT ITEM", "PRECIO", width) + "\n";
  content += Commands.BOLD_OFF;
  content += separator(width) + "\n";

  // Items with prices
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
      content += `   Nota: ${item.notes}\n`;
    }
  }

  content += separator(width) + "\n";

  // Totals
  content +=
    formatTwoColumns(
      "Subtotal:",
      `$${order.subtotal.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
      })}`,
      width
    ) + "\n";

  if (order.discountPercentage && order.discountPercentage > 0) {
    content +=
      formatTwoColumns(
        `Descuento (${order.discountPercentage}%):`,
        `-$${(order.discountAmount || 0).toLocaleString("es-AR", {
          minimumFractionDigits: 2,
        })}`,
        width
      ) + "\n";
  }

  content += separator(width) + "\n";
  content += Commands.BOLD_ON;
  content += Commands.DOUBLE_HEIGHT_ON;
  content +=
    formatTwoColumns(
      "TOTAL:",
      `$${order.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
      width
    ) + "\n";
  content += Commands.NORMAL_SIZE;
  content += Commands.BOLD_OFF;

  content += separator(width) + "\n";

  // General notes
  if (order.notes) {
    content += Commands.BOLD_ON;
    content += "NOTAS:\n";
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
 * Test printer connectivity
 */
export async function testConnection(
  config: PrinterConfig
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

    socket.connect(config.port, config.ipAddress);
  });
}
