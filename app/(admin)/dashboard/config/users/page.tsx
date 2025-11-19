import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isUserAdmin } from "@/lib/permissions";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  const hasAdminRole = await isUserAdmin(session.user.id);

  if (!hasAdminRole) {
    redirect("/dashboard");
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Usuarios</h1>
          <p className="mt-2 text-sm text-gray-700">
            Administración de acceso a la aplicación.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            href="/dashboard/users/register"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Agregar Usuario
          </Link>
        </div>
      </div>
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <div className="bg-white px-4 py-5 sm:p-6">
                <p className="text-sm text-gray-500">Listado de usuarios</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
