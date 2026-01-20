"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  PrinterStatus,
  PrintJobStatus,
  PrintMode,
  PrinterConnectionType,
} from "@/app/generated/prisma";
import { printTestPage } from "@/lib/printer/escpos";

const printerInputSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  // System identifier used by gg-ez-print (Windows printer name or IP address)
  systemName: z.string().min(1, "El identificador del sistema es requerido"),
  // Connection type
  connectionType: z.enum(["NETWORK", "USB"]).default("NETWORK"),
  // Other fields
  model: z.string().optional(),
  branchId: z.string().min(1, "La sucursal es requerida"),
  stationId: z.string().optional().nullable(),
  autoPrint: z.boolean().default(true),
  printMode: z
    .enum(["STATION_ITEMS", "FULL_ORDER", "BOTH"])
    .default("STATION_ITEMS"),
  printCopies: z.number().min(1).max(5).default(1),
  paperWidth: z.enum(["58", "80"]),
  charactersPerLine: z.number().min(32).max(48).default(48),
  // Ticket customization (0=small, 1=normal, 2=medium, 3=large)
  ticketHeader: z.string().optional().nullable(),
  ticketHeaderSize: z.number().min(0).max(3).default(2),
  ticketFooter: z.string().optional().nullable(),
  ticketFooterSize: z.number().min(0).max(3).default(1),
  // Control ticket formatting (0=small, 1=normal, 2=big)
  controlTicketFontSize: z.number().min(0).max(2).default(1),
  controlTicketSpacing: z.number().min(0).max(2).default(1),
});

const printerSchema = printerInputSchema.transform((data) => ({
  ...data,
  paperWidth: parseInt(data.paperWidth),
}));

export async function createPrinter(data: z.input<typeof printerSchema>) {
  try {
    const validatedData = printerSchema.parse(data);

    // Check if printer name already exists in this branch
    const existingName = await prisma.printer.findUnique({
      where: {
        branchId_name: {
          branchId: validatedData.branchId,
          name: validatedData.name,
        },
      },
    });

    if (existingName) {
      return {
        success: false,
        error: "Ya existe una impresora con ese nombre en esta sucursal",
      };
    }

    const printer = await prisma.printer.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        // System identifier for gg-ez-print
        systemName: validatedData.systemName,
        // Connection configuration
        connectionType: validatedData.connectionType as PrinterConnectionType,
        // Other fields
        model: validatedData.model,
        branchId: validatedData.branchId,
        stationId: validatedData.stationId,
        autoPrint: validatedData.autoPrint,
        printMode: validatedData.printMode as PrintMode,
        printCopies: validatedData.printCopies,
        paperWidth: validatedData.paperWidth,
        charactersPerLine: validatedData.charactersPerLine,
        controlTicketFontSize: validatedData.controlTicketFontSize,
        controlTicketSpacing: validatedData.controlTicketSpacing,
        status: PrinterStatus.OFFLINE,
        isActive: true,
      },
    });

    revalidatePath("/dashboard/config/printers");

    return {
      success: true,
      data: printer,
    };
  } catch (error) {
    console.error("Error creating printer:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Error de validación",
      };
    }
    return {
      success: false,
      error: "Error al crear la impresora",
    };
  }
}

export async function getPrintersByBranch(branchId: string) {
  try {
    const printers = await prisma.printer.findMany({
      where: {
        branchId,
      },
      orderBy: {
        name: "asc",
      },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: {
            printJobs: true,
          },
        },
      },
    });

    return {
      success: true,
      data: printers,
    };
  } catch (error) {
    console.error("Error fetching printers:", error);
    return {
      success: false,
      error: "Error al obtener las impresoras",
      data: [],
    };
  }
}

