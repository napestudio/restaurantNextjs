"use client";

import { useGgEzPrintOptional } from "@/contexts/gg-ez-print-context";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff } from "lucide-react";
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

  const { isConnected, connectionError, connect } = ggEzPrint;

  const handleClick = async () => {
    if (!isConnected) {
      await connect();
    }
  };

  const getStatusColor = () => {
    if (isConnected) {
      return "text-green-500";
    }
    return connectionError ? "text-red-500" : "text-gray-400";
  };

  const getStatusIcon = () => {
    if (isConnected) {
      return <Wifi className="h-4 w-4" />;
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
