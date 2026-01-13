import { NextRequest, NextResponse } from "next/server";
import { createSign } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * POST /api/qz/sign
 *
 * Signs a request for QZ Tray using the private key
 * This is called automatically by QZ Tray for each print operation
 *
 * In production (Vercel), reads from QZ_PRIVATE_KEY environment variable
 * In development, falls back to reading from certificates/qz-private-key.pem
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toSign } = body;

    if (!toSign) {
      return NextResponse.json(
        { error: "Missing toSign parameter" },
        { status: 400 }
      );
    }

    let privateKey: string;

    // Try environment variable first (for Vercel deployment)
    if (process.env.QZ_PRIVATE_KEY) {
      privateKey = process.env.QZ_PRIVATE_KEY;
    } else {
      // Fallback to filesystem (for local development)
      const privateKeyPath = join(process.cwd(), "certificates", "qz-private-key.pem");
      privateKey = readFileSync(privateKeyPath, "utf-8");
    }

    // Sign the data using SHA512
    const sign = createSign("SHA512");
    sign.update(toSign);
    sign.end();

    const signature = sign.sign(privateKey, "base64");

    return NextResponse.json({
      signature,
    });
  } catch (error) {
    console.error("[QZ Sign] Error signing request:", error);
    return NextResponse.json(
      { error: "Failed to sign request. Please configure QZ_PRIVATE_KEY environment variable." },
      { status: 500 }
    );
  }
}
