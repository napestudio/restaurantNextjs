import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint to check environment variables on Vercel
 * ⚠️ DELETE THIS FILE AFTER DEBUGGING!
 */
export async function GET() {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      ARCA_ENVIRONMENT: process.env.ARCA_ENVIRONMENT || "NOT SET",
      ARCA_PROD_CUIT: process.env.ARCA_PROD_CUIT
        ? `SET (${process.env.ARCA_PROD_CUIT})`
        : "NOT SET",
      ARCA_PROD_CERT: process.env.ARCA_PROD_CERT ? "SET ✅" : "NOT SET ❌",
      ARCA_PROD_KEY: process.env.ARCA_PROD_KEY ? "SET ✅" : "NOT SET ❌",
      ARCA_PROD_CERT_PATH: process.env.ARCA_PROD_CERT_PATH || "NOT SET",
      ARCA_PROD_KEY_PATH: process.env.ARCA_PROD_KEY_PATH || "NOT SET",
      ARCA_PROD_PTO_VTA: process.env.ARCA_PROD_PTO_VTA || "NOT SET",
      ARCA_PTO_VTA: process.env.ARCA_PTO_VTA || "NOT SET",
      BUSINESS_NAME: process.env.BUSINESS_NAME || "NOT SET",
    },
    notes: [
      "Check that ARCA_ENVIRONMENT is exactly 'production' (lowercase)",
      "Verify ARCA_PROD_CERT and ARCA_PROD_KEY show 'SET ✅'",
      "After fixing, redeploy on Vercel",
      "⚠️ DELETE THIS FILE AFTER DEBUGGING!",
    ],
  });
}
