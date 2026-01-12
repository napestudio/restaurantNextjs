"use client";

import { useQzTrayOptional } from "@/contexts/qz-tray-context";
import { cn } from "@/lib/utils";
import { Printer, Loader2, WifiOff, Wifi, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface QzTrayStatusProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * QZ Tray connection status indicator
 * Shows current connection state and allows manual reconnection
 */
export function QzTrayStatus({ className, showLabel = false }: QzTrayStatusProps) {
  const qz = useQzTrayOptional();

  // Not in provider context
  if (!qz) {
    return null;
  }

  const { status, isConnected, isConnecting, connect, printers } = qz;

  const handleClick = async () => {
    if (!isConnected && !isConnecting) {
      await connect();
    }
  };

  const getStatusColor = () => {
    switch (status.state) {
      case "connected":
        return "text-green-500";
      case "connecting":
        return "text-yellow-500";
      case "error":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = () => {
    switch (status.state) {
      case "connected":
        return <Wifi className="h-4 w-4" />;
      case "connecting":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <WifiOff className="h-4 w-4" />;
    }
  };

  const getStatusLabel = () => {
    switch (status.state) {
      case "connected":
        return `Conectado (${printers.length} impresoras)`;
      case "connecting":
        return "Conectando...";
      case "error":
        return status.error || "Error de conexión";
      default:
        return "Desconectado";
    }
  };

  const getTooltipContent = () => {
    if (status.state === "connected") {
      return (
        <div className="space-y-1">
          <p className="font-medium">QZ Tray conectado</p>
          <p className="text-xs text-muted-foreground">
            Versión: {status.version || "N/A"}
          </p>
          <p className="text-xs text-muted-foreground">
            Impresoras: {printers.length}
          </p>
          {printers.length > 0 && (
            <ul className="text-xs mt-1 space-y-0.5">
              {printers.slice(0, 5).map((p) => (
                <li key={p.name} className="flex items-center gap-1">
                  <Printer className="h-3 w-3" />
                  {p.name}
                  {p.isDefault && (
                    <span className="text-green-400">(default)</span>
                  )}
                </li>
              ))}
              {printers.length > 5 && (
                <li className="text-muted-foreground">
                  +{printers.length - 5} más
                </li>
              )}
            </ul>
          )}
        </div>
      );
    }

    if (status.state === "error") {
      return (
        <div className="space-y-1">
          <p className="font-medium text-red-400">Error de conexión</p>
          <p className="text-xs">{status.error}</p>
          <p className="text-xs text-muted-foreground">Click para reintentar</p>
        </div>
      );
    }

    if (status.state === "connecting") {
      return <p>Conectando a QZ Tray...</p>;
    }

    return (
      <div className="space-y-1">
        <p className="font-medium">QZ Tray desconectado</p>
        <p className="text-xs text-muted-foreground">Click para conectar</p>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 px-2",
              getStatusColor(),
              !isConnected && !isConnecting && "hover:text-green-500",
              className
            )}
            onClick={handleClick}
            disabled={isConnecting}
          >
            {getStatusIcon()}
            {showLabel && (
              <span className="text-xs">{getStatusLabel()}</span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact version for use in headers/toolbars
 */
export function QzTrayStatusCompact({ className }: { className?: string }) {
  return <QzTrayStatus className={className} showLabel={false} />;
}

/**
 * Full version with label for settings pages
 */
export function QzTrayStatusFull({ className }: { className?: string }) {
  return <QzTrayStatus className={className} showLabel={true} />;
}
