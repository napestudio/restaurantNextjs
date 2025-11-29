import Avatar from "@/components/avatar";
import { ReservationWizard } from "@/components/home/reservation-wizard";
import { BRANCH_ID } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ReservationPage() {
  if (!BRANCH_ID) {
    return <p>Error: Branch ID no está configurado.</p>;
  }
  return (
    <>
      <div className="min-h-screen text-center place-content-center py-16 space-y-6 bg-neutral-800">
        <div className="max-w-[500px] mx-auto px-4 md:px-0 flex justify-center flex-col items-center gap-4">
          <Avatar />
          <h1 className="text-4xl text-white leading-none">Reservá tu mesa</h1>
          <div className="bg-white rounded-md w-full py-6 px-2">
            <ReservationWizard branchId={BRANCH_ID} />
          </div>
          <div>
            <Link href="/" className="text-neutral-200 font-semibold">
              <ArrowLeft className="inline-block mr-2 h-4 w-4" />
              Inicio
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