export async function getPrinterById(id: string) {
  try {
    const printer = await prisma.printer.findUnique({
      where: { id },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    if (!printer) {
      return {
        success: false,
        error: "Impresora no encontrada",
      };
    }

    return {
      success: true,
      data: printer,
    };
  } catch (error) {
    console.error("Error fetching printer:", error);
    return {
      success: false,
      error: "Error al obtener la impresora",
    };
  }
}

export async function updatePrinter(
  id: string,
  data: Partial<z.input<typeof printerSchema>>
) {
  try {
    // If updating name, check it doesn't exist
    if (data.name) {
      const printer = await prisma.printer.findUnique({ where: { id } });
      if (!printer) {
        return { success: false, error: "Impresora no encontrada" };
      }

      const existingName = await prisma.printer.findFirst({
        where: {
          branchId: printer.branchId,
          name: data.name,
          id: { not: id },
        },
      });

      if (existingName) {
        return {
          success: false,
          error: "Ya existe una impresora con ese nombre en esta sucursal",
        };
      }
    }

    const printer = await prisma.printer.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        // System identifier for gg-ez-print
        ...(data.systemName !== undefined && { systemName: data.systemName }),
        // Connection configuration
        ...(data.connectionType !== undefined && {
          connectionType: data.connectionType as PrinterConnectionType,
        }),
        // Other fields
        ...(data.model !== undefined && { model: data.model }),
        ...(data.stationId !== undefined && { stationId: data.stationId }),
        ...(data.autoPrint !== undefined && { autoPrint: data.autoPrint }),
        ...(data.printMode !== undefined && {
          printMode: data.printMode as PrintMode,
        }),
        ...(data.printCopies !== undefined && {
          printCopies: data.printCopies,
        }),
        ...(data.paperWidth !== undefined && {
          paperWidth: parseInt(data.paperWidth),
        }),
        ...(data.charactersPerLine !== undefined && {
          charactersPerLine: data.charactersPerLine,
        }),
        ...(data.ticketHeader !== undefined && {
          ticketHeader: data.ticketHeader,
        }),
        ...(data.ticketHeaderSize !== undefined && {
          ticketHeaderSize: data.ticketHeaderSize,
        }),
        ...(data.ticketFooter !== undefined && {
          ticketFooter: data.ticketFooter,
        }),
        ...(data.ticketFooterSize !== undefined && {
          ticketFooterSize: data.ticketFooterSize,
        }),
        ...(data.controlTicketFontSize !== undefined && {
          controlTicketFontSize: data.controlTicketFontSize,
        }),
        ...(data.controlTicketSpacing !== undefined && {
          controlTicketSpacing: data.controlTicketSpacing,
        }),
      },
    });

    revalidatePath("/dashboard/config/printers");

    return {
      success: true,
      data: printer,
    };
  } catch (error) {
    console.error("Error updating printer:", error);
    return {
      success: false,
      error: "Error al actualizar la impresora",
    };
  }
}

export async function togglePrinterStatus(id: string, isActive: boolean) {
  try {
    const printer = await prisma.printer.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath("/dashboard/config/printers");

    return {
      success: true,
      data: printer,
    };
  } catch (error) {
    console.error("Error toggling printer status:", error);
    return {
      success: false,
      error: "Error al cambiar el estado de la impresora",
    };
  }
}

export async function updatePrinterConnectionStatus(
  id: string,
  status: PrinterStatus
) {
  try {
    const printer = await prisma.printer.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/dashboard/config/printers");

    return {
      success: true,
      data: printer,
    };
  } catch (error) {
    console.error("Error updating printer connection status:", error);
    return {
      success: false,
      error: "Error al actualizar el estado de conexión",
    };
  }
}

export async function deletePrinter(id: string) {
  try {
    // Check if printer has print jobs
    const printer = await prisma.printer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            printJobs: true,
          },
        },
      },
    });

    if (!printer) {
      return {
        success: false,
        error: "Impresora no encontrada",
      };
    }

    // Allow deletion even if there are print jobs (they will be cascade deleted)
    // But warn the user in the UI before calling this action

    await prisma.printer.delete({
      where: { id },
    });

    revalidatePath("/dashboard/config/printers");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting printer:", error);
    return {
      success: false,
      error: "Error al eliminar la impresora",
    };
  }
}

export async function testPrinter(id: string) {
  try {
    const printer = await prisma.printer.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            name: true,
          },
        },
        station: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!printer) {
      return {
        success: false,
        error: "Impresora no encontrada",
      };
    }

    if (!printer.isActive) {
      return {
        success: false,
        error: "La impresora está desactivada",
      };
    }

    // Create a test print job
    const testContent = {
      type: "TEST",
      timestamp: new Date().toISOString(),
      printer: {
        name: printer.name,
        model: printer.model,
        connectionType: printer.connectionType,
        systemName: printer.systemName,
      },
      branch: printer.branch.name,
      station: printer.station?.name || "Sin estación",
    };

    // Create print job record
    const printJob = await prisma.printJob.create({
      data: {
        printerId: printer.id,
        orderId: null, // Test prints don't have an order
        content: JSON.stringify(testContent),
        jobType: "TEST",
        status: PrintJobStatus.PENDING,
      },
    });

    // Build printer config based on connection type
    // Note: This uses gg-ez-print for both USB and network printers
    const printerConfig = {
      connectionType: printer.connectionType,
      systemName: printer.systemName,
      // Paper config
      paperWidth: printer.paperWidth,
      charactersPerLine: printer.charactersPerLine,
      controlTicketFontSize: printer.controlTicketFontSize,
      controlTicketSpacing: printer.controlTicketSpacing,
    };

    const printResult = await printTestPage(printerConfig);

    if (printResult.success) {
      // Update print job status to SENT
      await prisma.printJob.update({
        where: { id: printJob.id },
        data: {
          status: PrintJobStatus.SENT,
          sentAt: new Date(),
        },
      });

      // Update printer status to ONLINE
      await prisma.printer.update({
        where: { id: printer.id },
        data: {
          status: PrinterStatus.ONLINE,
        },
      });
    } else {
      // Update print job with error
      await prisma.printJob.update({
        where: { id: printJob.id },
        data: {
          status: PrintJobStatus.FAILED,
          error: printResult.error,
          attempts: 1,
        },
      });

      // Update printer status to ERROR
      await prisma.printer.update({
        where: { id: printer.id },
        data: {
          status: PrinterStatus.ERROR,
        },
      });

      return {
        success: false,
        error: printResult.error || "Error al conectar con la impresora",
      };
    }

    revalidatePath("/dashboard/config/printers");

    return {
      success: true,
      message: "Impresión de prueba enviada exitosamente",
      data: printJob,
    };
  } catch (error) {
    console.error("Error testing printer:", error);
    return {
      success: false,
      error: "Error al realizar la prueba de impresión",
    };
  }
}

