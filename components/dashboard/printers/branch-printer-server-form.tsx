"use client";

import { useState } from "react";
import { updateBranch } from "@/actions/Branch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink } from "lucide-react";

interface BranchPrinterServerFormProps {
  branchId: string;
  initialUrl: string | null;
}

function deriveCertUrl(wsUrl: string): string | null {
  try {
    // wss://192.168.1.100:8443/ws -> https://192.168.1.100:8443
    const url = new URL(wsUrl);
    return `https://${url.host}`;
  } catch {
    return null;
  }
}

export function BranchPrinterServerForm({
  branchId,
  initialUrl,
}: BranchPrinterServerFormProps) {
  const [url, setUrl] = useState(initialUrl || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const certUrl = url ? deriveCertUrl(url) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await updateBranch(branchId, {
      printerServerUrl: url || null,
    });

    if (result.success) {
      setMessage({
        type: "success",
        text: "URL del servidor de impresión actualizada.",
      });
    } else {
      setMessage({ type: "error", text: result.error || "Error al guardar." });
    }

    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="printer-server-url" className="text-sm font-medium">
          URL del servidor de impresión
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Dirección wss:// del equipo con gg-ez-print en la red local.
          Ejemplo: <span className="font-mono">wss://192.168.1.100:8443/ws</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          id="printer-server-url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="wss://192.168.1.100:8443/ws"
          className="font-mono text-sm"
        />
        <Button type="submit" disabled={loading} size="sm">
          {loading ? "Guardando..." : "Guardar"}
        </Button>
      </form>

      {certUrl && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <p className="font-medium mb-1">Certificado auto-firmado</p>
          <p className="text-xs">
            Cada dispositivo nuevo debe aceptar el certificado antes de poder
            imprimir. Compartí este enlace con el personal:
          </p>
          <a
            href={certUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 mt-1.5 text-xs font-mono text-amber-900 underline underline-offset-2 hover:text-amber-700"
          >
            {certUrl}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
