"use client";

import { useState, useCallback } from "react";
import { useQzTrayOptional } from "@/contexts/qz-tray-context";

/**
 * Lazy-loading wrapper for QZ Tray
 * Use this when QZ Tray provider might not be mounted
 *
 * Usage:
 * const { ensureQzTray, isInitializing } = useQzTrayLazy();
 *
 * // Before printing
 * const qzTray = await ensureQzTray();
 * if (!qzTray.isConnected) {
 *   alert("Please install QZ Tray and refresh");
 *   return;
 * }
 */
export function useQzTrayLazy() {
  const qzTray = useQzTrayOptional();
  const [isInitializing, setIsInitializing] = useState(false);

  const ensureQzTray = useCallback(async () => {
    // If QZ Tray provider is not mounted, context will be null/default
    if (!qzTray) {
      throw new Error(
        "QZ Tray is not available. Please add a printer and refresh the page."
      );
    }

    if (qzTray.isConnected) {
      return qzTray;
    }

    // Attempt to connect if not already connected
    if (!isInitializing) {
      setIsInitializing(true);
      try {
        await qzTray.connect();
      } finally {
        setIsInitializing(false);
      }
    }

    return qzTray;
  }, [qzTray, isInitializing]);

  return {
    ...qzTray,
    ensureQzTray,
    isInitializing,
  };
}
