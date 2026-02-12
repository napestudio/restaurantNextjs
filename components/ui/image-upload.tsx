"use client";

import { useState, useRef } from "react";
import {
  Upload,
  X,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

type ImageUploadProps = {
  value: string; // Current image URL
  onChange: (url: string) => void; // Callback when image uploaded
  onRemove: () => void; // Callback when image removed
  disabled?: boolean;
  maxSizeMB?: number; // Default: 5MB
};

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
  maxSizeMB = 2,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset error state
    setUploadError(null);

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Formato no válido. Solo se permiten JPG, PNG y WebP.");
      return;
    }

    // Validate file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(
        `El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB.`,
      );
      return;
    }

    // Upload to Cloudinary
    await uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Upload to our API route (server-side upload to Cloudinary)
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      // Log response details for debugging
      console.log("Upload API response:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Upload error:", data);
        throw new Error(data.error || "Error al subir la imagen");
      }

      // Call onChange with the secure URL from Cloudinary
      onChange(data.url);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Error al subir la imagen",
      );
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onRemove();
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Empty state - no image
  if (!value && !isUploading) {
    return (
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />

        <div
          onClick={handleUploadClick}
          className={`
            border-2 border-dashed border-gray-300 rounded-lg p-6
            flex flex-col items-center justify-center gap-2
            cursor-pointer hover:border-gray-400 transition-colors
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Upload className="w-6 h-6 text-gray-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              Subir imagen del producto
            </p>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG o WebP hasta {maxSizeMB}MB
            </p>
          </div>
        </div>

        {uploadError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-600">{uploadError}</p>
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if (isUploading) {
    return (
      <div className="border border-gray-300 rounded-lg p-6">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-600">Subiendo imagen...</p>
        </div>
      </div>
    );
  }

  // Success state - image uploaded
  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={disabled}
        className="hidden"
      />

      <div className="relative border border-gray-300 rounded-lg overflow-hidden">
        <Image
          src={value}
          alt="Imágen del producto"
          width={300}
          height={300}
          className="w-full max-h-50 object-contain bg-gray-50"
        />

        {!disabled && (
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleUploadClick}
              className="bg-white/90 hover:bg-white"
            >
              <ImageIcon className="w-4 h-4 mr-1" />
              Cambiar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleRemove}
              className="bg-red-600/90 hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-600">{uploadError}</p>
        </div>
      )}
    </div>
  );
}
