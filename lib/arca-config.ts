import fs from "fs";
import path from "path";

/**
 * ARCA SDK Configuration
 *
 * This module handles loading AFIP/ARCA credentials from environment variables
 * and the filesystem. Credentials are kept secure on the server and never
 * exposed to the client.
 */

export type ArcaEnvironment = "test" | "production";

export interface ArcaConfig {
  cuit: number;
  cert: string;
  key: string;
  production?: boolean;
}

/**
 * Get ARCA configuration for the specified environment
 *
 * @param environment - 'test' for AFIP homologation, 'production' for live invoicing
 * @returns Configuration object for Arca SDK initialization
 * @throws Error if required environment variables are missing or files don't exist
 *
 * @example
 * ```typescript
 * const config = getArcaConfig('test');
 * const arca = new Arca(config);
 * ```
 */
export function getArcaConfig(environment: ArcaEnvironment = "test"): ArcaConfig {
  const isProduction = environment === "production";

  // Determine environment variable names based on environment
  const cuitEnv = isProduction ? "ARCA_PROD_CUIT" : "ARCA_CUIT";
  const certPathEnv = isProduction ? "ARCA_PROD_CERT_PATH" : "ARCA_CERT_PATH";
  const keyPathEnv = isProduction ? "ARCA_PROD_KEY_PATH" : "ARCA_KEY_PATH";

  // Read environment variables
  const cuit = process.env[cuitEnv];
  const certPath = process.env[certPathEnv];
  const keyPath = process.env[keyPathEnv];

  // Validate that all required variables are present
  if (!cuit || !certPath || !keyPath) {
    const missingVars = [];
    if (!cuit) missingVars.push(cuitEnv);
    if (!certPath) missingVars.push(certPathEnv);
    if (!keyPath) missingVars.push(keyPathEnv);

    throw new Error(
      `Missing ARCA configuration for ${environment} environment.\n` +
      `Required environment variables: ${missingVars.join(", ")}\n` +
      `Please check your .env file.`
    );
  }

  // Resolve paths relative to project root
  const resolvedCertPath = path.resolve(process.cwd(), certPath);
  const resolvedKeyPath = path.resolve(process.cwd(), keyPath);

  // Check if files exist
  if (!fs.existsSync(resolvedCertPath)) {
    throw new Error(
      `ARCA certificate file not found: ${resolvedCertPath}\n` +
      `Please ensure the certificate file exists at the path specified in ${certPathEnv}`
    );
  }

  if (!fs.existsSync(resolvedKeyPath)) {
    throw new Error(
      `ARCA private key file not found: ${resolvedKeyPath}\n` +
      `Please ensure the private key file exists at the path specified in ${keyPathEnv}`
    );
  }

  try {
    // Read certificate and key files
    const cert = fs.readFileSync(resolvedCertPath, "utf-8");
    const key = fs.readFileSync(resolvedKeyPath, "utf-8");

    // Validate CUIT is a valid number
    const cuitNumber = Number(cuit);
    if (isNaN(cuitNumber) || cuitNumber <= 0) {
      throw new Error(
        `Invalid CUIT in ${cuitEnv}: ${cuit}\n` +
        `CUIT must be a valid positive number`
      );
    }

    return {
      cuit: cuitNumber,
      cert,
      key,
      production: isProduction,
    };
  } catch (error) {
    // Re-throw validation errors
    if (error instanceof Error && error.message.includes("CUIT")) {
      throw error;
    }

    // Handle file reading errors
    throw new Error(
      `Failed to read ARCA credential files:\n` +
      `Certificate: ${resolvedCertPath}\n` +
      `Key: ${resolvedKeyPath}\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate that ARCA configuration is available for the specified environment
 *
 * @param environment - 'test' or 'production'
 * @returns true if configuration is valid, false otherwise
 *
 * @example
 * ```typescript
 * if (isArcaConfigured('test')) {
 *   // Safe to use ARCA SDK
 * }
 * ```
 */
export function isArcaConfigured(environment: ArcaEnvironment = "test"): boolean {
  try {
    getArcaConfig(environment);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current ARCA environment from environment variables
 *
 * @returns 'test' or 'production' based on ARCA_ENVIRONMENT env var
 * @default 'test'
 */
export function getCurrentArcaEnvironment(): ArcaEnvironment {
  const env = process.env.ARCA_ENVIRONMENT?.toLowerCase();
  return env === "production" ? "production" : "test";
}
