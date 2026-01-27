"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PrintJobStatus, PrinterStatus } from "@/app/generated/prisma";
import {
  generateTestPageData,
  generateOrderData,
  generateFullOrderData,
  type PrinterConfig,
} from "@/lib/printer/escpos";

// ============================================================================
// TYPES
// ============================================================================

export interface PrinterTarget {
  type: "network" | "usb";
  systemName: string; // Windows printer name (USB) or IP address (Network)
  printerName?: string; // Display name
  copies?: number;
}

export interface PrintJobData {
  printerId: string;
  printerName: string;
  target: PrinterTarget;
  escPosData: string; // base64 encoded
  copies: number;
}

export interface PreparedPrintResult {
  success: boolean;
  error?: string;
  jobs?: PrintJobData[];
  printJobIds?: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildPrinterConfig(printer: {
  connectionType: string;
  systemName: string;
  paperWidth: number;
  charactersPerLine: number;
  ticketHeader?: string | null;
  ticketHeaderSize?: number;
  ticketFooter?: string | null;
  ticketFooterSize?: number;
  controlTicketFontSize?: number;
  controlTicketSpacing?: number;
}): PrinterConfig {
  return {
    connectionType: printer.connectionType as "NETWORK" | "USB",
    systemName: printer.systemName,
    paperWidth: printer.paperWidth,
    charactersPerLine: printer.charactersPerLine,
    ticketHeader: printer.ticketHeader,
    ticketHeaderSize: printer.ticketHeaderSize,
    ticketFooter: printer.ticketFooter,
    ticketFooterSize: printer.ticketFooterSize,
    controlTicketFontSize: printer.controlTicketFontSize,
    controlTicketSpacing: printer.controlTicketSpacing,
  };
}

function buildPrinterTarget(printer: {
  connectionType: string;
  systemName: string;
  name: string;
  printCopies: number;
}): PrinterTarget {
  return {
    type: printer.connectionType === "USB" ? "usb" : "network",
    systemName: printer.systemName,
    printerName: printer.name,
    copies: printer.printCopies,
  };
}

// ============================================================================
// PREPARE TEST PRINT
// ============================================================================

/**
 * Prepare a test print job - returns ESC/POS data for client to send via gg-ez-print
 */
export async function prepareTestPrint(
  printerId: string,
): Promise<PreparedPrintResult> {
  try {
    const printer = await prisma.printer.findUnique({
      where: { id: printerId },
      include: {
        station: { select: { name: true } },
      },
    });

    if (!printer) {
      return { success: false, error: "Impresora no encontrada" };
    }

    if (!printer.isActive) {
      return { success: false, error: "La impresora está desactivada" };
    }

    const config = buildPrinterConfig(printer);
    const escPosData = generateTestPageData(config);

    // Create print job record (pending - will be updated by client)
    const printJob = await prisma.printJob.create({
      data: {
        printerId: printer.id,
        orderId: null,
        content: JSON.stringify({
          type: "TEST",
          timestamp: new Date().toISOString(),
        }),
        jobType: "TEST",
        status: PrintJobStatus.PENDING,
      },
    });

    const target = buildPrinterTarget(printer);

    return {
      success: true,
      jobs: [
        {
          printerId: printer.id,
          printerName: printer.name,
          target,
          escPosData,
          copies: printer.printCopies,
        },
      ],
      printJobIds: [printJob.id],
    };
  } catch (error) {
    console.error("Error preparing test print:", error);
    return {
      success: false,
      error: "Error al preparar la impresión de prueba",
    };
  }
}

// ============================================================================
// PREPARE ORDER ITEMS PRINT (COMANDAS)
// ============================================================================

interface OrderItemForPrint {
  productId: string;
  itemName: string;
  quantity: number;
  notes?: string | null;
  categoryId?: string | null;
}

interface OrderInfoForPrint {
  orderId: string;
  orderCode: string;
  tableName: string;
  branchId: string;
}

/**
 * Prepare print jobs for order items (station comandas)
 * Returns ESC/POS data for each printer that should receive items
 */
export async function prepareOrderItemsPrint(
  orderInfo: OrderInfoForPrint,
  items: OrderItemForPrint[],
): Promise<PreparedPrintResult> {
  try {
    // Get all active auto-print printers for this branch
    const printers = await prisma.printer.findMany({
      where: {
        branchId: orderInfo.branchId,
        isActive: true,
        autoPrint: true,
        printMode: { in: ["STATION_ITEMS", "BOTH"] },
      },
      include: {
        station: {
          include: {
            stationCategories: { select: { categoryId: true } },
          },
        },
      },
    });

    if (printers.length === 0) {
      return {
        success: true,
        jobs: [],
        printJobIds: [],
      };
    }

    // Get category IDs for items that don't have categoryId
    const productIds = items
      .filter((item) => !item.categoryId && item.productId)
      .map((item) => item.productId);

    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, categoryId: true },
          })
        : [];

    const productCategoryMap = new Map(
      products.map((p) => [p.id, p.categoryId]),
    );

    // Enrich items with category IDs
    const enrichedItems = items.map((item) => ({
      ...item,
      categoryId:
        item.categoryId || productCategoryMap.get(item.productId) || null,
    }));

    const jobs: PrintJobData[] = [];
    const printJobIds: string[] = [];

    for (const printer of printers) {
      // Determine which items this printer should receive
      let stationItems = enrichedItems;

      if (printer.station) {
        const stationCategoryIds = new Set(
          printer.station.stationCategories.map((sc) => sc.categoryId),
        );

        if (stationCategoryIds.size > 0) {
          stationItems = enrichedItems.filter(
            (item) =>
              item.categoryId && stationCategoryIds.has(item.categoryId),
          );
        } else {
          // Station has no categories - skip
          stationItems = [];
        }
      }

      if (stationItems.length === 0) {
        continue;
      }

      const config = buildPrinterConfig(printer);
      const orderData = {
        orderNumber: orderInfo.orderCode,
        tableName: orderInfo.tableName,
        stationName: printer.station?.name,
        items: stationItems.map((item) => ({
          name: item.itemName,
          quantity: item.quantity,
          notes: item.notes || undefined,
        })),
      };

      const escPosData = generateOrderData(config, orderData);

      // Create print job record
      const printJob = await prisma.printJob.create({
        data: {
          printerId: printer.id,
          orderId: orderInfo.orderId,
          content: JSON.stringify(orderData),
          jobType: "STATION_ORDER",
          status: PrintJobStatus.PENDING,
        },
      });

      const target = buildPrinterTarget(printer);

      // Add job for each copy
      for (let i = 0; i < printer.printCopies; i++) {
        jobs.push({
          printerId: printer.id,
          printerName: printer.name,
          target,
          escPosData,
          copies: 1, // Already handled by loop
        });
      }

      printJobIds.push(printJob.id);
    }

    return {
      success: true,
      jobs,
      printJobIds,
    };
  } catch (error) {
    console.error("Error preparing order items print:", error);
    return {
      success: false,
      error: "Error al preparar la impresión de comanda",
    };
  }
}

