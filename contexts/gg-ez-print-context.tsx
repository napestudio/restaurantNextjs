"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  GgEzPrintClient,
  type DiscoveredPrinter,
  type PrintRequest,
  type GgEzPrintConnection,
} from "@/lib/printer/gg-ez-print";

// ============================================================================
// TYPES
// ============================================================================

interface GgEzPrintContextValue {
  // Connection status
  isConnected: boolean;
  connectionError: string | null;
  reconnectAttempts: number;

  // Printer management
  printers: DiscoveredPrinter[];
  isDiscovering: boolean;
  discoveryError: string | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
  refreshPrinters: () => Promise<DiscoveredPrinter[]>;
  print: (request: PrintRequest) => Promise<void>;

  // Direct client access for real-time state checks
  client: GgEzPrintClient;
}

// ============================================================================
// CONTEXT
// ============================================================================

const GgEzPrintContext = createContext<GgEzPrintContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function GgEzPrintProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new GgEzPrintClient());

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Printer discovery state
  const [printers, setPrinters] = useState<DiscoveredPrinter[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Subscribe to connection status changes
  useEffect(() => {
    const unsubscribe = client.onConnectionChange((connection: GgEzPrintConnection) => {
      setIsConnected(connection.isConnected);
      setConnectionError(connection.error);
      setReconnectAttempts(connection.reconnectAttempts);
    });

    return () => {
      unsubscribe();
    };
  }, [client]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      client.disconnect();
    };
  }, [client]);

  // Connect to gg-ez-print
  const connect = useCallback(() => {
    client.connect();
  }, [client]);

  // Disconnect from gg-ez-print
  const disconnect = useCallback(() => {
    client.disconnect();
  }, [client]);

  // Refresh printer list
  const refreshPrinters = useCallback(async () => {
    setIsDiscovering(true);
    setDiscoveryError(null);

    try {
      const discoveredPrinters = await client.listPrinters();
      setPrinters(discoveredPrinters);
      return discoveredPrinters;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al obtener lista de impresoras";
      setDiscoveryError(errorMessage);
      console.error("Failed to discover printers:", error);
      throw error;
    } finally {
      setIsDiscovering(false);
    }
  }, [client]);

  // Print function
  const print = useCallback(
    async (request: PrintRequest) => {
      try {
        await client.print(request);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Error al imprimir";
        throw new Error(errorMessage);
      }
    },
    [client]
  );

  const value: GgEzPrintContextValue = {
    // Connection status
    isConnected,
    connectionError,
    reconnectAttempts,

    // Printer management
    printers,
    isDiscovering,
    discoveryError,

    // Actions
    connect,
    disconnect,
    refreshPrinters,
    print,

    // Client instance
    client,
  };

  return (
    <GgEzPrintContext.Provider value={value}>
      {children}
    </GgEzPrintContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to access gg-ez-print context
 * @throws Error if used outside of GgEzPrintProvider
 */
export function useGgEzPrint(): GgEzPrintContextValue {
  const context = useContext(GgEzPrintContext);
  if (!context) {
    throw new Error("useGgEzPrint must be used within a GgEzPrintProvider");
  }
  return context;
}

/**
 * Hook to access gg-ez-print context (optional - returns null if not in provider)
 */
export function useGgEzPrintOptional(): GgEzPrintContextValue | null {
  return useContext(GgEzPrintContext);
}
