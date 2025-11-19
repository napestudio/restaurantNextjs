import { ReservationWizard } from "@/components/home/reservation-wizard";
import { BRANCH_ID } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function ReservationPage() {
  if (!BRANCH_ID) {
    return <p>Error: Branch ID no está configurado.</p>;
  }
  return (
    <>
      <div className="min-h-screen text-center place-content-center space-y-6 bg-neutral-800">
        <div className="max-w-[500px] mx-auto px-4 md:px-0 flex justify-center flex-col items-center gap-4">
          <div className="h-32 aspect-square bg-gray-50 rounded-full shadow-neutral-100">
            <Image
              src="https://res.cloudinary.com/dkgnaegp9/image/upload/v1763495054/235630035_1552811355049816_8329159676573787567_n_ynyecz.jpg"
              alt="Logo"
              width={256}
              height={256}
              className="rounded-full object-cover h-32 w-32 mx-auto"
            />
          </div>
          <h1 className="text-4xl text-white leading-none">Reservá tu mesa</h1>
          <div className="bg-white rounded-md w-full py-6 px-2">
            <ReservationWizard branchId={BRANCH_ID} />
          </div>
          <div>
            <Link href="/" className="text-neutral-200 font-semibold">
              <ArrowLeft className="inline-block mr-2 h-4 w-4" />
              Volver
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