// ============================================================================
// PREPARE CONTROL TICKET PRINT
// ============================================================================

interface ControlTicketItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string | null;
}

interface ControlTicketInfo {
  orderId: string;
  orderCode: string;
  tableName: string;
  waiterName: string;
  branchId: string;
  items: ControlTicketItem[];
  subtotal: number;
  discountPercentage?: number;
  orderType?: string;
  customerName?: string;
}

/**
 * Prepare print jobs for control ticket (full order with prices)
 */
export async function prepareControlTicketPrint(
  ticketInfo: ControlTicketInfo,
): Promise<PreparedPrintResult> {
  try {
    // Get printers configured for control tickets
    const printers = await prisma.printer.findMany({
      where: {
        branchId: ticketInfo.branchId,
        isActive: true,
        printMode: { in: ["FULL_ORDER", "BOTH"] },
      },
    });

    if (printers.length === 0) {
      // No printers configured - this is not an error for clients without printers
      return {
        success: true,
        jobs: [],
        printJobIds: [],
      };
    }

    const subtotal = ticketInfo.subtotal;
    const discountAmount = ticketInfo.discountPercentage
      ? subtotal * (ticketInfo.discountPercentage / 100)
      : 0;
    const total = subtotal - discountAmount;

    const jobs: PrintJobData[] = [];
    const printJobIds: string[] = [];

    for (const printer of printers) {
      const config = buildPrinterConfig(printer);

      const fullOrderData = {
        orderNumber: ticketInfo.orderCode,
        tableName: ticketInfo.tableName,
        waiterName: ticketInfo.waiterName,
        items: ticketInfo.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes || undefined,
        })),
        subtotal,
        discountPercentage: ticketInfo.discountPercentage,
        discountAmount,
        total,
        orderType: ticketInfo.orderType,
        customerName: ticketInfo.customerName,
      };

      const escPosData = generateFullOrderData(config, fullOrderData);

      // Create print job record
      const printJob = await prisma.printJob.create({
        data: {
          printerId: printer.id,
          orderId: ticketInfo.orderId,
          content: JSON.stringify(fullOrderData),
          jobType: "FULL_ORDER",
          status: PrintJobStatus.PENDING,
        },
      });

      const target = buildPrinterTarget(printer);

      for (let i = 0; i < printer.printCopies; i++) {
        jobs.push({
          printerId: printer.id,
          printerName: printer.name,
          target,
          escPosData,
          copies: 1,
        });
      }

      printJobIds.push(printJob.id);
    }

    return {
      success: true,
      jobs,
      printJobIds,
    };
  } catch (error) {
    console.error("Error preparing control ticket print:", error);
    return { success: false, error: "Error al preparar el ticket de control" };
  }
}

