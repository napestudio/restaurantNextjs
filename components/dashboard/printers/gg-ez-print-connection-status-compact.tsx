"use client";

import { useGgEzPrintOptional } from "@/contexts/gg-ez-print-context";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface GgEzPrintConnectionStatusCompactProps {
  className?: string;
}

/**
 * Compact gg-ez-print connection status indicator for navbar
 * Shows icon-only status with tooltip
 */
export function GgEzPrintConnectionStatusCompact({
  className,
}: GgEzPrintConnectionStatusCompactProps) {
  const ggEzPrint = useGgEzPrintOptional();

  // Not in provider context - don't show anything
  if (!ggEzPrint) {
    return null;
  }

  const {
    isConnected,
    connectionError,
    isReconnecting,
    reconnectAttempts,
    maxAttempts,
    nextRetryIn,
    connect,
    cancelReconnection,
  } = ggEzPrint;

  const handleClick = async () => {
    if (isReconnecting) {
      cancelReconnection();
    } else if (!isConnected) {
      await connect();
    }
  };

  const getStatusColor = () => {
    if (isConnected) {
      return "text-green-500";
    }
    if (isReconnecting) {
      return "text-yellow-500";
    }
    return connectionError ? "text-red-500" : "text-gray-400";
  };

  const getStatusIcon = () => {
    if (isConnected) {
      return <Wifi className="h-4 w-4" />;
    }
    if (isReconnecting) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return <WifiOff className="h-4 w-4" />;
  };

  const getTooltipContent = () => {
    if (isConnected) {
      return (
        <div className="space-y-1">
          <p className="font-medium">gg-ez-print conectado</p>
          <p className="text-xs text-muted-foreground">
            Servicio de impresión activo
          </p>
        </div>
      );
    }

    if (isReconnecting) {
      const formattedRetryIn = nextRetryIn
        ? `${Math.ceil(nextRetryIn / 1000)}s`
        : null;

      return (
        <div className="space-y-1">
          <p className="font-medium">
            Reconectando ({reconnectAttempts}/{maxAttempts})
          </p>
          {formattedRetryIn && (
            <p className="text-xs text-muted-foreground">
              Próximo intento en {formattedRetryIn}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Click para cancelar
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <p className="font-medium">gg-ez-print desconectado</p>
        {connectionError && (
          <p className="text-xs text-muted-foreground">{connectionError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Click para reconectar
        </p>
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
              !isConnected && "hover:text-green-500",
              className
            )}
            onClick={handleClick}
          >
            {getStatusIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
