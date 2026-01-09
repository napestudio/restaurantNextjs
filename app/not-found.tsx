import { Metadata } from "next";
import CanvasExperience from "@/components/experience/canvas";

export const metadata: Metadata = {
  title: "Kiku Sushi - Página no encontrada",
  description: "404 - Página no encontrada",
  // manifest: "/manifest.json",
};

export default function NotFound() {
  return (
    <div className="bg-neutral-950 h-svh w-svw ">
      <CanvasExperience />
    </div>
  );
}
