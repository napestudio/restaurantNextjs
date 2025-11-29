"use client";
import Image from "next/image";

export default function Avatar() {
  return (
    <div className="h-32 aspect-square bg-gray-50 rounded-full shadow-neutral-100">
      <Image
        src="https://res.cloudinary.com/dkgnaegp9/image/upload/v1763495054/235630035_1552811355049816_8329159676573787567_n_ynyecz.jpg"
        alt="Logo"
        width={256}
        height={256}
        className="rounded-full object-cover h-32 w-32 mx-auto"
      />
    </div>
  );
}
