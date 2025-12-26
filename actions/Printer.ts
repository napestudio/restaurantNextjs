"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PrinterStatus, PrintJobStatus, PrintMode } from "@/app/generated/prisma";
import { printTestPage } from "@/lib/printer/escpos";

const printerInputSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  ipAddress: z
    .string()
    .min(1, "La dirección IP es requerida")
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      "Dirección IP inválida"
    ),
  port: z.number().min(1).max(65535).default(9100),
  model: z.string().optional(),
  branchId: z.string().min(1, "La sucursal es requerida"),
  stationId: z.string().optional().nullable(),
  autoPrint: z.boolean().default(true),
  printMode: z.enum(["STATION_ITEMS", "FULL_ORDER", "BOTH"]).default("STATION_ITEMS"),
  printCopies: z.number().min(1).max(5).default(1),
  paperWidth: z.enum(["58", "80"]),
  charactersPerLine: z.number().min(32).max(48).default(48),
  // Ticket customization (0=small, 1=normal, 2=medium, 3=large)
  ticketHeader: z.string().optional().nullable(),
  ticketHeaderSize: z.number().min(0).max(3).default(2),
  ticketFooter: z.string().optional().nullable(),
  ticketFooterSize: z.number().min(0).max(3).default(1),
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

    // Check if IP address already exists in this branch
    const existingIP = await prisma.printer.findUnique({
      where: {
        branchId_ipAddress: {
          branchId: validatedData.branchId,
          ipAddress: validatedData.ipAddress,
        },
      },
    });

    if (existingIP) {
      return {
        success: false,
        error: "Ya existe una impresora con esa dirección IP en esta sucursal",
      };
    }

    const printer = await prisma.printer.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        ipAddress: validatedData.ipAddress,
        port: validatedData.port,
        model: validatedData.model,
        branchId: validatedData.branchId,
        stationId: validatedData.stationId,
        autoPrint: validatedData.autoPrint,
        printMode: validatedData.printMode as PrintMode,
        printCopies: validatedData.printCopies,
        paperWidth: validatedData.paperWidth,
        charactersPerLine: validatedData.charactersPerLine,
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

    // If updating IP, check it doesn't exist
    if (data.ipAddress) {
      const printer = await prisma.printer.findUnique({ where: { id } });
      if (!printer) {
        return { success: false, error: "Impresora no encontrada" };
      }

      const existingIP = await prisma.printer.findFirst({
        where: {
          branchId: printer.branchId,
          ipAddress: data.ipAddress,
          id: { not: id },
        },
      });

      if (existingIP) {
        return {
          success: false,
          error:
            "Ya existe una impresora con esa dirección IP en esta sucursal",
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
        ...(data.ipAddress && { ipAddress: data.ipAddress }),
        ...(data.port !== undefined && { port: data.port }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.stationId !== undefined && { stationId: data.stationId }),
        ...(data.autoPrint !== undefined && { autoPrint: data.autoPrint }),
        ...(data.printMode !== undefined && { printMode: data.printMode as PrintMode }),
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
        ip: printer.ipAddress,
        port: printer.port,
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

    // Attempt to print to the actual printer
    const printerConfig = {
      ipAddress: printer.ipAddress,
      port: printer.port,
      paperWidth: printer.paperWidth,
      charactersPerLine: printer.charactersPerLine,
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
export async function autoPrintOrderItems(
  orderInfo: OrderInfoForPrint,
  items: OrderItemForPrint[]
) {
  console.log("[autoPrintOrderItems] Called with:", JSON.stringify({ orderInfo, itemCount: items.length }, null, 2));

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

    console.log("[autoPrintOrderItems] Found printers:", printers.map(p => ({
      id: p.id,
      name: p.name,
      printMode: p.printMode,
      autoPrint: p.autoPrint,
      isActive: p.isActive,
      hasStation: !!p.station,
      stationCategories: p.station?.stationCategories?.length || 0,
    })));

    if (printers.length === 0) {
      console.log("[autoPrintOrderItems] No printers configured for auto-print");
      return { success: true, message: "No hay impresoras configuradas para auto-impresión" };
    }

    // Get category IDs for items that don't have categoryId
    const productIds = items
      .filter((item) => !item.categoryId && item.productId)
      .map((item) => item.productId);

    const products = productIds.length > 0
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
      categoryId: item.categoryId || productCategoryMap.get(item.productId) || null,
    }));

    // Import print function
    const { printOrder } = await import("@/lib/printer/escpos");

    // Print to each printer
    const printResults: { printerId: string; success: boolean; error?: string; jobType: string }[] = [];

    for (const printer of printers) {
      console.log(`[autoPrintOrderItems] Processing printer: ${printer.name}`);

      const printerConfig = {
        ipAddress: printer.ipAddress,
        port: printer.port,
        paperWidth: printer.paperWidth,
        charactersPerLine: printer.charactersPerLine,
      };

      // Determine which items this printer should receive
      let stationItems = enrichedItems;

      if (printer.station) {
        const stationCategoryIds = new Set(
          printer.station.stationCategories.map((sc) => sc.categoryId)
        );

        console.log(`[autoPrintOrderItems] Station "${printer.station.name}" has categories:`, Array.from(stationCategoryIds));
        console.log(`[autoPrintOrderItems] Items categories:`, enrichedItems.map(i => i.categoryId));

        // If station has categories, filter items
        if (stationCategoryIds.size > 0) {
          stationItems = enrichedItems.filter(
            (item) => item.categoryId && stationCategoryIds.has(item.categoryId)
          );
        } else {
          // Station has no categories configured - skip
          console.log(`[autoPrintOrderItems] Station has no categories, skipping`);
          stationItems = [];
        }
      } else {
        console.log(`[autoPrintOrderItems] Printer has no station, will print all items`);
      }

      console.log(`[autoPrintOrderItems] Station items to print: ${stationItems.length}`);

      if (stationItems.length === 0) {
        console.log(`[autoPrintOrderItems] No items to print for this printer, skipping`);
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

      console.log(`[autoPrintOrderItems] Sending to printer ${printer.name}:`, orderData);

      for (let copy = 0; copy < printer.printCopies; copy++) {
        const result = await printOrder(printerConfig, orderData);
        console.log(`[autoPrintOrderItems] Print result for ${printer.name}:`, result);

        await prisma.printJob.create({
          data: {
            printerId: printer.id,
            orderId: orderInfo.orderId,
            content: JSON.stringify(orderData),
            jobType: "STATION_ORDER",
            status: result.success ? PrintJobStatus.SENT : PrintJobStatus.FAILED,
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
      message: `Impreso en ${successCount} trabajo(s)${failCount > 0 ? `, ${failCount} fallaron` : ""}`,
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
async function updatePrinterStatusFromResult(printerId: string, success: boolean) {
  await prisma.printer.update({
    where: { id: printerId },
    data: { status: success ? PrinterStatus.ONLINE : PrinterStatus.ERROR },
  });
}

/**
 * Print control ticket (full order with prices) - triggered manually by user
 * This prints to printers with FULL_ORDER or BOTH print mode
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
        error: "No hay impresoras configuradas para tickets de control"
      };
    }

    const { printFullOrder } = await import("@/lib/printer/escpos");

    // Calculate totals
    const subtotal = ticketInfo.subtotal;
    const discountAmount = ticketInfo.discountPercentage
      ? subtotal * (ticketInfo.discountPercentage / 100)
      : 0;
    const total = subtotal - discountAmount;

    const printResults: { printerId: string; success: boolean; error?: string }[] = [];

    for (const printer of printers) {
      const printerConfig = {
        ipAddress: printer.ipAddress,
        port: printer.port,
        paperWidth: printer.paperWidth,
        charactersPerLine: printer.charactersPerLine,
        // Ticket customization
        ticketHeader: printer.ticketHeader,
        ticketHeaderSize: printer.ticketHeaderSize,
        ticketFooter: printer.ticketFooter,
        ticketFooterSize: printer.ticketFooterSize,
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
            status: result.success ? PrintJobStatus.SENT : PrintJobStatus.FAILED,
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
      message: `Ticket impreso en ${successCount} impresora(s)${failCount > 0 ? `, ${failCount} fallaron` : ""}`,
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
