"use client";

import { useCallback, useState } from "react";
import { useQzTrayOptional } from "@/contexts/qz-tray-context";
import {
  prepareTestPrint,
  prepareOrderItemsPrint,
  prepareControlTicketPrint,
  updatePrintJobStatuses,
  hasBranchControlTicketPrinters,
  type PrintJobData,
} from "@/actions/PrinterQz";
import type { PrinterTarget } from "@/lib/printer/qz-tray";

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
 * 3. Send to QZ Tray
 * 4. Update server with results
 * 5. Show final status
 */
export function usePrint(): UsePrintReturn {
  const qz = useQzTrayOptional();
  const [printStatus, setPrintStatus] = useState<PrintStatus>({ status: "idle" });

  const resetStatus = useCallback(() => {
    setPrintStatus({ status: "idle" });
  }, []);

  /**
   * Execute print jobs via QZ Tray
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

      // Check if QZ Tray context is available
      if (!qz) {
        console.debug("[usePrint] QZ Tray context not available - printing disabled for this session");
        setPrintStatus({
          status: "error",
          message: "QZ Tray no está disponible. Asegúrate de que esté instalado y ejecutándose, y recarga la página.",
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

        const target: PrinterTarget = job.target.type === "network"
          ? {
              type: "network",
              ipAddress: job.target.ipAddress,
              port: job.target.port,
            }
          : {
              type: "usb",
              printerName: job.target.printerName,
              usbPath: job.target.usbPath,
            };

        console.debug("[usePrint] Sending to printer:", target);
        const result = await qz.print(target, job.escPosData);
        console.debug("[usePrint] Print result for job", i, ":", result);

        if (result.success) {
          successCount++;
        } else {
          failCount++;
          // Use warn for expected failures (network issues), error for unexpected
          if (result.error?.includes("timeout") || result.error?.includes("Connection") || result.error?.includes("conectar")) {
            console.warn("[usePrint] Printer unreachable:", result.error);
          } else {
            console.error("[usePrint] Print failed:", result.error);
          }
        }

        results.push({
          printJobId,
          success: result.success,
          error: result.error,
        });
      }

      // Update server with results (fire and forget - don't block UI)
      updatePrintJobStatuses(results).catch(console.error);

      return { success: failCount === 0, successCount, failCount };
    },
    [qz]
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

  return {
    printStatus,
    isPrinting: printStatus.status === "preparing" || printStatus.status === "printing",
    printTest,
    printOrderItems,
    printControlTicket,
    checkHasControlTicketPrinters,
    resetStatus,
  };
}
