import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

/**
 * ARCA SDK Configuration
 *
 * This module handles loading ARCA/ARCA credentials from environment variables
 * and the filesystem. Credentials are kept secure on the server and never
 * exposed to the client.
 *
 * Configuration Priority:
 * 1. Database FiscalConfiguration (if exists AND enabled)
 * 2. Environment variables (.env)
 * 3. Error if neither is available
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
 * @param environment - 'test' for ARCA homologation, 'production' for live invoicing
 * @returns Configuration object for Arca SDK initialization
 * @throws Error if required environment variables are missing or files don't exist
 *
 * @example
 * ```typescript
 * const config = getArcaConfig('test');
 * const arca = new Arca(config);
 * ```
 */
export function getArcaConfig(
  environment: ArcaEnvironment = "test",
): ArcaConfig {
  const isProduction = environment === "production";

  // Determine environment variable names based on environment
  const cuitEnv = isProduction ? "ARCA_PROD_CUIT" : "ARCA_CUIT";
  const certPathEnv = isProduction ? "ARCA_PROD_CERT_PATH" : "ARCA_CERT_PATH";
  const keyPathEnv = isProduction ? "ARCA_PROD_KEY_PATH" : "ARCA_KEY_PATH";
  const certContentEnv = isProduction ? "ARCA_PROD_CERT" : "ARCA_CERT";
  const keyContentEnv = isProduction ? "ARCA_PROD_KEY" : "ARCA_KEY";

  // Read environment variables
  const cuit = process.env[cuitEnv];
  const certPath = process.env[certPathEnv];
  const keyPath = process.env[keyPathEnv];
  const certContent = process.env[certContentEnv];
  const keyContent = process.env[keyContentEnv];

  // Validate CUIT is present
  if (!cuit) {
    throw new Error(
      `Missing ARCA configuration for ${environment} environment.\n` +
        `Required environment variable: ${cuitEnv}\n` +
        `Please check your .env file.`,
    );
  }

  let cert: string;
  let key: string;

  // Option 1: Use certificate content directly from env vars (for Vercel/serverless)
  if (certContent && keyContent) {
    console.log(
      `[getArcaConfig] Using certificate content from ${certContentEnv} and ${keyContentEnv}`,
    );
    cert = certContent;
    key = keyContent;
  }
  // Option 2: Read from file paths (for local development)
  else if (certPath && keyPath) {
    console.log(
      `[getArcaConfig] Reading certificates from file paths: ${certPath}, ${keyPath}`,
    );

    // Resolve paths relative to project root
    const resolvedCertPath = path.resolve(process.cwd(), certPath);
    const resolvedKeyPath = path.resolve(process.cwd(), keyPath);

    // Check if files exist
    if (!fs.existsSync(resolvedCertPath)) {
      throw new Error(
        `ARCA certificate file not found: ${resolvedCertPath}\n` +
          `Please ensure the certificate file exists at the path specified in ${certPathEnv}`,
      );
    }

    if (!fs.existsSync(resolvedKeyPath)) {
      throw new Error(
        `ARCA private key file not found: ${resolvedKeyPath}\n` +
          `Please ensure the private key file exists at the path specified in ${keyPathEnv}`,
      );
    }

    try {
      // Read certificate and key files
      cert = fs.readFileSync(resolvedCertPath, "utf-8");
      key = fs.readFileSync(resolvedKeyPath, "utf-8");
    } catch (fileError) {
      throw new Error(
        `Failed to read ARCA credential files:\n` +
          `Certificate: ${resolvedCertPath}\n` +
          `Key: ${resolvedKeyPath}\n` +
          `Error: ${fileError instanceof Error ? fileError.message : String(fileError)}`,
      );
    }
  } else {
    // Neither content nor paths provided
    const missingInfo = [];
    if (!certContent && !certPath) missingInfo.push(`${certContentEnv} or ${certPathEnv}`);
    if (!keyContent && !keyPath) missingInfo.push(`${keyContentEnv} or ${keyPathEnv}`);

    throw new Error(
      `Missing ARCA configuration for ${environment} environment.\n` +
        `Required: ${missingInfo.join(", ")}\n` +
        `Provide either certificate content as env vars or file paths.\n` +
        `Please check your .env file.`,
    );
  }

  try {

    // Validate CUIT is a valid number
    const cuitNumber = Number(cuit);
    if (isNaN(cuitNumber) || cuitNumber <= 0) {
      throw new Error(
        `Invalid CUIT in ${cuitEnv}: ${cuit}\n` +
          `CUIT must be a valid positive number`,
      );
    }

    return {
      cuit: cuitNumber,
      cert,
      key,
      production: isProduction,
    };
  } catch (error) {
    // Re-throw if it's already a formatted error
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      `Failed to process ARCA credentials: ${String(error)}`,
    );
  }
}

