"use client";

import { useEffect, useRef, useState } from "react";

export default function PrinterTestPage() {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [printers, setPrinters] = useState<{ name: string; type: string }[]>(
    []
  );

  // Estados para la selección del usuario
  const [selectedUsb, setSelectedUsb] = useState("");
  const [networkIp, setNetworkIp] = useState("192.168.1.100");

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/ws");
    socketRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.type === "printer_list") {
        setPrinters(response.printers || []);
        if (response.printers?.length > 0)
          setSelectedUsb(response.printers[0].name);
      }
      if (response.status === "success") alert("¡Impresión enviada!");
      if (response.status === "error") alert("Error: " + response.message);
    };
    ws.onclose = () => setIsConnected(false);

    return () => ws.close();
  }, []);

  const listarImpresoras = () => {
    socketRef.current?.send(JSON.stringify({ action: "list" }));
  };

  const testImpresora = (tipo: "USB" | "Network") => {
    if (!isConnected) return alert("Bridge no conectado");

    const payload = {
      action: "print",
      data: {
        printer_name: tipo === "USB" ? selectedUsb : networkIp,
        type: tipo,
        content: `TEST ${tipo}\nImpresora: ${
          tipo === "USB" ? selectedUsb : networkIp
        }\nFecha: ${new Date().toLocaleString()}\n`,
        font_size: 1,
        paper_width: 80,
      },
    };

    socketRef.current?.send(JSON.stringify(payload));
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold border-b pb-2">
        Configuración de Impresión
      </h1>

      {/* Estado del Bridge */}
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span>
          Bridge local:{" "}
          {isConnected ? "Conectado" : "Desconectado (Abre el .exe)"}
        </span>
      </div>

      {/* SECCIÓN USB */}
      <section className="p-4 border rounded-lg bg-gray-50">
        <h2 className="font-bold mb-4 text-blue-700">
          Impresoras USB / Sistema
        </h2>
        <div className="flex flex-col gap-3">
          <button
            onClick={listarImpresoras}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            1. Buscar Impresoras Instaladas
          </button>

          <div className="flex gap-2">
            <select
              className="flex-1 p-2 border rounded"
              value={selectedUsb}
              onChange={(e) => setSelectedUsb(e.target.value)}
            >
              <option value="">Selecciona una impresora...</option>
              {printers.map((p, i) => (
                <option key={i} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => testImpresora("USB")}
              disabled={!selectedUsb}
              className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
              Test USB
            </button>
          </div>
        </div>
      </section>

      {/* SECCIÓN ETHERNET */}
      <section className="p-4 border rounded-lg bg-gray-50">
        <h2 className="font-bold mb-4 text-green-700">
          Impresora Ethernet (Red)
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ej: 192.168.1.100"
            className="flex-1 p-2 border rounded text-black"
            value={networkIp}
            onChange={(e) => setNetworkIp(e.target.value)}
          />
          <button
            onClick={() => testImpresora("Network")}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Test IP
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Asegúrate de que la impresora use el puerto 9100.
        </p>
      </section>
    </div>
  );
}
