import Link from "next/link";
import { ReservationForm } from "@/components/home/reservation-form";

interface HeroProps {
  title: string;
  subtitle: string;
  ctaButton: string;
  secondaryButton: string;
  branchId: string;
  reservationTitle: string;
}

export default function Hero({
  title,
  subtitle,
  ctaButton,
  secondaryButton,
  branchId,
  reservationTitle,
}: HeroProps) {
  return (
    <div className="relative bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 grid md:grid-cols-2 gap-12">
        <div className="text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-500">
            {subtitle}
          </p>
          <div className="mt-10 flex justify-star gap-4">
            <Link
              href="/reservations"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {ctaButton}
            </Link>
            <Link
              href="/menu"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              {secondaryButton}
            </Link>
          </div>
        </div>

        {/* Reservation Form */}
        <div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            {reservationTitle}
          </h2>
          <ReservationForm branchId={branchId} />
        </div>
      </div>
    </div>
  );
}
