"use client";

import { useCallback, useState } from "react";
import { useGgEzPrintOptional } from "@/contexts/gg-ez-print-context";
import {
  prepareTestPrint,
  prepareOrderItemsPrint,
  prepareControlTicketPrint,
  prepareInvoicePrint,
  updatePrintJobStatuses,
  hasBranchControlTicketPrinters,
  type PrintJobData,
} from "@/actions/PrinterActions";
import type { PrintRequest } from "@/lib/printer/gg-ez-print";

// ============================================================================
// TYPES
// ============================================================================

export interface PrintStatus {
  status: "idle" | "preparing" | "printing" | "success" | "error";
  message?: string;
  successCount?: number;
  failCount?: number;
}

export interface UsePrintReturn {
  // Status
  printStatus: PrintStatus;
  isPrinting: boolean;

  // Actions
  printTest: (printerId: string) => Promise<boolean>;
  printOrderItems: (
    orderInfo: {
      orderId: string;
      orderCode: string;
      tableName: string;
      branchId: string;
    },
    items: Array<{
      productId: string;
      itemName: string;
      quantity: number;
      notes?: string | null;
      categoryId?: string | null;
    }>
  ) => Promise<boolean>;
  printControlTicket: (ticketInfo: {
    orderId: string;
    orderCode: string;
    tableName: string;
    waiterName: string;
    branchId: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      notes?: string | null;
    }>;
    subtotal: number;
    discountPercentage?: number;
    orderType?: string;
    customerName?: string;
  }) => Promise<boolean>;
  printInvoice: (invoiceId: string) => Promise<boolean>;

  // Utility
  checkHasControlTicketPrinters: (branchId: string) => Promise<boolean>;

  // Reset status
  resetStatus: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for printing with optimistic updates
 *
 * Flow:
 * 1. Call server action to prepare print jobs (get ESC/POS data)
 * 2. Optimistically show "printing" status
 * 3. Send to gg-ez-print
 * 4. Update server with results
 * 5. Show final status
 */
