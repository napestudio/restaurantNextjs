import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isUserAdmin } from "@/lib/permissions";
import { getUsers } from "@/actions/users";
import { UsersClient } from "./users-client";
import prisma from "@/lib/prisma";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  const hasAdminRole = await isUserAdmin(session.user.id);

  if (!hasAdminRole) {
    redirect("/dashboard");
  }

  // Get the user's branch
  const userOnBranch = await prisma.userOnBranch.findFirst({
    where: { userId: session.user.id },
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
        currentUserId={session.user.id}
        branchId={userOnBranch.branchId}
      />
    </div>
  );
}
