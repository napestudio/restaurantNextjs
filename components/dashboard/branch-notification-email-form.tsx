"use client";

import { useState } from "react";
import { updateBranch } from "@/actions/Branch";

interface BranchNotificationEmailFormProps {
  branchId: string;
  initialEmail: string | null;
}

export default function BranchNotificationEmailForm({
  branchId,
  initialEmail,
}: BranchNotificationEmailFormProps) {
  const [email, setEmail] = useState(initialEmail || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await updateBranch(branchId, { notificationEmail: email });

    if (result.success) {
      setMessage({ type: "success", text: "Email de notificación actualizado correctamente." });
    } else {
      setMessage({ type: "error", text: result.error || "Error al guardar." });
    }

    setLoading(false);
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Notificaciones de reservas
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Las nuevas reservas web se enviarán a este correo electrónico.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ejemplo@restaurante.com"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </form>

      {message && (
        <p
          className={`mt-3 text-sm ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
