import { getClients } from "@/actions/clients";
import { ClientsManager } from "@/components/dashboard/clients";
import { BRANCH_ID } from "@/lib/constants";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";

export default async function ClientsPage() {
  await requireRole(UserRole.ADMIN);

  const branchId = BRANCH_ID || "";

  const clientsResult = await getClients(branchId);
  const clients =
    clientsResult.success && clientsResult.data ? clientsResult.data : [];

  return <ClientsManager branchId={branchId} initialClients={clients} />;
}
