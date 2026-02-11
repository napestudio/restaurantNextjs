"use client";

import { useGgEzPrintOptional } from "@/contexts/gg-ez-print-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw, Loader2, X } from "lucide-react";
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

  const {
    isConnected,
    connectionError,
    reconnectAttempts,
    isReconnecting,
    nextRetryIn,
    maxAttempts,
    connect,
    disconnect,
    cancelReconnection,
  } = ggEzPrint;

  // Format countdown timer
  const formattedRetryIn = nextRetryIn
    ? `${Math.ceil(nextRetryIn / 1000)}s`
    : null;

  // Connected state
  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="gap-2 bg-green-100 text-green-800 hover:bg-green-100">
          <Wifi className="h-3 w-3" />
          <span className="text-xs">Conectado</span>
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={disconnect}
          className="h-7 text-xs"
        >
          Desconectar
        </Button>
      </div>
    );
  }

  // Reconnecting state
  if (isReconnecting) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="gap-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">
            Reconectando ({reconnectAttempts}/{maxAttempts})
          </span>
        </Badge>
        {formattedRetryIn && (
          <span className="text-sm text-muted-foreground">
            Próximo intento en {formattedRetryIn}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={cancelReconnection}
          className="h-7 gap-1"
        >
          <X className="h-3 w-3" />
          <span className="text-xs">Cancelar</span>
        </Button>
      </div>
    );
  }

  // Disconnected state
  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="destructive"
        className="gap-2"
      >
        <WifiOff className="h-3 w-3" />
        <span className="text-xs">Desconectado</span>
      </Badge>
      {connectionError && (
        <span className="text-xs text-muted-foreground">
          {connectionError}
        </span>
      )}
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
