import { getUsers } from "@/actions/users";
import { UsersClient } from "./users-client";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/permissions/middleware";
import { UserRole } from "@/app/generated/prisma";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const { userId } = await requireRole(UserRole.ADMIN);

  // Get the user's branch
  const userOnBranch = await prisma.userOnBranch.findFirst({
    where: { userId },
    select: { branchId: true },
  });

  if (!userOnBranch) {
    redirect("/dashboard");
  }

  const usersResult = await getUsers();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-16">
      <UsersClient
        initialUsers={usersResult.data || []}
        currentUserId={userId}
        branchId={userOnBranch.branchId}
      />
    </div>
  );
}
