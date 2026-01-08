"use client";
import Image from "next/image";

interface AvatarProps {
  src?: string | null;
  alt?: string;
}

export default function Avatar({
  src = "https://res.cloudinary.com/dkgnaegp9/image/upload/v1764602727/LOGO_qm9wjw.svg",
  alt = "Logo",
}: AvatarProps) {
  return (
    <div className="h-28">
      <Image
        src={
          src ||
          "https://res.cloudinary.com/dkgnaegp9/image/upload/v1764602727/LOGO_qm9wjw.svg"
        }
        alt={alt}
        width={256}
        height={256}
        priority
        className="h-24 w-auto"
      />
    </div>
  );
}
