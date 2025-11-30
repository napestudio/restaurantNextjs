import { getMenu } from "@/actions/menus";
import { notFound, redirect } from "next/navigation";
import { MenuEditorClient } from "./components/menu-editor-client";

interface MenuEditorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MenuEditorPage({ params }: MenuEditorPageProps) {
  const { id } = await params;

  // Handle "new" route for creating new menus
  if (id === "new") {
    // We'll handle new menu creation in the client component
    return <MenuEditorClient menu={null} />;
  }

  // Fetch existing menu
  const menu = await getMenu(id);

  if (!menu) {
    notFound();
  }

  return <MenuEditorClient menu={menu} />;
}
