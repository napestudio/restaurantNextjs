/**
 * Print Relay Client
 *
 * This module handles communication with the Print Relay service.
 * The relay service bridges the cloud-hosted POS to local printers.
 *
 * Note: This is a server-only module (uses Node.js APIs like Buffer).
 * It's imported by server actions, not used directly as a server action.
 */

export interface RelayConfig {
  url: string;
  apiKey: string;
}

export interface PrintJobRequest {
  printerId: string;
  connectionType: "network" | "usb" | "serial";
  address?: string; // IP address for network printers
  port?: number; // Port for network printers (default: 9100)
  usbPath?: string; // COM port for USB/serial printers
  baudRate?: number; // Baud rate for serial printers (default: 9600)
  data: string; // Base64 encoded ESC/POS data
  copies?: number;
}

export interface PrintJobResponse {
  success: boolean;
  message: string;
  jobId?: string;
  error?: string;
  details?: string;
}

export interface TestPrinterRequest {
  connectionType: "network" | "usb" | "serial";
  address?: string;
  port?: number;
  usbPath?: string;
  baudRate?: number;
}

export interface TestPrinterResponse {
  success: boolean;
  message: string;
  error?: string;
  details?: string;
}

export interface DiscoveredPrinter {
  name: string;
  path: string;
  type: string;
  manufacturer?: string;
}

export interface DiscoverPrintersResponse {
  success: boolean;
  printers: DiscoveredPrinter[];
  error?: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  uptime: string;
}

/**
 * Get relay configuration from environment variables
 */
function getRelayConfig(): RelayConfig {
  const url = process.env.PRINT_RELAY_URL;
  const apiKey = process.env.PRINT_RELAY_API_KEY;

  if (!url) {
    throw new Error("PRINT_RELAY_URL environment variable is not set");
  }

  if (!apiKey) {
    throw new Error("PRINT_RELAY_API_KEY environment variable is not set");
  }

  return { url, apiKey };
}

/**
 * Check if the relay service is available
 */
export async function checkRelayHealth(): Promise<{
  available: boolean;
  health?: HealthResponse;
  error?: string;
}> {
  try {
    const config = getRelayConfig();
    const response = await fetch(`${config.url}/api/health`, {
      method: "GET",
      headers: {
        "X-API-Key": config.apiKey,
      },
    });

    if (!response.ok) {
      return {
        available: false,
        error: `Relay returned status ${response.status}`,
      };
    }

    const health = (await response.json()) as HealthResponse;
    return { available: true, health };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Discover USB/Serial printers connected to the relay machine
 */
export async function discoverPrinters(): Promise<DiscoverPrintersResponse> {
  try {
    const config = getRelayConfig();
    const response = await fetch(`${config.url}/api/printers/discover`, {
      method: "GET",
      headers: {
        "X-API-Key": config.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        printers: [],
        error: `Relay error: ${response.status} - ${errorText}`,
      };
    }

    return (await response.json()) as DiscoverPrintersResponse;
  } catch (error) {
    return {
      success: false,
      printers: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a test print to verify printer connectivity
 */
export async function testPrinterConnection(
  request: TestPrinterRequest
): Promise<TestPrinterResponse> {
  try {
    const config = getRelayConfig();
    const response = await fetch(`${config.url}/api/printers/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey,
      },
      body: JSON.stringify(request),
    });

    const result = (await response.json()) as TestPrinterResponse;
    return result;
  } catch (error) {
    return {
      success: false,
      message: "Failed to connect to relay service",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a print job to the relay service
 */
export async function sendPrintJob(
  request: PrintJobRequest
): Promise<PrintJobResponse> {
  try {
    const config = getRelayConfig();
    const response = await fetch(`${config.url}/api/print`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey,
      },
      body: JSON.stringify(request),
    });

    const result = (await response.json()) as PrintJobResponse;
    return result;
  } catch (error) {
    return {
      success: false,
      message: "Failed to connect to relay service",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Encode ESC/POS data to base64 for transmission
 */
export function encodeEscPosData(data: string): string {
  // Convert string to buffer using latin1 encoding to preserve byte values
  const buffer = Buffer.from(data, "latin1");
  return buffer.toString("base64");
}

/**
 * Helper to create a print job request for a network printer
 */
export function createNetworkPrintRequest(
  printerId: string,
  ipAddress: string,
  port: number,
  escPosData: string,
  copies: number = 1
): PrintJobRequest {
  return {
    printerId,
    connectionType: "network",
    address: ipAddress,
    port,
    data: encodeEscPosData(escPosData),
    copies,
  };
}

/**
 * Helper to create a print job request for a USB/Serial printer
 */
export function createUsbPrintRequest(
  printerId: string,
  usbPath: string,
  baudRate: number,
  escPosData: string,
  copies: number = 1
): PrintJobRequest {
  return {
    printerId,
    connectionType: "usb",
    usbPath,
    baudRate,
    data: encodeEscPosData(escPosData),
    copies,
  };
}
