/**
 * gg-ez-print Client Library
 *
 * Client library for communicating with the gg-ez-print WebSocket bridge.
 * gg-ez-print is a local service that enables browser-based printing to thermal printers.
 *
 * @see https://github.com/RenzoCostarelli/gg-ez-print
 */

const WS_URL = "ws://localhost:8080/ws";

// ============================================================================
// TYPES
// ============================================================================

export interface ReconnectionConfig {
  enabled: boolean; // Enable/disable auto-reconnect
  initialDelay: number; // Initial delay in ms
  maxDelay: number; // Maximum delay in ms
  maxAttempts: number; // Max reconnection attempts
  backoffMultiplier: number; // Exponential backoff multiplier
}

export interface DiscoveredPrinter {
  name: string;
  type: string;
}

export interface PrintRequest {
  printer_name: string; // Windows printer name (USB) or IP address (Network)
  type: "USB" | "Network";
  content: string; // Text content to print
  font_size: number; // 1, 2, or 3
  paper_width: number; // Character width (e.g., 80)
}

export interface PrintResponse {
  status: "success" | "error";
  message?: string;
}

export interface PrinterListResponse {
  type: "printer_list";
  printers: DiscoveredPrinter[];
}

export type GgEzPrintResponse = PrintResponse | PrinterListResponse;

export interface GgEzPrintConnection {
  isConnected: boolean;
  error: string | null;
  reconnectAttempts: number;
  isReconnecting: boolean; // Active reconnection in progress
  nextRetryIn?: number; // Milliseconds until next retry attempt
  maxAttempts?: number; // Maximum attempts configured
}

// ============================================================================
// GG-EZ-PRINT CLIENT CLASS
// ============================================================================

export class GgEzPrintClient {
  private ws: WebSocket | null = null;
  private connection: GgEzPrintConnection = {
    isConnected: false,
    error: null,
    reconnectAttempts: 0,
    isReconnecting: false,
  };
  private reconnectionConfig: ReconnectionConfig;
  private isReconnecting: boolean = false;
  private userDisconnected: boolean = false;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private messageHandlers: ((response: GgEzPrintResponse) => void)[] = [];
  private connectionHandlers: ((connection: GgEzPrintConnection) => void)[] =
    [];
  private keepaliveIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly KEEPALIVE_INTERVAL_MS = 25000;
  private hadSuccessfulConnection = false;

  constructor(
    url: string = WS_URL,
    reconnectionConfig?: Partial<ReconnectionConfig>,
  ) {
    this.reconnectionConfig = {
      enabled: true,
      initialDelay: 2000,
      maxDelay: 30000,
      maxAttempts: 20,
      backoffMultiplier: 1.5,
      ...reconnectionConfig,
    };

    // Connect once on instantiation
    this.connect();
  }

  /**
   * Check if WebSocket is currently connected (synchronous check)
   */
  public get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Connect to gg-ez-print WebSocket server
   */
  public connect(): void {
    this.userDisconnected = false; // Reset flag when manually connecting

    if (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    ) {
      return; // Already connected or connection in flight
    }

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.hadSuccessfulConnection = true;
        this.connection = {
          isConnected: true,
          error: null,
          reconnectAttempts: 0,
          isReconnecting: false,
        };
        this.notifyConnectionChange(this.connection);
        this.startKeepalive();
      };

      this.ws.onmessage = (event) => {
        try {
          const response: GgEzPrintResponse = JSON.parse(event.data);
          // Snapshot before iterating — handlers call splice() during cleanup,
          // which would shift indices and cause subsequent handlers to be skipped.
          [...this.messageHandlers].forEach((handler) => handler(response));
        } catch (error) {
          console.error("Failed to parse gg-ez-print response:", error);
        }
      };

      this.ws.onerror = (error) => {
        // console.warn("gg-ez-print WebSocket error:", error);
        this.connection = {
          isConnected: false,
          error: "Error de conexión con gg-ez-print",
          reconnectAttempts: this.connection.reconnectAttempts,
          isReconnecting: this.connection.isReconnecting,
        };
        this.notifyConnectionChange(this.connection);
      };

