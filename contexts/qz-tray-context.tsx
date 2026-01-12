"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
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

const QZ_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/qz-tray@2/qz-tray.min.js";

export interface PendingPrint {
  id: string;
  target: PrinterTarget;
  status: "pending" | "printing" | "success" | "error";
  error?: string;
  startedAt: number;
}

interface QzTrayContextValue {
  // Connection state
  status: QzConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  isScriptLoaded: boolean;

  // Actions
  connect: () => Promise<QzConnectionStatus>;
  disconnect: () => Promise<void>;

  // Printer operations
  printers: QzPrinterInfo[];
  refreshPrinters: () => Promise<void>;
  print: (target: PrinterTarget, escPosData: string) => Promise<QzPrintResult>;

  // Batch print for multiple printers (e.g., station comandas)
  printToMultiple: (
    jobs: Array<{ target: PrinterTarget; escPosData: string }>
  ) => Promise<QzPrintResult[]>;

  // Pending prints for optimistic UI
  pendingPrints: Map<string, PendingPrint>;
  clearPendingPrint: (id: string) => void;
}

const QzTrayContext = createContext<QzTrayContextValue | null>(null);

interface QzTrayProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number; // Stop trying after N failures (default: 3)
}

export function QzTrayProvider({
  children,
  autoConnect = true,
  reconnectInterval = 5000,
  maxReconnectAttempts = 3,
}: QzTrayProviderProps) {
  const [status, setStatus] = useState<QzConnectionStatus>({
    state: "disconnected",
  });
  const [printers, setPrinters] = useState<QzPrinterInfo[]>([]);
  const [pendingPrints, setPendingPrints] = useState<Map<string, PendingPrint>>(
    new Map()
  );
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);

  // Load QZ Tray script dynamically
  const loadQzScript = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    if (isQzLoaded()) {
      setIsScriptLoaded(true);
      return true;
    }

    return new Promise((resolve) => {
      // Check if script is already being loaded
      const existingScript = document.querySelector(
        `script[src="${QZ_SCRIPT_URL}"]`
      );
      if (existingScript) {
        const handleLoad = () => {
          setIsScriptLoaded(true);
          resolve(isQzLoaded());
        };
        existingScript.addEventListener("load", handleLoad);
        existingScript.addEventListener("error", () => resolve(false));

        // Already loaded
        if (isQzLoaded()) {
          setIsScriptLoaded(true);
          resolve(true);
        }
        return;
      }

      const script = document.createElement("script");
      script.src = QZ_SCRIPT_URL;
      script.async = true;

      script.onload = () => {
        setIsScriptLoaded(true);
        resolve(isQzLoaded());
      };

      script.onerror = () => {
        console.error("Failed to load QZ Tray script");
        resolve(false);
      };

      document.head.appendChild(script);
    });
  }, []);

  // Connect to QZ Tray
  const connect = useCallback(async (): Promise<QzConnectionStatus> => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setStatus({ state: "connecting" });

    const loaded = await loadQzScript();
    if (!loaded) {
      const errorStatus: QzConnectionStatus = {
        state: "error",
        error:
          "No se pudo cargar QZ Tray. Verifica que esté instalado y ejecutándose.",
      };
      setStatus(errorStatus);
      return errorStatus;
    }

    const result = await connectToQz();
    setStatus(result);

    if (result.state === "connected") {
      // Reset reconnect counter on successful connection
      reconnectAttemptsRef.current = 0;

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
  }, [loadQzScript]);

  // Disconnect
  const disconnect = useCallback(async (): Promise<void> => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    await disconnectFromQz();
    setStatus({ state: "disconnected" });
    setPrinters([]);
  }, []);

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

  // Clear a pending print
  const clearPendingPrint = useCallback((id: string) => {
    setPendingPrints((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Print with optimistic updates
  const print = useCallback(
    async (target: PrinterTarget, escPosData: string): Promise<QzPrintResult> => {
      const printId = `print-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Optimistic update
      const pendingPrint: PendingPrint = {
        id: printId,
        target,
        status: "printing",
        startedAt: Date.now(),
      };

      setPendingPrints((prev) => new Map(prev).set(printId, pendingPrint));

      try {
        if (!isQzConnected()) {
          const connectResult = await connect();
          if (connectResult.state !== "connected") {
            throw new Error(
              connectResult.error || "No se pudo conectar a QZ Tray"
            );
          }
        }

        const result = await printEscPos(target, escPosData);

        setPendingPrints((prev) => {
          const next = new Map(prev);
          next.set(printId, {
            ...pendingPrint,
            status: result.success ? "success" : "error",
            error: result.error,
          });

          // Auto-remove successful prints
          if (result.success) {
            setTimeout(() => clearPendingPrint(printId), 2000);
          }

          return next;
        });

        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Error de impresión";

        setPendingPrints((prev) =>
          new Map(prev).set(printId, {
            ...pendingPrint,
            status: "error",
            error,
          })
        );

        return { success: false, error };
      }
    },
    [connect, clearPendingPrint]
  );

  // Print to multiple printers in parallel
  const printToMultiple = useCallback(
    async (
      jobs: Array<{ target: PrinterTarget; escPosData: string }>
    ): Promise<QzPrintResult[]> => {
      // Ensure connected first
      if (!isQzConnected()) {
        const connectResult = await connect();
        if (connectResult.state !== "connected") {
          return jobs.map(() => ({
            success: false,
            error: connectResult.error || "No se pudo conectar a QZ Tray",
          }));
        }
      }

      // Execute all prints in parallel
      return Promise.all(jobs.map((job) => print(job.target, job.escPosData)));
    },
    [connect, print]
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

  // Auto-reconnect on error (with limited attempts)
  useEffect(() => {
    if (status.state === "error" && autoConnect) {
      // Stop trying after max attempts to avoid infinite retries
      // (useful for clients without QZ Tray installed)
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.log(
          `QZ Tray: Stopped reconnecting after ${maxReconnectAttempts} failed attempts`
        );
        return;
      }

      reconnectAttemptsRef.current += 1;

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
  }, [status.state, autoConnect, reconnectInterval, maxReconnectAttempts, connect]);

  const value: QzTrayContextValue = {
    status,
    isConnected: status.state === "connected",
    isConnecting: status.state === "connecting",
    isScriptLoaded,
    connect,
    disconnect,
    printers,
    refreshPrinters,
    print,
    printToMultiple,
    pendingPrints,
    clearPendingPrint,
  };

  return (
    <QzTrayContext.Provider value={value}>{children}</QzTrayContext.Provider>
  );
}

export function useQzTrayContext(): QzTrayContextValue {
  const context = useContext(QzTrayContext);
  if (!context) {
    throw new Error("useQzTrayContext must be used within a QzTrayProvider");
  }
  return context;
}

/**
 * Optional hook that returns null if not in provider
 * Useful for components that may or may not have QZ Tray available
 */
export function useQzTrayOptional(): QzTrayContextValue | null {
  return useContext(QzTrayContext);
}
