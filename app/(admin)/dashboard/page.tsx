import { redirect } from "next/navigation";

export default function DashboardPage() {
  redirect("/dashboard/reservations");
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Cargando</h1>
      {/* <p className="text-lg text-gray-600">Lorem ipsum dolor sit.</p> */}
    </div>
  );
}
