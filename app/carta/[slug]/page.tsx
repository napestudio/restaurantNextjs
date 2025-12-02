import Avatar from "@/components/avatar";
import { getMenuBySlug } from "@/actions/menus";
import { MenuSection } from "@/components/carta/menu-section";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface CartaPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CartaPage({ params }: CartaPageProps) {
  const { slug } = await params;
  const data = await getMenuBySlug(slug);

  if (!data) {
    notFound();
  }

  const { menu, restaurant } = data;

  return (
    <div className="min-h-screen bg-black text-white py-16">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="flex flex-col items-center gap-6 mb-12">
          <Avatar alt={restaurant.name} />
        </div>

        <div className="text-white py-12 px-6 md:px-8 ">
          <div className="text-left space-y-2 mb-2">
            <h1 className="text-4xl font-bold">{menu.name}</h1>
            {menu.description && (
              <p className="text-neutral-400">{menu.description}</p>
            )}
          </div>
          <div>
            {menu.menuSections && menu.menuSections.length > 0 ? (
              menu.menuSections.map((section) => (
                <MenuSection key={section.id} section={section} />
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-neutral-500">
                  Este menu no tiene secciones configuradas
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-neutral-200 font-semibold inline-flex items-center gap-2 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