      this.ws.onclose = () => {
        this.stopKeepalive();
        const wasConnected = this.connection.isConnected;

        this.connection = {
          isConnected: false,
          error: "Desconectado del servidor",
          reconnectAttempts: this.connection.reconnectAttempts,
          isReconnecting: false,
        };

        this.notifyConnectionChange(this.connection);

        // Only auto-reconnect if:
        // 1. Auto-reconnect is enabled
        // 2. This wasn't a user-initiated disconnect
        // 3. We were previously connected (not initial connection failure)
        // 4. We haven't exceeded max attempts
        if (
          this.reconnectionConfig.enabled &&
          !this.userDisconnected &&
          this.hadSuccessfulConnection &&
          this.connection.reconnectAttempts <
            this.reconnectionConfig.maxAttempts
        ) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      // console.warn("Failed to create gg-ez-print WebSocket:", error);
      this.connection = {
        isConnected: false,
        error:
          "No se pudo conectar a gg-ez-print. ¿Está el servicio ejecutándose?",
        reconnectAttempts: this.connection.reconnectAttempts,
        isReconnecting: false,
      };
      this.notifyConnectionChange(this.connection);
    }
  }

  /**
   * Disconnect from gg-ez-print server
   */
  public disconnect(): void {
    this.userDisconnected = true; // Prevent auto-reconnect
    this.stopKeepalive();
    this.cancelReconnection();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connection = {
      isConnected: false,
      error: null,
      reconnectAttempts: 0,
      isReconnecting: false,
    };

    this.notifyConnectionChange(this.connection);
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isReconnecting) return; // Prevent multiple reconnection loops

    this.isReconnecting = true;

    // Calculate delay using exponential backoff
    const delay = Math.min(
      this.reconnectionConfig.initialDelay *
        Math.pow(
          this.reconnectionConfig.backoffMultiplier,
          this.connection.reconnectAttempts,
        ),
      this.reconnectionConfig.maxDelay,
    );

    // Update UI with reconnecting status
    this.connection.isReconnecting = true;
    this.connection.nextRetryIn = delay;
    this.connection.maxAttempts = this.reconnectionConfig.maxAttempts;
    this.notifyConnectionChange(this.connection);

    // Schedule reconnection attempt
    this.reconnectTimeoutId = setTimeout(() => {
      this.attemptReconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    console.log(
      `[GgEzPrint] Intento de reconexión ${this.connection.reconnectAttempts + 1}/${this.reconnectionConfig.maxAttempts}`,
    );

    this.connection.reconnectAttempts++;
    this.isReconnecting = false;

    // Try to connect (this will trigger onopen/onclose/onerror)
    this.connect();
  }

  /**
   * Cancel ongoing reconnection attempts
   */
  public cancelReconnection(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.isReconnecting = false;
    this.connection.isReconnecting = false;
    this.connection.nextRetryIn = undefined;
    this.notifyConnectionChange(this.connection);

    console.log("[GgEzPrint] Reconexión cancelada por el usuario");
  }

  /**
   * Send a message to gg-ez-print server
   */
  private send(message: object): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("Cannot send message: gg-ez-print not connected");
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Failed to send message to gg-ez-print:", error);
      return false;
    }
  }

  /**
   * Start periodic keepalive. Every KEEPALIVE_INTERVAL_MS, sends a verified
   * ping (list request + response check). If no response arrives within 3s,
   * the connection is silently dead and forceReconnect() is triggered.
   */
  private startKeepalive(): void {
    this.stopKeepalive();
    this.keepaliveIntervalId = setInterval(() => {
      this.checkConnectionAlive();
    }, this.KEEPALIVE_INTERVAL_MS);
  }

  /**
   * Stop the keepalive interval
   */
  private stopKeepalive(): void {
    if (this.keepaliveIntervalId) {
      clearInterval(this.keepaliveIntervalId);
      this.keepaliveIntervalId = null;
    }
  }

  /**
   * Send a ping (list request) and verify the server responds within 3s.
   * If no response, the TCP connection is silently dead — force a reconnect.
   */
  private checkConnectionAlive(): void {
    if (this.userDisconnected || this.ws?.readyState !== WebSocket.OPEN) return;

    let cleaned = false;
    const pingTimeout = setTimeout(() => {
      if (cleaned) return;
      cleanup();
      if (!this.userDisconnected) {
        console.warn(
          "[GgEzPrint] Keepalive timeout — conexión muerta, reconectando...",
        );
        this.forceReconnect();
      }
    }, 3000);

    const handler = (response: GgEzPrintResponse) => {
      if ("type" in response && response.type === "printer_list") {
        cleanup(); // Server responded — connection is alive
      }
    };

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(pingTimeout);
      const i = this.messageHandlers.indexOf(handler);
      if (i > -1) this.messageHandlers.splice(i, 1);
    };

    if (!this.send({ action: "list" })) {
      clearTimeout(pingTimeout);
      return;
    }
    this.messageHandlers.push(handler);
  }

  /**
   * Immediately close a dead/stale WebSocket and reconnect.
   * Bypasses exponential backoff — used when we've confirmed the connection
   * is dead (keepalive timeout) and want to recover ASAP.
   */
  public forceReconnect(): void {
    this.stopKeepalive();
    const dead = this.ws;
    this.ws = null;
    if (dead) {
      dead.onopen = null;
      dead.onclose = null;
      dead.onerror = null;
      dead.onmessage = null;
      try {
        dead.close();
      } catch {
        /* ignore errors on dead socket */
      }
    }
    this.isReconnecting = false;
    this.connection = {
      isConnected: false,
      error: "Reconectando...",
      reconnectAttempts: this.connection.reconnectAttempts,
      isReconnecting: false,
    };
    this.notifyConnectionChange(this.connection);
    this.connect();
  }

  /**
   * Wait until the WebSocket is connected, up to timeoutMs.
   * Triggers a reconnect attempt if not already in progress.
   * Resolves true when connected, false on timeout.
   */
  public waitForConnection(timeoutMs: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isConnected) {
        resolve(true);
        return;
      }

      const timer = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeoutMs);

      const unsubscribe = this.onConnectionChange((connection) => {
        if (connection.isConnected) {
          clearTimeout(timer);
          unsubscribe();
          resolve(true);
        }
      });

      // Trigger reconnect if not already in progress
      if (!this.isReconnecting) {
        this.connect();
      }
    });
  }

  /**
   * List available printers
   */
  public listPrinters(): Promise<DiscoveredPrinter[]> {
    return new Promise((resolve, reject) => {
      if (!this.send({ action: "list" })) {
        reject(new Error("No conectado a gg-ez-print"));
        return;
      }

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Timeout esperando lista de impresoras"));
      }, 10000); // 10 second timeout

      const handler = (response: GgEzPrintResponse) => {
        if ("type" in response && response.type === "printer_list") {
          cleanup();
          resolve(response.printers);
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        const index = this.messageHandlers.indexOf(handler);
        if (index > -1) {
          this.messageHandlers.splice(index, 1);
        }
      };

      this.messageHandlers.push(handler);
    });
  }

  /**
   * Print to a printer
   */
  public print(request: PrintRequest): Promise<PrintResponse> {
    return new Promise((resolve, reject) => {
      if (!this.send({ action: "print", data: request })) {
        reject(new Error("No conectado a gg-ez-print"));
        return;
      }

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Timeout esperando respuesta de impresión"));
      }, 8000); // 8s — gg-ez-print responds once job is queued, not after paper finishes

      const handler = (response: GgEzPrintResponse) => {
        if ("status" in response) {
          cleanup();
          if (response.status === "success") {
            resolve(response);
          } else {
            reject(new Error(response.message || "Error al imprimir"));
          }
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        const index = this.messageHandlers.indexOf(handler);
        if (index > -1) {
          this.messageHandlers.splice(index, 1);
        }
      };

      this.messageHandlers.push(handler);
    });
  }

  /**
   * Subscribe to connection status changes
   */
  public onConnectionChange(
    handler: (connection: GgEzPrintConnection) => void,
  ): () => void {
    this.connectionHandlers.push(handler);

    // Immediately notify with current status
    handler(this.connection);

    // Return unsubscribe function
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all connection handlers of status change
   */
  private notifyConnectionChange(connection: GgEzPrintConnection): void {
    this.connectionHandlers.forEach((handler) => handler(connection));
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): GgEzPrintConnection {
    return this.connection;
  }
}

// ============================================================================
// SINGLETON INSTANCE (Optional - for simple usage)
// ============================================================================

let globalClient: GgEzPrintClient | null = null;

export function getGgEzPrintClient(): GgEzPrintClient {
  if (!globalClient) {
    globalClient = new GgEzPrintClient();
  }
  return globalClient;
}
