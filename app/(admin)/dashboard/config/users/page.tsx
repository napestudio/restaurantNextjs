import { getUsers } from "@/actions/users";
import { UsersClient } from "./users-client";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";

export default async function UsersPage() {
  const { userId, userRole, branchId } = await requireRole(UserRole.ADMIN);

  const usersResult = await getUsers();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-16">
      <UsersClient
        initialUsers={usersResult.data || []}
        currentUserId={userId}
        branchId={branchId}
        isSuperAdmin={userRole === UserRole.SUPERADMIN}
        isAdminOrHigher={userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN}
      />
    </div>
  );
}
