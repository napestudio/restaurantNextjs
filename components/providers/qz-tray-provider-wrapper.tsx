"use client";

import { QzTrayProvider } from "@/contexts/qz-tray-context";
import { ReactNode } from "react";

interface QzTrayProviderWrapperProps {
  children: ReactNode;
}

/**
 * Client component wrapper for QzTrayProvider
 * Used to wrap the dashboard layout since layout is a server component
 */
export function QzTrayProviderWrapper({ children }: QzTrayProviderWrapperProps) {
  return (
    <QzTrayProvider autoConnect={true} reconnectInterval={10000}>
      {children}
    </QzTrayProvider>
  );
}
