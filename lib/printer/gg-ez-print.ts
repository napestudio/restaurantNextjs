/**
 * gg-ez-print Client Library
 *
 * Client library for communicating with the gg-ez-print WebSocket bridge.
 * gg-ez-print is a local service that enables browser-based printing to thermal printers.
 *
 * @see https://github.com/RenzoCostarelli/gg-ez-print
 */

const WS_URL = "ws://localhost:8080/ws";
const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

// ============================================================================
// TYPES
// ============================================================================

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
}

// ============================================================================
// GG-EZ-PRINT CLIENT CLASS
// ============================================================================

export class GgEzPrintClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: ((response: GgEzPrintResponse) => void)[] = [];
  private connectionHandlers: ((connection: GgEzPrintConnection) => void)[] = [];

  constructor() {
    // Connect once on instantiation (no auto-reconnect)
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
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.notifyConnectionChange({
          isConnected: true,
          error: null,
          reconnectAttempts: 0,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const response: GgEzPrintResponse = JSON.parse(event.data);
          this.messageHandlers.forEach(handler => handler(response));
        } catch (error) {
          console.error("Failed to parse gg-ez-print response:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.warn("gg-ez-print WebSocket error:", error);
        this.notifyConnectionChange({
          isConnected: false,
          error: "Error de conexión con gg-ez-print",
          reconnectAttempts: this.reconnectAttempts,
        });
      };

      this.ws.onclose = () => {
        this.notifyConnectionChange({
          isConnected: false,
          error: null,
          reconnectAttempts: this.reconnectAttempts,
        });
        // No auto-reconnect - user must manually reconnect
      };
    } catch (error) {
      console.warn("Failed to create gg-ez-print WebSocket:", error);
      this.notifyConnectionChange({
        isConnected: false,
        error: "No se pudo conectar a gg-ez-print. ¿Está el servicio ejecutándose?",
        reconnectAttempts: this.reconnectAttempts,
      });
      // No auto-reconnect - user must manually reconnect
    }
  }

  /**
   * Disconnect from gg-ez-print server
   */
  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn("Max reconnect attempts reached for gg-ez-print");
      return;
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY * this.reconnectAttempts;

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Attempting to reconnect to gg-ez-print (attempt ${this.reconnectAttempts})...`);
      this.connect();
    }, delay);
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
      }, 30000); // 30 second timeout for printing

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
  public onConnectionChange(handler: (connection: GgEzPrintConnection) => void): () => void {
    this.connectionHandlers.push(handler);

    // Immediately notify with current status
    handler({
      isConnected: this.ws?.readyState === WebSocket.OPEN,
      error: null,
      reconnectAttempts: this.reconnectAttempts,
    });

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
    this.connectionHandlers.forEach(handler => handler(connection));
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): GgEzPrintConnection {
    return {
      isConnected: this.ws?.readyState === WebSocket.OPEN,
      error: null,
      reconnectAttempts: this.reconnectAttempts,
    };
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