// ============================================================================
// UPDATE PRINT JOB STATUS (called by client after printing)
// ============================================================================

/**
 * Update print job status after client sends to printer via gg-ez-print
 */
export async function updatePrintJobStatus(
  printJobId: string,
  success: boolean,
  error?: string,
): Promise<{ success: boolean }> {
  try {
    const printJob = await prisma.printJob.update({
      where: { id: printJobId },
      data: {
        status: success ? PrintJobStatus.SENT : PrintJobStatus.FAILED,
        error: error || null,
        sentAt: success ? new Date() : null,
        attempts: { increment: 1 },
      },
    });

    // Update printer status
    await prisma.printer.update({
      where: { id: printJob.printerId },
      data: {
        status: success ? PrinterStatus.ONLINE : PrinterStatus.ERROR,
      },
    });

    revalidatePath("/dashboard/config/printers");

    return { success: true };
  } catch (err) {
    console.error("Error updating print job status:", err);
    return { success: false };
  }
}

/**
 * Batch update multiple print job statuses
 */
export async function updatePrintJobStatuses(
  results: Array<{ printJobId: string; success: boolean; error?: string }>,
): Promise<{ success: boolean }> {
  try {
    await Promise.all(
      results.map(async (result) => {
        await prisma.printJob.update({
          where: { id: result.printJobId },
          data: {
            status: result.success
              ? PrintJobStatus.SENT
              : PrintJobStatus.FAILED,
            error: result.error || null,
            sentAt: result.success ? new Date() : null,
            attempts: { increment: 1 },
          },
        });

        const printJob = await prisma.printJob.findUnique({
          where: { id: result.printJobId },
          select: { printerId: true },
        });

        if (printJob) {
          await prisma.printer.update({
            where: { id: printJob.printerId },
            data: {
              status: result.success
                ? PrinterStatus.ONLINE
                : PrinterStatus.ERROR,
            },
          });
        }
      }),
    );

    revalidatePath("/dashboard/config/printers");

    return { success: true };
  } catch (err) {
    console.error("Error updating print job statuses:", err);
    return { success: false };
  }
}

// ============================================================================
// CHECK IF BRANCH HAS PRINTERS
// ============================================================================

/**
 * Check if a branch has any active printers configured
 * Used to conditionally show/hide print buttons in the UI
 */
export async function hasBranchPrinters(branchId: string): Promise<boolean> {
  try {
    const count = await prisma.printer.count({
      where: {
        branchId,
        isActive: true,
      },
    });
    return count > 0;
  } catch (error) {
    console.error("Error checking branch printers:", error);
    return false;
  }
}

/**
 * Check if a branch has control ticket printers (FULL_ORDER or BOTH mode)
 */
export async function hasBranchControlTicketPrinters(
  branchId: string,
): Promise<boolean> {
  try {
    const count = await prisma.printer.count({
      where: {
        branchId,
        isActive: true,
        printMode: { in: ["FULL_ORDER", "BOTH"] },
      },
    });
    return count > 0;
  } catch (error) {
    console.error("Error checking branch control ticket printers:", error);
    return false;
  }
}

// ============================================================================
// PREPARE AFIP INVOICE PRINT (TEST PAGE)
// ============================================================================

/**
 * AFIP Invoice print parameters (for test page)
 */
export interface AfipInvoicePrintParams {
  // Invoice header
  invoiceType: string;
  invoiceNumber: string;
  invoiceDate: string;

  // Issuer
  businessName?: string;
  cuit: string;

  // Customer
  customerDoc: string;

  // Items
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

  // AFIP authorization
  cae: string;
  caeExpiration: string;

  // QR code URL
  qrUrl?: string;

  // Printer config
  printerIp: string;
  charactersPerLine?: number;
}

/**
 * Prepare AFIP invoice print job for test page
 * Returns ESC/POS data for client to send via gg-ez-print
 *
 * NOTE: This is a simplified version for the test page that doesn't use
 * the database printer configuration or print job tracking.
 */
