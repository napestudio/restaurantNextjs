import Link from "next/link";
import { auth } from "@/lib/auth";
import LogoutButton from "./logout-button";

interface NavbarProps {
  logo: string;
  loginButton: string;
}

export default async function Navbar({ logo, loginButton }: NavbarProps) {
  const session = await auth();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              {logo}
            </Link>
          </div>
          <div>
            {session ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">
                  {session.user?.name || session.user?.email}
                </span>
                <LogoutButton />
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {loginButton}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
