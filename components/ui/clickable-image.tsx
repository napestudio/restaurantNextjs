"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { XIcon } from "lucide-react";

interface ClickableImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export function ClickableImage({
  src,
  alt,
  width,
  height,
  className,
}: ClickableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-zoom-in"
        aria-label={`Ver imagen de ${alt}`}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[85svw] p-2 bg-black border-none"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <DialogClose className="absolute top-3 right-3 z-10 bg-white rounded-full p-1 opacity-90 hover:opacity-100 transition-opacity">
            <XIcon className="size-4 text-black" />
            <span className="sr-only">Cerrar</span>
          </DialogClose>

          <Image
            src={src}
            alt={alt}
            width={800}
            height={800}
            className="w-full h-auto object-contain rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
