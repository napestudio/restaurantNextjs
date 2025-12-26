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

    socket.on("connect", () => {
      socket.write(data, (err) => {
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
  waiterName: string;
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
  content += formatTwoColumns("Mozo:", order.waiterName, width) + "\n";

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