/**
 * Get active ARCA configuration for a restaurant
 *
 * Priority hierarchy:
 * 1. Database FiscalConfiguration (if exists AND isEnabled = true)
 * 2. Environment variables (.env) as fallback
 * 3. Error if neither is available
 *
 * @param restaurantId - Restaurant ID to fetch configuration for
 * @returns Configuration object for Arca SDK initialization
 * @throws Error if no valid configuration is found
 *
 * @example
 * ```typescript
 * const config = await getActiveArcaConfig(restaurantId);
 * const arca = new Arca(config);
 * ```
 */
export async function getActiveArcaConfig(
  restaurantId: string,
): Promise<ArcaConfig> {
  try {
    // 1. Try database first (production config)
    const fiscalConfig = await prisma.fiscalConfiguration.findUnique({
      where: { restaurantId },
    });

    // Use DB config if enabled and has valid credentials
    if (
      fiscalConfig?.isEnabled &&
      fiscalConfig.certificatePath &&
      fiscalConfig.privateKeyPath &&
      fiscalConfig.cuit
    ) {
      const isProduction = fiscalConfig.environment === "production";

      // Resolve paths relative to project root
      const resolvedCertPath = path.resolve(
        process.cwd(),
        fiscalConfig.certificatePath,
      );
      const resolvedKeyPath = path.resolve(
        process.cwd(),
        fiscalConfig.privateKeyPath,
      );

      // Check if files exist
      if (!fs.existsSync(resolvedCertPath)) {
        console.warn(
          `[getActiveArcaConfig] Certificate file not found at: ${resolvedCertPath}. Falling back to .env`,
        );
        return getArcaConfig(getCurrentArcaEnvironment());
      }

      if (!fs.existsSync(resolvedKeyPath)) {
        console.warn(
          `[getActiveArcaConfig] Private key file not found at: ${resolvedKeyPath}. Falling back to .env`,
        );
        return getArcaConfig(getCurrentArcaEnvironment());
      }

      try {
        // Read certificate and key files
        const cert = fs.readFileSync(resolvedCertPath, "utf-8");
        const key = fs.readFileSync(resolvedKeyPath, "utf-8");

        // Validate CUIT is a valid number
        const cuitNumber = Number(fiscalConfig.cuit);
        if (isNaN(cuitNumber) || cuitNumber <= 0) {
          console.warn(
            `[getActiveArcaConfig] Invalid CUIT in database: ${fiscalConfig.cuit}. Falling back to .env`,
          );
          return getArcaConfig(getCurrentArcaEnvironment());
        }

        console.log(
          `[getActiveArcaConfig] Using database configuration for restaurant ${restaurantId} (${isProduction ? "PRODUCTION" : "TEST"})`,
        );

        return {
          cuit: cuitNumber,
          cert,
          key,
          production: isProduction,
        };
      } catch (fileError) {
        console.warn(
          `[getActiveArcaConfig] Failed to read DB certificate files. Falling back to .env:`,
          fileError instanceof Error ? fileError.message : String(fileError),
        );
        return getArcaConfig(getCurrentArcaEnvironment());
      }
    }

    // 2. Fallback to environment variables (test/dev)
    console.log(
      `[getActiveArcaConfig] No enabled database config found for restaurant ${restaurantId}. Using .env`,
    );
    return getArcaConfig(getCurrentArcaEnvironment());
  } catch (error) {
    // If database query fails, fall back to env
    console.warn(
      `[getActiveArcaConfig] Database query failed. Falling back to .env:`,
      error instanceof Error ? error.message : String(error),
    );
    return getArcaConfig(getCurrentArcaEnvironment());
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
export function isArcaConfigured(
  environment: ArcaEnvironment = "test",
): boolean {
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
