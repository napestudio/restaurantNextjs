"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type QzConnectionStatus,
  type QzPrinterInfo,
  type QzPrintResult,
  type PrinterTarget,
  isQzLoaded,
  isQzConnected,
  connectToQz,
  disconnectFromQz,
  listPrinters,
  printEscPos,
} from "@/lib/printer/qz-tray";

export interface UseQzTrayOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  onConnectionChange?: (status: QzConnectionStatus) => void;
}

export interface UseQzTrayReturn {
  // Connection state
  status: QzConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;

  // Actions
  connect: () => Promise<QzConnectionStatus>;
  disconnect: () => Promise<void>;

  // Printer operations
  printers: QzPrinterInfo[];
  refreshPrinters: () => Promise<void>;
  print: (target: PrinterTarget, escPosData: string) => Promise<QzPrintResult>;

  // Optimistic print queue
  pendingPrints: Map<string, PendingPrint>;
}

export interface PendingPrint {
  id: string;
  target: PrinterTarget;
  status: "pending" | "printing" | "success" | "error";
  error?: string;
  startedAt: number;
}

const QZ_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/qz-tray@2/qz-tray.min.js";

/**
 * Hook for managing QZ Tray connection and printing
 *
 * Features:
 * - Auto-connect on mount (optional)
 * - Auto-reconnect on disconnect
 * - Optimistic UI for print operations
 * - Printer discovery and caching
 */
export function useQzTray(options: UseQzTrayOptions = {}): UseQzTrayReturn {
  const {
    autoConnect = true,
    reconnectInterval = 5000,
    onConnectionChange,
  } = options;

  const [status, setStatus] = useState<QzConnectionStatus>({
    state: "disconnected",
  });
  const [printers, setPrinters] = useState<QzPrinterInfo[]>([]);
  const [pendingPrints, setPendingPrints] = useState<Map<string, PendingPrint>>(
    new Map()
  );

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const scriptLoadedRef = useRef(false);

  // Load QZ Tray script dynamically
  const loadQzScript = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    if (isQzLoaded()) return true;
    if (scriptLoadedRef.current) return isQzLoaded();

    return new Promise((resolve) => {
      // Check if script is already being loaded
      const existingScript = document.querySelector(
        `script[src="${QZ_SCRIPT_URL}"]`
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(isQzLoaded()));
        existingScript.addEventListener("error", () => resolve(false));
        return;
      }

      const script = document.createElement("script");
      script.src = QZ_SCRIPT_URL;
      script.async = true;

      script.onload = () => {
        scriptLoadedRef.current = true;
        resolve(isQzLoaded());
      };

      script.onerror = () => {
        console.error("Failed to load QZ Tray script");
        resolve(false);
      };

      document.head.appendChild(script);
    });
  }, []);

  // Update status and notify
  const updateStatus = useCallback(
    (newStatus: QzConnectionStatus) => {
      setStatus(newStatus);
      onConnectionChange?.(newStatus);
    },
    [onConnectionChange]
  );

  // Connect to QZ Tray
  const connect = useCallback(async (): Promise<QzConnectionStatus> => {
    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    updateStatus({ state: "connecting" });

    // Ensure script is loaded
    const loaded = await loadQzScript();
    if (!loaded) {
      const errorStatus: QzConnectionStatus = {
        state: "error",
        error:
          "No se pudo cargar QZ Tray. Verifica que esté instalado y ejecutándose.",
      };
      updateStatus(errorStatus);
      return errorStatus;
    }

    const result = await connectToQz();
    updateStatus(result);

    // If connected, load printers
    if (result.state === "connected") {
      try {
        const printerList = await listPrinters();
        if (mountedRef.current) {
          setPrinters(printerList);
        }
      } catch (err) {
        console.warn("Failed to list printers:", err);
      }
    }

    return result;
  }, [loadQzScript, updateStatus]);

  // Disconnect from QZ Tray
  const disconnect = useCallback(async (): Promise<void> => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    await disconnectFromQz();
    updateStatus({ state: "disconnected" });
    setPrinters([]);
  }, [updateStatus]);

  // Refresh printer list
  const refreshPrinters = useCallback(async (): Promise<void> => {
    if (!isQzConnected()) return;

    try {
      const printerList = await listPrinters();
      if (mountedRef.current) {
        setPrinters(printerList);
      }
    } catch (err) {
      console.warn("Failed to refresh printers:", err);
    }
  }, []);

  // Print with optimistic updates
  const print = useCallback(
    async (target: PrinterTarget, escPosData: string): Promise<QzPrintResult> => {
      const printId = `print-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Optimistic update - add to pending
      const pendingPrint: PendingPrint = {
        id: printId,
        target,
        status: "printing",
        startedAt: Date.now(),
      };

      setPendingPrints((prev) => {
        const next = new Map(prev);
        next.set(printId, pendingPrint);
        return next;
      });

      try {
        // Check connection first
        if (!isQzConnected()) {
          // Try to reconnect
          const connectResult = await connect();
          if (connectResult.state !== "connected") {
            throw new Error(
              connectResult.error || "No se pudo conectar a QZ Tray"
            );
          }
        }

        const result = await printEscPos(target, escPosData);

        // Update pending print status
        setPendingPrints((prev) => {
          const next = new Map(prev);
          const updated: PendingPrint = {
            ...pendingPrint,
            status: result.success ? "success" : "error",
            error: result.error,
          };
          next.set(printId, updated);

          // Auto-remove successful prints after 2 seconds
          if (result.success) {
            setTimeout(() => {
              setPendingPrints((current) => {
                const cleaned = new Map(current);
                cleaned.delete(printId);
                return cleaned;
              });
            }, 2000);
          }

          return next;
        });

        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Error de impresión";

        setPendingPrints((prev) => {
          const next = new Map(prev);
          next.set(printId, {
            ...pendingPrint,
            status: "error",
            error,
          });
          return next;
        });

        return { success: false, error };
      }
    },
    [connect]
  );

  // Auto-connect on mount
  useEffect(() => {
    mountedRef.current = true;

    if (autoConnect) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [autoConnect, connect]);

  // Monitor connection and auto-reconnect
  useEffect(() => {
    if (status.state === "error" && autoConnect) {
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, reconnectInterval);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [status.state, autoConnect, reconnectInterval, connect]);

  return {
    status,
    isConnected: status.state === "connected",
    isConnecting: status.state === "connecting",
    connect,
    disconnect,
    printers,
    refreshPrinters,
    print,
    pendingPrints,
  };
}