export function usePrint(): UsePrintReturn {
  const ggEzPrint = useGgEzPrintOptional();
  const [printStatus, setPrintStatus] = useState<PrintStatus>({ status: "idle" });

  const resetStatus = useCallback(() => {
    setPrintStatus({ status: "idle" });
  }, []);

  /**
   * Execute print jobs via gg-ez-print
   */
  const executePrintJobs = useCallback(
    async (
      jobs: PrintJobData[],
      printJobIds: string[]
    ): Promise<{ success: boolean; successCount: number; failCount: number }> => {
      console.debug("[usePrint] executePrintJobs called with", jobs.length, "jobs");

      if (jobs.length === 0) {
        return { success: true, successCount: 0, failCount: 0 };
      }

      // Check if gg-ez-print context is available
      if (!ggEzPrint) {
        console.debug("[usePrint] gg-ez-print context not available - printing disabled for this session");
        setPrintStatus({
          status: "error",
          message: "gg-ez-print no está disponible. Asegúrate de que esté instalado y ejecutándose, y recarga la página.",
        });
        return { success: false, successCount: 0, failCount: jobs.length };
      }

      // Check if connected
      if (!ggEzPrint.isConnected) {
        console.debug("[usePrint] gg-ez-print not connected");
        setPrintStatus({
          status: "error",
          message: "No conectado a gg-ez-print. Verifica que el servicio esté ejecutándose.",
        });
        return { success: false, successCount: 0, failCount: jobs.length };
      }

      // Optimistic update - show printing
      setPrintStatus({ status: "printing", message: `Imprimiendo ${jobs.length} trabajo(s)...` });

      const results: Array<{ printJobId: string; success: boolean; error?: string }> = [];
      let successCount = 0;
      let failCount = 0;

      // Execute all print jobs
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const printJobId = printJobIds[Math.floor(i / (job.copies || 1))] || printJobIds[0];

        // Check if printer needs reconfiguration
        if (job.target.systemName === "NEEDS_RECONFIGURATION") {
          failCount++;
          const errorMessage = `La impresora "${job.printerName}" requiere configuración. Por favor configura el nombre del sistema o dirección IP.`;
          console.warn("[usePrint] Printer needs reconfiguration:", job.printerName);
          results.push({
            printJobId,
            success: false,
            error: errorMessage,
          });
          continue;
        }

        // Build PrintRequest for gg-ez-print
        const printRequest: PrintRequest = {
          printer_name: job.target.systemName,
          type: job.target.type === "network" ? "Network" : "USB",
          content: job.escPosData,
          font_size: 1, // Default font size
          paper_width: 80, // Default paper width (could be passed from job if needed)
        };

        console.debug("[usePrint] Sending to gg-ez-print:", printRequest.printer_name, printRequest.type);

        try {
          await ggEzPrint.print(printRequest);
          console.debug("[usePrint] Print success for job", i);
          successCount++;
          results.push({
            printJobId,
            success: true,
          });
        } catch (error) {
          failCount++;
          const errorMessage = error instanceof Error ? error.message : "Error desconocido";

          // Use warn for expected failures (network issues, DNS lookup), error for unexpected
          if (
            errorMessage.includes("timeout") ||
            errorMessage.includes("Connection") ||
            errorMessage.includes("conectar") ||
            errorMessage.includes("no such host") ||
            errorMessage.includes("NEEDS_RECONFIGURATION")
          ) {
            console.warn("[usePrint] Printer unreachable:", errorMessage);
          } else {
            console.error("[usePrint] Print failed:", errorMessage);
          }

          results.push({
            printJobId,
            success: false,
            error: errorMessage,
          });
        }
      }

      // Update server with results (fire and forget - don't block UI)
      updatePrintJobStatuses(results).catch(console.error);

      return { success: failCount === 0, successCount, failCount };
    },
    [ggEzPrint]
  );

  /**
   * Print test page
   */
  const printTest = useCallback(
    async (printerId: string): Promise<boolean> => {
      console.debug("[usePrint] Starting test print for printer:", printerId);
      setPrintStatus({ status: "preparing", message: "Preparando impresión de prueba..." });

      try {
        console.debug("[usePrint] Calling prepareTestPrint...");
        const result = await prepareTestPrint(printerId);
        console.debug("[usePrint] prepareTestPrint result:", result);

        if (!result.success || !result.jobs || result.jobs.length === 0) {
          console.warn("[usePrint] Prepare failed:", result.error);
          setPrintStatus({
            status: "error",
            message: result.error || "Error al preparar la impresión",
          });
          return false;
        }

        console.debug("[usePrint] Executing print jobs:", result.jobs.length, "jobs");
        const printResult = await executePrintJobs(result.jobs, result.printJobIds || []);
        console.debug("[usePrint] Print result:", printResult);

        if (printResult.success) {
          setPrintStatus({ status: "success", message: "Impresión de prueba enviada" });
        } else {
          setPrintStatus({
            status: "error",
            message: `Error al imprimir (${printResult.failCount} fallido(s))`,
          });
        }

        // Auto-reset after 3 seconds
        setTimeout(resetStatus, 3000);

        return printResult.success;
      } catch (error) {
        console.warn("[usePrint] Exception during print:", error);
        const message = error instanceof Error ? error.message : "Error desconocido";
        setPrintStatus({ status: "error", message });
        return false;
      }
    },
    [executePrintJobs, resetStatus]
  );

  /**
   * Print order items (station comandas)
   */
  const printOrderItems = useCallback(
    async (
      orderInfo: {
        orderId: string;
        orderCode: string;
        tableName: string;
        branchId: string;
      },
      items: Array<{
        productId: string;
        itemName: string;
        quantity: number;
        notes?: string | null;
        categoryId?: string | null;
      }>
    ): Promise<boolean> => {
      // Don't show preparing status for auto-prints (happens in background)
      try {
        const result = await prepareOrderItemsPrint(orderInfo, items);

        if (!result.success) {
          console.warn("[usePrint] Error preparing order items print:", result.error);
          return false;
        }

        if (!result.jobs || result.jobs.length === 0) {
          // No printers configured - not an error
          return true;
        }

        const printResult = await executePrintJobs(result.jobs, result.printJobIds || []);

        // Don't show status for auto-prints (too noisy)
        // Could emit an event or use a toast here if needed

        return printResult.success;
      } catch (error) {
        console.warn("[usePrint] Error printing order items:", error);
        return false;
      }
    },
    [executePrintJobs]
  );

  /**
   * Print control ticket (full order with prices)
   */
  const printControlTicket = useCallback(
    async (ticketInfo: {
      orderId: string;
      orderCode: string;
      tableName: string;
      waiterName: string;
      branchId: string;
      items: Array<{
        name: string;
        quantity: number;
        price: number;
        notes?: string | null;
      }>;
      subtotal: number;
      discountPercentage?: number;
      orderType?: string;
      customerName?: string;
    }): Promise<boolean> => {
      setPrintStatus({ status: "preparing", message: "Preparando ticket de control..." });

      try {
        const result = await prepareControlTicketPrint(ticketInfo);

        if (!result.success) {
          setPrintStatus({
            status: "error",
            message: result.error || "Error al preparar la impresión",
          });
          return false;
        }

        if (!result.jobs || result.jobs.length === 0) {
          // No printers configured - silently succeed (client may not have printers)
          setPrintStatus({ status: "idle" });
          return true;
        }

        const printResult = await executePrintJobs(result.jobs, result.printJobIds || []);

        if (printResult.success) {
          setPrintStatus({
            status: "success",
            message: `Ticket impreso (${printResult.successCount})`,
            successCount: printResult.successCount,
          });
        } else {
          setPrintStatus({
            status: "error",
            message: `Error al imprimir (${printResult.failCount} fallido(s))`,
            failCount: printResult.failCount,
          });
        }

        // Auto-reset after 3 seconds
        setTimeout(resetStatus, 3000);

        return printResult.success;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        setPrintStatus({ status: "error", message });
        return false;
      }
    },
    [executePrintJobs, resetStatus]
  );

  /**
   * Check if a branch has control ticket printers configured
   * Use this to conditionally show/hide print buttons
   */
  const checkHasControlTicketPrinters = useCallback(
    async (branchId: string): Promise<boolean> => {
      return hasBranchControlTicketPrinters(branchId);
    },
    []
  );

  /**
   * Print invoice (AFIP electronic invoice)
   */
  const printInvoice = useCallback(
    async (invoiceId: string): Promise<boolean> => {
      console.debug("[usePrint] Starting invoice print for:", invoiceId);
      setPrintStatus({ status: "preparing", message: "Preparando impresión de factura..." });

      try {
        const result = await prepareInvoicePrint(invoiceId);
        console.debug("[usePrint] prepareInvoicePrint result:", result);

        if (!result.success || !result.jobs || result.jobs.length === 0) {
          console.warn("[usePrint] Prepare failed:", result.error);
          setPrintStatus({
            status: "error",
            message: result.error || "Error al preparar la impresión",
          });
          return false;
        }

        console.debug("[usePrint] Executing invoice print jobs:", result.jobs.length, "jobs");
        const printResult = await executePrintJobs(result.jobs, result.printJobIds || []);
        console.debug("[usePrint] Print result:", printResult);

        if (printResult.success) {
          setPrintStatus({ status: "success", message: "Factura enviada a impresora" });
        } else {
          setPrintStatus({
            status: "error",
            message: `Error al imprimir (${printResult.failCount} fallido(s))`,
          });
        }

        // Auto-reset after 3 seconds
        setTimeout(resetStatus, 3000);

        return printResult.success;
      } catch (error) {
        console.warn("[usePrint] Exception during invoice print:", error);
        const message = error instanceof Error ? error.message : "Error desconocido";
        setPrintStatus({ status: "error", message });
        return false;
      }
    },
    [executePrintJobs, resetStatus]
  );

  return {
    printStatus,
    isPrinting: printStatus.status === "preparing" || printStatus.status === "printing",
    printTest,
    printOrderItems,
    printControlTicket,
    printInvoice,
    checkHasControlTicketPrinters,
    resetStatus,
  };
}
