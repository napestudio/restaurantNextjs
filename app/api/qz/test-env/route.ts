import { NextResponse } from "next/server";

/**
 * GET /api/qz/test-env
 *
 * Test endpoint to verify environment variables are configured
 */
export async function GET() {
  const hasCertificate = !!process.env.QZ_CERTIFICATE;
  const hasPrivateKey = !!process.env.QZ_PRIVATE_KEY;

  const certificateLength = process.env.QZ_CERTIFICATE?.length || 0;
  const privateKeyLength = process.env.QZ_PRIVATE_KEY?.length || 0;

  const certificatePreview = process.env.QZ_CERTIFICATE
    ? process.env.QZ_CERTIFICATE.substring(0, 50) + "..."
    : "NOT SET";

  return NextResponse.json({
    hasCertificate,
    hasPrivateKey,
    certificateLength,
    privateKeyLength,
    certificatePreview,
    env: process.env.NODE_ENV,
  });
}
