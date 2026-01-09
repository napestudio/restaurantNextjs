import { Metadata } from "next";
import CanvasExperience from "@/components/experience/canvas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kiku Sushi - Página no encontrada",
  description: "404 - Página no encontrada",
  // manifest: "/manifest.json",
};

export default function NotFound() {
  return (
    <div className="bg-neutral-950 h-svh w-svw relative">
      <CanvasExperience />
      <div className="absolute bottom-6 w-full text-center">
        <Link href="/" className="text-white underline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
