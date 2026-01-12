import { NextRequest, NextResponse } from "next/server";
import { createSign } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * POST /api/qz/sign
 *
 * Signs a request for QZ Tray using the private key
 * This is called automatically by QZ Tray for each print operation
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

    // Read the private key
    const privateKeyPath = join(process.cwd(), "certificates", "qz-private-key.pem");
    const privateKey = readFileSync(privateKeyPath, "utf-8");

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
      { error: "Failed to sign request" },
      { status: 500 }
    );
  }
}
