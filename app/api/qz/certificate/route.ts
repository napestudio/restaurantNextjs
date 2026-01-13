import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * GET /api/qz/certificate
 *
 * Serves the public certificate for QZ Tray
 * Clients fetch this certificate to enable signed printing
 *
 * In production (Vercel), reads from QZ_CERTIFICATE environment variable
 * In development, falls back to reading from certificates/qz-certificate.pem
 */
export async function GET() {
  try {
    let certificate: string;

    // Try environment variable first (for Vercel deployment)
    if (process.env.QZ_CERTIFICATE) {
      certificate = process.env.QZ_CERTIFICATE;
    } else {
      // Fallback to filesystem (for local development)
      const certificatePath = join(process.cwd(), "certificates", "qz-certificate.pem");
      certificate = readFileSync(certificatePath, "utf-8");
    }

    // Return as downloadable file
    return new NextResponse(certificate, {
      headers: {
        "Content-Type": "application/x-pem-file",
        "Content-Disposition": 'attachment; filename="qz-certificate.pem"',
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("[QZ Certificate] Error reading certificate:", error);
    return NextResponse.json(
      { error: "Certificate not found. Please configure QZ_CERTIFICATE environment variable." },
      { status: 500 }
    );
  }
}