// Types for auto-printing order items (comandas - no prices)
interface OrderItemForPrint {
  productId: string;
  itemName: string;
  quantity: number;
  notes?: string | null;
  categoryId?: string | null;
}

interface OrderInfoForPrint {
  orderId: string;
  orderCode: string; // publicCode or short identifier
  tableName: string;
  branchId: string;
}

// Types for control ticket printing (with prices)
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
 * Auto-print newly added order items to station printers (comandas)
 * This prints kitchen/bar tickets WITHOUT prices and WITHOUT waiter name
 * Only prints to printers with STATION_ITEMS or BOTH print mode
 */
/**
 * @deprecated Use prepareOrderItemsPrint from PrinterActions.ts instead for gg-ez-print printing
 */
export async function autoPrintOrderItems(
  orderInfo: OrderInfoForPrint,
  items: OrderItemForPrint[]
) {
  try {
    // Get all active auto-print printers for this branch that should print station items
    const printers = await prisma.printer.findMany({
      where: {
        branchId: orderInfo.branchId,
        isActive: true,
        autoPrint: true,
        // Only get printers that print station items (not FULL_ORDER only)
        printMode: { in: ["STATION_ITEMS", "BOTH"] },
      },
      include: {
        station: {
          include: {
            stationCategories: {
              select: {
                categoryId: true,
              },
            },
          },
        },
      },
    });

    if (printers.length === 0) {
      return {
        success: true,
        message: "No hay impresoras configuradas para auto-impresión",
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
      products.map((p) => [p.id, p.categoryId])
    );

    // Enrich items with category IDs
    const enrichedItems = items.map((item) => ({
      ...item,
      categoryId:
        item.categoryId || productCategoryMap.get(item.productId) || null,
    }));

    // Import print function
    const { printOrder } = await import("@/lib/printer/escpos");

    // Print to each printer
    const printResults: {
      printerId: string;
      success: boolean;
      error?: string;
      jobType: string;
    }[] = [];

    for (const printer of printers) {
      // Build printer config based on connection type
      // Note: This uses gg-ez-print for both USB and network printers
      const printerConfig = {
        connectionType: printer.connectionType,
        systemName: printer.systemName,
        // Paper config
        paperWidth: printer.paperWidth,
        charactersPerLine: printer.charactersPerLine,
      };

      // Determine which items this printer should receive
      let stationItems = enrichedItems;

      if (printer.station) {
        const stationCategoryIds = new Set(
          printer.station.stationCategories.map((sc) => sc.categoryId)
        );

        // If station has categories, filter items
        if (stationCategoryIds.size > 0) {
          stationItems = enrichedItems.filter(
            (item) => item.categoryId && stationCategoryIds.has(item.categoryId)
          );
        } else {
          // Station has no categories configured - skip
          stationItems = [];
        }
      } else {
        console.log(
          `[autoPrintOrderItems] Printer ${printer.name} has no station, will print all items`
        );
      }

      if (stationItems.length === 0) {
        continue;
      }

      // Print station comanda (NO prices, NO waiter name)
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

      for (let copy = 0; copy < printer.printCopies; copy++) {
        const result = await printOrder(printerConfig, orderData);

        await prisma.printJob.create({
          data: {
            printerId: printer.id,
            orderId: orderInfo.orderId,
            content: JSON.stringify(orderData),
            jobType: "STATION_ORDER",
            status: result.success
              ? PrintJobStatus.SENT
              : PrintJobStatus.FAILED,
            error: result.error || null,
            sentAt: result.success ? new Date() : null,
            attempts: 1,
          },
        });

        await updatePrinterStatusFromResult(printer.id, result.success);

        printResults.push({
          printerId: printer.id,
          success: result.success,
          error: result.error,
          jobType: "STATION_ORDER",
        });
      }
    }

    const successCount = printResults.filter((r) => r.success).length;
    const failCount = printResults.filter((r) => !r.success).length;

    return {
      success: true,
      message: `Impreso en ${successCount} trabajo(s)${
        failCount > 0 ? `, ${failCount} fallaron` : ""
      }`,
      results: printResults,
    };
  } catch (error) {
    console.error("Error auto-printing order items:", error);
    return {
      success: false,
      error: "Error al imprimir automáticamente",
    };
  }
}

// Helper to update printer status
async function updatePrinterStatusFromResult(
  printerId: string,
  success: boolean
) {
  await prisma.printer.update({
    where: { id: printerId },
    data: { status: success ? PrinterStatus.ONLINE : PrinterStatus.ERROR },
  });
}

/**
 * Print control ticket (full order with prices) - triggered manually by user
 * This prints to printers with FULL_ORDER or BOTH print mode
 * @deprecated Use prepareControlTicketPrint from PrinterActions.ts instead for gg-ez-print printing
 */
export async function printControlTicket(ticketInfo: ControlTicketInfo) {
  try {
    // Get printers that print control tickets (FULL_ORDER or BOTH)
    const printers = await prisma.printer.findMany({
      where: {
        branchId: ticketInfo.branchId,
        isActive: true,
        printMode: { in: ["FULL_ORDER", "BOTH"] },
      },
    });

    if (printers.length === 0) {
      return {
        success: false,
        error: "No hay impresoras configuradas para tickets de control",
      };
    }

    const { printFullOrder } = await import("@/lib/printer/escpos");

    // Calculate totals
    const subtotal = ticketInfo.subtotal;
    const discountAmount = ticketInfo.discountPercentage
      ? subtotal * (ticketInfo.discountPercentage / 100)
      : 0;
    const total = subtotal - discountAmount;

    const printResults: {
      printerId: string;
      success: boolean;
      error?: string;
    }[] = [];

    for (const printer of printers) {
      // Build printer config based on connection type
      // Note: This uses gg-ez-print for both USB and network printers
      const printerConfig = {
        connectionType: printer.connectionType,
        systemName: printer.systemName,
        // Paper config
        paperWidth: printer.paperWidth,
        charactersPerLine: printer.charactersPerLine,
        // Ticket customization
        ticketHeader: printer.ticketHeader,
        ticketHeaderSize: printer.ticketHeaderSize,
        ticketFooter: printer.ticketFooter,
        ticketFooterSize: printer.ticketFooterSize,
        // Control ticket formatting
        controlTicketFontSize: printer.controlTicketFontSize,
        controlTicketSpacing: printer.controlTicketSpacing,
      };

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

      for (let copy = 0; copy < printer.printCopies; copy++) {
        const result = await printFullOrder(printerConfig, fullOrderData);

        await prisma.printJob.create({
          data: {
            printerId: printer.id,
            orderId: ticketInfo.orderId,
            content: JSON.stringify(fullOrderData),
            jobType: "FULL_ORDER",
            status: result.success
              ? PrintJobStatus.SENT
              : PrintJobStatus.FAILED,
            error: result.error || null,
            sentAt: result.success ? new Date() : null,
            attempts: 1,
          },
        });

        await updatePrinterStatusFromResult(printer.id, result.success);

        printResults.push({
          printerId: printer.id,
          success: result.success,
          error: result.error,
        });
      }
    }

    const successCount = printResults.filter((r) => r.success).length;
    const failCount = printResults.filter((r) => !r.success).length;

    if (successCount === 0) {
      return {
        success: false,
        error: "No se pudo imprimir en ninguna impresora",
        results: printResults,
      };
    }

    return {
      success: true,
      message: `Ticket impreso en ${successCount} impresora(s)${
        failCount > 0 ? `, ${failCount} fallaron` : ""
      }`,
      results: printResults,
    };
  } catch (error) {
    console.error("Error printing control ticket:", error);
    return {
      success: false,
      error: "Error al imprimir ticket de control",
    };
  }
}

/**
 * Discover USB/Serial printers
 * @deprecated Printer discovery now happens client-side via gg-ez-print.
 * Use the gg-ez-print context to get available printers.
 */
export async function discoverUsbPrinters() {
  // This function is deprecated - printer discovery is now done client-side via gg-ez-print WebSocket
  return {
    success: false,
    error: "La detección de impresoras ahora se realiza desde el navegador con gg-ez-print",
    printers: [],
  };
}
