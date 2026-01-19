"use client";

import { usePathname } from "next/navigation";
import { GgEzPrintProvider } from "@/contexts/gg-ez-print-context";

interface ConditionalGgEzPrintProviderProps {
  children: React.ReactNode;
  hasPrinters: boolean;
}

/**
 * Conditionally loads GgEzPrintProvider based on current route and branch printer status
 *
 * Loads gg-ez-print when:
 * - User is on printer configuration pages (/config/printers, /printer-test, /ayuda)
 * - User is on order pages AND their branch has printers configured
 *
 * This prevents unnecessary WebSocket connections for users who don't use printing.
 */
export function ConditionalGgEzPrintProvider({
  children,
  hasPrinters,
}: ConditionalGgEzPrintProviderProps) {
  const pathname = usePathname();

  // Always load on printer-related pages (configuration, testing, help)
  const isPrinterConfigPage =
    pathname?.includes("/config/printers") ||
    pathname?.includes("/printer-test") ||
    pathname?.includes("/ayuda");

  // Load on order pages if branch has printers (for printing orders)
  const isOrderPage =
    pathname?.includes("/orders") ||
    pathname?.includes("/tables") ||
    pathname?.includes("/dashboard") && !pathname?.includes("/config");

  const shouldLoadProvider = isPrinterConfigPage || (isOrderPage && hasPrinters);

  if (shouldLoadProvider) {
    return <GgEzPrintProvider>{children}</GgEzPrintProvider>;
  }

  // Don't load provider - no printing needed
  return <>{children}</>;
}
