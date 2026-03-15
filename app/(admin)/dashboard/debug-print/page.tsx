import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";
import { DebugPrintClient } from "./debug-print-client";

export default async function DebugPrintPage() {
  await requireRole(UserRole.SUPERADMIN);

  const rawAddress = process.env.GGEZPRINTADDRESS ?? "";
  const serverUrl = rawAddress ? `wss://${rawAddress}` : "";

  // Extract host:port for the cert trust URL (e.g. "192.168.100.11:8443")
  const hostPort = rawAddress.split("/")[0];
  const certUrl = hostPort ? `https://${hostPort}` : "";

  return (
    <DebugPrintClient
      serverUrl={serverUrl}
      certUrl={certUrl}
      rawAddress={rawAddress}
    />
  );
}