export async function prepareAfipInvoicePrint(
  params: AfipInvoicePrintParams,
): Promise<PreparedPrintResult> {
  try {
    const { generateAfipInvoiceData } = await import("@/lib/printer/escpos");

    // Prepare invoice data
    const invoiceData = {
      invoiceType: params.invoiceType,
      invoiceNumber: params.invoiceNumber,
      invoiceDate: params.invoiceDate,
      businessName: params.businessName,
      cuit: params.cuit,
      customerDoc: params.customerDoc,
      items: params.items,
      subtotal: params.subtotal,
      vatBreakdown: params.vatBreakdown,
      totalVat: params.totalVat,
      total: params.total,
      cae: params.cae,
      caeExpiration: params.caeExpiration,
      qrUrl: params.qrUrl || "",
    };

    // Generate ESC/POS data
    const escPosData = generateAfipInvoiceData(invoiceData, {
      charactersPerLine: params.charactersPerLine || 48,
    });

    // Build print target for network printer
    const target: PrinterTarget = {
      type: "network",
      systemName: params.printerIp,
      printerName: `Network Printer (${params.printerIp})`,
      copies: 1,
    };

    return {
      success: true,
      jobs: [
        {
          printerId: "test-arca-printer", // Not a real printer ID
          printerName: target.printerName || params.printerIp,
          target,
          escPosData,
          copies: 1,
        },
      ],
      printJobIds: [], // No database tracking for test page
    };
  } catch (error) {
    console.error("Error preparing AFIP invoice print:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al preparar la impresión de factura AFIP",
    };
  }
}

/**
 * Prepare invoice print job for a saved invoice
 * Uses branch's printer configuration
 */
export async function prepareInvoicePrint(
  invoiceId: string
): Promise<PreparedPrintResult> {
  try {
    // Get invoice with order details
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: { name: true },
                },
              },
            },
            table: true,
          },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: "Factura no encontrada" };
    }

    if (!invoice.order) {
      return { success: false, error: "Orden no encontrada para esta factura" };
    }

    // Get the branch ID from the order
    const branchId = process.env.BRANCH_ID || "";

    // Get first online network printer from the branch (for invoices we typically use one printer)
    const printer = await prisma.printer.findFirst({
      where: {
        branchId,
        status: PrinterStatus.ONLINE,
        connectionType: "NETWORK", // Preferably network for invoice printers
      },
      orderBy: { createdAt: "asc" },
    });

    if (!printer) {
      return {
        success: false,
        error: "No hay impresoras activas configuradas para este local",
      };
    }

    const { generateAfipInvoiceData } = await import("@/lib/printer/escpos");

    // Get business name from environment or default
    const businessName = process.env.BUSINESS_NAME || "Kiku Sushi";
    const businessCuit = process.env.ARCA_CUIT || "";

    // Prepare invoice items
    const items = invoice.order.items.map((item) => ({
      description: item.itemName || item.product?.name || "Producto",
      quantity: item.quantity,
      unitPrice: Number(item.price),
      vatRate: 21, // Default VAT rate
      total: Number(item.price) * item.quantity,
    }));

    // Parse VAT breakdown
    let vatBreakdown: Array<{ rate: number; base: number; amount: number }> = [];
    if (invoice.vatBreakdown && typeof invoice.vatBreakdown === "object") {
      if (Array.isArray(invoice.vatBreakdown)) {
        vatBreakdown = invoice.vatBreakdown as Array<{
          rate: number;
          base: number;
          amount: number;
        }>;
      }
    }

    // Prepare invoice data
    const invoiceData = {
      invoiceType: `Factura ${invoice.invoiceType === 1 ? "A" : invoice.invoiceType === 6 ? "B" : "C"}`,
      invoiceNumber: `${invoice.ptoVta.toString().padStart(4, "0")}-${invoice.invoiceNumber.toString().padStart(8, "0")}`,
      invoiceDate: new Date(invoice.invoiceDate).toLocaleDateString("es-AR"),
      businessName,
      cuit: businessCuit,
      customerDoc: `${invoice.customerDocType === 80 ? "CUIT" : invoice.customerDocType === 96 ? "DNI" : "Doc"}: ${invoice.customerDocNumber}`,
      items,
      subtotal: Number(invoice.subtotal),
      vatBreakdown,
      totalVat: Number(invoice.vatAmount),
      total: Number(invoice.totalAmount),
      cae: invoice.cae || "",
      caeExpiration: invoice.caeFchVto || "",
      qrUrl: invoice.qrUrl || "",
    };

    // Generate ESC/POS data
    const escPosData = generateAfipInvoiceData(invoiceData, {
      charactersPerLine: printer.charactersPerLine,
    });

    // Build print target
    const target: PrinterTarget = {
      type: printer.connectionType === "NETWORK" ? "network" : "usb",
      systemName: printer.systemName,
      printerName: printer.name,
      copies: 1,
    };

    return {
      success: true,
      jobs: [
        {
          printerId: printer.id,
          printerName: printer.name,
          target,
          escPosData,
          copies: 1,
        },
      ],
      printJobIds: [], // Optional: could create print job records for tracking
    };
  } catch (error) {
    console.error("Error preparing invoice print:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al preparar la impresión de la factura",
    };
  }
}
