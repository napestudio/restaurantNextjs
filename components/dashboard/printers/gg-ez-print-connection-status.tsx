"use client";

import { useGgEzPrintOptional } from "@/contexts/gg-ez-print-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function GgEzPrintConnectionStatus() {
  const ggEzPrint = useGgEzPrintOptional();

  if (!ggEzPrint) {
    return (
      <Badge variant="outline" className="gap-2">
        <WifiOff className="h-3 w-3" />
        <span className="text-xs">gg-ez-print no disponible</span>
      </Badge>
    );
  }

  const { isConnected, connectionError, connect } = ggEzPrint;

  if (isConnected) {
    return (
      <Badge className="gap-2 bg-green-100 text-green-800 hover:bg-green-100">
        <Wifi className="h-3 w-3" />
        <span className="text-xs">gg-ez-print conectado</span>
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={cn(
          "gap-2",
          connectionError && "bg-yellow-50 text-yellow-800 border-yellow-200"
        )}
      >
        <WifiOff className="h-3 w-3" />
        <span className="text-xs">
          {connectionError || "gg-ez-print desconectado"}
        </span>
      </Badge>
      <Button
        variant="outline"
        size="sm"
        onClick={connect}
        className="h-7 gap-1"
      >
        <RefreshCw className="h-3 w-3" />
        <span className="text-xs">Reconectar</span>
      </Button>
    </div>
  );
}
