import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * GET /api/qz/certificate
 *
 * Serves the public certificate for QZ Tray
 * Clients fetch this certificate to enable signed printing
 */
export async function GET() {
  try {
    // Read the public certificate from the certificates directory
    const certificatePath = join(process.cwd(), "certificates", "qz-certificate.pem");
    const certificate = readFileSync(certificatePath, "utf-8");

    // Return as plain text
    return new NextResponse(certificate, {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("[QZ Certificate] Error reading certificate:", error);
    return NextResponse.json(
      { error: "Certificate not found" },
      { status: 500 }
    );
  }
}
